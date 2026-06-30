/* ===========================
   Windows 10 IoT Enterprise LTSC
   app.js
   =========================== */

'use strict';

// ======== STATE ========
let openWindows = {};
let windowZIndex = 100;
let activeWindowId = null;
let startMenuOpen = false;
let actionCenterOpen = false;
let volumePopupOpen = false;

// Simulated IoT data
let iotData = {
  cpu: 24, ram: 52, disk: 38, temp: 41,
  net: 12, gpu: 18, uptime: 0
};

// ======== CLOCK ========
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${h}:${m}`;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  const shortDate = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;

  // Lock screen
  const lt = document.getElementById('lockTime');
  const ld = document.getElementById('lockDate');
  if (lt) lt.textContent = timeStr;
  if (ld) ld.textContent = dateStr;

  // Tray
  const tt = document.getElementById('trayTimeStr');
  const td = document.getElementById('trayDateStr');
  if (tt) tt.textContent = timeStr;
  if (td) td.textContent = shortDate;
}

setInterval(updateClock, 1000);
updateClock();

// ======== LOCK SCREEN ========
const lockscreen = document.getElementById('lockscreen');
const desktop = document.getElementById('desktop');

lockscreen.addEventListener('click', unlockDesktop);
document.addEventListener('keydown', (e) => {
  if (!lockscreen.classList.contains('hidden')) unlockDesktop();
});

function unlockDesktop() {
  lockscreen.style.animation = 'lockFadeOut 0.4s ease forwards';
  lockscreen.style.transition = 'opacity 0.4s';
  lockscreen.style.opacity = '0';
  lockscreen.style.transform = 'translateY(-20px)';
  setTimeout(() => {
    lockscreen.classList.add('hidden');
    desktop.classList.remove('hidden');
    startIoTSimulation();
    startUptimeCounter();
  }, 380);
}

// ======== START MENU ========
function toggleStart() {
  startMenuOpen = !startMenuOpen;
  const menu = document.getElementById('startMenu');
  if (startMenuOpen) {
    menu.classList.remove('hidden');
    closeActionCenter();
    closeVolumePopup();
    closePowerMenu();
    document.getElementById('startSearch').focus();
  } else {
    menu.classList.add('hidden');
  }
}

function closeStart() {
  startMenuOpen = false;
  document.getElementById('startMenu').classList.add('hidden');
}

function filterApps(val) {
  const items = document.querySelectorAll('.all-app-item');
  items.forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(val.toLowerCase()) ? '' : 'none';
  });
}

// ======== ACTION CENTER ========
function toggleActionCenter() {
  actionCenterOpen = !actionCenterOpen;
  const ac = document.getElementById('actionCenter');
  if (actionCenterOpen) {
    ac.classList.remove('hidden');
    closeStart();
    closeVolumePopup();
  } else {
    ac.classList.add('hidden');
  }
}

function closeActionCenter() {
  actionCenterOpen = false;
  document.getElementById('actionCenter').classList.add('hidden');
}

function toggleQA(el) {
  el.classList.toggle('active');
}

// ======== VOLUME ========
function toggleVolume() {
  volumePopupOpen = !volumePopupOpen;
  const vp = document.getElementById('volumePopup');
  if (volumePopupOpen) {
    vp.classList.remove('hidden');
    closeStart();
    closeActionCenter();
  } else {
    vp.classList.add('hidden');
  }
}

function closeVolumePopup() {
  volumePopupOpen = false;
  document.getElementById('volumePopup').classList.add('hidden');
}

document.getElementById('volumeSlider').addEventListener('input', function() {
  document.getElementById('volumeVal').textContent = this.value;
});

// ======== POWER MENU ========
function showPowerMenu() {
  const pm = document.getElementById('powerMenu');
  pm.classList.toggle('hidden');
}

function closePowerMenu() {
  document.getElementById('powerMenu').classList.add('hidden');
}

// ======== CONTEXT MENU ========
document.getElementById('desktop').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const cm = document.getElementById('contextMenu');
  cm.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
  cm.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
  cm.classList.remove('hidden');
});

function contextAction(action) {
  document.getElementById('contextMenu').classList.add('hidden');
  if (action === 'refresh') {
    const icons = document.getElementById('desktopIcons');
    icons.style.opacity = '0.5';
    setTimeout(() => icons.style.opacity = '1', 400);
  }
}

// ======== GLOBAL CLICK CLOSE ========
document.addEventListener('click', (e) => {
  // Context menu
  const cm = document.getElementById('contextMenu');
  if (!cm.contains(e.target)) cm.classList.add('hidden');

  // Start menu
  const sm = document.getElementById('startMenu');
  const sb = document.getElementById('startBtn');
  if (!sm.contains(e.target) && !sb.contains(e.target)) closeStart();

  // Action center
  const ac = document.getElementById('actionCenter');
  const tn = document.querySelector('.tray-notif');
  if (!ac.contains(e.target) && tn && !tn.contains(e.target)) closeActionCenter();

  // Volume popup
  const vp = document.getElementById('volumePopup');
  const vi = document.querySelector('.tray-icon[title="Volume"]');
  if (!vp.contains(e.target) && vi && !vi.contains(e.target)) closeVolumePopup();

  // Power menu
  const pm = document.getElementById('powerMenu');
  if (!pm.contains(e.target) && !e.target.closest('.power-item')) closePowerMenu();
});

// ======== WINDOW SYSTEM ========
function openApp(appId) {
  closeStart();

  // If already open, restore & focus
  if (openWindows[appId]) {
    const w = openWindows[appId];
    w.el.classList.remove('minimized');
    w.minimized = false;
    focusWindow(appId);
    updateTaskbar();
    return;
  }

  const winEl = document.createElement('div');
  winEl.className = 'win-window';
  winEl.id = 'win-' + appId;
  winEl.style.zIndex = ++windowZIndex;

  // Default size & position
  const sizes = {
    notepad:    { w: 600, h: 420 },
    terminal:   { w: 640, h: 400 },
    mycomputer: { w: 720, h: 480 },
    settings:   { w: 700, h: 500 },
    iotdash:    { w: 750, h: 520 },
    calc:       { w: 290, h: 420 },
    recycle:    { w: 560, h: 380 },
    sysinfo:    { w: 580, h: 480 },
    search:     { w: 500, h: 360 }
  };

  const sz = sizes[appId] || { w: 600, h: 420 };
  const offsetX = 60 + Object.keys(openWindows).length * 24;
  const offsetY = 40 + Object.keys(openWindows).length * 24;

  winEl.style.width  = sz.w + 'px';
  winEl.style.height = sz.h + 'px';
  winEl.style.left   = Math.min(offsetX, window.innerWidth  - sz.w - 20) + 'px';
  winEl.style.top    = Math.min(offsetY, window.innerHeight - sz.h - 60) + 'px';

  winEl.innerHTML = buildWindowHTML(appId);
  document.getElementById('windowContainer').appendChild(winEl);

  openWindows[appId] = {
    el: winEl, minimized: false, maximized: false,
    title: getAppTitle(appId), icon: getAppIcon(appId)
  };

  // Init app
  initApp(appId, winEl);

  // Drag
  makeDraggable(winEl, winEl.querySelector('.win-titlebar'));

  // Resize
  makeResizable(winEl);

  // Focus
  winEl.addEventListener('mousedown', () => focusWindow(appId));
  focusWindow(appId);
  updateTaskbar();
}

function buildWindowHTML(appId) {
  const title = getAppTitle(appId);
  const icon  = getAppIcon(appId);
  const body  = buildAppBody(appId);

  return `
    <div class="win-titlebar" ondblclick="toggleMaximize('${appId}')">
      <div class="win-titlebar-icon">${icon}</div>
      <div class="win-titlebar-title">${title}</div>
      <div class="win-controls">
        <button class="win-ctrl minimize" onclick="minimizeWindow('${appId}')" title="Minimize">
          <svg viewBox="0 0 10 1"><rect width="10" height="1"/></svg>
        </button>
        <button class="win-ctrl maximize" onclick="toggleMaximize('${appId}')" title="Maximize">
          <svg viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor"/></svg>
        </button>
        <button class="win-ctrl close" onclick="closeWindow('${appId}')" title="Close">
          <svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
      </div>
    </div>
    <div class="win-body" id="winbody-${appId}">
      ${body}
    </div>
    <div class="resize-handle" id="resize-${appId}"></div>
  `;
}

function getAppTitle(id) {
  return {
    notepad:    'Notepad',
    terminal:   'Command Prompt',
    mycomputer: 'File Explorer',
    settings:   'Settings',
    iotdash:    'IoT Dashboard — Enterprise Monitor',
    calc:       'Calculator',
    recycle:    'Recycle Bin',
    sysinfo:    'System Information',
    search:     'Search'
  }[id] || id;
}

function getAppIcon(id) {
  return {
    notepad:    '📝',
    terminal:   '⬛',
    mycomputer: '📁',
    settings:   '⚙️',
    iotdash:    '📡',
    calc:       '🔢',
    recycle:    '🗑️',
    sysinfo:    'ℹ️',
    search:     '🔍'
  }[id] || '🪟';
}

// ======== APP BODIES ========
function buildAppBody(id) {
  switch(id) {
    case 'notepad':    return buildNotepad();
    case 'terminal':   return buildTerminal();
    case 'mycomputer': return buildExplorer();
    case 'settings':   return buildSettings();
    case 'iotdash':    return buildIoT();
    case 'calc':       return buildCalc();
    case 'recycle':    return buildRecycle();
    case 'sysinfo':    return buildSysInfo();
    case 'search':     return buildSearch();
    default:           return `<div style="padding:24px;color:#555;">App not implemented.</div>`;
  }
}

function buildNotepad() {
  return `
    <div class="notepad-menu">
      <div class="notepad-menu-item">File</div>
      <div class="notepad-menu-item">Edit</div>
      <div class="notepad-menu-item">Format</div>
      <div class="notepad-menu-item">View</div>
      <div class="notepad-menu-item">Help</div>
    </div>
    <textarea class="notepad-textarea" id="notepad-ta" placeholder="Start typing..." spellcheck="false">Windows 10 IoT Enterprise LTSC
