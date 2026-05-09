/* ==============================
   NCORE GAME — joystick.js
   العصا التناظرية الافتراضية
   ============================== */

'use strict';

const Joystick = (() => {

  /* ==============================
     الحالة الداخلية
     ============================== */
  let _base      = null;   // عنصر القاعدة  #joystick-base
  let _thumb     = null;   // عنصر الإبهام  #joystick-thumb
  let _zone      = null;   // منطقة اللمس   #joystick-zone

  let _active    = false;  // هل العصا مضغوطة الآن
  let _touchId   = null;   // معرّف نقطة اللمس (متعدد الأصابع)

  let _baseX     = 0;      // مركز القاعدة (بالبكسل على الشاشة)
  let _baseY     = 0;
  let _radius    = 0;      // نصف قطر القاعدة

  let _dx        = 0;      // اتجاه (-1 → 1) أفقي
  let _dy        = 0;      // اتجاه (-1 → 1) عمودي
  let _magnitude = 0;      // قوة الضغط (0 → 1)

  // دعم لوحة المفاتيح (للاختبار على سطح المكتب)
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

    // --- أحداث اللمس ---
    _zone.addEventListener('touchstart',  _onTouchStart,  { passive: false });
    window.addEventListener('touchmove',  _onTouchMove,   { passive: false });
    window.addEventListener('touchend',   _onTouchEnd,    { passive: false });
    window.addEventListener('touchcancel',_onTouchEnd,    { passive: false });

    // --- أحداث الماوس (للاختبار على PC) ---
    _zone.addEventListener('mousedown',  _onMouseDown);
    window.addEventListener('mousemove', _onMouseMove);
    window.addEventListener('mouseup',   _onMouseUp);

    // --- لوحة المفاتيح (للاختبار) ---
    window.addEventListener('keydown', _onKeyDown);
    window.addEventListener('keyup',   _onKeyUp);

    // تحديث مركز القاعدة عند تغيير حجم الشاشة
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

    // تقييد حركة الإبهام داخل نصف القطر
    const clampedDist = Math.min(dist, _radius);
    const angle       = Math.atan2(rawDy, rawDx);

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    // تحريك عنصر الإبهام بصرياً
    _thumb.style.transform =
      `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;

    // حساب القيم المعيارية
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
     يدمج اللمس + لوحة المفاتيح
     ============================== */
  function update() {
    // إذا كانت لوحة المفاتيح مستخدمة وليس اللمس
    if (!_active) {
      let kx = 0, ky = 0;
      if (_keys.left)  kx -= 1;
      if (_keys.right) kx += 1;
      if (_keys.up)    ky -= 1;
      if (_keys.down)  ky += 1;

      if (kx !== 0 || ky !== 0) {
        // تطبيع الاتجاه القطري
        const len = Math.sqrt(kx * kx + ky * ky);
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
     إظهار / إخفاء العصا
     ============================== */
  function show() {
    if (_zone) Utils.show(_zone);
  }

  function hide() {
    if (_zone) Utils.hide(_zone);
  }

  /* ==============================
     Getters
     ============================== */

  /** الاتجاه الأفقي (-1 → 1) */
  function getDx() { return _dx; }

  /** الاتجاه العمودي (-1 → 1) */
  function getDy() { return _dy; }

  /** قوة الضغط (0 → 1) */
  function getMagnitude() { return _magnitude; }

  /** هل العصا تتحرك؟ */
  function isMoving() { return _magnitude > 0.05; }

  /** الاتجاه الغالب كنص: 'up' | 'down' | 'left' | 'right' | 'idle' */
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
    getDx,
    getDy,
    getMagnitude,
    isMoving,
    getDirection
  };

})();