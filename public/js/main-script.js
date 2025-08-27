document.addEventListener('DOMContentLoaded', () => {
    // --- Slider Functionality ---
    const sliderTrack = document.getElementById('mainSliderTrack');
    const sliderImages = sliderTrack.querySelectorAll('.slider-image');
    const prevBtn = document.getElementById('sliderPrevBtn');
    const nextBtn = document.getElementById('sliderNextBtn');
    const dotsContainer = document.getElementById('sliderDotsContainer');

    let currentSlideIndex = 0;
    let autoSlideInterval;

    // دات‌ها رو برای ناوبری می سازه
    function createDots() {
        dotsContainer.innerHTML = ''; // دات‌های قبلی رو پاک می کنه
        sliderImages.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (index === currentSlideIndex) {
                dot.classList.add('active');
            }
            dot.addEventListener('click', () => showSlide(index));
            dotsContainer.appendChild(dot);
        });
    }

    // یه اسلاید خاص رو نشون می ده
    function showSlide(index) {
        if (index >= sliderImages.length) {
            currentSlideIndex = 0;
        } else if (index < 0) {
            currentSlideIndex = sliderImages.length - 1;
        } else {
            currentSlideIndex = index;
        }
        sliderTrack.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
        updateDots();
    }

    // دات فعال رو به روز می کنه
    function updateDots() {
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index === currentSlideIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // دکمه های ناوبری
    prevBtn.addEventListener('click', () => showSlide(currentSlideIndex - 1));
    nextBtn.addEventListener('click', () => showSlide(currentSlideIndex + 1));

    // اسلاید خودکار
    function startAutoSlide() {
        autoSlideInterval = setInterval(() => {
            showSlide(currentSlideIndex + 1);
        }, 4000); // هر 4 ثانیه یک بار اسلاید عوض می شه
    }

    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }

    // اسلایدر رو شروع می کنه
    createDots();
    showSlide(0); // اسلاید اول رو نشون می ده
    startAutoSlide(); // اسلاید خودکار رو شروع می کنه

    // وقتی موس روی اسلایدر رفت، اسلاید خودکار وایسه
    sliderTrack.addEventListener('mouseenter', stopAutoSlide);
    sliderTrack.addEventListener('mouseleave', startAutoSlide);

    // --- Course Card Redirection ---
    // لینک دوره‌ها و اساتید (چون تو HTML لینک دورشون گذاشته شده)
    const courseCardLinks = document.querySelectorAll('.course-card-link');
    const teacherCardLinks = document.querySelectorAll('.teacher-card-link');

    courseCardLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            // event.preventDefault(); // اگر بخوای قبلش کاری بکنی، اینو فعال کن

            const redirectUrl = link.getAttribute('href');
            if (redirectUrl) {
                window.location.href = redirectUrl;
            }
        });
    });

    teacherCardLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            // event.preventDefault(); // اگر بخوای قبلش کاری بکنی، اینو فعال کن

            const redirectUrl = link.getAttribute('href');
            if (redirectUrl) {
                window.location.href = redirectUrl;
            }
        });
    });

    // --- Smooth scrolling for navigation links ---
    // اسکرول نرم برای لینک‌های ناوبری اصلی
    document.querySelectorAll('.main-nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // --- Floating Support Button Click ---
    // اگه روی دکمه پشتیبانی کلیک شد
    const supportBtn = document.querySelector('.floating-support-btn');
    if (supportBtn) {
        supportBtn.addEventListener('click', (event) => {
            event.preventDefault(); // جلوی حرکت پیش‌فرض لینک رو می گیره
            alert('با پشتیبانی آنلاین ما در تماس باشید! شماره تماس: 0912-XXX-XXXX');
            // می تونی به جای alert یه پنجره چت واقعی باز کنی
            // window.open('https://your-chat-app.com', '_blank');
        });
    }
});