─────────────────────────────
Device: Industrial Terminal Unit
Serial: WN10-IOT-2024-LTSC
Build: 19041.1415 (21H1)
Edition: IoT Enterprise LTSC
Licensed to: ZenMobileWiFi Corp.

This device is managed by the
IoT Enterprise Management Suite.
</textarea>
    <div class="notepad-status">
      <span id="notepad-ln">Ln 1, Col 1</span>
      <span>100%</span>
      <span>Windows (CRLF)</span>
      <span>UTF-8</span>
    </div>
  `;
}

function buildTerminal() {
  return `
    <div class="terminal-body" id="terminal-body-wrap">
      <div class="terminal-output" id="terminal-output">
        <div class="terminal-line">Microsoft Windows [Version 10.0.19041.1415]</div>
        <div class="terminal-line">(c) Microsoft Corporation. All rights reserved.</div>
        <div class="terminal-line warn">Windows 10 IoT Enterprise LTSC — Industrial Device Shell</div>
        <div class="terminal-line"> </div>
      </div>
      <div class="terminal-input-row">
        <span class="terminal-prompt" id="terminal-prompt">C:\\Users\\IoTUser&gt;</span>
        <input class="terminal-input" id="terminal-input" type="text"
          autocomplete="off" autocorrect="off" spellcheck="false"
          onkeydown="terminalKey(event)" />
      </div>
    </div>
  `;
}

function buildExplorer() {
  return `
    <div class="explorer-toolbar">
      <button>← Back</button>
      <button>→ Forward</button>
      <button>↑ Up</button>
      <div class="explorer-addressbar">
        <span>📁</span>
        <span>This PC &gt; Local Disk (C:) &gt; Users &gt; IoTUser</span>
      </div>
    </div>
    <div class="explorer-content">
      <div class="explorer-sidebar">
        <div class="explorer-sidebar-item active">🖥️ This PC</div>
        <div class="explorer-sidebar-item">📁 Desktop</div>
        <div class="explorer-sidebar-item">📂 Documents</div>
        <div class="explorer-sidebar-item">⬇️ Downloads</div>
        <div class="explorer-sidebar-item">🖼️ Pictures</div>
        <div class="explorer-sidebar-item">🎵 Music</div>
        <div class="explorer-sidebar-item">💾 Local Disk (C:)</div>
        <div class="explorer-sidebar-item">💿 Local Disk (D:)</div>
        <div class="explorer-sidebar-item">🌐 Network</div>
      </div>
      <div class="explorer-files">
        <div class="file-item" ondblclick="openApp('mycomputer')"><div class="file-icon">💾</div><span>Local Disk (C:)</span></div>
        <div class="file-item" ondblclick="openApp('mycomputer')"><div class="file-icon">💿</div><span>Local Disk (D:)</span></div>
        <div class="file-item"><div class="file-icon">📁</div><span>Desktop</span></div>
        <div class="file-item"><div class="file-icon">📂</div><span>Documents</span></div>
        <div class="file-item"><div class="file-icon">⬇️</div><span>Downloads</span></div>
        <div class="file-item"><div class="file-icon">🖼️</div><span>Pictures</span></div>
        <div class="file-item"><div class="file-icon">🎵</div><span>Music</span></div>
        <div class="file-item"><div class="file-icon">🎬</div><span>Videos</span></div>
        <div class="file-item ondblclick"><div class="file-icon">📡</div><span>IoT Logs</span></div>
        <div class="file-item"><div class="file-icon">🔧</div><span>System32</span></div>
      </div>
    </div>
  `;
}

function buildSettings() {
  return `
    <div class="settings-body">
      <div class="settings-sidebar">
        <div class="settings-sidebar-item active" onclick="showSettingsPage('system', this)">
          <span class="s-icon">💻</span> System
        </div>
        <div class="settings-sidebar-item" onclick="showSettingsPage('network', this)">
          <span class="s-icon">🌐</span> Network & Internet
        </div>
        <div class="settings-sidebar-item" onclick="showSettingsPage('personalize', this)">
          <span class="s-icon">🎨</span> Personalization
        </div>
        <div class="settings-sidebar-item" onclick="showSettingsPage('apps', this)">
          <span class="s-icon">📦</span> Apps
        </div>
        <div class="settings-sidebar-item" onclick="showSettingsPage('accounts', this)">
          <span class="s-icon">👤</span> Accounts
        </div>
        <div class="settings-sidebar-item" onclick="showSettingsPage('update', this)">
          <span class="s-icon">🔄</span> Windows Update
        </div>
        <div class="settings-sidebar-item" onclick="showSettingsPage('security', this)">
          <span class="s-icon">🛡️</span> Security
        </div>
        <div class="settings-sidebar-item" onclick="showSettingsPage('iot', this)">
          <span class="s-icon">📡</span> IoT Settings
        </div>
      </div>
      <div class="settings-content" id="settings-content">
        <div class="settings-page active" id="spage-system">
          <div class="settings-title">System</div>
          <div class="settings-card">
            <div class="settings-card-title">Display</div>
            <div class="settings-row"><span class="settings-row-label">Resolution</span><span class="settings-row-value">1920 × 1080</span></div>
            <div class="settings-row"><span class="settings-row-label">Refresh rate</span><span class="settings-row-value">60 Hz</span></div>
            <div class="settings-row"><span class="settings-row-label">Color depth</span><span class="settings-row-value">32-bit</span></div>
          </div>
          <div class="settings-card">
            <div class="settings-card-title">Power & Sleep</div>
            <div class="settings-row"><span class="settings-row-label">Screen off (on battery)</span><span class="settings-row-value">Never (IoT Mode)</span></div>
            <div class="settings-row"><span class="settings-row-label">Sleep</span><span class="settings-row-value">Never</span></div>
          </div>
          <div class="settings-card">
            <div class="settings-card-title">Sound</div>
            <div class="settings-row">
              <span class="settings-row-label">System Sounds</span>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
          </div>
        </div>
        <div class="settings-page" id="spage-network">
          <div class="settings-title">Network & Internet</div>
          <div class="settings-card">
            <div class="settings-card-title">Status</div>
            <div class="settings-row"><span class="settings-row-label">Connection type</span><span class="settings-row-value" style="color:#107c10">✅ Connected</span></div>
            <div class="settings-row"><span class="settings-row-label">IP Address</span><span class="settings-row-value">192.168.1.105</span></div>
            <div class="settings-row"><span class="settings-row-label">Gateway</span><span class="settings-row-value">192.168.1.1</span></div>
            <div class="settings-row"><span class="settings-row-label">DNS</span><span class="settings-row-value">8.8.8.8 / 1.1.1.1</span></div>
          </div>
          <div class="settings-card">
            <div class="settings-card-title">Wi-Fi</div>
            <div class="settings-row">
              <span class="settings-row-label">Wi-Fi</span>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
            <div class="settings-row"><span class="settings-row-label">Network name</span><span class="settings-row-value">ZenMobileWiFi</span></div>
          </div>
        </div>
        <div class="settings-page" id="spage-personalize">
          <div class="settings-title">Personalization</div>
          <div class="settings-card">
            <div class="settings-card-title">Theme</div>
            <div class="settings-row"><span class="settings-row-label">Current theme</span><span class="settings-row-value">Windows 10 IoT Dark</span></div>
            <div class="settings-row">
              <span class="settings-row-label">Dark mode</span>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
          </div>
          <div class="settings-card">
            <div class="settings-card-title">Taskbar</div>
            <div class="settings-row">
              <span class="settings-row-label">Lock the taskbar</span>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
          </div>
        </div>
        <div class="settings-page" id="spage-apps">
          <div class="settings-title">Apps & Features</div>
          <div class="settings-card">
            <div class="settings-row"><span class="settings-row-label">IoT Dashboard</span><span class="settings-row-value">v3.0.1</span></div>
            <div class="settings-row"><span class="settings-row-label">Notepad</span><span class="settings-row-value">10.2103.6</span></div>
            <div class="settings-row"><span class="settings-row-label">Command Prompt</span><span class="settings-row-value">10.0.19041</span></div>
            <div class="settings-row"><span class="settings-row-label">Calculator</span><span class="settings-row-value">10.2103.8</span></div>
          </div>
        </div>
        <div class="settings-page" id="spage-accounts">
          <div class="settings-title">Accounts</div>
          <div class="settings-card">
            <div class="settings-card-title">Your info</div>
            <div class="settings-row"><span class="settings-row-label">Username</span><span class="settings-row-value">IoTUser</span></div>
            <div class="settings-row"><span class="settings-row-label">Account type</span><span class="settings-row-value">Administrator</span></div>
            <div class="settings-row"><span class="settings-row-label">Organization</span><span class="settings-row-value">ZenMobileWiFi Corp.</span></div>
          </div>
        </div>
        <div class="settings-page" id="spage-update">
          <div class="settings-title">Windows Update</div>
          <div class="settings-card">
            <div class="settings-card-title">Update Status</div>
            <div class="settings-row"><span class="settings-row-label">Last checked</span><span class="settings-row-value">Today at 06:00</span></div>
            <div class="settings-row"><span class="settings-row-label">Status</span><span class="settings-row-value" style="color:#107c10">✅ Up to date</span></div>
            <div class="settings-row"><span class="settings-row-label">Version</span><span class="settings-row-value">21H1 (19043.1415) LTSC</span></div>
          </div>
          <div class="settings-card">
            <div class="settings-card-title">Update Policy (IoT LTSC)</div>
            <div class="settings-row">
              <span class="settings-row-label">Defer feature updates</span>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
            <div class="settings-row">
              <span class="settings-row-label">Receive updates from: LTSC channel only</span>
              <span class="settings-row-value">Enabled</span>
            </div>
          </div>
        </div>
        <div class="settings-page" id="spage-security">
          <div class="settings-title">Security</div>
          <div class="settings-card">
            <div class="settings-card-title">Windows Defender</div>
            <div class="settings-row">
              <span class="settings-row-label">Real-time protection</span>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
            <div class="settings-row"><span class="settings-row-label">Threat status</span><span class="settings-row-value" style="color:#107c10">No threats</span></div>
            <div class="settings-row"><span class="settings-row-label">Last scan</span><span class="settings-row-value">Today 03:00</span></div>
          </div>
          <div class="settings-card">
            <div class="settings-card-title">Firewall</div>
            <div class="settings-row">
              <span class="settings-row-label">Domain network</span>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
            <div class="settings-row">
              <span class="settings-row-label">Private network</span>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
          </div>
        </div>
        <div class="settings-page" id="spage-iot">
          <div class="settings-title">IoT Settings</div>
          <div class="settings-card">
            <div class="settings-card-title">Device Management</div>
            <div class="settings-row"><span class="settings-row-label">Device ID</span><span class="settings-row-value">IOT-WN10-ZEN-001</span></div>
            <div class="settings-row"><span class="settings-row-label">Management server</span><span class="settings-row-value">mdm.zenmobilewifi.id</span></div>
            <div class="settings-row">
              <span class="settings-row-label">Remote management</span>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
          </div>
          <div class="settings-card">
            <div class="settings-card-title">Assigned Access (Kiosk)</div>
            <div class="settings-row">
              <span class="settings-row-label">Kiosk mode</span>
              <div class="toggle" onclick="this.classList.toggle('on')"></div>
            </div>
            <div class="settings-row"><span class="settings-row-label">Kiosk app</span><span class="settings-row-value">Not configured</span></div>
          </div>
          <div class="settings-card">
            <div class="settings-card-title">LTSB / LTSC Channel</div>
            <div class="settings-row"><span class="settings-row-label">Servicing channel</span><span class="settings-row-value">Long-Term Servicing Channel</span></div>
            <div class="settings-row"><span class="settings-row-label">Support end date</span><span class="settings-row-value">October 13, 2029</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showSettingsPage(page, el) {
  document.querySelectorAll('.settings-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.settings-sidebar-item').forEach(i => i.classList.remove('active'));
  document.getElementById('spage-' + page).classList.add('active');
  el.classList.add('active');
}

