/* ==============================
   NCORE GAME — utils.js
   دوال مساعدة عامة تُستخدم في كل الملفات
   ============================== */

'use strict';

const Utils = (() => {

  /* ==============================
     الرياضيات
     ============================== */

  /** تقييد قيمة بين حد أدنى وأقصى */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /** خطية بين قيمتين */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** المسافة بين نقطتين */
  function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** زاوية بين نقطتين بالراديان */
  function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  }

  /** رقم عشوائي بين min و max */
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** رقم عشوائي عشري بين min و max */
  function randFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  /** اختيار عنصر عشوائي من مصفوفة */
  function randFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** تحويل درجة إلى راديان */
  function degToRad(deg) {
    return deg * (Math.PI / 180);
  }

  /** تحويل راديان إلى درجة */
  function radToDeg(rad) {
    return rad * (180 / Math.PI);
  }

  /* ==============================
     التصادم (AABB)
     ============================== */

  /**
   * تحقق من تداخل مستطيلين
   * كل مستطيل: { x, y, w, h }
   */
  function rectOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  /**
   * هل نقطة داخل مستطيل؟
   * { x, y } و { x, y, w, h }
   */
  function pointInRect(px, py, rect) {
    return (
      px >= rect.x &&
      px <= rect.x + rect.w &&
      py >= rect.y &&
      py <= rect.y + rect.h
    );
  }

  /**
   * هل دائرة تتداخل مع مستطيل؟
   * دائرة: { x, y, r } — مستطيل: { x, y, w, h }
   */
  function circleRectOverlap(circle, rect) {
    const nearX = clamp(circle.x, rect.x, rect.x + rect.w);
    const nearY = clamp(circle.y, rect.y, rect.y + rect.h);
    const dx = circle.x - nearX;
    const dy = circle.y - nearY;
    return (dx * dx + dy * dy) <= (circle.r * circle.r);
  }

  /* ==============================
     Canvas
     ============================== */

  /**
   * رسم مستطيل بكسلي بحواف مقطوعة (Pixel Border)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x, y, w, h
   * @param {number} cut - حجم القطعة بالبكسل
   * @param {string} fill - لون التعبئة
   * @param {string} stroke - لون الحدود
   * @param {number} lineWidth
   */
  function drawPixelRect(ctx, x, y, w, h, cut = 4, fill = null, stroke = null, lineWidth = 2) {
    ctx.beginPath();
    ctx.moveTo(x + cut, y);
    ctx.lineTo(x + w - cut, y);
    ctx.lineTo(x + w, y + cut);
    ctx.lineTo(x + w, y + h - cut);
    ctx.lineTo(x + w - cut, y + h);
    ctx.lineTo(x + cut, y + h);
    ctx.lineTo(x, y + h - cut);
    ctx.lineTo(x, y + cut);
    ctx.closePath();

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  /**
   * رسم نص بكسلي مع ظل
   * @param {CanvasRenderingContext2D} ctx
   */
  function drawPixelText(ctx, text, x, y, {
    font      = '8px "Press Start 2P"',
    color     = '#ffffff',
    shadow    = '#000000',
    shadowOff = 2,
    align     = 'left',
    baseline  = 'top'
  } = {}) {
    ctx.font         = font;
    ctx.textAlign    = align;
    ctx.textBaseline = baseline;

    // ظل
    ctx.fillStyle = shadow;
    ctx.fillText(text, x + shadowOff, y + shadowOff);

    // النص الأصلي
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  /**
   * رسم صورة بكسلية مُكبَّرة يدوياً من ImageData
   * مفيد لرسم Sprites صغيرة بدقة عالية
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLCanvasElement} srcCanvas - مصدر الـ Sprite
   * @param {number} dx, dy - موضع الرسم
   * @param {number} scale - مقياس التكبير
   */
  function drawPixelImage(ctx, srcCanvas, dx, dy, scale = 1) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      srcCanvas,
      dx, dy,
      srcCanvas.width  * scale,
      srcCanvas.height * scale
    );
  }

  /**
   * إنشاء Canvas مؤقت بحجم معين
   */
  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width  = w;
    c.height = h;
    return c;
  }

  /* ==============================
     الوقت والأداء
     ============================== */

  /** توقيت دقيق بالميلي ثانية */
  function now() {
    return performance.now();
  }

  /**
   * مؤقت بسيط — يُعيد true عند انتهاء المدة
   * الاستخدام: if (timer.tick(delta)) { ... }
   */
  function createTimer(duration) {
    let elapsed = 0;
    return {
      tick(delta) {
        elapsed += delta;
        if (elapsed >= duration) {
          elapsed -= duration;
          return true;
        }
        return false;
      },
      reset() { elapsed = 0; },
      progress() { return clamp(elapsed / duration, 0, 1); }
    };
  }

  /* ==============================
     DOM
     ============================== */

  /** اختصار document.getElementById */
  function $(id) {
    return document.getElementById(id);
  }

  /** إظهار عنصر (يزيل كلاس hidden) */
  function show(el) {
    if (typeof el === 'string') el = $(el);
    el && el.classList.remove('hidden');
  }

  /** إخفاء عنصر (يضيف كلاس hidden) */
  function hide(el) {
    if (typeof el === 'string') el = $(el);
    el && el.classList.add('hidden');
  }

  /* ==============================
     اللون
     ============================== */

  /**
   * تحويل HEX إلى RGBA
   * مثال: hexToRgba('#f0c040', 0.5) => 'rgba(240,192,64,0.5)'
   */
  function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /**
   * إنشاء لون HSL جاهز للـ Canvas
   */
  function hsl(h, s, l, a = 1) {
    return `hsla(${h},${s}%,${l}%,${a})`;
  }

  /* ==============================
     تصدير
     ============================== */
  return {
    clamp, lerp, distance, angleBetween,
    randInt, randFloat, randFrom,
    degToRad, radToDeg,
    rectOverlap, pointInRect, circleRectOverlap,
    drawPixelRect, drawPixelText, drawPixelImage, createCanvas,
    now, createTimer,
    $, show, hide,
    hexToRgba, hsl
  };

})();