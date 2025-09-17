class AppointmentSystem {
    constructor() {
        this.bookings = {};
        this.maxBookingsPerDay = 2;
        this.maxBookingsIncludingReserve = 3; // 2名 + 1名予備
        this.availableDays = [1, 2, 4, 5]; // 月(1), 火(2), 木(4), 金(5)
        this.isAdminMode = false;
        this.pendingReservation = null; // 予備枠予約の一時保存
        this.isGoogleAPIInitialized = false;
        this.accessToken = localStorage.getItem('google_access_token');
        this.useFirestore = true; // Firestoreを使用するかのフラグ
        this.adminPassword = '@hs1357@'; // 管理者パスワード（本番環境では暗号化推奨）

        // Firestore機能が利用可能になるまで待機
        this.waitForFirestore().then(() => {
            this.initializeSystem();
        });
    }

    async waitForFirestore() {
        // Firebase DBが利用可能になるまで待機
        let attempts = 0;
        while (!window.firebaseDB && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.firebaseDB) {
            console.warn('Firebase初期化に失敗しました。ローカルストレージを使用します。');
            this.useFirestore = false;
            this.bookings = JSON.parse(localStorage.getItem('appointments')) || {};
        }
    }

    async initializeSystem() {
        if (this.useFirestore) {
            await this.loadBookingsFromFirestore();
        }

        this.initializeCalendar();
        this.bindEvents();
        this.updateAvailableDates();
        this.initializeAdminMode();
    }

    // Firestoreから予約データを読み込み
    async loadBookingsFromFirestore() {
        try {
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const querySnapshot = await getDocs(collection(window.firebaseDB, 'appointments'));

            this.bookings = {};
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (!this.bookings[data.date]) {
                    this.bookings[data.date] = {};
                }
                this.bookings[data.date][data.slot] = {
                    name: data.name,
                    company: data.company,
                    phone: data.phone,
                    createdAt: data.createdAt,
                    isReserve: data.isReserve,
                    googleEventId: data.googleEventId || null,
                    firestoreId: doc.id
                };
            });

            console.log('Firestoreからデータを読み込みました');
        } catch (error) {
            console.error('Firestore読み込みエラー:', error);
            this.useFirestore = false;
            this.bookings = JSON.parse(localStorage.getItem('appointments')) || {};
        }
    }

    // Firestoreに予約データを保存
    async saveBookingToFirestore(appointment) {
        try {
            const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const docData = {
                name: appointment.name,
                company: appointment.company,
                phone: appointment.phone,
                date: appointment.date,
                slot: appointment.slot,
                createdAt: appointment.createdAt,
                isReserve: appointment.slot > this.maxBookingsPerDay,
                googleEventId: null
            };

            const docRef = await addDoc(collection(window.firebaseDB, 'appointments'), docData);
            console.log('Firestoreに保存しました:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Firestore保存エラー:', error);
            throw error;
        }
    }

    // FirestoreのGoogleカレンダーイベントIDを更新
    async updateGoogleEventIdInFirestore(firestoreId, eventId) {
        try {
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const docRef = doc(window.firebaseDB, 'appointments', firestoreId);
            await updateDoc(docRef, {
                googleEventId: eventId
            });
            console.log('FirestoreのGoogleイベントIDを更新しました');
        } catch (error) {
            console.error('FirestoreのGoogleイベントID更新エラー:', error);
        }
    }

    // Firestoreから予約データを削除
    async deleteBookingFromFirestore(firestoreId) {
        try {
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const docRef = doc(window.firebaseDB, 'appointments', firestoreId);
            await deleteDoc(docRef);
            console.log('Firestoreから削除しました');
        } catch (error) {
            console.error('Firestore削除エラー:', error);
        }
    }

    initializeCalendar() {
        this.generateCalendar();
    }

    bindEvents() {
        const form = document.getElementById('appointmentForm');
        const dateSelect = document.getElementById('date');
        const slotSelect = document.getElementById('slot');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        dateSelect.addEventListener('change', (e) => this.updateSlots(e.target.value));

        // 管理者モード関連のイベント
        document.getElementById('adminToggle').addEventListener('click', () => this.toggleAdminMode());
        document.getElementById('showReservations').addEventListener('click', () => this.showReservationsList());
        document.getElementById('hideReservations').addEventListener('click', () => this.hideReservationsList());
        document.getElementById('syncToGoogleCalendar').addEventListener('click', () => this.syncAllToGoogleCalendar());
        document.getElementById('migrateData').addEventListener('click', () => this.showMigrateModal());

        // モーダル関連のイベント
        document.getElementById('closeModal').addEventListener('click', () => this.closeCancelModal());
        document.getElementById('confirmCancel').addEventListener('click', () => this.executeCancel());
        document.getElementById('cancelCancel').addEventListener('click', () => this.closeCancelModal());

        // 予備枠モーダル関連のイベント
        document.getElementById('closeReserveModal').addEventListener('click', () => this.closeReserveModal());
        document.getElementById('confirmReserve').addEventListener('click', () => this.executeReserveBooking());
        document.getElementById('cancelReserve').addEventListener('click', () => this.closeReserveModal());

        // データ移行モーダル関連のイベント
        document.getElementById('closeMigrateModal').addEventListener('click', () => this.closeMigrateModal());
        document.getElementById('confirmMigrate').addEventListener('click', () => this.executeMigration());
        document.getElementById('cancelMigrate').addEventListener('click', () => this.closeMigrateModal());

        // 管理者パスワード認証モーダル関連のイベント
        document.getElementById('closeAdminPasswordModal').addEventListener('click', () => this.closeAdminPasswordModal());
        document.getElementById('confirmAdminPassword').addEventListener('click', () => this.verifyAdminPassword());
        document.getElementById('cancelAdminPassword').addEventListener('click', () => this.closeAdminPasswordModal());

        // Enterキーでパスワード認証を実行
        document.getElementById('adminPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.verifyAdminPassword();
            }
        });

        // モーダル外クリックで閉じる
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeCancelModal();
                this.closeReserveModal();
                this.closeMigrateModal();
                this.closeAdminPasswordModal();
            }
        });
    }

    generateCalendar() {
        const today = new Date();
        const calendarDiv = document.getElementById('calendar');

        let calendarHTML = '<div class="calendar-grid">';

        // 今後4週間分の利用可能日を表示
        for (let week = 0; week < 4; week++) {
            for (let day = 0; day < 7; day++) {
                const date = new Date(today);
                date.setDate(today.getDate() + (week * 7) + day);

                const dayOfWeek = date.getDay();
                const dateStr = this.formatDate(date);
                const isAvailable = this.availableDays.includes(dayOfWeek) && date >= today;
                const bookingCount = this.getBookingCount(dateStr);
                const reserveCount = this.getReserveBookingCount(dateStr);

                let cellClass = 'calendar-cell';
                if (isAvailable) {
                    if (bookingCount >= this.maxBookingsPerDay) {
                        if (reserveCount > 0) {
                            cellClass += ' reserve-used';
                        } else {
                            cellClass += ' full';
                        }
                    } else {
                        cellClass += ' available';
                    }
                } else {
                    cellClass += ' unavailable';
                }

                const totalBookings = bookingCount + reserveCount;
                const slotInfo = isAvailable ?
                    `<div class="slots">${bookingCount}/${this.maxBookingsPerDay}${reserveCount > 0 ? ' (+' + reserveCount + '予備)' : ''}</div>` : '';

                calendarHTML += `
                    <div class="${cellClass}" data-date="${dateStr}">
                        <div class="date">${date.getDate()}</div>
                        <div class="day">${this.getDayName(dayOfWeek)}</div>
                        ${slotInfo}
                    </div>
                `;
            }
        }

        calendarHTML += '</div>';
        calendarDiv.innerHTML = calendarHTML;
    }

    updateAvailableDates() {
        const dateSelect = document.getElementById('date');
        const today = new Date();

        // 既存のオプションをクリア（最初のオプションは残す）
        while (dateSelect.children.length > 1) {
            dateSelect.removeChild(dateSelect.lastChild);
        }

        // 今後4週間分の利用可能日を追加
        for (let i = 0; i < 28; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            const dayOfWeek = date.getDay();
            if (this.availableDays.includes(dayOfWeek)) {
                const dateStr = this.formatDate(date);
                const bookingCount = this.getBookingCount(dateStr);
                const reserveCount = this.getReserveBookingCount(dateStr);
                const totalBookings = bookingCount + reserveCount;

                // 通常枠に空きがある、または予備枠が利用可能な場合は表示
                if (totalBookings < this.maxBookingsIncludingReserve) {
                    const option = document.createElement('option');
                    option.value = dateStr;

                    let displayText;
                    if (bookingCount < this.maxBookingsPerDay) {
                        // 通常枠に空きがある場合
                        displayText = `${dateStr} (${this.getDayName(dayOfWeek)}) - 残り${this.maxBookingsPerDay - bookingCount}枠`;
                    } else {
                        // 通常枠は満席だが予備枠が利用可能
                        displayText = `${dateStr} (${this.getDayName(dayOfWeek)}) - 予備枠のみ利用可能`;
                    }

                    option.textContent = displayText;
                    dateSelect.appendChild(option);
                }
            }
        }
    }

    updateSlots(selectedDate) {
        const slotSelect = document.getElementById('slot');

        // スロット選択をリセット
        slotSelect.innerHTML = '';

        if (!selectedDate) {
            slotSelect.disabled = true;
            slotSelect.innerHTML = '<option value="">まず日付を選択してください</option>';
            return;
        }

        slotSelect.disabled = false;

        const bookingCount = this.getBookingCount(selectedDate);
        const reserveCount = this.getReserveBookingCount(selectedDate);
        const totalBookings = bookingCount + reserveCount;
        const availableSlots = this.maxBookingsPerDay - bookingCount;

        // すべての枠（通常枠+予備枠）が埋まっている場合
        if (totalBookings >= this.maxBookingsIncludingReserve) {
            slotSelect.innerHTML = '<option value="">この日は満席です（予備枠含む）</option>';
            return;
        }

        slotSelect.innerHTML = '<option value="">予約枠を選択してください</option>';

        // 通常枠の表示
        for (let i = 1; i <= this.maxBookingsPerDay; i++) {
            if (!this.isSlotBooked(selectedDate, i)) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `予約枠 ${i}`;
                slotSelect.appendChild(option);
            }
        }

        // 通常枠が満席で予備枠が利用可能な場合
        if (availableSlots === 0 && reserveCount === 0) {
            const reserveSlot = this.maxBookingsPerDay + 1;
            if (!this.isSlotBooked(selectedDate, reserveSlot)) {
                const option = document.createElement('option');
                option.value = reserveSlot;
                option.textContent = `予約枠 ${reserveSlot} (予備枠)`;
                option.style.backgroundColor = '#fff3cd';
                option.style.color = '#856404';
                slotSelect.appendChild(option);
            }
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const appointment = {
            name: formData.get('name'),
            company: formData.get('company'),
            phone: formData.get('phone'),
            date: formData.get('date'),
            slot: parseInt(formData.get('slot')),
            createdAt: new Date().toISOString()
        };

        // バリデーション
        if (!appointment.name || !appointment.company || !appointment.phone || !appointment.date || !appointment.slot) {
            alert('すべての項目を入力してください。');
            return;
        }

        // 電話番号の形式チェック
        const phonePattern = /^[0-9-+()\\s]+$/;
        if (!phonePattern.test(appointment.phone)) {
            alert('正しい電話番号を入力してください。');
            return;
        }

        // 重複チェック
        if (this.isSlotBooked(appointment.date, appointment.slot)) {
            alert('選択された予約枠は既に予約済みです。他の枠を選択してください。');
            this.updateSlots(appointment.date);
            return;
        }

        // 通常枠が満席で予備枠を使用する場合の警告
        const normalBookings = this.getBookingCount(appointment.date);
        if (normalBookings >= this.maxBookingsPerDay && appointment.slot > this.maxBookingsPerDay) {
            // 予備枠使用の確認
            this.pendingReservation = appointment;
            this.showReserveModal();
            return;
        }

        // 通常の予約処理
        await this.processBooking(appointment);
    }

    async processBooking(appointment) {
        // 予約を保存
        await this.saveBooking(appointment);

        // Googleカレンダーに自動同期
        try {
            console.log('新しい予約をGoogleカレンダーに自動同期中...');
            const eventId = await this.addToGoogleCalendar(appointment);
            if (eventId) {
                console.log('Googleカレンダー自動同期成功:', eventId);
            }
        } catch (error) {
            console.error('Googleカレンダー自動同期エラー:', error);
            // エラーがあっても予約処理は継続
        }

        // 成功メッセージ表示
        this.showBookingStatus(appointment);

        // フォームリセット
        document.getElementById('appointmentForm').reset();
        document.getElementById('slot').disabled = true;
        document.getElementById('slot').innerHTML = '<option value="">まず日付を選択してください</option>';

        // カレンダーと選択肢を更新
        this.generateCalendar();
        this.updateAvailableDates();

        // 管理者モードの場合は予約一覧も更新
        if (this.isAdminMode && document.getElementById('reservationsList').style.display !== 'none') {
            this.showReservationsList();
        }
    }

    async saveBooking(appointment) {
        const dateKey = appointment.date;
        if (!this.bookings[dateKey]) {
            this.bookings[dateKey] = {};
        }

        const bookingData = {
            name: appointment.name,
            company: appointment.company,
            phone: appointment.phone,
            createdAt: appointment.createdAt,
            isReserve: appointment.slot > this.maxBookingsPerDay,
            googleEventId: null
        };

        if (this.useFirestore) {
            try {
                const firestoreId = await this.saveBookingToFirestore(appointment);
                bookingData.firestoreId = firestoreId;
            } catch (error) {
                console.error('Firestore保存に失敗しました。ローカルに保存します。', error);
                this.useFirestore = false;
            }
        }

        this.bookings[dateKey][appointment.slot] = bookingData;

        // ローカルストレージにもバックアップ保存
        localStorage.setItem('appointments', JSON.stringify(this.bookings));
    }

    async addToGoogleCalendar(appointment) {
        try {
            // Google Calendar API連携を有効化
            await this.ensureGoogleAPIAccess();

            // gapiが利用可能か確認
            if (typeof gapi === 'undefined' || !gapi.client || !gapi.client.calendar) {
                throw new Error('Google Calendar API が利用できません');
            }

            const event = {
                summary: `アポイント - ${appointment.company} (${appointment.name})`,
                description: `製薬会社: ${appointment.company}\n担当者: ${appointment.name}\n電話番号: ${appointment.phone}\n予約枠: ${appointment.slot}${appointment.slot > this.maxBookingsPerDay ? ' (予備枠)' : ''}`,
                start: {
                    date: appointment.date,
                    timeZone: 'Asia/Tokyo'
                },
                end: {
                    date: appointment.date,
                    timeZone: 'Asia/Tokyo'
                }
            };

            console.log('Creating Google Calendar event:', event);

            // Promise形式でAPI呼び出し
            const response = await new Promise((resolve, reject) => {
                const request = gapi.client.calendar.events.insert({
                    calendarId: 'primary',
                    resource: event
                });

                request.execute((response) => {
                    if (response.error) {
                        console.error('Google Calendar API error:', response.error);
                        reject(response.error);
                    } else {
                        console.log('Google Calendar API raw response:', response);
                        resolve(response);
                    }
                });
            });

            // レスポンスが正常か確認
            if (!response || !response.id) {
                console.error('Invalid response structure:', response);
                throw new Error('Google Calendar event creation failed: Invalid response');
            }

            console.log('Google Calendar event created successfully with ID:', response.id);

            // イベントIDを予約データに保存
            const dateKey = appointment.date;
            if (this.bookings[dateKey] && this.bookings[dateKey][appointment.slot]) {
                this.bookings[dateKey][appointment.slot].googleEventId = response.id;

                // Firestoreにも保存
                if (this.useFirestore && this.bookings[dateKey][appointment.slot].firestoreId) {
                    try {
                        await this.updateGoogleEventIdInFirestore(
                            this.bookings[dateKey][appointment.slot].firestoreId,
                            response.id
                        );
                        console.log('Firestore updated with Google Event ID:', response.id);
                    } catch (firestoreError) {
                        console.error('Firestore update failed:', firestoreError);
                        // Firestoreエラーは無視してローカル更新は続行
                    }
                }

                // ローカルストレージも更新
                localStorage.setItem('appointments', JSON.stringify(this.bookings));
                console.log('Local storage updated with Google Event ID');
            }

            return response.id;

        } catch (error) {
            console.error('Google Calendar連携エラー:', error);

            // 認証エラーの場合は再認証を試行
            if (error.status === 401 || error.message?.includes('unauthorized') || error.message?.includes('invalid_grant')) {
                console.log('認証が無効になりました。再認証を実行します。');
                this.clearStoredAuth();
                try {
                    await this.ensureGoogleAPIAccess();
                    // 再試行（無限ループ防止のため1回のみ）
                    return await this.addToGoogleCalendar(appointment);
                } catch (retryError) {
                    console.error('再認証も失敗しました:', retryError);
                    throw new Error('Google Calendar認証に失敗しました');
                }
            }

            throw error;
        }
    }

    // Googleカレンダーからイベントを削除
    async deleteFromGoogleCalendar(eventId) {
        try {
            if (!eventId) {
                console.log('Google Calendar event ID が無いため、削除をスキップします');
                return;
            }

            await this.ensureGoogleAPIAccess();

            // gapiが利用可能か確認
            if (typeof gapi === 'undefined' || !gapi.client || !gapi.client.calendar) {
                throw new Error('Google Calendar API が利用できません');
            }

            console.log('Deleting Google Calendar event:', eventId);

            // Promise形式でAPI呼び出し
            await new Promise((resolve, reject) => {
                const request = gapi.client.calendar.events.delete({
                    calendarId: 'primary',
                    eventId: eventId
                });

                request.execute((response) => {
                    if (response.error) {
                        console.error('Google Calendar delete error:', response.error);
                        reject(response.error);
                    } else {
                        console.log('Google Calendar delete response:', response);
                        resolve(response);
                    }
                });
            });

            console.log('Google Calendar event deleted successfully:', eventId);
            return true;
        } catch (error) {
            console.error('Googleカレンダー削除エラー:', error);

            // 認証エラーの場合は再認証を試行
            if (error.status === 401 || error.message?.includes('unauthorized') || error.message?.includes('invalid_grant')) {
                console.log('認証が無効になりました。再認証を実行します。');
                this.clearStoredAuth();
                try {
                    await this.ensureGoogleAPIAccess();
                    // 再試行（無限ループ防止のため1回のみ）
                    await new Promise((resolve, reject) => {
                        const request = gapi.client.calendar.events.delete({
                            calendarId: 'primary',
                            eventId: eventId
                        });

                        request.execute((response) => {
                            if (response.error) {
                                reject(response.error);
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    console.log('Google Calendar event deleted after retry:', eventId);
                    return true;
                } catch (retryError) {
                    console.error('再認証での削除も失敗しました:', retryError);
                }
            }

            // エラーがあってもキャンセル処理は継続
            return false;
        }
    }

    // 認証状態の確認とアクセス保証
    async ensureGoogleAPIAccess() {
        try {
            // gapiが利用可能か確認
            if (typeof gapi === 'undefined') {
                throw new Error('Google API が読み込まれていません');
            }

            if (this.isGoogleAPIInitialized && this.accessToken && this.isTokenValid()) {
                // 既に認証済みで有効なトークンがある場合
                gapi.client.setToken({ access_token: this.accessToken });
                return;
            }

            // 初回または再認証が必要な場合
            console.log('Google API の初期化または再認証を開始します');
            await this.initializeGoogleAPI();
        } catch (error) {
            console.error('Google API アクセス確保に失敗:', error);
            throw error;
        }
    }

    // 保存された認証情報をクリア
    clearStoredAuth() {
        this.accessToken = null;
        this.isGoogleAPIInitialized = false;
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_expiry');
    }

    // トークンの有効性を確認
    isTokenValid() {
        if (!this.accessToken) return false;

        const expiry = localStorage.getItem('google_token_expiry');
        if (!expiry) return false;

        return new Date().getTime() < parseInt(expiry);
    }

    async initializeGoogleAPI() {
        const API_KEY = 'AIzaSyCmHXVdbDWtv0FZdDLkgWUbDEak5mxTuzQ';
        const CLIENT_ID = '917502957454-id7ctq4u1fgiv0ol8toi0ej93vv57817.apps.googleusercontent.com';
        const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
        const SCOPES = 'https://www.googleapis.com/auth/calendar';

        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: [DISCOVERY_DOC]
                    });

                    // 保存されたトークンが有効な場合は再利用
                    if (this.isTokenValid()) {
                        gapi.client.setToken({ access_token: this.accessToken });
                        this.isGoogleAPIInitialized = true;
                        resolve({ access_token: this.accessToken });
                        return;
                    }

                    // 新しいGoogle Identity Services (GIS)を使用
                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: (response) => {
                            if (response.error) {
                                console.error('Google OAuth error:', response.error);
                                reject(response);
                            } else {
                                // トークンを保存
                                this.accessToken = response.access_token;
                                this.isGoogleAPIInitialized = true;
                                localStorage.setItem('google_access_token', response.access_token);

                                // 有効期限を設定（1時間後）
                                const expiry = new Date().getTime() + (3600 * 1000);
                                localStorage.setItem('google_token_expiry', expiry.toString());

                                gapi.client.setToken({ access_token: response.access_token });
                                resolve(response);
                            }
                        },
                        error_callback: (error) => {
                            console.error('Google OAuth error callback:', error);
                            reject(error);
                        }
                    });

                    // トークンをリクエスト（ユーザーインタラクションが必要）
                    try {
                        this.tokenClient.requestAccessToken({ prompt: 'consent' });
                    } catch (error) {
                        console.error('Token request failed:', error);
                        reject(error);
                    }

                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    showBookingStatus(appointment) {
        const statusDiv = document.getElementById('bookingStatus');
        const messageDiv = document.getElementById('statusMessage');

        const storageType = this.useFirestore ? 'クラウド' : 'ローカル';

        messageDiv.innerHTML = `
            <div class="success-message">
                <h4>予約が完了しました！</h4>
                <p><strong>お名前:</strong> ${appointment.name}</p>
                <p><strong>製薬会社:</strong> ${appointment.company}</p>
                <p><strong>電話番号:</strong> ${appointment.phone}</p>
                <p><strong>予約日:</strong> ${appointment.date}</p>
                <p><strong>予約枠:</strong> ${appointment.slot}${appointment.slot > this.maxBookingsPerDay ? ' (予備枠)' : ''}</p>
                <p><small>予約が${storageType}に保存され、Googleカレンダーに自動同期されました。</small></p>
            </div>
        `;

        statusDiv.style.display = 'block';

        // 5秒後に非表示
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    getBookingCount(date) {
        if (!this.bookings[date]) return 0;
        return Object.values(this.bookings[date]).filter(booking => !booking.isReserve).length;
    }

    isSlotBooked(date, slot) {
        return this.bookings[date] && this.bookings[date][slot];
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getDayName(dayOfWeek) {
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return days[dayOfWeek];
    }

    // 予備枠の予約数をカウント
    getReserveBookingCount(date) {
        if (!this.bookings[date]) return 0;
        return Object.values(this.bookings[date]).filter(booking => booking.isReserve).length;
    }

    // 管理者モード関連の初期化
    initializeAdminMode() {
        // 管理者セクションを表示
        document.getElementById('adminSection').style.display = 'block';
    }

    // 管理者モードの切り替え
    toggleAdminMode() {
        if (!this.isAdminMode) {
            // 管理者モードONの場合はパスワード認証が必要
            this.showAdminPasswordModal();
            return;
        }

        // 管理者モードOFFの場合はそのまま終了
        this.isAdminMode = false;
        this.updateAdminUI();
    }

    // 管理者UIの更新
    updateAdminUI() {
        const showBtn = document.getElementById('showReservations');
        const hideBtn = document.getElementById('hideReservations');
        const syncBtn = document.getElementById('syncToGoogleCalendar');
        const migrateBtn = document.getElementById('migrateData');
        const adminToggle = document.getElementById('adminToggle');

        if (this.isAdminMode) {
            showBtn.style.display = 'inline-block';
            syncBtn.style.display = 'inline-block';
            migrateBtn.style.display = this.useFirestore ? 'none' : 'inline-block';
            adminToggle.textContent = '管理者モード終了';
            adminToggle.style.backgroundColor = '#e74c3c';
        } else {
            showBtn.style.display = 'none';
            hideBtn.style.display = 'none';
            syncBtn.style.display = 'none';
            migrateBtn.style.display = 'none';
            document.getElementById('reservationsList').style.display = 'none';
            adminToggle.textContent = '管理者モード';
            adminToggle.style.backgroundColor = '#3498db';
        }
    }

    // 予約一覧の表示
    showReservationsList() {
        const reservationsList = document.getElementById('reservationsList');
        const reservationsContent = document.getElementById('reservationsContent');
        const showBtn = document.getElementById('showReservations');
        const hideBtn = document.getElementById('hideReservations');

        let html = '';
        let hasReservations = false;

        // 日付順にソート
        const sortedDates = Object.keys(this.bookings).sort();

        for (const date of sortedDates) {
            const dateBookings = this.bookings[date];
            if (Object.keys(dateBookings).length > 0) {
                hasReservations = true;
                html += `<div class="date-group">
                    <h4>${date} (${this.getDayName(new Date(date).getDay())}) - ${this.useFirestore ? 'クラウド保存' : 'ローカル保存'}</h4>
                `;

                // スロット順にソート
                const sortedSlots = Object.keys(dateBookings).sort((a, b) => parseInt(a) - parseInt(b));

                for (const slot of sortedSlots) {
                    const booking = dateBookings[slot];
                    const slotType = booking.isReserve ? ' (予備枠)' : '';
                    const googleStatus = booking.googleEventId ? '📅' : '❌';
                    html += `
                        <div class="reservation-item ${booking.isReserve ? 'reserve-booking' : ''}">
                            <div class="reservation-details">
                                <span class="slot-info">枠${slot}${slotType}</span>
                                <span class="name">${booking.name}</span>
                                <span class="company">${booking.company}</span>
                                <span class="phone">${booking.phone}</span>
                                <span class="google-status" title="${booking.googleEventId ? 'Googleカレンダー連携済み' : 'Googleカレンダー未連携'}">${googleStatus}</span>
                                <span class="created">${new Date(booking.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <button class="cancel-btn" onclick="appointmentSystem.showCancelModal('${date}', '${slot}')">
                                キャンセル
                            </button>
                        </div>
                    `;
                }
                html += '</div>';
            }
        }

        if (!hasReservations) {
            html = '<p class="no-reservations">現在予約はありません。</p>';
        }

        reservationsContent.innerHTML = html;
        reservationsList.style.display = 'block';
        showBtn.style.display = 'none';
        hideBtn.style.display = 'inline-block';
    }

    // 予約一覧の非表示
    hideReservationsList() {
        document.getElementById('reservationsList').style.display = 'none';
        document.getElementById('showReservations').style.display = 'inline-block';
        document.getElementById('hideReservations').style.display = 'none';
    }

    // キャンセルモーダルの表示
    showCancelModal(date, slot) {
        const booking = this.bookings[date][slot];
        if (!booking) return;

        const modal = document.getElementById('cancelModal');
        const details = document.getElementById('cancelDetails');

        details.innerHTML = `
            <div class="cancel-booking-details">
                <p><strong>予約日:</strong> ${date}</p>
                <p><strong>予約枠:</strong> ${slot}${booking.isReserve ? ' (予備枠)' : ''}</p>
                <p><strong>お名前:</strong> ${booking.name}</p>
                <p><strong>製薬会社:</strong> ${booking.company}</p>
                <p><strong>電話番号:</strong> ${booking.phone}</p>
                <p><strong>保存場所:</strong> ${this.useFirestore ? 'クラウド' : 'ローカル'}</p>
            </div>
        `;

        modal.style.display = 'block';
        modal.dataset.cancelDate = date;
        modal.dataset.cancelSlot = slot;
    }

    // キャンセルモーダルを閉じる
    closeCancelModal() {
        document.getElementById('cancelModal').style.display = 'none';
    }

    // 予約キャンセルの実行（Firestore + Googleカレンダー削除機能付き）
    async executeCancel() {
        const modal = document.getElementById('cancelModal');
        const date = modal.dataset.cancelDate;
        const slot = modal.dataset.cancelSlot;

        if (this.bookings[date] && this.bookings[date][slot]) {
            const booking = this.bookings[date][slot];
            console.log('キャンセル対象の予約:', booking);

            let googleCalendarDeleted = false;

            // Googleカレンダーからイベントを削除
            if (booking.googleEventId) {
                console.log('Googleカレンダーイベント削除を開始:', booking.googleEventId);
                try {
                    const deleted = await this.deleteFromGoogleCalendar(booking.googleEventId);
                    googleCalendarDeleted = deleted;
                    console.log('Googleカレンダー削除結果:', deleted);
                } catch (error) {
                    console.error('Googleカレンダー削除でエラー発生:', error);
                }
            } else {
                console.log('GoogleカレンダーのイベントIDがないため、Googleカレンダー削除をスキップします');
            }

            // Firestoreから削除
            if (this.useFirestore && booking.firestoreId) {
                try {
                    console.log('Firestore削除を開始:', booking.firestoreId);
                    await this.deleteBookingFromFirestore(booking.firestoreId);
                    console.log('Firestore削除完了');
                } catch (error) {
                    console.error('Firestore削除でエラー発生:', error);
                }
            }

            // ローカルデータから削除
            delete this.bookings[date][slot];

            // 日付に予約がなくなった場合、日付キーも削除
            if (Object.keys(this.bookings[date]).length === 0) {
                delete this.bookings[date];
            }

            // ローカルストレージも更新
            localStorage.setItem('appointments', JSON.stringify(this.bookings));

            // 画面を更新
            this.generateCalendar();
            this.updateAvailableDates();
            if (document.getElementById('reservationsList').style.display !== 'none') {
                this.showReservationsList();
            }

            this.closeCancelModal();

            // 削除結果をメッセージに反映
            const storageType = this.useFirestore ? 'クラウドと' : '';
            const googleMessage = booking.googleEventId ?
                (googleCalendarDeleted ? 'Googleカレンダーから削除されました。' : 'Googleカレンダーの削除に失敗しました。') :
                'GoogleカレンダーのイベントIDがありませんでした。';

            alert(`予約がキャンセルされました。${googleMessage} ${storageType}ローカルストレージからも削除されました。`);
        }
    }

    // データ移行モーダルの表示
    showMigrateModal() {
        document.getElementById('migrateModal').style.display = 'block';
    }

    // データ移行モーダルを閉じる
    closeMigrateModal() {
        document.getElementById('migrateModal').style.display = 'none';
    }

    // ローカルデータをFirestoreに移行
    async executeMigration() {
        if (this.useFirestore) {
            alert('既にクラウドストレージを使用しています。');
            this.closeMigrateModal();
            return;
        }

        try {
            const localBookings = JSON.parse(localStorage.getItem('appointments')) || {};
            let migratedCount = 0;

            for (const date in localBookings) {
                for (const slot in localBookings[date]) {
                    const booking = localBookings[date][slot];
                    const appointment = {
                        name: booking.name,
                        company: booking.company,
                        phone: booking.phone,
                        date: date,
                        slot: parseInt(slot),
                        createdAt: booking.createdAt
                    };

                    try {
                        const firestoreId = await this.saveBookingToFirestore(appointment);
                        // ローカルデータにFirestore IDを追加
                        this.bookings[date][slot].firestoreId = firestoreId;
                        if (booking.googleEventId) {
                            await this.updateGoogleEventIdInFirestore(firestoreId, booking.googleEventId);
                        }
                        migratedCount++;
                    } catch (error) {
                        console.error(`予約データ移行エラー (${date}-${slot}):`, error);
                    }
                }
            }

            this.useFirestore = true;
            localStorage.setItem('appointments', JSON.stringify(this.bookings));

            alert(`${migratedCount}件の予約データをクラウドに移行しました。`);
            this.closeMigrateModal();

            // 管理者モード表示を更新
            if (this.isAdminMode) {
                document.getElementById('migrateData').style.display = 'none';
                if (document.getElementById('reservationsList').style.display !== 'none') {
                    this.showReservationsList();
                }
            }

        } catch (error) {
            console.error('データ移行エラー:', error);
            alert('データ移行に失敗しました。');
            this.closeMigrateModal();
        }
    }

    // 予備枠モーダルの表示
    showReserveModal() {
        document.getElementById('reserveModal').style.display = 'block';
    }

    // 予備枠モーダルを閉じる
    closeReserveModal() {
        document.getElementById('reserveModal').style.display = 'none';
        this.pendingReservation = null;
    }

    // 予備枠予約の実行
    async executeReserveBooking() {
        if (this.pendingReservation) {
            await this.processBooking(this.pendingReservation);
            this.closeReserveModal();
        }
    }

    // 管理者専用：全予約をGoogleカレンダーに同期
    async syncAllToGoogleCalendar() {
        if (!this.isAdminMode) {
            alert('管理者モードでのみ使用できます。');
            return;
        }

        if (!confirm('全ての予約をGoogleカレンダーに同期しますか？\n（既存の予約は重複して作成されます）')) {
            return;
        }

        try {
            // Google Calendar API連携を有効化
            await this.ensureGoogleAPIAccess();

            let syncCount = 0;
            let errorCount = 0;

            for (const date in this.bookings) {
                for (const slot in this.bookings[date]) {
                    const booking = this.bookings[date][slot];

                    // 既にGoogleカレンダーに登録済みの場合はスキップ
                    if (booking.googleEventId) {
                        continue;
                    }

                    try {
                        const appointment = {
                            name: booking.name,
                            company: booking.company,
                            phone: booking.phone,
                            date: date,
                            slot: parseInt(slot)
                        };

                        console.log(`同期開始: ${date}-${slot}`, appointment);
                        const eventId = await this.addToGoogleCalendar(appointment);

                        if (eventId) {
                            // 予約データにGoogleイベントIDを保存
                            this.bookings[date][slot].googleEventId = eventId;
                            console.log(`同期成功: ${date}-${slot}, EventID: ${eventId}`);

                            // Firestoreにも更新
                            if (this.useFirestore && booking.firestoreId) {
                                try {
                                    await this.updateGoogleEventIdInFirestore(booking.firestoreId, eventId);
                                } catch (firestoreError) {
                                    console.error('Firestore更新エラー:', firestoreError);
                                }
                            }

                            syncCount++;
                        } else {
                            console.error(`同期失敗: ${date}-${slot} - EventIDが取得できませんでした`);
                            errorCount++;
                        }
                    } catch (error) {
                        console.error(`同期エラー (${date}-${slot}):`, error);
                        errorCount++;
                    }
                }
            }

            // ローカルストレージも更新
            localStorage.setItem('appointments', JSON.stringify(this.bookings));

            alert(`同期完了: ${syncCount}件成功, ${errorCount}件失敗`);

            // 予約一覧を更新
            if (document.getElementById('reservationsList').style.display !== 'none') {
                this.showReservationsList();
            }

        } catch (error) {
            console.error('Google Calendar同期エラー:', error);
            alert('Google Calendar認証に失敗しました。');
        }
    }

    // 管理者パスワード認証モーダルの表示
    showAdminPasswordModal() {
        document.getElementById('adminPasswordModal').style.display = 'block';
        document.getElementById('adminPassword').value = '';
        document.getElementById('passwordError').style.display = 'none';
        document.getElementById('adminPassword').focus();
    }

    // 管理者パスワード認証モーダルを閉じる
    closeAdminPasswordModal() {
        document.getElementById('adminPasswordModal').style.display = 'none';
        document.getElementById('adminPassword').value = '';
        document.getElementById('passwordError').style.display = 'none';
    }

    // パスワード認証の検証
    verifyAdminPassword() {
        const inputPassword = document.getElementById('adminPassword').value;
        const errorDiv = document.getElementById('passwordError');

        if (inputPassword === this.adminPassword) {
            // 認証成功
            this.isAdminMode = true;
            this.updateAdminUI();
            this.closeAdminPasswordModal();
            alert('管理者モードが有効になりました。');
        } else {
            // 認証失敗
            errorDiv.style.display = 'block';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminPassword').focus();
        }
    }
}

// グローバル変数としてインスタンスを作成
let appointmentSystem;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    appointmentSystem = new AppointmentSystem();
});