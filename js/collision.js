/* ==============================
   NCORE GAME — collision.js
   نظام اكتشاف التصادم ومنع الاختراق
   ============================== */

'use strict';

const Collision = (() => {

  /* ==============================
     قائمة الحواجز الثابتة
     تُملأ من map.js عند بناء الخريطة
     كل عنصر: { x, y, w, h, type }
     type: 'wall' | 'device' | 'door_frame'
     ============================== */
  let _obstacles = [];

  /** تسجيل قائمة الحواجز من الخريطة */
  function setObstacles(list) {
    _obstacles = list;
  }

  /** إضافة حاجز واحد */
  function addObstacle(rect) {
    _obstacles.push(rect);
  }

  /** إرجاع كل الحواجز (للرسم في وضع debug) */
  function getObstacles() {
    return _obstacles;
  }

  /* ==============================
     AABB — تصادم مستطيل مع مستطيل
     ============================== */

  /**
   * هل المستطيل a يتصادم مع أي حاجز؟
   * يُعيد الحاجز الأول المتداخل أو null
   * @param {{ x, y, w, h }} a
   */
  function checkRect(a) {
    for (const obs of _obstacles) {
      if (Utils.rectOverlap(a, obs)) return obs;
    }
    return null;
  }

  /**
   * هل المستطيل a يتصادم مع حاجز من نوع معين؟
   * @param {{ x, y, w, h }} a
   * @param {string} type
   */
  function checkRectType(a, type) {
    for (const obs of _obstacles) {
      if (obs.type === type && Utils.rectOverlap(a, obs)) return obs;
    }
    return null;
  }

  /* ==============================
     حل التصادم — Slide (الانزلاق)
     يمنع الاختراق مع إبقاء حركة جانبية
     ============================== */

  /**
   * حاول تحريك مستطيل من (x,y) بمقدار (dx,dy)
   * مع تجنب الحواجز بأسلوب Axis-Separated Slide
   *
   * @param {{ x, y, w, h }} rect  - المستطيل الحالي
   * @param {number} dx, dy        - محاولة الحركة
   * @returns {{ x, y, colX, colY }} - الموضع الجديد ونوع التصادم
   */
  function resolveMovement(rect, dx, dy) {
    let newX = rect.x;
    let newY = rect.y;
    let colX = false;
    let colY = false;

    // --- محاولة الحركة على المحور X ---
    const testX = { x: rect.x + dx, y: rect.y, w: rect.w, h: rect.h };
    if (checkRect(testX)) {
      colX = true;
      // ابحث عن أقرب موضع آمن على X
      if (dx > 0) {
        newX = _snapLeft(rect, dx);
      } else if (dx < 0) {
        newX = _snapRight(rect, dx);
      }
    } else {
      newX = rect.x + dx;
    }

    // --- محاولة الحركة على المحور Y ---
    const testY = { x: newX, y: rect.y + dy, w: rect.w, h: rect.h };
    if (checkRect(testY)) {
      colY = true;
      if (dy > 0) {
        newY = _snapTop(rect, dy);
      } else if (dy < 0) {
        newY = _snapBottom(rect, dy);
      }
    } else {
      newY = rect.y + dy;
    }

    return { x: newX, y: newY, colX, colY };
  }

  /* ==============================
     دوال Snap الداخلية
     تضع الشخصية مباشرة على حافة الحاجز
     ============================== */

  function _snapLeft(rect, dx) {
    let best = rect.x + dx;
    for (const obs of _obstacles) {
      const test = { x: rect.x + dx, y: rect.y, w: rect.w, h: rect.h };
      if (Utils.rectOverlap(test, obs)) {
        best = obs.x - rect.w;
      }
    }
    return best;
  }

  function _snapRight(rect, dx) {
    let best = rect.x + dx;
    for (const obs of _obstacles) {
      const test = { x: rect.x + dx, y: rect.y, w: rect.w, h: rect.h };
      if (Utils.rectOverlap(test, obs)) {
        best = obs.x + obs.w;
      }
    }
    return best;
  }

  function _snapTop(rect, dy) {
    let best = rect.y + dy;
    for (const obs of _obstacles) {
      const test = { x: rect.x, y: rect.y + dy, w: rect.w, h: rect.h };
      if (Utils.rectOverlap(test, obs)) {
        best = obs.y - rect.h;
      }
    }
    return best;
  }

  function _snapBottom(rect, dy) {
    let best = rect.y + dy;
    for (const obs of _obstacles) {
      const test = { x: rect.x, y: rect.y + dy, w: rect.w, h: rect.h };
      if (Utils.rectOverlap(test, obs)) {
        best = obs.y + obs.h;
      }
    }
    return best;
  }

  /* ==============================
     حدود العالم
     يمنع الخروج خارج حدود الخريطة
     ============================== */

  /**
   * @param {{ x, y, w, h }} rect
   * @param {{ w, h }} worldSize
   * @param {{ left, right }} doors - مناطق الأبواب (لا تُعيق)
   */
  function clampToWorld(rect, worldSize, doors = {}) {
    let x = Utils.clamp(rect.x, 0, worldSize.w - rect.w);
    let y = Utils.clamp(rect.y, 0, worldSize.h - rect.h);
    return { x, y };
  }

  /* ==============================
     اكتشاف التفاعل مع الأجهزة
     يُعيد أقرب جهاز ضمن مسافة معينة
     ============================== */

  /**
   * @param {{ x, y, w, h }} playerRect
   * @param {Array}           devices      - قائمة الأجهزة من map.js
   * @param {number}          range        - مسافة التفاعل بالبكسل
   * @returns {object|null}   الجهاز الأقرب أو null
   */
  function getNearbyDevice(playerRect, devices, range = 60) {
    const cx = playerRect.x + playerRect.w / 2;
    const cy = playerRect.y + playerRect.h / 2;

    let nearest     = null;
    let nearestDist = Infinity;

    for (const dev of devices) {
      const devCx = dev.x + dev.w / 2;
      const devCy = dev.y + dev.h / 2;
      const dist  = Utils.distance(cx, cy, devCx, devCy);

      if (dist <= range && dist < nearestDist) {
        nearest     = dev;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  /* ==============================
     Debug — رسم الحواجز
     ============================== */

  /**
   * ارسم كل الحواجز باللون الأحمر (للاختبار فقط)
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ x, y }} cameraOffset
   */
  function debugDraw(ctx, cameraOffset = { x: 0, y: 0 }) {
    ctx.save();
    for (const obs of _obstacles) {
      const col = obs.type === 'wall'   ? 'rgba(255,0,0,0.4)'
                : obs.type === 'device' ? 'rgba(0,128,255,0.4)'
                :                         'rgba(0,255,0,0.4)';
      ctx.fillStyle   = col;
      ctx.strokeStyle = col.replace('0.4', '0.9');
      ctx.lineWidth   = 1;
      ctx.fillRect(
        obs.x - cameraOffset.x,
        obs.y - cameraOffset.y,
        obs.w, obs.h
      );
      ctx.strokeRect(
        obs.x - cameraOffset.x,
        obs.y - cameraOffset.y,
        obs.w, obs.h
      );
    }
    ctx.restore();
  }

  /* ==============================
     تصدير
     ============================== */
  return {
    setObstacles,
    addObstacle,
    getObstacles,
    checkRect,
    checkRectType,
    resolveMovement,
    clampToWorld,
    getNearbyDevice,
    debugDraw
  };

})();