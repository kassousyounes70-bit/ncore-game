/* ==============================
   NCORE GAME — camera.js
   نظام الكاميرا التي تتبع اللاعب
   ============================== */

'use strict';

const Camera = (() => {

  /* ==============================
     الحالة الداخلية
     ============================== */
  let _x          = 0;      // موضع الكاميرا في العالم (أفقي)
  let _y          = 0;      // موضع الكاميرا في العالم (عمودي)
  let _targetX    = 0;      // الموضع المستهدف (يتغير مع اللاعب)
  let _targetY    = 0;
  let _smoothing  = 0.10;   // سرعة ملاحقة اللاعب (0 = فورية، 1 = بطيئة جداً)

  let _viewW      = 0;      // عرض منطقة العرض (Canvas)
  let _viewH      = 0;      // ارتفاع منطقة العرض

  let _worldW     = 0;      // عرض العالم الكامل
  let _worldH     = 0;      // ارتفاع العالم الكامل

  // تأثير الاهتزاز
  let _shakeX     = 0;
  let _shakeY     = 0;
  let _shakePower = 0;
  let _shakeDur   = 0;
  let _shakeTimer = 0;

  /* ==============================
     الإعداد
     ============================== */

  /**
   * تهيئة الكاميرا
   * @param {number} viewW, viewH   - أبعاد الـ Canvas
   * @param {number} worldW, worldH - أبعاد العالم
   * @param {number} smoothing      - معامل النعومة (افتراضي 0.10)
   */
  function init(viewW, viewH, worldW, worldH, smoothing = 0.10) {
    _viewW     = viewW;
    _viewH     = viewH;
    _worldW    = worldW;
    _worldH    = worldH;
    _smoothing = smoothing;
  }

  /** تحديث أبعاد العرض عند تغيير حجم النافذة */
  function resize(viewW, viewH) {
    _viewW = viewW;
    _viewH = viewH;
  }

  /* ==============================
     التحديث كل إطار
     ============================== */

  /**
   * @param {number} targetX, targetY - مركز اللاعب في العالم
   * @param {number} delta            - الوقت بالثانية منذ آخر إطار
   */
  function update(targetX, targetY, delta) {

    // الموضع المستهدف: مركز اللاعب في منتصف الشاشة
    _targetX = targetX - _viewW / 2;
    _targetY = targetY - _viewH / 2;

    // تقييد الهدف داخل حدود العالم
    _targetX = Utils.clamp(_targetX, 0, Math.max(0, _worldW - _viewW));
    _targetY = Utils.clamp(_targetY, 0, Math.max(0, _worldH - _viewH));

    // انتقال سلس نحو الهدف (Lerp)
    const factor = 1 - Math.pow(_smoothing, delta * 60);
    _x = Utils.lerp(_x, _targetX, factor);
    _y = Utils.lerp(_y, _targetY, factor);

    // تقريب لتجنب تشويه البكسل
    _x = Math.round(_x);
    _y = Math.round(_y);

    // --- اهتزاز الكاميرا ---
    if (_shakeTimer > 0) {
      _shakeTimer -= delta;
      const progress = _shakeTimer / _shakeDur;
      const power    = _shakePower * progress;
      _shakeX = Utils.randFloat(-power, power);
      _shakeY = Utils.randFloat(-power, power);
    } else {
      _shakeX = 0;
      _shakeY = 0;
    }
  }

  /* ==============================
     تطبيق الكاميرا على الـ Canvas
     ============================== */

  /**
   * اضغط تحويل الكاميرا على السياق
   * استخدم دائماً beginDraw / endDraw حول رسم العالم
   * @param {CanvasRenderingContext2D} ctx
   */
  function beginDraw(ctx) {
    ctx.save();
    ctx.translate(
      -(_x + _shakeX),
      -(_y + _shakeY)
    );
  }

  /** أعِد السياق إلى حالته الأصلية */
  function endDraw(ctx) {
    ctx.restore();
  }

  /* ==============================
     تحويل الإحداثيات
     ============================== */

  /** تحويل موضع العالم → موضع الشاشة */
  function worldToScreen(wx, wy) {
    return {
      x: wx - _x - _shakeX,
      y: wy - _y - _shakeY
    };
  }

  /** تحويل موضع الشاشة → موضع العالم */
  function screenToWorld(sx, sy) {
    return {
      x: sx + _x + _shakeX,
      y: sy + _y + _shakeY
    };
  }

  /* ==============================
     هل الكائن مرئي في الشاشة؟
     مفيد لتخطي رسم ما هو خارج النطاق
     ============================== */

  /**
   * @param {{ x, y, w, h }} rect - مستطيل في إحداثيات العالم
   * @param {number} margin       - هامش إضافي بالبكسل
   */
  function isVisible(rect, margin = 32) {
    return (
      rect.x + rect.w + margin > _x &&
      rect.x               - margin < _x + _viewW &&
      rect.y + rect.h + margin > _y &&
      rect.y               - margin < _y + _viewH
    );
  }

  /* ==============================
     اهتزاز الكاميرا (Shake)
     ============================== */

  /**
   * @param {number} power    - قوة الاهتزاز بالبكسل
   * @param {number} duration - مدة الاهتزاز بالثانية
   */
  function shake(power = 6, duration = 0.3) {
    _shakePower = power;
    _shakeDur   = duration;
    _shakeTimer = duration;
  }

  /* ==============================
     ضبط فوري (بدون انتقال سلس)
     مفيد عند تولّد اللاعب أول مرة
     ============================== */

  function snapTo(targetX, targetY) {
    _x = Utils.clamp(targetX - _viewW / 2, 0, Math.max(0, _worldW - _viewW));
    _y = Utils.clamp(targetY - _viewH / 2, 0, Math.max(0, _worldH - _viewH));
    _targetX = _x;
    _targetY = _y;
  }

  /* ==============================
     Getters
     ============================== */

  function getX()     { return _x; }
  function getY()     { return _y; }
  function getViewW() { return _viewW; }
  function getViewH() { return _viewH; }

  /** إحداثيات الكاميرا كـ object (للـ Collision وغيره) */
  function getOffset() {
    return { x: _x, y: _y };
  }

  /* ==============================
     تصدير
     ============================== */
  return {
    init,
    resize,
    update,
    beginDraw,
    endDraw,
    worldToScreen,
    screenToWorld,
    isVisible,
    shake,
    snapTo,
    getX, getY,
    getViewW, getViewH,
    getOffset
  };

})();