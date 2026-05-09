/* ==============================
   NCORE GAME — player.js
   اللاعب: حركة، رسم، animation
   ============================== */

'use strict';

const Player = (() => {

  /* ==============================
     ثوابت
     ============================== */
  const SPEED      = 160;   // بكسل/ثانية
  const W          = 24;    // عرض hitbox
  const H          = 28;    // ارتفاع hitbox
  const FRAME_TIME = 0.14;  // ثانية لكل فريم animation

  /* ==============================
     الحالة
     ============================== */
  let _x         = 0;
  let _y         = 0;
  let _dir       = 'down';   // up | down | left | right
  let _frame     = 0;        // فريم الـ animation الحالي (0-2)
  let _frameTimer= 0;
  let _moving    = false;
  let _charId    = 0;        // معرّف الشخصية المختارة

  /* ==============================
     الإعداد
     ============================== */
  function init(charId) {
    _charId = charId;
    const spawn = GameMap.getSpawnPoint();
    _x = spawn.x;
    _y = spawn.y;
    _dir   = 'down';
    _frame = 0;
    Camera.snapTo(_x + W / 2, _y + H / 2);
  }

  /* ==============================
     التحديث كل إطار
     ============================== */
  function update(delta) {
    const dx = Joystick.getDx();
    const dy = Joystick.getDy();
    const mag = Joystick.getMagnitude();
    _moving = mag > 0.05;

    if (_moving) {
      // تحديث الاتجاه
      _dir = Joystick.getDirection();

      // حساب الحركة مع سرعة ثابتة
      const speed = SPEED * delta;
      const moveX = dx * speed;
      const moveY = dy * speed;

      // حل التصادم
      const rect   = { x: _x, y: _y, w: W, h: H };
      const result = Collision.resolveMovement(rect, moveX, moveY);
      const world  = GameMap.getWorldSize();
      const clamped= Collision.clampToWorld({ x: result.x, y: result.y, w: W, h: H }, world);
      _x = clamped.x;
      _y = clamped.y;

      // animation
      _frameTimer += delta;
      if (_frameTimer >= FRAME_TIME) {
        _frameTimer -= FRAME_TIME;
        _frame = (_frame + 1) % 3;
      }
    } else {
      _frame      = 0;
      _frameTimer = 0;
    }

    // تحديث الكاميرا
    Camera.update(_x + W / 2, _y + H / 2, delta);
  }

  /* ==============================
     الرسم
     ============================== */
  function draw(ctx) {
    const char = CHARACTERS[_charId];
    if (!char) return;
    char.draw(ctx, _x, _y, _dir, _frame, _moving);
  }

  /* ==============================
     تعريف الشخصيات العشر
     كل شخصية: { name, draw(ctx,x,y,dir,frame,moving) }
     ============================== */
  const CHARACTERS = [

    /* 0 — فتى النار */
    {
      name: 'فتى النار',
      draw(ctx, x, y, dir, frame, moving) {
        const lean = moving ? (frame === 1 ? -1 : frame === 2 ? 1 : 0) : 0;
        // جسم
        ctx.fillStyle = '#c83020';
        ctx.fillRect(x + 6, y + 12, 12, 14);
        // رجلان
        _drawLegs(ctx, x, y, frame, moving, '#8B1010', '#c83020');
        // ذراعان
        _drawArms(ctx, x, y, dir, frame, moving, '#c83020');
        // رأس
        ctx.fillStyle = '#f0a060';
        ctx.fillRect(x + 5, y + 2, 14, 13);
        // شعر ناري
        ctx.fillStyle = '#ff6000';
        ctx.fillRect(x + 5, y,     14, 4);
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(x + 7, y - 3,  4, 4);
        ctx.fillRect(x + 13, y - 2, 3, 3);
        // عيون
        _drawEyes(ctx, x, y, dir);
        // لهب صغير فوق الرأس
        if (moving && frame % 2 === 0) {
          ctx.fillStyle = 'rgba(255,140,0,0.8)';
          ctx.fillRect(x + 9, y - 5, 6, 3);
        }
      }
    },

    /* 1 — فتاة الماء */
    {
      name: 'فتاة الماء',
      draw(ctx, x, y, dir, frame, moving) {
        // جسم (فستان)
        ctx.fillStyle = '#2080e0';
        ctx.fillRect(x + 5, y + 12, 14, 16);
        // تفاصيل الفستان
        ctx.fillStyle = '#4090f0';
        ctx.fillRect(x + 7, y + 14, 10, 8);
        _drawLegs(ctx, x, y, frame, moving, '#1060c0', '#2080e0');
        _drawArms(ctx, x, y, dir, frame, moving, '#2080e0');
        // رأس
        ctx.fillStyle = '#f0d0b0';
        ctx.fillRect(x + 5, y + 2, 14, 13);
        // شعر أزرق
        ctx.fillStyle = '#0050b0';
        ctx.fillRect(x + 4, y,     16, 5);
        ctx.fillRect(x + 4, y + 5,  3, 8);
        ctx.fillRect(x + 17, y + 5, 3, 8);
        _drawEyes(ctx, x, y, dir, '#4090ff');
        // تأثير ماء
        if (moving && frame === 1) {
          ctx.fillStyle = 'rgba(100,180,255,0.5)';
          ctx.fillRect(x + 2, y + 20, 4, 4);
          ctx.fillRect(x + 18, y + 20, 4, 4);
        }
      }
    },

    /* 2 — Hobo المشرد */
    {
      name: 'Hobo',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(x + 5, y + 12, 14, 15);
        // رقعة على الملابس
        ctx.fillStyle = '#8b5a30';
        ctx.fillRect(x + 8, y + 14, 5, 5);
        _drawLegs(ctx, x, y, frame, moving, '#4a2e18', '#6b4226');
        _drawArms(ctx, x, y, dir, frame, moving, '#6b4226');
        // رأس
        ctx.fillStyle = '#d4956a';
        ctx.fillRect(x + 5, y + 2, 14, 13);
        // قبعة قديمة
        ctx.fillStyle = '#3a2a10';
        ctx.fillRect(x + 3, y + 1,  18, 3);
        ctx.fillRect(x + 6, y - 5,  12, 7);
        // لحية
        ctx.fillStyle = '#888';
        ctx.fillRect(x + 6, y + 10, 12, 4);
        _drawEyes(ctx, x, y, dir, '#8B4513');
        // عصا
        if (dir === 'right' || dir === 'down') {
          ctx.fillStyle = '#8b6040';
          ctx.fillRect(x + 20, y + 8, 2, 20);
        }
      }
    },

    /* 3 — Stickman */
    {
      name: 'Stickman',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 2;
        // رأس
        ctx.beginPath();
        ctx.arc(x + 12, y + 7, 6, 0, Math.PI * 2);
        ctx.stroke();
        // جذع
        ctx.beginPath(); ctx.moveTo(x + 12, y + 13); ctx.lineTo(x + 12, y + 24); ctx.stroke();
        // ذراعان
        const armSwing = moving ? (frame === 1 ? 4 : -4) : 0;
        ctx.beginPath(); ctx.moveTo(x + 12, y + 16); ctx.lineTo(x + 4,  y + 20 + armSwing);  ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 12, y + 16); ctx.lineTo(x + 20, y + 20 - armSwing); ctx.stroke();
        // رجلان
        const legSwing = moving ? (frame === 1 ? 4 : -2) : 0;
        ctx.beginPath(); ctx.moveTo(x + 12, y + 24); ctx.lineTo(x + 6,  y + 32 + legSwing);  ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 12, y + 24); ctx.lineTo(x + 18, y + 32 - legSwing); ctx.stroke();
        // وجه بسيط
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 9,  y + 5, 2, 2);
        ctx.fillRect(x + 13, y + 5, 2, 2);
        ctx.beginPath(); ctx.arc(x + 12, y + 9, 2, 0, Math.PI); ctx.stroke();
      }
    },

    /* 4 — النينجا الأخضر */
    {
      name: 'النينجا',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#1a6b1a';
        ctx.fillRect(x + 5, y + 12, 14, 15);
        _drawLegs(ctx, x, y, frame, moving, '#0f4f0f', '#1a6b1a');
        _drawArms(ctx, x, y, dir, frame, moving, '#1a6b1a');
        // رأس مع قناع
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x + 5, y + 2, 14, 13);
        ctx.fillStyle = '#1a6b1a';
        ctx.fillRect(x + 5, y + 2, 14, 4);
        // عيون (فتحة القناع)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 7, y + 6, 4, 3);
        ctx.fillRect(x + 13, y + 6, 4, 3);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x + 8, y + 7,  2, 2);
        ctx.fillRect(x + 14, y + 7, 2, 2);
        // شريط رأس
        ctx.fillStyle = '#cc2200';
        ctx.fillRect(x + 4, y + 4, 16, 2);
        // سيف (كاتانا) عند التحرك
        if (dir === 'right') {
          ctx.fillStyle = '#c0c0c0';
          ctx.fillRect(x + 19, y + 10, 10, 2);
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(x + 18, y + 9, 4, 4);
        }
      }
    },

    /* 5 — الزومبي */
    {
      name: 'الزومبي',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#5a7a3a';
        ctx.fillRect(x + 5, y + 12, 14, 15);
        _drawLegs(ctx, x, y, frame, moving, '#3a5a2a', '#5a7a3a');
        // ذراعان ممدودتان للأمام (زومبي)
        ctx.fillStyle = '#5a7a3a';
        if (dir === 'down' || dir === 'right') {
          ctx.fillRect(x - 4, y + 14, 8,  4);
          ctx.fillRect(x + 20, y + 14, 8, 4);
        } else {
          _drawArms(ctx, x, y, dir, frame, moving, '#5a7a3a');
        }
        // رأس
        ctx.fillStyle = '#6a8a4a';
        ctx.fillRect(x + 5, y + 2, 14, 13);
        // شعر أشعث
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(x + 4, y,     4, 5);
        ctx.fillRect(x + 10, y - 2, 3, 4);
        ctx.fillRect(x + 16, y,    4, 5);
        // عيون حمراء
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(x + 7,  y + 6, 3, 3);
        ctx.fillRect(x + 14, y + 6, 3, 3);
        // جرح
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(x + 9, y + 10, 6, 2);
      }
    },

    /* 6 — الفارس */
    {
      name: 'الفارس',
      draw(ctx, x, y, dir, frame, moving) {
        // درع
        ctx.fillStyle = '#a0a0b0';
        ctx.fillRect(x + 4, y + 11, 16, 16);
        ctx.fillStyle = '#c0c0d0';
        ctx.fillRect(x + 6, y + 13, 12, 10);
        _drawLegs(ctx, x, y, frame, moving, '#606070', '#a0a0b0');
        _drawArms(ctx, x, y, dir, frame, moving, '#a0a0b0');
        // خوذة
        ctx.fillStyle = '#909098';
        ctx.fillRect(x + 4, y + 1, 16, 14);
        ctx.fillStyle = '#707078';
        ctx.fillRect(x + 4, y + 1,  16, 4);
        ctx.fillRect(x + 4, y + 9,  16, 2);
        // قناع الخوذة
        ctx.fillStyle = '#505058';
        ctx.fillRect(x + 7, y + 5, 10, 6);
        // عيون
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(x + 8,  y + 6, 3, 3);
        ctx.fillRect(x + 13, y + 6, 3, 3);
        // سيف
        if (dir === 'right' || dir === 'down') {
          ctx.fillStyle = '#d0d0d0';
          ctx.fillRect(x + 20, y + 8, 3, 18);
          ctx.fillStyle = '#c8a000';
          ctx.fillRect(x + 18, y + 12, 7, 3);
        }
      }
    },

    /* 7 — الروبوت */
    {
      name: 'الروبوت',
      draw(ctx, x, y, dir, frame, moving) {
        // جسم معدني
        ctx.fillStyle = '#4a6080';
        ctx.fillRect(x + 4, y + 12, 16, 15);
        ctx.fillStyle = '#5a7090';
        ctx.fillRect(x + 6, y + 14, 12, 9);
        // تفاصيل صدر
        ctx.fillStyle = '#40c0f0';
        ctx.fillRect(x + 8, y + 15, 4, 4);
        ctx.fillStyle = '#f04060';
        ctx.fillRect(x + 13, y + 15, 3, 3);
        _drawLegs(ctx, x, y, frame, moving, '#3a5070', '#4a6080');
        _drawArms(ctx, x, y, dir, frame, moving, '#4a6080');
        // رأس مربع
        ctx.fillStyle = '#3a5070';
        ctx.fillRect(x + 4, y + 1, 16, 13);
        ctx.fillStyle = '#4a6080';
        ctx.fillRect(x + 6, y + 3, 12, 9);
        // عيون LED
        ctx.fillStyle = moving ? '#00ff00' : '#ff4400';
        ctx.fillRect(x + 7,  y + 5, 4, 4);
        ctx.fillRect(x + 13, y + 5, 4, 4);
        // فم LED
        ctx.fillStyle = '#40c0f0';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(x + 7 + i * 3, y + 10, 2, 2);
        }
        // هوائي
        ctx.fillStyle = '#a0b0c0';
        ctx.fillRect(x + 11, y - 4, 2, 6);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x + 10, y - 5, 4, 2);
      }
    },

    /* 8 — الساحرة */
    {
      name: 'الساحرة',
      draw(ctx, x, y, dir, frame, moving) {
        // رداء
        ctx.fillStyle = '#4a1a6a';
        ctx.fillRect(x + 4, y + 12, 16, 16);
        ctx.fillStyle = '#6a2a8a';
        ctx.fillRect(x + 6, y + 14, 12, 10);
        // نجوم على الرداء
        ctx.fillStyle = '#f0d020';
        ctx.fillRect(x + 7,  y + 15, 2, 2);
        ctx.fillRect(x + 14, y + 18, 2, 2);
        _drawLegs(ctx, x, y, frame, moving, '#3a0a5a', '#4a1a6a');
        _drawArms(ctx, x, y, dir, frame, moving, '#4a1a6a');
        // رأس
        ctx.fillStyle = '#f0d0b0';
        ctx.fillRect(x + 5, y + 3, 14, 12);
        // قبعة ساحرة
        ctx.fillStyle = '#2a0a4a';
        ctx.fillRect(x + 2, y + 2, 20, 3);
        ctx.fillRect(x + 7, y - 7, 10, 10);
        ctx.fillStyle = '#8a00aa';
        ctx.fillRect(x + 2, y + 2, 20, 1);
        // شعر
        ctx.fillStyle = '#c060f0';
        ctx.fillRect(x + 4, y + 5,  3, 10);
        ctx.fillRect(x + 17, y + 5, 3, 10);
        _drawEyes(ctx, x, y, dir, '#c060f0');
        // عصا سحرية
        if (dir === 'right' || dir === 'up') {
          ctx.fillStyle = '#8b6040';
          ctx.fillRect(x + 20, y + 10, 2, 18);
          ctx.fillStyle = '#f0d020';
          ctx.beginPath();
          ctx.arc(x + 21, y + 10, 4, 0, Math.PI * 2);
          ctx.fill();
          if (moving) {
            ctx.fillStyle = 'rgba(240,208,32,0.4)';
            ctx.beginPath();
            ctx.arc(x + 21, y + 10, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    },

    /* 9 — اللص */
    {
      name: 'اللص',
      draw(ctx, x, y, dir, frame, moving) {
        // ملابس داكنة
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x + 5, y + 12, 14, 15);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x + 7, y + 14, 10, 9);
        _drawLegs(ctx, x, y, frame, moving, '#111', '#1a1a1a');
        _drawArms(ctx, x, y, dir, frame, moving, '#1a1a1a');
        // رأس
        ctx.fillStyle = '#e0b090';
        ctx.fillRect(x + 5, y + 3, 14, 12);
        // قبعة
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(x + 3, y + 3, 18, 3);
        ctx.fillRect(x + 6, y - 4, 12, 8);
        // قناع عين
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 6, y + 6, 12, 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 7,  y + 7, 3, 2);
        ctx.fillRect(x + 13, y + 7, 3, 2);
        // كيس الغنائم
        if (dir === 'left' || dir === 'down') {
          ctx.fillStyle = '#8b6040';
          ctx.fillRect(x - 8, y + 14, 10, 10);
          ctx.strokeStyle = '#6b4020'; ctx.lineWidth = 1;
          ctx.strokeRect(x - 8, y + 14, 10, 10);
        }
      }
    }

  ]; // نهاية CHARACTERS

  /* ==============================
     دوال رسم مشتركة
     ============================== */

  function _drawLegs(ctx, x, y, frame, moving, c1, c2) {
    const swing = moving ? (frame === 1 ? 3 : frame === 2 ? -3 : 0) : 0;
    ctx.fillStyle = c1;
    ctx.fillRect(x + 6,  y + 26, 5, 8 + swing);
    ctx.fillStyle = c2;
    ctx.fillRect(x + 13, y + 26, 5, 8 - swing);
    // أحذية
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 5,  y + 32 + swing, 7, 4);
    ctx.fillRect(x + 12, y + 32 - swing, 7, 4);
  }

  function _drawArms(ctx, x, y, dir, frame, moving, color) {
    const swing = moving ? (frame === 1 ? -3 : frame === 2 ? 3 : 0) : 0;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1,  y + 13, 5, 10 + swing);
    ctx.fillRect(x + 18, y + 13, 5, 10 - swing);
  }

  function _drawEyes(ctx, x, y, dir, color = '#1a1a1a') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 7,  y + 6, 4, 4);
    ctx.fillRect(x + 13, y + 6, 4, 4);
    ctx.fillStyle = color;
    const ox = dir === 'right' ? 2 : dir === 'left' ? 0 : 1;
    const oy = dir === 'down'  ? 2 : dir === 'up'   ? 0 : 1;
    ctx.fillRect(x + 7  + ox, y + 6 + oy, 2, 2);
    ctx.fillRect(x + 13 + ox, y + 6 + oy, 2, 2);
  }

  /* ==============================
     Getters
     ============================== */
  function getRect()       { return { x: _x, y: _y, w: W, h: H }; }
  function getCenterX()    { return _x + W / 2; }
  function getCenterY()    { return _y + H / 2; }
  function getCharId()     { return _charId; }
  function getCharName()   { return CHARACTERS[_charId]?.name || ''; }
  function getAllChars()   { return CHARACTERS; }

  /* ==============================
     تصدير
     ============================== */
  return {
    init,
    update,
    draw,
    getRect,
    getCenterX,
    getCenterY,
    getCharId,
    getCharName,
    getAllChars
  };

})();