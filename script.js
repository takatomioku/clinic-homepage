document.addEventListener('DOMContentLoaded', function() {
    
    // モバイルメニューの制御
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
    }
    
    // スムーススクロール（メニュートリガーを除外）
    const anchorLinks = document.querySelectorAll('a[href^="#"]:not(#mobile-menu-trigger)');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                let offsetHeight = 20; // デフォルトの余白
                
                // モバイル時は固定ヘッダーとナビの高さを考慮
                if (window.innerWidth <= 768) {
                    offsetHeight = 130; // モバイルヘッダー(60px) + ナビ(60px) + 余白(10px)
                } else {
                    const headerHeight = document.querySelector('header').offsetHeight;
                    offsetHeight = headerHeight + 20;
                }
                
                const targetPosition = targetElement.offsetTop - offsetHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ドロップダウンメニューのモバイル対応
    const dropdownItems = document.querySelectorAll('.dropdown');
    
    dropdownItems.forEach(dropdown => {
        const dropdownLink = dropdown.querySelector('a');
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');
        
        if (window.innerWidth <= 768) {
            dropdownLink.addEventListener('click', function(e) {
                e.preventDefault();
                dropdown.classList.toggle('active');
            });
        }
    });
    
    // ページトップへ戻るボタン
    const scrollToTopBtn = document.createElement('button');
    scrollToTopBtn.innerHTML = '↑';
    scrollToTopBtn.classList.add('scroll-to-top');
    scrollToTopBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background-color: #2c5282;
        color: white;
        border: none;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 1000;
    `;
    
    document.body.appendChild(scrollToTopBtn);
    
    // スクロール時の処理
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // ページトップボタンの表示/非表示
        if (scrollTop > 300) {
            scrollToTopBtn.style.opacity = '1';
            scrollToTopBtn.style.visibility = 'visible';
        } else {
            scrollToTopBtn.style.opacity = '0';
            scrollToTopBtn.style.visibility = 'hidden';
        }
        
        // ヘッダーの背景色変更
        const header = document.querySelector('header');
        if (scrollTop > 50) {
            header.style.backgroundColor = 'rgba(10, 14, 26, 0.98)';
            header.style.backdropFilter = 'blur(24px)';
        } else {
            header.style.backgroundColor = 'rgba(10, 14, 26, 0.95)';
            header.style.backdropFilter = 'blur(20px)';
        }
    });
    
    // ページトップボタンのクリックイベント
    scrollToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // 高度なアニメーション効果
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('animate-in');
                }, index * 150); // スタッガード（段階的）アニメーション
            }
        });
    }, observerOptions);
    
    // アニメーション対象の要素を設定
    const animateElements = document.querySelectorAll('.service-card, .feature-item, .news-item, .doctor-info');
    animateElements.forEach(element => {
        element.classList.add('animate-element');
        observer.observe(element);
    });
    
    // パララックス効果
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.hero::before');
        
        parallaxElements.forEach(element => {
            const speed = 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translate3d(0, ${yPos}px, 0) rotate(-15deg)`;
        });
        
        ticking = false;
    }
    
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    });
    
    // マウス追従効果
    document.addEventListener('mousemove', function(e) {
        const cards = document.querySelectorAll('.service-card, .feature-item');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
            } else {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
            }
        });
    });
    
    // フォームバリデーション（お問い合わせフォームがある場合）
    const contactForm = document.querySelector('#contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = this.querySelector('input[name="name"]').value.trim();
            const email = this.querySelector('input[name="email"]').value.trim();
            const message = this.querySelector('textarea[name="message"]').value.trim();
            
            let isValid = true;
            let errorMessage = '';
            
            if (!name) {
                isValid = false;
                errorMessage += 'お名前を入力してください。\n';
            }
            
            if (!email) {
                isValid = false;
                errorMessage += 'メールアドレスを入力してください。\n';
            } else if (!isValidEmail(email)) {
                isValid = false;
                errorMessage += '正しいメールアドレス形式で入力してください。\n';
            }
            
            if (!message) {
                isValid = false;
                errorMessage += 'お問い合わせ内容を入力してください。\n';
            }
            
            if (!isValid) {
                alert(errorMessage);
                return;
            }
            
            // フォーム送信処理（実際の実装では適切なエンドポイントに送信）
            alert('お問い合わせありがとうございます。後日担当者よりご連絡いたします。');
            this.reset();
        });
    }
    
    // メールアドレスの形式チェック
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // ウィンドウリサイズ時の処理
    window.addEventListener('resize', function() {
        // モバイルメニューの状態をリセット
        if (window.innerWidth > 768) {
            mainNav.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        }
    });
    
});

// ギャラリーライトボックス機能
function openLightbox(imageSrc, title, description) {
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDescription = document.getElementById('lightboxDescription');
    
    if (lightbox && lightboxImage && lightboxTitle && lightboxDescription) {
        lightboxImage.src = imageSrc;
        lightboxImage.alt = title;
        lightboxTitle.textContent = title;
        lightboxDescription.textContent = description;
        
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // スクロールを無効化
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('galleryLightbox');
    
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // スクロールを有効化
    }
}

// ESCキーでライトボックスを閉じる
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

// ライトボックス内のクリックイベントを制御
document.addEventListener('DOMContentLoaded', function() {
    const lightboxContainer = document.querySelector('.lightbox-container');
    
    if (lightboxContainer) {
        lightboxContainer.addEventListener('click', function(e) {
            e.stopPropagation(); // バブリングを停止して背景クリックでの閉じる動作を防ぐ
        });
    }
});