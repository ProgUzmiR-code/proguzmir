// O'zgaruvchilarni yaratamiz
let totalKeys = 0; // O'ng tomondagi (jami to'plangan)
let usedKeys = 0;  // Chap tomondagi (ishlatish uchun mavjud)

// Ekrandagi raqamlarni yangilash funksiyasi
function updateKeyDisplay() {
    document.getElementById('totalKeys').innerText = totalKeys;
    document.getElementById('usedKeys').innerText = usedKeys;
}

// Kalit qo'shish funksiyasi (masalan, vazifa bajarganda)
function addKeys(amount) {
    totalKeys += amount;
    usedKeys += amount;
    updateKeyDisplay();
}

// Kalitni ishlatish funksiyasi
function useKeys(amount) {
    if (usedKeys >= amount) {
        usedKeys -= amount;
        updateKeyDisplay();
        return true;
    } else {
        alert("Kalitlar yetarli emas!");
        return false;
    }
}

// Test uchun: Sahifa yuklanganda 10 ta kalit qo'shish
// addKeys(10);


