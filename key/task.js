// Diqqat: Bu kod ishlashi uchun JS faylingizning boshida Supabase ulanishi 
// (supabase.createClient) to'g'ri sozlangan bo'lishi kerak.

(() => {
    const popModal = document.getElementById('pop');
    const upsubmitDiv = popModal.querySelector('.upsubmit');
    const watchBtn = popModal.querySelector('.pop-main .btns .btn');
    const btnClose = popModal.querySelector('.btn-close');
    const shadow = popModal.querySelector('.shadow');
    const inputElement = popModal.querySelector('.verification-input');
    const submitBtn = popModal.querySelector('.btn-submit');

    function closeModal() {
        popModal.classList.remove('show');
        upsubmitDiv.innerHTML = '';
        inputElement.value = '';
        submitBtn.classList.add('dis');
    }

    if (btnClose) btnClose.onclick = (e) => { e.stopPropagation(); closeModal(); };
    if (shadow) shadow.onclick = (e) => { e.stopPropagation(); closeModal(); };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // Vazifani bosganda modalni ochish
    document.addEventListener('click', function (e) {
        if (popModal.contains(e.target)) return;
        const keyDiv = e.target.closest('[id^="key"]');
        if (!keyDiv || keyDiv.id === 'keycontent') return;
        const shaffofContent = keyDiv.querySelector('.shaffof');
        if (!shaffofContent) return;

        // Qaysi vazifa bosilganini xotiraga saqlaymiz (masalan: "key1")
        submitBtn.setAttribute('data-task-id', keyDiv.id);

        const cloned = shaffofContent.cloneNode(true);
        upsubmitDiv.innerHTML = '';
        upsubmitDiv.appendChild(cloned);

        const videoLink = cloned.querySelector('a');
        if (videoLink?.href) watchBtn.dataset.videoUrl = videoLink.href;

        popModal.classList.add('show');
    });

    inputElement.addEventListener('input', function () {
        if (this.value.trim().length > 0) {
            submitBtn.classList.remove('dis');
        } else {
            submitBtn.classList.add('dis');
        }
    });

    // ==========================================
    // BACKEND API GA SO'ROV YUBORISH
    // ==========================================
    submitBtn.addEventListener('click', async function () {
        if (this.classList.contains('dis')) return;

        const userCode = inputElement.value.trim().toUpperCase();
        const taskId = this.getAttribute('data-task-id');

        // Telegram ob'ektidan foydalanuvchi ID sini olish
        // (Sizning Mini App'ingizda bu qanday olinayotgan bo'lsa shunday ishlating)
        const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

        if (!tgId) {
            alert("Telegram identifikatori topilmadi. Ilovani Telegram ichida oching.");
            return;
        }

        // Tugmani "Loading" holatiga o'tkazish
        const originalText = this.innerText;
        this.innerText = 'Tekshirilmoqda...';
        this.classList.add('dis');

        try {
            // O'zimizning API ga jo'natamiz
            const response = await fetch('/api/key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_id: tgId,
                    task_id: taskId,
                    user_code: userCode
                })
            });

            const data = await response.json();

            if (data.success) {
                // KOD TO'G'RI! API tangalarni qo'shdi.
                alert(data.message);

                // (Ixtiyoriy) Ekranda foydalanuvchi balansini ko'rsatadigan joyingiz 
                // bo'lsa, data.new_balance orqali uni yangilashingiz mumkin.

                closeModal();
            } else {
                // Noto'g'ri kod yoki boshqa xato (API xabari chiqadi)
                alert(data.message);
                inputElement.value = '';
            }
        } catch (error) {
            console.error("So'rovda xato:", error);
            alert("Internet bilan muammo yuz berdi.");
        } finally {
            // Tugmani holatini asliga qaytarish
            this.innerText = originalText;
            if (inputElement.value.trim().length > 0) {
                this.classList.remove('dis');
            }
        }
    });


    // Videoni ochish
    if (watchBtn) watchBtn.onclick = function () {
        const url = this.dataset.videoUrl;
        if (url) window.open(url, '_blank');
    };

    upsubmitDiv.addEventListener('click', function (e) {
        const shaffof = e.target.closest('.shaffof');
        if (shaffof) {
            const link = shaffof.querySelector('a');
            if (link?.href) window.open(link.href, '_blank');
        }
    });
})();
