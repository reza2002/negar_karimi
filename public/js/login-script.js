document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const studentCodeInput = document.getElementById('studentCode');
    const messageDiv = document.getElementById('message');
    const studentCoursesSection = document.getElementById('studentCoursesSection'); // بخش کامل نمایش دروس
    const coursesGrid = document.getElementById('coursesGrid'); // گرید برای نمایش کارت های دروس

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // جلوی رفرش شدن صفحه رو می گیریم

        const studentCode = studentCodeInput.value.trim();
        if (!studentCode) {
            showMessage('لطفاً کد دانشجویی را وارد کنید.', 'error');
            return;
        }

        try {
            // کد دانشجویی رو می فرستیم به بک‌اند برای چک کردن
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ studentCode })
            });

            const data = await response.json();

            if (data.success) {
                // اگه لاگین موفق بود
                showMessage(`خوش آمدید، ${data.student.FirstName} ${data.student.LastName}!`, 'success');
                // حالا میریم سراغ دریافت درس‌های دانشجو
                fetchStudentCourses(data.student.StudentID);
            } else {
                // اگه کد دانشجویی اشتباه بود
                showMessage(data.message, 'error');
                studentCoursesSection.style.display = 'none'; // بخش دروس رو مخفی می کنیم
                coursesGrid.innerHTML = ''; // لیست قبلی دروس رو پاک می کنیم
            }

        } catch (error) {
            console.error('Error during login:', error);
            showMessage('یه مشکلی تو ارتباط با سرور پیش اومد.', 'error');
            studentCoursesSection.style.display = 'none';
            coursesGrid.innerHTML = '';
        }
    });

    async function fetchStudentCourses(studentId) {
        try {
            // درس‌های دانشجو رو از بک‌اند می گیریم
            const response = await fetch(`/api/courses/${studentId}`);
            const data = await response.json();

            if (data.success && data.courses.length > 0) {
                coursesGrid.innerHTML = ''; // اول گرید رو پاک می کنیم
                data.courses.forEach(course => {
                    const courseCard = document.createElement('div');
                    courseCard.classList.add('course-item-card'); // یک کارت برای هر درس

                    // محتوای کارت درس
                    courseCard.innerHTML = `
                        <h4>درس: ${course.CourseName}</h4>
                        <p>استاد: ${course.Instructor || 'نامشخص'}</p>
                        <p>زمان: ${course.ClassTime || 'نامشخص'}</p>
                        <a href="${course.ClassLink || '/live-class.html'}" target="_blank" class="class-link-btn">
                            ورود به کلاس
                        </a>
                    `;
                    coursesGrid.appendChild(courseCard);
                });
                studentCoursesSection.style.display = 'block'; // بخش دروس رو نشون می دیم
            } else {
                showMessage('درسی برای شما ثبت نشده است.', 'info');
                studentCoursesSection.style.display = 'none';
                coursesGrid.innerHTML = '';
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
            showMessage('یه مشکلی تو دریافت لیست درس‌ها پیش اومد.', 'error');
            studentCoursesSection.style.display = 'none';
            coursesGrid.innerHTML = '';
        }
    }

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        // کلاس های مربوط به استایل پیام رو اضافه می کنیم
        messageDiv.className = `message ${type}`;
    }
});