function buildIoT() {
  return `
    <div class="iot-body" id="iot-body">
      <div class="iot-header">
        <div class="iot-title">
          <span class="iot-status-dot"></span>
          IoT Enterprise Monitor — Live
        </div>
        <div style="font-size:12px;color:#666">Device: IOT-WN10-ZEN-001</div>
      </div>
      <div class="iot-grid" id="iot-grid">
        <div class="iot-card">
          <div class="iot-card-label">CPU Usage</div>
          <div class="iot-card-value" id="iot-cpu">24<span class="iot-card-unit">%</span></div>
          <div class="iot-card-bar"><div class="iot-card-bar-fill ok" id="iot-cpu-bar" style="width:24%"></div></div>
        </div>
        <div class="iot-card">
          <div class="iot-card-label">RAM Usage</div>
          <div class="iot-card-value" id="iot-ram">52<span class="iot-card-unit">%</span></div>
          <div class="iot-card-bar"><div class="iot-card-bar-fill" id="iot-ram-bar" style="width:52%"></div></div>
        </div>
        <div class="iot-card">
          <div class="iot-card-label">Disk I/O</div>
          <div class="iot-card-value" id="iot-disk">38<span class="iot-card-unit">%</span></div>
          <div class="iot-card-bar"><div class="iot-card-bar-fill ok" id="iot-disk-bar" style="width:38%"></div></div>
        </div>
        <div class="iot-card">
          <div class="iot-card-label">CPU Temp</div>
          <div class="iot-card-value" id="iot-temp">41<span class="iot-card-unit">°C</span></div>
          <div class="iot-card-bar"><div class="iot-card-bar-fill ok" id="iot-temp-bar" style="width:41%"></div></div>
        </div>
        <div class="iot-card">
          <div class="iot-card-label">Network</div>
          <div class="iot-card-value" id="iot-net">12<span class="iot-card-unit">MB/s</span></div>
          <div class="iot-card-bar"><div class="iot-card-bar-fill ok" id="iot-net-bar" style="width:12%"></div></div>
        </div>
        <div class="iot-card">
          <div class="iot-card-label">GPU Usage</div>
          <div class="iot-card-value" id="iot-gpu">18<span class="iot-card-unit">%</span></div>
          <div class="iot-card-bar"><div class="iot-card-bar-fill ok" id="iot-gpu-bar" style="width:18%"></div></div>
        </div>
      </div>

      <div class="iot-section-title">Process Monitor</div>
      <div class="iot-process-list" id="iot-procs">
        <div class="iot-process-row" style="color:#666;font-size:12px;padding:4px 12px;">
          <span class="iot-process-name">Process</span>
          <span class="iot-process-cpu">CPU</span>
          <span class="iot-process-mem">MEM</span>
        </div>
      </div>

      <div class="iot-section-title" style="margin-top:16px">System Uptime</div>
      <div style="font-size:24px;color:#fff;font-weight:200;margin-bottom:16px" id="iot-uptime">0d 0h 0m 0s</div>

      <div class="iot-section-title">Event Log</div>
      <div id="iot-log" style="font-size:12px;color:#666;background:#1a1d23;border-radius:6px;padding:10px;max-height:120px;overflow-y:auto;font-family:Consolas,monospace;line-height:1.8;">
        <div style="color:#4ec9b0">[INFO] IoT Enterprise LTSC — monitoring started</div>
        <div style="color:#888">[INFO] Device registered: IOT-WN10-ZEN-001</div>
        <div style="color:#888">[INFO] All sensors nominal. No alerts.</div>
      </div>
    </div>
  `;
}

