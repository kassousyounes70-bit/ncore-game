/* ==============================
   NCORE GAME — devices.js
   إدارة الأجهزة التفاعلية والـ Popup
   ============================== */

'use strict';

const Devices = (() => {

  /* ==============================
     الحالة
     ============================== */
  let _activeDevice  = null;
  let _nearDevice    = null;
  let _popupCanvas   = null;
  let _popupCtx      = null;
  let _closeBtn      = null;
  let _popupEl       = null;
  let _interactBtn   = null; // ربط الزر الجديد
  let _animTimer     = 0;

  const INTERACT_RANGE = 64;

  let _promptAlpha   = 0;
  let _promptTimer   = 0;

  /* ==============================
     الإعداد
     ============================== */
  function init() {
    _popupCanvas = Utils.$('device-canvas');
    _popupCtx    = _popupCanvas.getContext('2d');
    _popupEl     = Utils.$('device-popup');
    _closeBtn    = Utils.$('device-close-btn');
    _interactBtn = Utils.$('interact-btn'); // تعريف الزر

    _closeBtn.addEventListener('click',     close);
    _closeBtn.addEventListener('touchend',  (e) => { e.preventDefault(); close(); });

    _popupEl.addEventListener('click', e => {
      if (e.target === _popupEl) close();
    });

    // ربط الحدث بزر التفاعل (إلغاء السلوك الافتراضي لمنع التداخل)
    if (_interactBtn) {
      _interactBtn.addEventListener('click', tryOpen);
      _interactBtn.addEventListener('touchend', (e) => { e.preventDefault(); tryOpen(); }, { passive: false });
    }
  }

  /* ==============================
     التحديث كل إطار
     ============================== */
  function update(delta) {
    _animTimer += delta;

    const playerRect = Player.getRect();
    const devices    = GameMap.getDevices();

    _nearDevice = Collision.getNearbyDevice(playerRect, devices, INTERACT_RANGE);

    // إدارة ظهور واختفاء زر التفاعل الديناميكي
    if (_nearDevice && !_activeDevice) {
      if (_interactBtn && _interactBtn.classList.contains('hidden')) {
        _interactBtn.classList.remove('hidden');
      }
    } else {
      if (_interactBtn && !_interactBtn.classList.contains('hidden')) {
        _interactBtn.classList.add('hidden');
      }
    }

    if (_activeDevice) {
      // محاصرة أي خطأ أثناء الرسم لمنع انهيار الـ Game Loop
      try {
        _renderPopup(_activeDevice);
      } catch (err) {
        console.error('[Devices] خطأ حرج أثناء رسم الجهاز:', err);
      }
    }
  }

  /* ==============================
     فتح جهاز
     ============================== */
  function tryOpen() {
    if (_nearDevice && !_activeDevice) {
      open(_nearDevice);
    }
  }

  function open(device) {
    _activeDevice = device;
    _animTimer    = 0;

    const sizes = {
      ps1: { w: 320, h: 260 },
      ps2: { w: 320, h: 260 },
      psp: { w: 280, h: 220 },
      pc:  { w: 380, h: 280 }
    };
    const sz = sizes[device.type] || { w: 320, h: 260 };

    _popupCanvas.width  = sz.w;
    _popupCanvas.height = sz.h;
    _popupCtx.imageSmoothingEnabled = false;

    Utils.show(_popupEl);
    if (_interactBtn) Utils.hide(_interactBtn); // إخفاء الزر أثناء العرض
    
    try {
      _renderPopup(device);
    } catch (err) {
      console.error('[Devices] خطأ أثناء الفتح:', err);
    }

    Joystick.hide();
    Joystick.reset();
  }

  function close() {
    _activeDevice = null;
    Utils.hide(_popupEl);

    Joystick.reset();
    Joystick.show();

    // عزل الإيقاف الدفاعي
    try {
      if (typeof MiniGames !== 'undefined' && MiniGames.stop) {
        MiniGames.stop();
      }
    } catch (err) {
      console.error('[Devices] خطأ أثناء إيقاف اللعبة المصغرة:', err);
    }
  }

  /* ==============================
     رسم محتوى الـ Popup
     ============================== */
  function _renderPopup(device) {
    const ctx = _popupCtx;
    const w   = _popupCanvas.width;
    const h   = _popupCanvas.height;
    ctx.clearRect(0, 0, w, h);

    switch (device.type) {
      case 'ps1': _renderPS1Screen(ctx, w, h); break;
      case 'ps2': _renderPS2Screen(ctx, w, h); break;
      case 'psp': _renderPSPScreen(ctx, w, h); break;
      case 'pc':  _renderPCScreen(ctx, w, h);  break;
    }
  }

  /* ==============================
     شاشة PS1
     ============================== */
  function _renderPS1Screen(ctx, w, h) {
    ctx.fillStyle = '#b0a898';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c8c0b0';
    Utils.drawPixelRect(ctx, 4, 4, w - 8, h - 8, 6, '#c8c0b0', '#888070', 3);

    const sw = w - 48, sh = h - 60;
    const sx = 24, sy = 20;
    ctx.fillStyle = '#000';
    ctx.fillRect(sx, sy, sw, sh);

    _drawAnimatedStatic(ctx, sx + 2, sy + 2, sw - 4, sh - 4);

    const scanY = sy + ((_animTimer * 40) % sh);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(sx, scanY, sw, 3);

    ctx.fillStyle = '#777';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(sx + sw + 10, sy + 14 + i * 12, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#d0c8b8';
    ctx.fillRect(sx, sy + sh + 8, sw, 18);
    ctx.fillStyle = '#555';
    ctx.fillRect(sx + 8, sy + sh + 12, sw - 16, 8);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(sx + sw - 14, sy + sh + 14, 6, 4);

    Utils.drawPixelText(ctx, 'PlayStation', sx + sw / 2, sy + sh + 32, {
      font: '7px "Press Start 2P"', color: '#3060c0', align: 'center'
    });

    // استدعاء دفاعي للـ MiniGames
    try {
      if (typeof MiniGames !== 'undefined' && MiniGames.drawPS) {
        MiniGames.drawPS(ctx, sx + 4, sy + 4, sw - 8, sh - 8, 'ps1', _animTimer);
      } else {
        Utils.drawPixelText(ctx, 'NO DISC', sx + sw / 2, sy + sh / 2, {
          font: '8px "Press Start 2P"', color: '#ff4040', align: 'center'
        });
      }
    } catch (err) {
      Utils.drawPixelText(ctx, 'ERROR', sx + sw / 2, sy + sh / 2, {
        font: '8px "Press Start 2P"', color: '#ff0000', align: 'center'
      });
    }
  }

  /* ==============================
     شاشة PS2
     ============================== */
  function _renderPS2Screen(ctx, w, h) {
    Utils.drawPixelRect(ctx, 0, 0, w, h, 4, '#222', '#444', 2);
    Utils.drawPixelRect(ctx, 4, 4, w - 8, h - 8, 3, '#1a1a1a', '#333', 2);

    const sw = w - 40, sh = h - 56;
    const sx = 20, sy = 16;

    ctx.fillStyle = '#000';
    ctx.fillRect(sx, sy, sw, sh);
    _drawAnimatedStatic(ctx, sx + 2, sy + 2, sw - 4, sh - 4);

    const scanY = sy + ((_animTimer * 50) % sh);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(sx, scanY, sw, 2);

    ctx.fillStyle = '#111';
    ctx.fillRect(sx, sy + sh + 6, sw, 14);
    ctx.fillStyle = '#0070d0';
    ctx.fillRect(sx + 6, sy + sh + 8, 20, 8);
    ctx.fillStyle = '#333';
    ctx.fillRect(sx + sw - 20, sy + sh + 9, 14, 6);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(sx + sw - 8, sy + sh + 10, 4, 4);

    Utils.drawPixelText(ctx, 'PlayStation 2', sx + sw / 2, sy + sh + 26, {
      font: '7px "Press Start 2P"', color: '#0070d0', align: 'center'
    });

    // استدعاء دفاعي للـ MiniGames
    try {
      if (typeof MiniGames !== 'undefined' && MiniGames.drawPS) {
        MiniGames.drawPS(ctx, sx + 4, sy + 4, sw - 8, sh - 8, 'ps2', _animTimer);
      } else {
        Utils.drawPixelText(ctx, 'NO DISC', sx + sw / 2, sy + sh / 2, {
          font: '8px "Press Start 2P"', color: '#ff4040', align: 'center'
        });
      }
    } catch (err) {
      Utils.drawPixelText(ctx, 'ERROR', sx + sw / 2, sy + sh / 2, {
        font: '8px "Press Start 2P"', color: '#ff0000', align: 'center'
      });
    }
  }

  /* ==============================
     شاشة PSP
     ============================== */
  function _renderPSPScreen(ctx, w, h) {
    Utils.drawPixelRect(ctx, 0, 0, w, h, 10, '#111', '#333', 2);

    const sw = w - 60, sh = h - 70;
    const sx = 30, sy = 20;

    ctx.fillStyle = '#020210';
    ctx.fillRect(sx, sy, sw, sh);

    const grd = ctx.createLinearGradient(sx, sy, sx + sw * 0.6, sy + sh * 0.4);
    grd.addColorStop(0, 'rgba(255,255,255,0.06)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(sx, sy, sw, sh);

    Utils.drawPixelText(ctx, 'PSP', sx + sw / 2, sy + sh / 2 - 10, {
      font: '10px "Press Start 2P"', color: 'rgba(80,80,120,0.6)', align: 'center'
    });
    Utils.drawPixelText(ctx, '...', sx + sw / 2, sy + sh / 2 + 6, {
      font: '8px "Press Start 2P"', color: 'rgba(80,80,120,0.4)', align: 'center'
    });

    const bx = sx + sw + 8, by = sy + sh / 2 - 20;
    const btns = [
      { dx: 10, dy: 0,   c: '#00aaff', l: 'X' },
      { dx: 20, dy: -10, c: '#cc0000', l: 'O' },
      { dx: 0,  dy: -10, c: '#00aa00', l: '□' },
      { dx: 20, dy: 10,  c: '#ccaa00', l: '△' }
    ];
    for (const b of btns) {
      ctx.fillStyle = b.c;
      ctx.beginPath(); ctx.arc(bx + b.dx, by + b.dy, 7, 0, Math.PI * 2); ctx.fill();
      Utils.drawPixelText(ctx, b.l, bx + b.dx, by + b.dy - 4, {
        font: '6px "Press Start 2P"', color: '#fff', align: 'center'
      });
    }

    const dpx = sx - 30, dpy = sy + sh / 2 - 12;
    ctx.fillStyle = '#222';
    ctx.fillRect(dpx,      dpy + 8,  24, 8);
    ctx.fillRect(dpx + 8,  dpy,       8, 24);
    ctx.fillStyle = '#444';
    ctx.fillRect(dpx + 2,  dpy + 10,  8, 4);
    ctx.fillRect(dpx + 14, dpy + 10,  8, 4);
    ctx.fillRect(dpx + 10, dpy + 2,   4, 8);
    ctx.fillRect(dpx + 10, dpy + 14,  4, 8);

    Utils.drawPixelText(ctx, 'OFF', sx + sw / 2, sy + sh + 10, {
      font: '7px "Press Start 2P"', color: '#666', align: 'center'
    });
  }

  /* ==============================
     شاشة PC
     ============================== */
  function _renderPCScreen(ctx, w, h) {
    Utils.drawPixelRect(ctx, 0, 0, w, h, 4, '#1e1e2e', '#404060', 2);

    const sw = w - 24, sh = h - 36;
    const sx = 12, sy = 10;

    const grad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    grad.addColorStop(0, '#000428');
    grad.addColorStop(1, '#004e92');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, sw, sh);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect(sx + Utils.randInt(2, sw), sy + Utils.randInt(2, sh - 20), 1, 1);
    }

    ctx.fillStyle = '#1a1a6a';
    ctx.fillRect(sx, sy + sh - 14, sw, 14);
    ctx.fillStyle = '#3030a0';
    ctx.fillRect(sx + 2, sy + sh - 12, 28, 10);
    Utils.drawPixelText(ctx, 'START', sx + 4, sy + sh - 11, {
      font: '6px "Press Start 2P"', color: '#fff'
    });

    const now  = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
    Utils.drawPixelText(ctx, time, sx + sw - 4, sy + sh - 11, {
      font: '6px "Press Start 2P"', color: '#ccc', align: 'right'
    });

    const icons = [
      { lbl: 'Fireboy', col: '#ff4400' },
      { lbl: 'Hobo',    col: '#8b4513' },
      { lbl: 'Stick',   col: '#ffffff' }
    ];
    for (let i = 0; i < icons.length; i++) {
      const ix = sx + 10 + i * 80;
      const iy = sy + 12;
      ctx.fillStyle = icons[i].col;
      ctx.fillRect(ix, iy, 28, 28);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
      ctx.strokeRect(ix, iy, 28, 28);
      Utils.drawPixelText(ctx, icons[i].lbl, ix + 14, iy + 32, {
        font: '5px "Press Start 2P"', color: '#fff', align: 'center'
      });
    }

    Utils.drawPixelText(ctx, 'FLASH GAMES PC', sx + sw / 2, sy + sh + 6, {
      font: '6px "Press Start 2P"', color: '#40f080', align: 'center'
    });

    // استدعاء دفاعي للـ MiniGames
    try {
      if (typeof MiniGames !== 'undefined' && MiniGames.drawPC) {
        MiniGames.drawPC(ctx, sx, sy, sw, sh - 14, _animTimer);
      }
    } catch (err) {
      Utils.drawPixelText(ctx, 'SYSTEM ERROR', sx + sw / 2, sy + sh / 2, {
        font: '8px "Press Start 2P"', color: '#ff0000', align: 'center'
      });
    }
  }

  function _drawAnimatedStatic(ctx, x, y, w, h) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 200; i++) {
      const px = x + Utils.randInt(0, w - 1);
      const py = y + Utils.randInt(0, h - 1);
      const br = Utils.randInt(30, 180);
      ctx.fillStyle = `rgb(${br},${br},${br})`;
      ctx.fillRect(px, py, Utils.randInt(1, 3), 1);
    }
  }

  function drawPrompt(ctx) {
    // تم تفريغ الدالة لأن الاعتماد أصبح على الزر HTML
  }

  function hasActive() { return _activeDevice !== null; }
  function getNear()   { return _nearDevice; }

  return {
    init, update,
    tryOpen, open, close,
    drawPrompt,
    hasActive, getNear
  };

})();
