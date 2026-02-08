// wallet.html ichidagi skript

async function donateStarsFunc() {
    const input = document.getElementById('donateStarsAmount');
    let amount = parseInt(input.value);

    if (!amount || amount <= 0) {
        alert("Iltimos, to'g'ri miqdor kiriting!");
        return;
    }

    // Tugmani bosilmas qilib turamiz (yuklanayotganda)
    const btn = document.querySelector('.btn-stars');
    const originalText = btn.innerText;
    btn.innerText = "Yuklanmoqda...";
    btn.disabled = true;

    try {
        // 1. Bizning yangi API ga so'rov yuboramiz
        const response = await fetch('/api/stars', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: amount })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Xatolik yuz berdi");
        }

        // 2. Telegram WebApp oynasida Invoice ni ochamiz
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.openInvoice(data.url, (status) => {
                if (status === 'paid') {
                    alert("Katta rahmat! Yulduzlar qabul qilindi ⭐️");
                    input.value = ""; // Tozalash
                } else if (status === 'cancelled') {
                    console.log("To'lov bekor qilindi");
                } else if (status === 'failed') {
                    alert("To'lov amalga oshmadi.");
                }
            });
        } else {
            // Agar WebApp ichida bo'lmasa (masalan oddiy brauzerda)
            window.open(data.url, '_blank');
        }

    } catch (e) {
        console.error(e);
        alert("Xatolik: " + e.message);
    } finally {
        // Tugmani joyiga qaytaramiz
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