function buildCalc() {
  return `
    <div class="calc-body">
      <div class="calc-display">
        <div class="calc-expr" id="calc-expr"></div>
        <div class="calc-result" id="calc-result">0</div>
      </div>
      <div class="calc-grid">
        <button class="calc-btn fn" onclick="calcAction('MC')">MC</button>
        <button class="calc-btn fn" onclick="calcAction('MR')">MR</button>
        <button class="calc-btn fn" onclick="calcAction('M+')">M+</button>
        <button class="calc-btn fn" onclick="calcAction('M-')">M-</button>

        <button class="calc-btn fn" onclick="calcAction('%')">%</button>
        <button class="calc-btn fn" onclick="calcAction('CE')">CE</button>
        <button class="calc-btn fn" onclick="calcAction('C')">C</button>
        <button class="calc-btn op" onclick="calcAction('⌫')">⌫</button>

        <button class="calc-btn fn" onclick="calcAction('1/x')">1/x</button>
        <button class="calc-btn fn" onclick="calcAction('x²')">x²</button>
        <button class="calc-btn fn" onclick="calcAction('√')">√</button>
        <button class="calc-btn op" onclick="calcAction('/')">÷</button>

        <button class="calc-btn num" onclick="calcAction('7')">7</button>
        <button class="calc-btn num" onclick="calcAction('8')">8</button>
        <button class="calc-btn num" onclick="calcAction('9')">9</button>
        <button class="calc-btn op" onclick="calcAction('*')">×</button>

        <button class="calc-btn num" onclick="calcAction('4')">4</button>
        <button class="calc-btn num" onclick="calcAction('5')">5</button>
        <button class="calc-btn num" onclick="calcAction('6')">6</button>
        <button class="calc-btn op" onclick="calcAction('-')">−</button>

        <button class="calc-btn num" onclick="calcAction('1')">1</button>
        <button class="calc-btn num" onclick="calcAction('2')">2</button>
        <button class="calc-btn num" onclick="calcAction('3')">3</button>
        <button class="calc-btn op" onclick="calcAction('+')">+</button>

        <button class="calc-btn fn" onclick="calcAction('+/-')">+/−</button>
        <button class="calc-btn num zero" onclick="calcAction('0')">0</button>
        <button class="calc-btn num" onclick="calcAction('.')">.</button>
        <button class="calc-btn eq" onclick="calcAction('=')">=</button>
      </div>
    </div>
  `;
}

