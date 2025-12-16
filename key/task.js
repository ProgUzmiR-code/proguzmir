document.addEventListener('DOMContentLoaded', () => {
    const pop = document.getElementById('pop');
    const upsubmit = document.querySelector('.upsubmit');
    const btnClose = document.querySelector('.btn-close');
    const key1 = document.getElementById('key1');
    const key2 = document.getElementById('key2');

    // key1 bosilganda
    if (key1) {
        key1.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal(key1);
        });
    }

    // key2 bosilganda
    if (key2) {
        key2.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal(key2);
        });
    }

    // Modal ochish funksiyasi
    function openModal(keyElement) {
        if (!pop) return;

        // key element-ning shaffof content-ni upsubmit ga joylashtir
        const shaffofContent = keyElement.querySelector('.shaffof');
        if (shaffofContent && upsubmit) {
            // Clone qil asl element-ni o'zgartirishdan qutilish uchun
            upsubmit.innerHTML = '';
            const clone = shaffofContent.cloneNode(true);
            upsubmit.appendChild(clone);
        }

        // Modal ko'rsat
        pop.classList.add('show');
    }

    // Modal yopish
    if (btnClose) {
        btnClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (pop) {
                pop.classList.remove('show');
            }
        });
    }

    // Orqa fonni bosganda ham yopish (optional)
    const shadow = document.querySelector('#pop .shadow');
    if (shadow) {
        shadow.addEventListener('click', () => {
            if (pop) {
                pop.classList.remove('show');
            }
        });
    }
});