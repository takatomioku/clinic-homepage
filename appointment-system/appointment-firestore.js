class AppointmentSystem {
    constructor() {
        this.bookings = {};
        this.maxBookingsPerDay = 2;
        this.maxBookingsIncludingReserve = 3; // 2名 + 1名予備
        this.availableDays = [1, 2, 4, 5]; // 月(1), 火(2), 木(4), 金(5)
        this.isAdminMode = false;
        this.pendingReservation = null; // 予備枠予約の一時保存
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
                    email: data.email,
                    createdAt: data.createdAt,
                    isReserve: data.isReserve,
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
                email: appointment.email,
                date: appointment.date,
                slot: appointment.slot,
                createdAt: appointment.createdAt,
                isReserve: appointment.slot > this.maxBookingsPerDay
            };

            const docRef = await addDoc(collection(window.firebaseDB, 'appointments'), docData);
            console.log('Firestoreに保存しました:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Firestore保存エラー:', error);
            throw error;
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
        document.getElementById('migrateData').addEventListener('click', () => this.showMigrateModal());
        document.getElementById('createDummyBooking').addEventListener('click', () => this.createDummyBooking());
        document.getElementById('testEmailJS').addEventListener('click', () => this.testEmailJS());
        document.getElementById('todayReservations').addEventListener('click', () => this.showTodayReservations());
        document.getElementById('bulkDeleteToggle').addEventListener('click', () => this.toggleBulkDeleteSection());
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => this.showBulkDeleteModal());
        document.getElementById('closeBulkDeleteModal').addEventListener('click', () => this.closeBulkDeleteModal());
        document.getElementById('confirmBulkDelete').addEventListener('click', () => this.executeBulkDelete());
        document.getElementById('cancelBulkDelete').addEventListener('click', () => this.closeBulkDeleteModal());

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
                this.closeBulkDeleteModal();
            }
        });
    }

    generateCalendar() {
        const today = new Date();
        const calendarDiv = document.getElementById('calendar');

        let calendarHTML = '<div class="calendar-container">';

        // 2か月分の期間を計算
        const endDate = new Date(today);
        endDate.setMonth(today.getMonth() + 2);

        // 月ごとにカレンダーを生成
        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        while (currentMonth < endDate) {
            calendarHTML += this.generateMonthCalendar(currentMonth, today);
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        calendarHTML += '</div>';
        calendarDiv.innerHTML = calendarHTML;
    }

    generateMonthCalendar(monthDate, today) {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const monthName = `${year}年${month + 1}月`;

        let monthHTML = `
            <div class="month-calendar">
                <div class="month-header">
                    <h3>${monthName}</h3>
                </div>
                <div class="weekdays-header">
                    <div class="weekday">日</div>
                    <div class="weekday">月</div>
                    <div class="weekday">火</div>
                    <div class="weekday">水</div>
                    <div class="weekday">木</div>
                    <div class="weekday">金</div>
                    <div class="weekday">土</div>
                </div>
                <div class="calendar-grid">
        `;

        // 月の最初の日を取得
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 最初の週の開始日（日曜日）を計算
        const startDate = new Date(firstDay);
        startDate.setDate(firstDay.getDate() - firstDay.getDay());

        // 6週間分のセルを生成（42セル）
        const currentDate = new Date(startDate);
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const isCurrentMonth = currentDate.getMonth() === month;
                const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                const isPastDate = currentDateOnly < todayDateOnly;
                const dayOfWeek = currentDate.getDay();
                const dateStr = this.formatDate(currentDate);
                const isAvailable = this.availableDays.includes(dayOfWeek) && !isPastDate && isCurrentMonth;

                const bookingCount = this.getBookingCount(dateStr);
                const reserveCount = this.getReserveBookingCount(dateStr);

                // ダミー予約の判定
                const isDummyBlocked = this.isDummyBookedDate(dateStr);

                let cellClass = 'calendar-cell';
                if (!isCurrentMonth) {
                    cellClass += ' other-month';
                } else if (isPastDate) {
                    cellClass += ' past-date';
                } else if (isDummyBlocked) {
                    cellClass += ' dummy-blocked';
                } else if (isAvailable) {
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

                const slotInfo = isAvailable ?
                    `<div class="slots">${bookingCount}/${this.maxBookingsPerDay}${reserveCount > 0 ? ' (+' + reserveCount + '予備)' : ''}</div>` : '';

                monthHTML += `
                    <div class="${cellClass}" data-date="${dateStr}">
                        <div class="date">${currentDate.getDate()}</div>
                        <div class="day">${isCurrentMonth ? this.getDayName(dayOfWeek) : ''}</div>
                        ${slotInfo}
                    </div>
                `;

                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        monthHTML += '</div></div>';
        return monthHTML;
    }

    updateAvailableDates() {
        const dateSelect = document.getElementById('date');
        const today = new Date();

        // 既存のオプションをクリア（最初のオプションは残す）
        while (dateSelect.children.length > 1) {
            dateSelect.removeChild(dateSelect.lastChild);
        }

        // 今後2か月分の利用可能日を追加
        for (let i = 0; i < 60; i++) {
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
            email: formData.get('email'),
            date: formData.get('date'),
            slot: parseInt(formData.get('slot')),
            createdAt: new Date().toISOString()
        };

        // バリデーション
        if (!appointment.name || !appointment.company || !appointment.phone || !appointment.email || !appointment.date || !appointment.slot) {
            alert('すべての項目を入力してください。');
            return;
        }

        // 電話番号の形式チェック
        const phonePattern = /^[0-9-+()\\s]+$/;
        if (!phonePattern.test(appointment.phone)) {
            alert('正しい電話番号を入力してください。');
            return;
        }

        // メールアドレスの形式チェック
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(appointment.email)) {
            alert('正しいメールアドレスを入力してください。');
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

        // 確認メール送信
        await this.sendConfirmationEmail(appointment);

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
            email: appointment.email,
            createdAt: appointment.createdAt,
            isReserve: appointment.slot > this.maxBookingsPerDay
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




    // 確認メール送信
    async sendConfirmationEmail(appointment) {
        // EmailJSが初期化されているか確認
        if (typeof emailjs === 'undefined') {
            console.error('EmailJSが初期化されていません');
            alert('予約は完了しましたが、確認メールの送信に失敗しました。予約内容は保存されています。');
            return;
        }

        const slotNames = {
            '1': '第1枠',
            '2': '第2枠',
            '3': '予備枠'
        };

        const templateParams = {
            to_email: appointment.email,
            to_name: appointment.name,
            company: appointment.company,
            phone: appointment.phone,
            date: appointment.date,
            slot_name: slotNames[appointment.slot] || `第${appointment.slot}枠`,
            clinic_name: 'おく内科消化器クリニック',
            clinic_phone: '0155-66-6170'
        };

        try {
            console.log('メール送信開始:', templateParams);
            const response = await emailjs.send(
                'service_l3gxbkp',
                'template_r2rilz7',
                templateParams
            );
            console.log('確認メール送信成功:', response);
        } catch (error) {
            console.error('確認メール送信失敗:', error);
            console.error('エラー詳細:', error.text || error.message);
            alert('予約は完了しましたが、確認メールの送信に失敗しました。予約内容は保存されています。');
        }
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
                <p><strong>メールアドレス:</strong> ${appointment.email}</p>
                <p><strong>予約日:</strong> ${appointment.date}</p>
                <p><strong>予約枠:</strong> ${appointment.slot}${appointment.slot > this.maxBookingsPerDay ? ' (予備枠)' : ''}</p>
                <p><small>予約が${storageType}に保存され、確認メールを送信しました。</small></p>
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
        const migrateBtn = document.getElementById('migrateData');
        const testEmailBtn = document.getElementById('testEmailJS');
        const adminToggle = document.getElementById('adminToggle');
        const dummySection = document.getElementById('dummyBookingSection');
        const bulkDeleteToggle = document.getElementById('bulkDeleteToggle');
        const bulkDeleteSection = document.getElementById('bulkDeleteSection');
        const todayBtn = document.getElementById('todayReservations');

        if (this.isAdminMode) {
            showBtn.style.display = 'inline-block';
            todayBtn.style.display = 'inline-block';
            migrateBtn.style.display = this.useFirestore ? 'none' : 'inline-block';
            testEmailBtn.style.display = 'inline-block';
            bulkDeleteToggle.style.display = 'inline-block';
            dummySection.style.display = 'block';
            adminToggle.textContent = '管理者モード終了';
            adminToggle.style.backgroundColor = '#e74c3c';
            this.populateDummyDateOptions();
        } else {
            showBtn.style.display = 'none';
            hideBtn.style.display = 'none';
            todayBtn.style.display = 'none';
            migrateBtn.style.display = 'none';
            testEmailBtn.style.display = 'none';
            bulkDeleteToggle.style.display = 'none';
            bulkDeleteSection.style.display = 'none';
            dummySection.style.display = 'none';
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
                html += `<div class="date-group" data-date="${date}">
                    <h4>${date} (${this.getDayName(new Date(date).getDay())}) - ${this.useFirestore ? 'クラウド保存' : 'ローカル保存'}</h4>
                `;

                // スロット順にソート
                const sortedSlots = Object.keys(dateBookings).sort((a, b) => parseInt(a) - parseInt(b));

                for (const slot of sortedSlots) {
                    const booking = dateBookings[slot];
                    const slotType = booking.isReserve ? ' (予備枠)' : '';
                    html += `
                        <div class="reservation-item ${booking.isReserve ? 'reserve-booking' : ''}">
                            <div class="reservation-details">
                                <span class="slot-info">枠${slot}${slotType}</span>
                                <span class="name">${booking.name}</span>
                                <span class="company">${booking.company}</span>
                                <span class="phone">${booking.phone}</span>
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

    // 予約キャンセルの実行
    async executeCancel() {
        const modal = document.getElementById('cancelModal');
        const date = modal.dataset.cancelDate;
        const slot = modal.dataset.cancelSlot;

        if (this.bookings[date] && this.bookings[date][slot]) {
            const booking = this.bookings[date][slot];
            console.log('キャンセル対象の予約:', booking);

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
            alert(`予約がキャンセルされました。${storageType}ローカルストレージからも削除されました。`);
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
    async verifyAdminPassword() {
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

    // ダミー予約用の日付オプションを生成
    populateDummyDateOptions() {
        const select = document.getElementById('dummyDateSelect');
        select.innerHTML = '<option value="">日付を選択してください</option>';

        const today = new Date();
        const endDate = new Date();
        endDate.setMonth(today.getMonth() + 3); // 3ヶ月先まで

        for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            // 月(1), 火(2), 木(4), 金(5)のみ
            if (this.availableDays.includes(dayOfWeek)) {
                const dateStr = d.toISOString().split('T')[0];
                const formatStr = `${d.getMonth() + 1}/${d.getDate()}(${['日','月','火','水','木','金','土'][dayOfWeek]})`;

                // 過去の日付はスキップ
                if (d > today) {
                    select.innerHTML += `<option value="${dateStr}">${formatStr}</option>`;
                }
            }
        }
    }

    // ダミー予約を作成
    async createDummyBooking() {
        const selectedDate = document.getElementById('dummyDateSelect').value;

        if (!selectedDate) {
            alert('日付を選択してください。');
            return;
        }

        // 既に予約がある場合の確認
        const existingBookings = this.bookings[selectedDate];
        if (existingBookings && (existingBookings[1] || existingBookings[2])) {
            if (!confirm('選択した日付に既に予約があります。ダミー予約で上書きしますか？')) {
                return;
            }
        }

        try {
            const dummyData = {
                name: 'ダミー',
                company: 'ダミー',
                phone: 'ダミー',
                email: 'dummy@example.com',
                date: selectedDate,
                createdAt: new Date().toISOString()
            };

            // スロット1とスロット2に同時にダミー予約を作成
            if (!this.bookings[selectedDate]) {
                this.bookings[selectedDate] = {};
            }

            // スロット1にダミー予約
            this.bookings[selectedDate][1] = {
                name: dummyData.name,
                company: dummyData.company,
                phone: dummyData.phone,
                createdAt: dummyData.createdAt,
                isReserve: false
            };

            // スロット2にダミー予約
            this.bookings[selectedDate][2] = {
                name: dummyData.name,
                company: dummyData.company,
                phone: dummyData.phone,
                createdAt: dummyData.createdAt,
                isReserve: false
            };

            // Firestoreまたはローカルストレージに保存
            if (this.useFirestore) {
                // スロット1保存
                const slot1Data = { ...dummyData, slot: 1 };
                const firestoreId1 = await this.saveBookingToFirestore(slot1Data);
                this.bookings[selectedDate][1].firestoreId = firestoreId1;

                // スロット2保存
                const slot2Data = { ...dummyData, slot: 2 };
                const firestoreId2 = await this.saveBookingToFirestore(slot2Data);
                this.bookings[selectedDate][2].firestoreId = firestoreId2;
            } else {
                localStorage.setItem('appointments', JSON.stringify(this.bookings));
            }

            // カレンダーを更新
            this.generateCalendar();
            this.updateAvailableDates();

            // 管理者モードの場合は予約一覧も更新
            if (this.isAdminMode && document.getElementById('reservationsList').style.display !== 'none') {
                this.showReservationsList();
            }

            alert(`${selectedDate}にダミー予約を作成しました。（スロット1・2両方）`);

            // 日付選択をリセット
            document.getElementById('dummyDateSelect').value = '';

        } catch (error) {
            console.error('ダミー予約作成エラー:', error);
            alert('ダミー予約の作成に失敗しました。');
        }
    }

    // 指定した日付がダミー予約でブロックされているかチェック
    isDummyBookedDate(dateStr) {
        const bookings = this.bookings[dateStr];
        if (!bookings) return false;

        // スロット1と2の両方がダミー予約の場合のみtrue
        const slot1Dummy = bookings[1] && bookings[1].name === 'ダミー';
        const slot2Dummy = bookings[2] && bookings[2].name === 'ダミー';

        return slot1Dummy && slot2Dummy;
    }

    // EmailJS接続テスト
    async testEmailJS() {
        // EmailJSが初期化されているか確認
        if (typeof emailjs === 'undefined') {
            alert('❌ EmailJS未初期化\n\nEmailJS SDKが読み込まれていません。ページをリロードしてください。');
            return;
        }

        const slotNames = {
            '1': '第1枠',
            '2': '第2枠',
            '3': '予備枠'
        };

        const templateParams = {
            to_email: 'takatomioku1152@gmail.com',
            to_name: 'EmailJSテスト',
            company: 'システムテスト',
            phone: '000-0000-0000',
            date: new Date().toISOString().split('T')[0],
            slot_name: 'テスト送信',
            clinic_name: 'おく内科消化器クリニック',
            clinic_phone: '0155-66-6170'
        };

        try {
            console.log('EmailJSテスト開始:', templateParams);

            // テストメール送信
            const response = await emailjs.send(
                'service_l3gxbkp',
                'template_r2rilz7',
                templateParams
            );

            console.log('EmailJSテスト成功:', response);

            // 成功メッセージ
            alert('✅ EmailJS接続テスト成功\n\nテストメールを送信しました。\n受信トレイを確認してください。\n\n送信先: takatomioku1152@gmail.com');

        } catch (error) {
            console.error('EmailJSテスト失敗:', error);
            console.error('エラー詳細:', error.text || error.message);

            // エラーメッセージを解析
            let errorMsg = 'EmailJS接続エラーが発生しました。';

            if (error.text) {
                if (error.text.includes('Invalid grant')) {
                    errorMsg = '❌ Gmail接続エラー\n\nGmailアカウントの再認証が必要です。\n\n対応方法:\n1. EmailJSダッシュボードにアクセス\n2. Email Services > Gmail を開く\n3. 「Disconnect」→「Connect Gmail」で再認証';
                } else if (error.text.includes('Template')) {
                    errorMsg = '❌ テンプレートエラー\n\nEmailJSテンプレート設定を確認してください。';
                } else {
                    errorMsg = `❌ EmailJSエラー\n\n${error.text}`;
                }
            }

            alert(errorMsg);
        }
    }

    // 本日の予約にスクロール
    showTodayReservations() {
        const todayStr = this.formatDate(new Date());

        // 予約一覧が非表示なら先に表示する
        if (document.getElementById('reservationsList').style.display === 'none') {
            this.showReservationsList();
        }

        // 既存の「本日予約なし」メッセージを除去
        const existing = document.getElementById('todayNoReservationMsg');
        if (existing) existing.remove();

        // 本日の date-group を探す
        const todayGroup = document.querySelector(`.date-group[data-date="${todayStr}"]`);

        if (todayGroup) {
            todayGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
            todayGroup.classList.remove('today-highlight');
            // 再フローを挟んでアニメーションをリセット
            void todayGroup.offsetWidth;
            todayGroup.classList.add('today-highlight');
        } else {
            // 予約なしメッセージを一覧の先頭に表示
            const content = document.getElementById('reservationsContent');
            const msg = document.createElement('div');
            msg.id = 'todayNoReservationMsg';
            msg.className = 'today-no-reservation';
            msg.textContent = `本日（${todayStr}）の予約はありません。`;
            content.insertBefore(msg, content.firstChild);
            msg.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // 4秒後に自動削除
            setTimeout(() => {
                const el = document.getElementById('todayNoReservationMsg');
                if (el) el.remove();
            }, 4000);
        }
    }

    // 期間指定削除セクションのトグル
    toggleBulkDeleteSection() {
        const section = document.getElementById('bulkDeleteSection');
        const isVisible = section.style.display !== 'none';
        section.style.display = isVisible ? 'none' : 'block';
    }

    // 期間内の予約を取得
    getBookingsInRange(startDate, endDate) {
        const targets = [];
        for (const date of Object.keys(this.bookings)) {
            if (date >= startDate && date <= endDate) {
                for (const slot of Object.keys(this.bookings[date])) {
                    const booking = this.bookings[date][slot];
                    targets.push({
                        date,
                        slot,
                        name: booking.name,
                        company: booking.company,
                        firestoreId: booking.firestoreId,
                        isReserve: booking.isReserve
                    });
                }
            }
        }
        // 日付→スロット順にソート
        targets.sort((a, b) => a.date.localeCompare(b.date) || parseInt(a.slot) - parseInt(b.slot));
        return targets;
    }

    // 期間指定削除の確認モーダルを表示
    showBulkDeleteModal() {
        const startDate = document.getElementById('deleteStartDate').value;
        const endDate = document.getElementById('deleteEndDate').value;

        if (!startDate || !endDate) {
            alert('開始日と終了日を両方入力してください。');
            return;
        }
        if (startDate > endDate) {
            alert('開始日は終了日より前の日付を設定してください。');
            return;
        }

        const targets = this.getBookingsInRange(startDate, endDate);

        if (targets.length === 0) {
            alert('指定した期間内に削除対象の予約がありません。');
            return;
        }

        const slotLabel = (slot, isReserve) => isReserve ? `枠${slot}（予備）` : `枠${slot}`;

        let rowsHTML = targets.map(t => `
            <div class="bulk-delete-row">
                <span class="bulk-date">${t.date}</span>
                <span class="bulk-slot">${slotLabel(t.slot, t.isReserve)}</span>
                <span class="bulk-name">${t.name}</span>
                <span class="bulk-company">${t.company}</span>
            </div>
        `).join('');

        document.getElementById('bulkDeletePreview').innerHTML = `
            <div class="bulk-delete-summary">
                <p><strong>削除期間:</strong> ${startDate} 〜 ${endDate}</p>
                <p><strong>削除件数:</strong> <span style="color:#e74c3c; font-size:1.1em;">${targets.length}件</span></p>
            </div>
            <div class="bulk-delete-list">
                ${rowsHTML}
            </div>
            <p style="margin-top:10px; font-size:12px; color:#888;">※この操作は取り消せません。</p>
        `;

        document.getElementById('bulkDeleteModal').style.display = 'block';
    }

    // 期間指定削除モーダルを閉じる
    closeBulkDeleteModal() {
        document.getElementById('bulkDeleteModal').style.display = 'none';
    }

    // 期間指定削除の実行
    async executeBulkDelete() {
        const startDate = document.getElementById('deleteStartDate').value;
        const endDate = document.getElementById('deleteEndDate').value;
        const targets = this.getBookingsInRange(startDate, endDate);

        let successCount = 0;
        let errorCount = 0;

        for (const target of targets) {
            try {
                if (this.useFirestore && target.firestoreId) {
                    await this.deleteBookingFromFirestore(target.firestoreId);
                }

                if (this.bookings[target.date]) {
                    delete this.bookings[target.date][target.slot];
                    if (Object.keys(this.bookings[target.date]).length === 0) {
                        delete this.bookings[target.date];
                    }
                }

                successCount++;
            } catch (error) {
                console.error(`削除エラー (${target.date}-${target.slot}):`, error);
                errorCount++;
            }
        }

        // ローカルストレージを更新
        localStorage.setItem('appointments', JSON.stringify(this.bookings));

        // 画面を更新
        this.generateCalendar();
        this.updateAvailableDates();
        if (this.isAdminMode && document.getElementById('reservationsList').style.display !== 'none') {
            this.showReservationsList();
        }

        this.closeBulkDeleteModal();

        // 入力欄をリセット
        document.getElementById('deleteStartDate').value = '';
        document.getElementById('deleteEndDate').value = '';

        let msg = `${successCount}件の予約を削除しました。`;
        if (errorCount > 0) {
            msg += `\n${errorCount}件の削除に失敗しました。`;
        }
        alert(msg);
    }
}

// グローバル変数としてインスタンスを作成
let appointmentSystem;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    appointmentSystem = new AppointmentSystem();
});