function buildRecycle() {
  return `
    <div style="display:flex;flex-direction:column;flex:1;background:#fff;">
      <div class="explorer-toolbar">
        <button onclick="alert('Recycle Bin emptied!')">🗑️ Empty Recycle Bin</button>
        <button>↩ Restore all items</button>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#aaa;">
        <div style="font-size:64px;">🗑️</div>
        <div style="font-size:16px;color:#888">Recycle Bin is empty</div>
        <div style="font-size:13px;color:#aaa">Deleted items will appear here</div>
      </div>
    </div>
  `;
}

function buildSysInfo() {
  const now = new Date();
  return `
    <div class="sysinfo-body">
      <div class="sysinfo-header">
        <div class="sysinfo-logo">🪟</div>
        <div>
          <div class="sysinfo-title">Windows 10 IoT Enterprise LTSC</div>
          <div class="sysinfo-edition">Version 21H1 — Build 19043.1415</div>
        </div>
      </div>
      <div class="sysinfo-table">
        <div class="sysinfo-row"><div class="sysinfo-key">Edition</div><div class="sysinfo-val">Windows 10 IoT Enterprise LTSC 2021</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Version</div><div class="sysinfo-val">21H1</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">OS Build</div><div class="sysinfo-val">19043.1415</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Install Date</div><div class="sysinfo-val">June 1, 2024</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Last Updated</div><div class="sysinfo-val">${now.toLocaleDateString()}</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Device Name</div><div class="sysinfo-val">IOT-WN10-ZEN-001</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Processor</div><div class="sysinfo-val">Intel® Core™ i7-10700K @ 3.80GHz</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Installed RAM</div><div class="sysinfo-val">16.0 GB (15.8 GB usable)</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">System type</div><div class="sysinfo-val">64-bit OS, x64-based processor</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">GPU</div><div class="sysinfo-val">NVIDIA GeForce RTX 3060 (12 GB VRAM)</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Storage</div><div class="sysinfo-val">512 GB NVMe SSD + 2 TB HDD</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">License</div><div class="sysinfo-val">Licensed to: ZenMobileWiFi Corp. — Rayhan Firdaus Akhtar</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Product Key</div><div class="sysinfo-val">*****-*****-*****-*****-LTSC1</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Support End Date</div><div class="sysinfo-val">October 13, 2029</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Servicing Channel</div><div class="sysinfo-val">Long-Term Servicing Channel (LTSC)</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">Virtualization</div><div class="sysinfo-val">Hyper-V — Enabled</div></div>
        <div class="sysinfo-row"><div class="sysinfo-key">DirectX</div><div class="sysinfo-val">DirectX 12 Ultimate</div></div>
      </div>
    </div>
  `;
}

function buildSearch() {
  return `
    <div style="display:flex;flex-direction:column;flex:1;background:#f3f3f3;">
      <div style="padding:16px;background:#fff;border-bottom:1px solid #ddd;">
        <div style="display:flex;align-items:center;background:#f3f3f3;border:1px solid #ccc;border-radius:4px;padding:8px 12px;gap:8px;">
          <span style="font-size:16px">🔍</span>
          <input type="text" placeholder="Search apps, settings, files..."
            style="border:none;outline:none;background:transparent;font-size:14px;flex:1;font-family:var(--font);"
            oninput="handleSearch(this.value)" id="search-input" />
        </div>
      </div>
      <div style="padding:16px;flex:1;overflow-y:auto;" id="search-results">
        <div style="color:#888;font-size:13px;margin-bottom:12px;">Top results</div>
        <div class="search-result" onclick="openApp('notepad')" style="display:flex;align-items:center;gap:12px;padding:8px;border-radius:4px;cursor:pointer;margin-bottom:4px;">
          <span style="font-size:24px">📝</span>
          <div><div style="font-size:14px">Notepad</div><div style="font-size:12px;color:#888">App</div></div>
        </div>
        <div class="search-result" onclick="openApp('terminal')" style="display:flex;align-items:center;gap:12px;padding:8px;border-radius:4px;cursor:pointer;margin-bottom:4px;">
          <span style="font-size:24px">⬛</span>
          <div><div style="font-size:14px">Command Prompt</div><div style="font-size:12px;color:#888">App</div></div>
        </div>
        <div class="search-result" onclick="openApp('settings')" style="display:flex;align-items:center;gap:12px;padding:8px;border-radius:4px;cursor:pointer;margin-bottom:4px;">
          <span style="font-size:24px">⚙️</span>
          <div><div style="font-size:14px">Settings</div><div style="font-size:12px;color:#888">System settings</div></div>
        </div>
      </div>
    </div>
  `;
}

// ======== WINDOW CONTROLS ========
function closeWindow(appId) {
  const w = openWindows[appId];
  if (!w) return;
  w.el.style.animation = 'winClose 0.15s ease forwards';
  w.el.style.transform = 'scale(0.92)';
  w.el.style.opacity = '0';
  w.el.style.transition = 'transform 0.15s, opacity 0.15s';
  setTimeout(() => {
    w.el.remove();
    delete openWindows[appId];
    updateTaskbar();
  }, 140);
}

