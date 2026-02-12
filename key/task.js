(() => {
    // 1. Elementlarni olish
    const popModal = document.getElementById('pop');
    const upsubmitDiv = popModal.querySelector('.upsubmit');
    const watchBtn = popModal.querySelector('.pop-main .btns .btn'); // Selector to'g'ri bo'lishi kerak
    const btnClose = popModal.querySelector('.btn-close');
    const shadow = popModal.querySelector('.shadow');

    // Tekshirish (Loglar)
    console.log('Modal elementlari:', { popModal, btnClose, shadow, watchBtn });

    /* ===============================
       MODALNI YOPISH FUNKSIYASI
    ================================ */
    function closeModal() {
        popModal.classList.remove('show');
        upsubmitDiv.innerHTML = ''; // Yopilganda ichini tozalash (ixtiyoriy, lekin foydali)
    }

    // Yopish tugmalari uchun hodisalar
    if (btnClose) {
        btnClose.onclick = (e) => {
            e.stopPropagation(); // Muhim: Hodisa documentga o'tib ketmasligi uchun
            closeModal();
        };
    }

    if (shadow) {
        shadow.onclick = (e) => {
            e.stopPropagation();
            closeModal();
        };
    }

    // ESC tugmasi
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });

    /* ===============================
       ASOSIY OCHISH MANTIQI (DELEGATION)
    ================================ */
    document.addEventListener('click', function (e) {

        // 1-MUHIM TUZATISH: Agar bosilgan joy Modal (pop) ichida bo'lsa, kodni to'xtat
        // Bu "Close" tugmasi bosilganda qayta ochilishini oldini oladi
        if (popModal.contains(e.target)) return;

        // 2. Elementni aniqlash
        const keyDiv = e.target.closest('[id^="key"]');

        // Agar element yo'q bo'lsa yoki bu asosiy konteyner (keycontent) bo'lsa, to'xtat
        if (!keyDiv || keyDiv.id === 'keycontent') return;

        // 3. .shaffof ni qidirish (Selector to'g'irlandi)
        // #keycontent ichidan emas, aynan bosilgan keyDiv ichidan qidiramiz
        const shaffofContent = keyDiv.querySelector('.shaffof');

        if (!shaffofContent) return;

        // 4. Klonlash va Modalga joylash
        const cloned = shaffofContent.cloneNode(true);
        upsubmitDiv.innerHTML = '';
        upsubmitDiv.appendChild(cloned);

        // Youtube linkini tugmaga biriktirish
        const videoLink = cloned.querySelector('a');
        if (videoLink?.href) {
            watchBtn.dataset.videoUrl = videoLink.href;
        }

        // Modalni ochish
        popModal.classList.add('show');
    });

    /* ===============================
       WATCH TUGMASI VA LINKLAR
    ================================ */
    // Watch tugmasi bosilganda
    if (watchBtn) {
        watchBtn.onclick = function () {
            const url = this.dataset.videoUrl;
            if (url) window.open(url, '_blank');
        };
    }

    // Modal ichidagi linklar (shaffof) bosilganda
    // Bu yerda eski murakkab bind funksiyasini shunchaki delegation bilan almashtiramiz
    upsubmitDiv.addEventListener('click', function (e) {
        const shaffof = e.target.closest('.shaffof');
        if (shaffof) {
            const link = shaffof.querySelector('a');
            if (link?.href) window.open(link.href, '_blank');
        }
    });

})();
