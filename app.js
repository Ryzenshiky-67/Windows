// Fungsi untuk membuka jendela aplikasi
function openApp(appId) {
    const container = document.getElementById('windowContainer');
    const win = document.createElement('div');
    win.className = 'win-window';
    win.innerHTML = `
        <div class="win-titlebar">
            <span>${appId.toUpperCase()}</span>
            <button onclick="this.parentElement.parentElement.remove()">X</button>
        </div>
        <div style="padding: 20px;">Konten ${appId} berjalan...</div>
    `;
    container.appendChild(win);
}

// Update Jam
function updateClock() {
    const now = new Date();
    document.getElementById('trayTimeStr').textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}
setInterval(updateClock, 1000);

// Buka Desktop saat klik lockscreen
document.getElementById('lockscreen').onclick = () => {
    document.getElementById('lockscreen').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
};