function minimizeWindow(appId) {
  const w = openWindows[appId];
  if (!w) return;
  w.minimized = true;
  w.el.classList.add('minimized');
  updateTaskbar();
}

function toggleMaximize(appId) {
  const w = openWindows[appId];
  if (!w) return;
  w.maximized = !w.maximized;
  if (w.maximized) {
    w._prevStyle = { left: w.el.style.left, top: w.el.style.top, width: w.el.style.width, height: w.el.style.height };
    w.el.classList.add('maximized');
  } else {
    w.el.classList.remove('maximized');
    if (w._prevStyle) {
      w.el.style.left = w._prevStyle.left;
      w.el.style.top = w._prevStyle.top;
      w.el.style.width = w._prevStyle.width;
      w.el.style.height = w._prevStyle.height;
    }
  }
}

function focusWindow(appId) {
  activeWindowId = appId;
  Object.entries(openWindows).forEach(([id, w]) => {
    if (id === appId) {
      w.el.style.zIndex = ++windowZIndex;
    }
  });
  updateTaskbar();
}

// ======== TASKBAR RUNNING APPS ========
function updateTaskbar() {
  const container = document.getElementById('taskbarRunning');
  container.innerHTML = '';
  Object.entries(openWindows).forEach(([id, w]) => {
    const btn = document.createElement('div');
    btn.className = 'taskbar-app' + (id === activeWindowId && !w.minimized ? ' active' : '') + (w.minimized ? ' minimized' : '');
    btn.innerHTML = `<span class="taskbar-app-icon">${w.icon}</span><span>${w.title}</span>`;
    btn.onclick = () => {
      if (w.minimized) {
        w.minimized = false;
        w.el.classList.remove('minimized');
        focusWindow(id);
      } else if (id === activeWindowId) {
        minimizeWindow(id);
      } else {
        focusWindow(id);
      }
      updateTaskbar();
    };
    container.appendChild(btn);
  });
}

