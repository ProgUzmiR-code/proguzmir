// key/task.js

(() => {
    const popModal = document.getElementById('pop');
    if (!popModal) return;

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

        // Telegram identifikatori yoki LocalStorage dagi wallet
        const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || localStorage.getItem('proguzmir_wallet');

        if (!tgId) {
            alert("Telegram identifikatori topilmadi. Ilovani Telegram ichida oching.");
            return;
        }

        // Tugmani "Loading" holatiga o'tkazish
        const originalText = this.innerText;
        this.innerText = 'Tekshirilmoqda...';
        this.classList.add('dis');

        try {
            const response = await fetch('/api/key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegram_id: tgId.toString(),
                    task_id: taskId,
                    user_code: userCode
                })
            });

            const data = await response.json();
            if (data.success) {
                // 1. GLOBAL STATE NI YANGILASH
                if (typeof state !== 'undefined' && state !== null) {
                    state.diamond = Number(data.new_diamond);
                    
                    // Sizning logikangiz: Kalit olinsa, ikkalasiga ham qo'shilsin
                    state.keysTotal = Number(data.new_keys); 
                    state.keysUsed = (state.keysUsed || 0) + 1; // <--- YANGI QO'SHILDI: Bunga ham +1 qo'shamiz
                    
                    if (!state.completedTasks) state.completedTasks = {};
                    state.completedTasks[taskId] = true;
                }

                // 2. EKRANNI DARHOL YANGILASH
                if (typeof updateHeaderDiamond === 'function') updateHeaderDiamond();
                if (typeof updateHeaderKeys === 'function') updateHeaderKeys();

                // 3. SERVERGA SAQLASH
                if (typeof saveUserState === 'function') {
                    saveUserState(typeof state !== 'undefined' ? state : null, 'full');
                }

                if (typeof showToast === 'function') {
                    showToast("🎉 To'g'ri kod! +300,000 Diamond & +1 Key!");
                } else {
                    alert(data.message);
                }

                const completedTaskDiv = document.getElementById(taskId);
                if (completedTaskDiv) {
                    completedTaskDiv.style.opacity = '0.5';
                    completedTaskDiv.style.pointerEvents = 'none';
                }

                closeModal();
            } else {

                alert(data.message);
                inputElement.value = '';
            }
        } catch (error) {
            console.error("So'rovda xato:", error);
            alert("Internet bilan muammo yuz berdi.");
        } finally {
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
