/* ==============================
   NCORE GAME — joystick.js
   العصا التناظرية الافتراضية
   ============================== */

'use strict';

const Joystick = (() => {

  /* ==============================
     الحالة الداخلية
     ============================== */
  let _base      = null;
  let _thumb     = null;
  let _zone      = null;

  let _active    = false;
  let _touchId   = null;

  let _baseX     = 0;
  let _baseY     = 0;
  let _radius    = 0;

  let _dx        = 0;
  let _dy        = 0;
  let _magnitude = 0;

  const _keys = { up: false, down: false, left: false, right: false };

  /* ==============================
     الإعداد
     ============================== */
  function init() {
    _base  = Utils.$('joystick-base');
    _thumb = Utils.$('joystick-thumb');
    _zone  = Utils.$('joystick-zone');

    if (!_base || !_thumb || !_zone) {
      console.warn('[Joystick] عناصر HTML غير موجودة');
      return;
    }

    _updateBaseCenter();

    _zone.addEventListener('touchstart',   _onTouchStart,  { passive: false });
    window.addEventListener('touchmove',   _onTouchMove,   { passive: false });
    window.addEventListener('touchend',    _onTouchEnd,    { passive: false });
    window.addEventListener('touchcancel', _onTouchEnd,    { passive: false });

    _zone.addEventListener('mousedown',  _onMouseDown);
    window.addEventListener('mousemove', _onMouseMove);
    window.addEventListener('mouseup',   _onMouseUp);

    window.addEventListener('keydown', _onKeyDown);
    window.addEventListener('keyup',   _onKeyUp);

    window.addEventListener('resize', _updateBaseCenter);
  }

  function _updateBaseCenter() {
    if (!_base) return;
    const rect = _base.getBoundingClientRect();
    _baseX  = rect.left + rect.width  / 2;
    _baseY  = rect.top  + rect.height / 2;
    _radius = rect.width / 2;
  }

  /* ==============================
     أحداث اللمس
     ============================== */
  function _onTouchStart(e) {
    e.preventDefault();
    if (_active) return;
    const touch = e.changedTouches[0];
    _touchId = touch.identifier;
    _active  = true;
    _updateBaseCenter();
    _processInput(touch.clientX, touch.clientY);
  }

  function _onTouchMove(e) {
    e.preventDefault();
    if (!_active) return;
    for (const touch of e.changedTouches) {
      if (touch.identifier === _touchId) {
        _processInput(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  function _onTouchEnd(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === _touchId) {
        _reset();
        break;
      }
    }
  }

  /* ==============================
     أحداث الماوس
     ============================== */
  function _onMouseDown(e) {
    _active = true;
    _updateBaseCenter();
    _processInput(e.clientX, e.clientY);
  }

  function _onMouseMove(e) {
    if (!_active) return;
    _processInput(e.clientX, e.clientY);
  }

  function _onMouseUp() {
    if (_active) _reset();
  }

  /* ==============================
     أحداث لوحة المفاتيح
     ============================== */
  function _onKeyDown(e) {
    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': _keys.up    = true; break;
      case 'ArrowDown':  case 'KeyS': _keys.down  = true; break;
      case 'ArrowLeft':  case 'KeyA': _keys.left  = true; break;
      case 'ArrowRight': case 'KeyD': _keys.right = true; break;
    }
  }

  function _onKeyUp(e) {
    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': _keys.up    = false; break;
      case 'ArrowDown':  case 'KeyS': _keys.down  = false; break;
      case 'ArrowLeft':  case 'KeyA': _keys.left  = false; break;
      case 'ArrowRight': case 'KeyD': _keys.right = false; break;
    }
  }

  /* ==============================
     حساب الاتجاه
     ============================== */
  function _processInput(clientX, clientY) {
    const rawDx = clientX - _baseX;
    const rawDy = clientY - _baseY;
    const dist  = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    const clampedDist = Math.min(dist, _radius);
    const angle       = Math.atan2(rawDy, rawDx);

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    _thumb.style.transform =
      `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;

    _magnitude = Utils.clamp(dist / _radius, 0, 1);
    _dx        = Math.cos(angle) * _magnitude;
    _dy        = Math.sin(angle) * _magnitude;
  }

  function _reset() {
    _active    = false;
    _touchId   = null;
    _dx        = 0;
    _dy        = 0;
    _magnitude = 0;

    if (_thumb) {
      _thumb.style.transform = 'translate(-50%, -50%)';
    }
  }

  /* ==============================
     التحديث كل إطار
     ============================== */
  function update() {
    if (!_active) {
      let kx = 0, ky = 0;
      if (_keys.left)  kx -= 1;
      if (_keys.right) kx += 1;
      if (_keys.up)    ky -= 1;
      if (_keys.down)  ky += 1;

      if (kx !== 0 || ky !== 0) {
        const len  = Math.sqrt(kx * kx + ky * ky);
        _dx        = kx / len;
        _dy        = ky / len;
        _magnitude = 1;
      } else {
        _dx        = 0;
        _dy        = 0;
        _magnitude = 0;
      }
    }
  }

  /* ==============================
     إظهار / إخفاء / إعادة ضبط
     ============================== */
  function show() {
    if (_zone) Utils.show(_zone);
  }

  function hide() {
    if (_zone) Utils.hide(_zone);
  }

  /** إعادة ضبط كاملة — تصفير الحركة فوراً */
  function reset() {
    _reset();
    _keys.up    = false;
    _keys.down  = false;
    _keys.left  = false;
    _keys.right = false;
  }

  /* ==============================
     Getters
     ============================== */
  function getDx()        { return _dx; }
  function getDy()        { return _dy; }
  function getMagnitude() { return _magnitude; }
  function isMoving()     { return _magnitude > 0.05; }

  function getDirection() {
    if (!isMoving()) return 'idle';
    if (Math.abs(_dx) >= Math.abs(_dy)) {
      return _dx > 0 ? 'right' : 'left';
    } else {
      return _dy > 0 ? 'down' : 'up';
    }
  }

  /* ==============================
     تصدير
     ============================== */
  return {
    init,
    update,
    show,
    hide,
    reset,
    getDx,
    getDy,
    getMagnitude,
    isMoving,
    getDirection
  };

})();