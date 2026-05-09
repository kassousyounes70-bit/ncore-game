/* ==============================
   NCORE GAME — network.js
   إدارة الاتصال المتعدد اللاعبين
   عبر Socket.io
   ============================== */

'use strict';

const Network = (() => {

  /* ==============================
     الثوابت
     ============================== */
  const SERVER_URL     = 'https://ncore-mmo-server.onrender.com';
  const SEND_RATE      = 100;   // ms بين كل إرسال (10 مرات/ثانية)
  const INTERP_SPEED   = 0.18;  // سرعة الـ Interpolation (0-1)
  const PLAYER_W       = 24;
  const PLAYER_H       = 28;

  /* ==============================
     الحالة
     ============================== */
  let _socket        = null;
  let _connected     = false;
  let _myId          = null;
  let _myCharId      = 0;
  let _lastSendTime  = 0;
  let _onConnectCb   = null;

  // خريطة اللاعبين الآخرين
  // key: socketId → { x, y, targetX, targetY, charId, dir, frame, frameTimer, name }
  const _players = new Map();

  /* ==============================
     الاتصال
     ============================== */
  function connect(charId, onConnect) {
    _myCharId    = charId;
    _onConnectCb = onConnect;

    _socket = io(SERVER_URL, {
      reconnection:         true,
      reconnectionDelay:    1500,
      reconnectionDelayMax: 5000,
      timeout:              60000
    });

    _registerEvents();
  }

  /* ==============================
     تسجيل أحداث Socket.io
     ============================== */
  function _registerEvents() {

    /* ---- اتصال ناجح ---- */
    _socket.on('connect', () => {
      _connected = true;
      _myId      = _socket.id;

      console.log('[Network] متصل ✅ ID:', _myId);

      // إرسال بيانات اللاعب للسيرفر
      const spawn = GameMap.getSpawnPoint();
      _socket.emit('player:join', {
        charId: _myCharId,
        x:      spawn.x,
        y:      spawn.y,
        dir:    'down',
        name:   'لاعب'
      });

      if (_onConnectCb) {
        _onConnectCb();
        _onConnectCb = null; // تفريغ الـ Callback لمنع التكرار
      }
    });

    /* ---- قائمة اللاعبين الحاليين عند الدخول ---- */
    _socket.on('players:list', (players) => {
      _players.clear();
      for (const [id, data] of Object.entries(players)) {
        if (id === _myId) continue;
        _players.set(id, _createPlayerState(data));
      }
    });

    /* ---- لاعب جديد دخل ---- */
    _socket.on('player:joined', ({ id, data }) => {
      if (id === _myId) return;
      _players.set(id, _createPlayerState(data));
      UI.showToast('لاعب جديد دخل الصالة 🎮', 1800);
    });

    /* ---- تحديث موضع لاعب ---- */
    _socket.on('player:moved', ({ id, x, y, dir }) => {
      if (id === _myId) return;
      const p = _players.get(id);
      if (!p) return;
      p.targetX = x;
      p.targetY = y;
      p.dir     = dir;
      // تحريك animation
      p.moving  = (dir !== 'idle');
    });

    /* ---- لاعب غادر ---- */
    _socket.on('player:left', (id) => {
      _players.delete(id);
    });

    /* ---- انقطاع الاتصال ---- */
    _socket.on('disconnect', (reason) => {
      _connected = false;
      console.warn('[Network] انقطع الاتصال:', reason);
      UI.showToast('⚠️ انقطع الاتصال: ' + reason, 3000);
    });

    /* ---- إعادة اتصال ناجحة ---- */
    _socket.on('reconnect', () => {
      _connected = true;
      const spawn = GameMap.getSpawnPoint();
      _socket.emit('player:join', {
        charId: _myCharId,
        x:      spawn.x,
        y:      spawn.y,
        dir:    'down',
        name:   'لاعب'
      });
      UI.showToast('تمّت إعادة الاتصال ✅', 1500);
    });

    /* ---- خطأ صريح ---- */
    _socket.on('connect_error', (err) => {
      console.error('[Network] خطأ في الاتصال:', err.message);
      UI.showToast('❌ خطأ في الخادم: ' + err.message, 5000);
    });
  }

  /* ==============================
     إنشاء حالة لاعب جديد
     ============================== */
  function _createPlayerState(data) {
    return {
      x:          data.x,
      y:          data.y,
      targetX:    data.x,
      targetY:    data.y,
      charId:     data.charId || 0,
      dir:        data.dir    || 'down',
      frame:      0,
      frameTimer: 0,
      moving:     false,
      name:       data.name   || 'لاعب'
    };
  }

  /* ==============================
     إرسال الموضع (مُقيَّد بـ Throttle)
     ============================== */
  function sendPosition(cx, cy, rect, dir) {
    if (!_connected) return;

    const now = performance.now();
    if (now - _lastSendTime < SEND_RATE) return;
    _lastSendTime = now;

    _socket.emit('player:move', {
      x:   Math.round(cx),
      y:   Math.round(cy),
      dir: dir
    });
  }

  /* ==============================
     تحديث الـ Interpolation كل إطار
     (يُستدعى ضمنياً من drawOtherPlayers)
     ============================== */
  function _interpolatePlayers(delta) {
    const FRAME_TIME = 0.16;

    for (const p of _players.values()) {
      // انتقال سلس نحو الموضع المستهدف
      p.x = Utils.lerp(p.x, p.targetX, INTERP_SPEED);
      p.y = Utils.lerp(p.y, p.targetY, INTERP_SPEED);

      // animation
      const dist = Utils.distance(p.x, p.y, p.targetX, p.targetY);
      p.moving   = dist > 2;

      if (p.moving) {
        p.frameTimer += delta || 0.016;
        if (p.frameTimer >= FRAME_TIME) {
          p.frameTimer -= FRAME_TIME;
          p.frame = (p.frame + 1) % 3;
        }
      } else {
        p.frame      = 0;
        p.frameTimer = 0;
      }
    }
  }

  /* ==============================
     رسم اللاعبين الآخرين
     ============================== */
  function drawOtherPlayers(ctx, allChars) {
    _interpolatePlayers();

    for (const p of _players.values()) {
      if (!Camera.isVisible({ x: p.x - 20, y: p.y - 20, w: 60, h: 60 })) continue;

      const char = allChars[p.charId];
      if (!char) continue;

      // ظل
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + PLAYER_H / 2 + 4, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // رسم الشخصية
      char.draw(
        ctx,
        p.x - PLAYER_W / 2,
        p.y - PLAYER_H / 2,
        p.dir,
        p.frame,
        p.moving
      );

      // اسم اللاعب فوق رأسه
      _drawPlayerName(ctx, p);
    }
  }

  /* ---- اسم اللاعب ---- */
  function _drawPlayerName(ctx, p) {
    const nameX = p.x;
    const nameY = p.y - PLAYER_H / 2 - 14;

    // خلفية الاسم
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const tw = (p.name.length * 6) + 8;
    ctx.fillRect(nameX - tw / 2, nameY - 8, tw, 10);

    // النص
    Utils.drawPixelText(ctx, p.name, nameX, nameY - 7, {
      font:    '5px "Press Start 2P"',
      color:   '#f0c040',
      shadow:  '#000',
      align:   'center'
    });
  }

  /* ==============================
     Getters
     ============================== */
  function getPlayerCount() { return _players.size; }
  function isConnected()    { return _connected; }
  function getMyId()        { return _myId; }

  /* ==============================
     تصدير
     ============================== */
  return {
    connect,
    sendPosition,
    drawOtherPlayers,
    getPlayerCount,
    isConnected,
    getMyId
  };

})();