// ======== DRAG ========
function makeDraggable(winEl, handle) {
  let dx = 0, dy = 0, startX = 0, startY = 0;

  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.win-controls')) return;
    const w = Object.values(openWindows).find(w => w.el === winEl);
    if (w && w.maximized) return;

    startX = e.clientX - winEl.offsetLeft;
    startY = e.clientY - winEl.offsetTop;

    const onMove = (e) => {
      winEl.style.left = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - startX)) + 'px';
      winEl.style.top  = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - startY)) + 'px';
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ======== RESIZE ========
function makeResizable(winEl) {
  const handle = winEl.querySelector('.resize-handle');
  if (!handle) return;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startW = winEl.offsetWidth;
    const startH = winEl.offsetHeight;
    const startX = e.clientX;
    const startY = e.clientY;

    const onMove = (e) => {
      winEl.style.width  = Math.max(280, startW + e.clientX - startX) + 'px';
      winEl.style.height = Math.max(200, startH + e.clientY - startY) + 'px';
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ======== INIT APP ========
function initApp(appId, winEl) {
  if (appId === 'notepad') {
    const ta = winEl.querySelector('#notepad-ta');
    const ln = winEl.querySelector('#notepad-ln');
    if (ta && ln) {
      ta.addEventListener('keyup', () => {
        const lines = ta.value.substr(0, ta.selectionStart).split('\n');
        ln.textContent = `Ln ${lines.length}, Col ${lines[lines.length-1].length + 1}`;
      });
    }
  }

  if (appId === 'terminal') {
    setTimeout(() => {
      const input = winEl.querySelector('#terminal-input');
      if (input) input.focus();
    }, 100);
  }
}

// ======== TERMINAL ========
const termHistory = [];
let termHistIdx = -1;

function terminalKey(e) {
  const input = document.getElementById('terminal-input');
  if (!input) return;

  if (e.key === 'ArrowUp') {
    termHistIdx = Math.min(termHistIdx + 1, termHistory.length - 1);
    input.value = termHistory[termHistory.length - 1 - termHistIdx] || '';
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    termHistIdx = Math.max(termHistIdx - 1, -1);
    input.value = termHistIdx === -1 ? '' : (termHistory[termHistory.length - 1 - termHistIdx] || '');
    e.preventDefault();
  } else if (e.key === 'Enter') {
    const cmd = input.value.trim();
    if (!cmd) return;
    termHistory.push(cmd);
    termHistIdx = -1;
    input.value = '';
    runCommand(cmd);
  }
}

function runCommand(cmd) {
  const out = document.getElementById('terminal-output');
  const prompt = document.getElementById('terminal-prompt');
  if (!out) return;

  const cwd = prompt ? prompt.textContent.replace('>', '') : 'C:\\Users\\IoTUser';

  // Echo the command
  appendLine(out, `${cwd}> ${cmd}`, '');

  const c = cmd.toLowerCase().trim();
  const parts = cmd.split(' ');
  const sub = parts[1] ? parts[1].toLowerCase() : '';

  if (c === 'cls' || c === 'clear') {
    out.innerHTML = '';
  } else if (c === 'help') {
    appendLine(out, 'Available commands:', 'info');
    appendLine(out, '  help        — Show this help', '');
    appendLine(out, '  ver         — Windows version', '');
    appendLine(out, '  date        — Current date', '');
    appendLine(out, '  time        — Current time', '');
    appendLine(out, '  dir         — List directory', '');
    appendLine(out, '  cls / clear — Clear screen', '');
    appendLine(out, '  echo [text] — Print text', '');
    appendLine(out, '  ipconfig    — Network info', '');
    appendLine(out, '  systeminfo  — System info', '');
    appendLine(out, '  tasklist    — Running tasks', '');
    appendLine(out, '  ping [host] — Ping a host', '');
    appendLine(out, '  winver      — Windows info', '');
    appendLine(out, '  whoami      — Current user', '');
    appendLine(out, '  shutdown    — Power options', '');
  } else if (c === 'ver' || c === 'winver') {
    appendLine(out, 'Microsoft Windows [Version 10.0.19043.1415]', 'info');
    appendLine(out, 'Edition: Windows 10 IoT Enterprise LTSC 2021', '');
  } else if (c === 'date') {
    appendLine(out, 'The current date is: ' + new Date().toLocaleDateString('en-US', {weekday:'long',year:'numeric',month:'long',day:'numeric'}), '');
  } else if (c === 'time') {
    appendLine(out, 'The current time is: ' + new Date().toLocaleTimeString(), '');
  } else if (c === 'whoami') {
    appendLine(out, 'IOT-WN10-ZEN-001\\IoTUser', '');
  } else if (c === 'dir') {
    appendLine(out, ' Volume in drive C is System', '');
    appendLine(out, ' Volume Serial Number is B3A7-1F0E', '');
    appendLine(out, '', '');
    appendLine(out, ' Directory of C:\\Users\\IoTUser', '');
    appendLine(out, '', '');
    appendLine(out, '30/06/2024  08:00    <DIR>          .', '');
    appendLine(out, '30/06/2024  08:00    <DIR>          ..', '');
    appendLine(out, '30/06/2024  07:45    <DIR>          Desktop', '');
    appendLine(out, '30/06/2024  07:45    <DIR>          Documents', '');
    appendLine(out, '30/06/2024  07:45    <DIR>          Downloads', '');
    appendLine(out, '30/06/2024  07:30         3,456     notes.txt', '');
    appendLine(out, '30/06/2024  07:30         1,024     iot-config.json', '');
    appendLine(out, '               2 File(s)      4,480 bytes', '');
    appendLine(out, '               5 Dir(s)   412,384,206,848 bytes free', '');
  } else if (c.startsWith('echo ')) {
    appendLine(out, cmd.slice(5), '');
  } else if (c === 'ipconfig' || c === 'ipconfig /all') {
    appendLine(out, 'Windows IP Configuration', 'info');
    appendLine(out, '', '');
    appendLine(out, '  Host Name . . . . . : IOT-WN10-ZEN-001', '');
    appendLine(out, '  Primary DNS Suffix  : zenmobilewifi.id', '');
    appendLine(out, '', '');
    appendLine(out, 'Ethernet adapter Local Area Connection:', '');
    appendLine(out, '  IPv4 Address  . . . : 192.168.1.105', '');
    appendLine(out, '  Subnet Mask . . . . : 255.255.255.0', '');
    appendLine(out, '  Default Gateway . . : 192.168.1.1', '');
    appendLine(out, '  DNS Servers . . . . : 8.8.8.8 / 1.1.1.1', '');
  } else if (c === 'systeminfo') {
    appendLine(out, 'OS Name:     Windows 10 IoT Enterprise LTSC 2021', '');
    appendLine(out, 'OS Version:  10.0.19043.1415 Build 19043', '');
    appendLine(out, 'OS Mfr:      Microsoft Corporation', '');
    appendLine(out, 'System Mfr:  ZenMobileWiFi Corp.', '');
    appendLine(out, 'Processor:   Intel Core i7-10700K @ 3.80GHz', '');
    appendLine(out, 'Total RAM:   16,384 MB', '');
    appendLine(out, 'Avail RAM:   ' + Math.floor((100 - iotData.ram) * 163.84) + ' MB', '');
    appendLine(out, 'Uptime:      ' + document.getElementById('iot-uptime')?.textContent || '—', '');
  } else if (c === 'tasklist') {
    appendLine(out, 'Image Name              PID   Session   Mem Usage', 'info');
    appendLine(out, '======================== ===== ========= ==========', '');
    const tasks = [
      ['System', '4', 'Services', '128 K'],
      ['svchost.exe', '848', 'Services', '18,432 K'],
      ['lsass.exe', '680', 'Services', '22,016 K'],
      ['explorer.exe', '2044', 'Console', '84,512 K'],
      ['IoTDashboard.exe', '3120', 'Console', '47,840 K'],
      ['cmd.exe', '4096', 'Console', '4,096 K'],
    ];
    tasks.forEach(([name, pid, sess, mem]) => {
      appendLine(out, `${name.padEnd(25)}${pid.padEnd(6)}${sess.padEnd(10)}${mem}`, '');
    });
  } else if (c.startsWith('ping ')) {
    const host = parts[1] || 'localhost';
    appendLine(out, `Pinging ${host} with 32 bytes of data:`, '');
    const times = [12, 11, 13, 12];
    times.forEach(t => appendLine(out, `Reply from ${host}: bytes=32 time=${t}ms TTL=64`, 'success'));
    appendLine(out, '', '');
    appendLine(out, `Ping statistics for ${host}:`, '');
    appendLine(out, `  Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`, '');
    appendLine(out, `Approximate round trip times in milli-seconds:`, '');
    appendLine(out, `  Minimum = 11ms, Maximum = 13ms, Average = 12ms`, '');
  } else if (c.startsWith('shutdown')) {
    appendLine(out, 'Shutdown command received. (Simulated — not executing)', 'warn');
  } else if (c === '') {
    // do nothing
  } else {
    appendLine(out, `'${parts[0]}' is not recognized as an internal or external command,`, 'error');
    appendLine(out, 'operable program or batch file.', 'error');
  }

  appendLine(out, '', '');
  out.scrollTop = out.scrollHeight;
}

function appendLine(container, text, cls) {
  const div = document.createElement('div');
  div.className = 'terminal-line' + (cls ? ' ' + cls : '');
  div.textContent = text;
  container.appendChild(div);
}

// ======== CALCULATOR ========
let calcExpr = '';
let calcResult = '0';
let calcNewNum = true;
let calcMem = 0;

function calcAction(btn) {
  const exprEl = document.getElementById('calc-expr');
  const resEl  = document.getElementById('calc-result');
  if (!exprEl || !resEl) return;

  const nums = '0123456789.';
  const ops  = ['+', '-', '*', '/'];

  if (nums.includes(btn)) {
    if (calcNewNum) { calcResult = btn === '.' ? '0.' : btn; calcNewNum = false; }
    else {
      if (btn === '.' && calcResult.includes('.')) return;
      if (calcResult === '0' && btn !== '.') calcResult = btn;
      else calcResult += btn;
    }
  } else if (ops.includes(btn)) {
    calcExpr = calcResult + ' ' + btn;
    calcNewNum = true;
  } else if (btn === '=') {
    try {
      const full = calcExpr + ' ' + calcResult;
      exprEl.textContent = full + ' =';
      calcResult = String(parseFloat(eval(full).toFixed(10)));
      calcExpr = '';
      calcNewNum = true;
    } catch { calcResult = 'Error'; calcNewNum = true; }
  } else if (btn === 'C' || btn === 'CE') {
    calcExpr = ''; calcResult = '0'; calcNewNum = true;
  } else if (btn === '⌫') {
    if (!calcNewNum && calcResult.length > 1) calcResult = calcResult.slice(0, -1);
    else { calcResult = '0'; calcNewNum = true; }
  } else if (btn === '+/-') {
    calcResult = String(-parseFloat(calcResult));
  } else if (btn === '%') {
    calcResult = String(parseFloat(calcResult) / 100);
  } else if (btn === '1/x') {
    calcResult = String(1 / parseFloat(calcResult));
  } else if (btn === 'x²') {
    calcResult = String(parseFloat(calcResult) ** 2);
  } else if (btn === '√') {
    calcResult = String(Math.sqrt(parseFloat(calcResult)));
  } else if (btn === 'MC') { calcMem = 0; }
  else if (btn === 'MR') { calcResult = String(calcMem); calcNewNum = false; }
  else if (btn === 'M+') { calcMem += parseFloat(calcResult); }
  else if (btn === 'M-') { calcMem -= parseFloat(calcResult); }

  if (btn !== '=') exprEl.textContent = calcExpr;
  resEl.textContent = calcResult.length > 14 ? parseFloat(calcResult).toExponential(6) : calcResult;
}

// ======== IoT SIMULATION ========
const processes = [
  { name: 'System', cpu: 1, mem: 128 },
  { name: 'svchost.exe', cpu: 3, mem: 18432 },
  { name: 'explorer.exe', cpu: 2, mem: 84512 },
  { name: 'IoTDashboard.exe', cpu: 8, mem: 47840 },
  { name: 'MsMpEng.exe', cpu: 4, mem: 22016 },
  { name: 'lsass.exe', cpu: 1, mem: 15360 },
  { name: 'RuntimeBroker', cpu: 2, mem: 12288 },
];

function startIoTSimulation() {
  setInterval(() => {
    // Fluctuate data
    iotData.cpu  = clamp(iotData.cpu  + randDelta(8), 5, 95);
    iotData.ram  = clamp(iotData.ram  + randDelta(3), 20, 90);
    iotData.disk = clamp(iotData.disk + randDelta(10), 1, 80);
    iotData.temp = clamp(iotData.temp + randDelta(3), 30, 90);
    iotData.net  = clamp(iotData.net  + randDelta(15), 0, 100);
    iotData.gpu  = clamp(iotData.gpu  + randDelta(6), 1, 80);

    updateIoTUI();
    updateTileCPU();
    addEventLog();
  }, 1800);
}

function updateIoTUI() {
  setIoTCard('cpu', iotData.cpu, '%');
  setIoTCard('ram', iotData.ram, '%');
  setIoTCard('disk', iotData.disk, '%');
  setIoTCard('temp', iotData.temp, '°C');
  setIoTCard('net', iotData.net, 'MB/s');
  setIoTCard('gpu', iotData.gpu, '%');

  // Process list
  const procs = document.getElementById('iot-procs');
  if (procs) {
    const rows = procs.querySelectorAll('.iot-process-row:not(:first-child)');
    rows.forEach(r => r.remove());
    processes.forEach(p => {
      const cpu = clamp(p.cpu + randDelta(3), 0, 30);
      const mem = Math.round(p.mem * (0.9 + Math.random() * 0.2));
      const row = document.createElement('div');
      row.className = 'iot-process-row';
      row.innerHTML = `
        <span class="iot-process-name">${p.name}</span>
        <span class="iot-process-cpu" style="color:${cpu > 15 ? '#ff9800' : '#4ec9b0'}">${cpu.toFixed(1)}%</span>
        <span class="iot-process-mem">${(mem/1024).toFixed(0)} MB</span>
      `;
      procs.appendChild(row);
    });
  }
}

function setIoTCard(key, val, unit) {
  const el = document.getElementById('iot-' + key);
  const bar = document.getElementById('iot-' + key + '-bar');
  if (el) el.innerHTML = `${Math.round(val)}<span class="iot-card-unit">${unit}</span>`;
  if (bar) {
    bar.style.width = Math.round(val) + '%';
    bar.className = 'iot-card-bar-fill ' + (val > 80 ? 'danger' : val > 60 ? 'warn' : 'ok');
  }
}

function updateTileCPU() {
  const t = document.getElementById('tileTemp');
  if (t) t.textContent = `CPU: ${Math.round(iotData.cpu)}% / ${Math.round(iotData.temp)}°C`;
}

let logCount = 0;
const logMessages = [
  ['INFO', '#4ec9b0', 'Sensor polling cycle complete'],
  ['INFO', '#4ec9b0', 'Heartbeat sent to MDM server'],
  ['WARN', '#ff9800', 'CPU usage spike detected'],
  ['INFO', '#4ec9b0', 'Network throughput within limits'],
  ['INFO', '#888',    'Scheduled task: health-check.ps1 — OK'],
  ['INFO', '#4ec9b0', 'IoT telemetry uploaded to cloud'],
];

function addEventLog() {
  const log = document.getElementById('iot-log');
  if (!log || logCount++ % 2 !== 0) return;
  const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
  const now = new Date().toLocaleTimeString();
  const div = document.createElement('div');
  div.style.color = msg[1];
  div.textContent = `[${msg[0]}] ${now} — ${msg[2]}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  if (log.children.length > 30) log.removeChild(log.firstChild);
}

function startUptimeCounter() {
  let secs = 0;
  setInterval(() => {
    secs++;
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const el = document.getElementById('iot-uptime');
    if (el) el.textContent = `${d}d ${h}h ${m}m ${s}s`;
  }, 1000);
}

// ======== HELPERS ========
function randDelta(max) { return (Math.random() - 0.5) * max; }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function handleSearch(val) {
  const results = document.getElementById('search-results');
  if (!results) return;
  const apps = [
    { id:'notepad', icon:'📝', name:'Notepad', type:'App' },
    { id:'terminal', icon:'⬛', name:'Command Prompt', type:'App' },
    { id:'settings', icon:'⚙️', name:'Settings', type:'System' },
    { id:'mycomputer', icon:'📁', name:'File Explorer', type:'App' },
    { id:'iotdash', icon:'📡', name:'IoT Dashboard', type:'App' },
    { id:'calc', icon:'🔢', name:'Calculator', type:'App' },
    { id:'sysinfo', icon:'ℹ️', name:'System Information', type:'System' },
  ];
  const filtered = val ? apps.filter(a => a.name.toLowerCase().includes(val.toLowerCase())) : apps;
  results.innerHTML = `<div style="color:#888;font-size:13px;margin-bottom:12px">Results for "${val || 'all'}"</div>`;
  filtered.forEach(app => {
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px;border-radius:4px;cursor:pointer;margin-bottom:4px;';
    d.innerHTML = `<span style="font-size:24px">${app.icon}</span><div><div style="font-size:14px">${app.name}</div><div style="font-size:12px;color:#888">${app.type}</div></div>`;
    d.onclick = () => openApp(app.id);
    d.onmouseover = () => d.style.background = '#e5e5e5';
    d.onmouseout  = () => d.style.background = '';
    results.appendChild(d);
  });
}

// ======== KEYBOARD SHORTCUTS ========
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeStart(); closeActionCenter(); closeVolumePopup(); closePowerMenu();
    document.getElementById('contextMenu').classList.add('hidden');
  }
  if (e.ctrlKey && e.key === 'Escape') toggleStart();
});
