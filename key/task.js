function renderKey() {
    const content = document.getElementById('content');

    content.innerHTML = `
        <button id="keyBack" class="btn">Back</button>
        <img src="/image/bg-lucky-code.jpg" alt="" style="margin-top: 50px;">
        <div>
            <div>
                <img src="/image/key.png" alt="">
                <h3>Lucky Code</h3>
                <p>Find the lucky code in the video to get rewards</p>
            </div>
            <div id="key1">
                <div class="shaffof">
                    <a href="https://youtu.be/HmaQwuKUYTc?si=blIzy-4IF_kIP7dO"></a>
                    <div class="youtubepaf">
                        <i class="fa-brands fa-youtube"></i>
                    </div>
                    <div class="youtubetext">
                        <p>The Curve That Controls Your Coins?! Learn in Bonding Curve</p>
                        <div class="dflex">
                            <span>300,000</span>
                            <img class="key" src="/image/key.png" alt=""> 1
                        </div>
                    </div>
                    <span class="material-icons-outlined">arrow_forward_ios</span>
                </div>
            </div>
            <div id="key2">
                <div class="shaffof">
                    <a href="https://youtu.be/b_8fHNIHFk4?si=D05wCEy9MPqUwG_V"></a>
                    <div class="youtubepaf">
                        <i class="fa-brands fa-youtube"></i>
                    </div>
                    <div class="youtubetext">
                        <p>wwThe Curve That Controls Your Coins?! Learn in Bonding Curve</p>
                        <div class="dflex">
                            <span>300,000</span>
                            <img class="key" src="/image/key.png" alt=""> 1
                        </div>
                    </div>
                    <span class="material-icons-outlined">arrow_forward_ios</span>
                </div>
            </div>
        </div>

        <div id="pop">
            <div class="pop-dialog" show="true">
                <div class="shadow"></div>
                <div class="dialog-main center" style="width: 95%; height: auto;">
                    <div class="btn-close">
                        <span class="material-icons-outlined">close</span>
                    </div>
                    <div class="pop-main">
                        <div class="energy__title">Watch the video to get rewards</div>
                        <div class="number-box">
                            <div class="number__title">Watch the video, find the Lucky Code and paste it here</div>
                            <div class="number__items">
                                <input class="verification-input">
                            </div>
                        </div>
                        <div class="btn-submit dis">Submit</div>
                        <div class="upsubmit"></div>
                        <div class="btns">
                            <div class="btn">Watch</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Endi elementlarni to'g'ri topamiz
    const popModal = content.querySelector('#pop');
    const btnClose = content.querySelector('#pop .btn-close');
    const upsubmitDiv = content.querySelector('.upsubmit');
    const watchBtn = content.querySelector('.pop-main .btns .btn');
    const keyBack = content.querySelector('#keyBack');
    const shadow = content.querySelector('#pop .shadow');

    if (!popModal || !btnClose || !upsubmitDiv || !watchBtn) {
        console.warn('Key elements not found');
        return;
    }

    // Key elementlarni topish va click hodisasini biriktirish
    const keyDivs = content.querySelectorAll('[id^="key"]:not(#keyBack)');

    keyDivs.forEach(keyDiv => {
        keyDiv.addEventListener('click', function (e) {
            e.stopPropagation();
            const shaffofContent = this.querySelector('.shaffof');
            if (!shaffofContent) return;

            const cloned = shaffofContent.cloneNode(true);
            upsubmitDiv.innerHTML = '';
            upsubmitDiv.appendChild(cloned);

            const videoLink = cloned.querySelector('a');
            if (videoLink && videoLink.href) {
                watchBtn.dataset.videoUrl = videoLink.href;
            }

            popModal.classList.add('show');

            // Modal ichidagi klonlangan .shaffof ga click hodisasi
            const clonedShaffof = upsubmitDiv.querySelector('.shaffof');
            if (clonedShaffof) {
                clonedShaffof.addEventListener('click', function (evt) {
                    evt.stopPropagation();
                    const clonedLink = this.querySelector('a');
                    if (clonedLink && clonedLink.href) {
                        window.open(clonedLink.href, '_blank');
                    }
                });
            }
        });
    });

    // Watch tugmasi
    watchBtn.addEventListener('click', function () {
        const url = this.dataset.videoUrl;
        if (url) window.open(url, '_blank');
    });

    // Modal yopish
    btnClose.addEventListener('click', () => popModal.classList.remove('show'));
    shadow.addEventListener('click', () => popModal.classList.remove('show'));

    // Escape tugmasi
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && popModal.classList.contains('show')) {
            popModal.classList.remove('show');
        }
    });

    // Back tugmasi
    if (keyBack) {
        keyBack.addEventListener('click', () => {
            if (typeof window.openGame === 'function') {
                window.openGame();
            } else {
                window.renderGame && window.renderGame();
            }
        });
    }
}

// Sahifa yuklanganda renderKey chaqirish
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderKey);
} else {
    renderKey();
}

// Expose to window
window.renderKey = renderKey;