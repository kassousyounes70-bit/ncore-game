/* ==============================
   NCORE GAME — game.js (v2 Multiplayer)
   المدير الرئيسي للعبة وحلقة اللعب
   ============================== */

'use strict';

const Game = (() => {

  const STATE = {
    LOADING    : 'loading',
    SELECT     : 'select',
    CONNECTING : 'connecting',
    PLAYING    : 'playing',
    PAUSED     : 'paused'
  };

  let _state    = STATE.LOADING;
  let _canvas   = null;
  let _ctx      = null;
  let _lastTime = 0;
  let _rafId    = null;
  let _debug    = false;

  /* ==============================
     الإعداد
     ============================== */
  function init() {
    _canvas = Utils.$('game-canvas');
    _ctx    = _canvas.getContext('2d');
    _ctx.imageSmoothingEnabled = false;

    _resizeCanvas();
    window.addEventListener('resize', _resizeCanvas);

    UI.showLoading(() => {
      _initSystems();
      UI.showCharacterSelect(_onCharSelected);
      _state = STATE.SELECT;
    });
  }

  function _initSystems() {
    GameMap.init();
    Camera.init(_canvas.width, _canvas.height, 1920, 1440, 0.12);
    Devices.init();
    Joystick.init();
    
    // تشغيل نظام المحادثة لكي لا ينهار المحرك عند استدعائه
    if (typeof Chat !== 'undefined') {
      Chat.init();
    }
  }

  function _onCharSelected(charId) {
    UI.stopPreviewAnimation();
    _state = STATE.CONNECTING;
    UI.showToast('جارِ الاتصال بالخادم... الرجاء الانتظار ⏳', 60000);

    Network.connect(charId, () => {
      UI.showToast('تم الاتصال بنجاح! مرحباً بك في الصالة 🎮', 2500);
      UI.showGame();
      Player.init(charId);
      NPC.init();
      UI.showHUD(Player.getCharName());
      Joystick.show();
      _registerInteraction();

      _state    = STATE.PLAYING;
      _lastTime = performance.now();
      _rafId    = requestAnimationFrame(_loop);
    });
  }

  /* ==============================
     حلقة اللعب
     ============================== */
  function _loop(timestamp) {
    if (_state !== STATE.PLAYING) return;

    const delta = Math.min((timestamp - _lastTime) / 1000, 0.05);
    _lastTime   = timestamp;

    _update(delta);
    _draw();

    _rafId = requestAnimationFrame(_loop);
  }

  /* ==============================
     التحديث
     ============================== */
  function _update(delta) {
    const deviceOpen = Devices.hasActive();
    Joystick.update();

    if (!deviceOpen) {
      Player.update(delta);
      Network.sendPosition(
        Player.getCenterX(),
        Player.getCenterY(),
        Player.getRect(),
        Joystick.getDirection()
      );
    }

    NPC.update(delta);
    Devices.update(delta);
    _updatePlayersHUD();
  }

  function _updatePlayersHUD() {
    const el = Utils.$('hud-players-count');
    if (el) el.textContent = '👥 ' + (Network.getPlayerCount() + 1);
  }

  /* ==============================
     الرسم
     ============================== */
  function _draw() {
    const ctx = _ctx;
    const cw  = _canvas.width;
    const ch  = _canvas.height;

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, cw, ch);

    Camera.beginDraw(ctx);
      GameMap.draw(ctx);
      Devices.drawPrompt(ctx);
      NPC.draw(ctx);
      Network.drawOtherPlayers(ctx, Player.getAllChars());
      Player.draw(ctx);
      if (_debug) Collision.debugDraw(ctx, Camera.getOffset());
    Camera.endDraw(ctx);

    _drawVignette(ctx, cw, ch);
  }

  function _drawVignette(ctx, w, h) {
    const grad = ctx.createRadialGradient(
      w / 2, h / 2, h * 0.3,
      w / 2, h / 2, h * 0.85
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,10,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  /* ==============================
     التفاعل مع الأجهزة
     ============================== */
  function _registerInteraction() {
    const gc = Utils.$('game-container');

    function _onTap(e) {
      const t = e.target;
      // حماية جميع أزرار الواجهة الجديدة من النقر العشوائي
      if (
        t.closest('#joystick-zone') ||
        t.closest('#device-popup')  ||
        t.closest('#hud') ||
        t.closest('#interact-btn') ||
        t.closest('#chat-btn') ||
        t.closest('#chat-input-container')
      ) return;

      if (Devices.hasActive()) Devices.close();
    }

    gc.addEventListener('click', _onTap);
    gc.addEventListener('touchend', _onTap);
  }

  /* ==============================
     تغيير الحجم
     ============================== */
  function _resizeCanvas() {
    if (!_canvas) return;
    _canvas.width  = window.innerWidth;
    _canvas.height = window.innerHeight;
    _ctx.imageSmoothingEnabled = false;
    if (_state === STATE.PLAYING) {
      Camera.resize(_canvas.width, _canvas.height);
    }
  }

  /* ==============================
     إيقاف / استئناف
     ============================== */
  function pause() {
    if (_state === STATE.PLAYING) {
      _state = STATE.PAUSED;
      if (_rafId) cancelAnimationFrame(_rafId);
    }
  }

  function resume() {
    if (_state === STATE.PAUSED) {
      _state    = STATE.PLAYING;
      _lastTime = performance.now();
      _rafId    = requestAnimationFrame(_loop);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else                 resume();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'F2') {
      e.preventDefault();
      _debug = !_debug;
      UI.showToast(_debug ? '🔴 Debug ON' : '✅ Debug OFF', 1500);
    }
  });

  return { init, pause, resume };

})();
