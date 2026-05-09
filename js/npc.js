/* ==============================
   NCORE GAME — npc.js
   شخصيات NPC: جلوس + تجول عشوائي
   ============================== */

'use strict';

const NPC = (() => {

  /* ==============================
     ثوابت
     ============================== */
  const NPC_W       = 20;
  const NPC_H       = 26;
  const WALK_SPEED  = 55;
  const FRAME_TIME  = 0.18;

  /* ==============================
     قائمة الـ NPCs
     ============================== */
  let _npcs = [];

  /* ==============================
     ألوان الشخصيات العشوائية
     ============================== */
  const PALETTES = [
    { body: '#c83020', hair: '#1a1a1a', skin: '#f0a060' }, // أحمر
    { body: '#2060c0', hair: '#8b4513', skin: '#f0d0b0' }, // أزرق
    { body: '#208040', hair: '#1a1a1a', skin: '#d4956a' }, // أخضر
    { body: '#806020', hair: '#2a1a0a', skin: '#f0c090' }, // بني
    { body: '#602080', hair: '#c060f0', skin: '#f0d0b0' }, // بنفسجي
    { body: '#208080', hair: '#1a1a1a', skin: '#e0b090' }, // تركوازي
    { body: '#c06020', hair: '#1a1a1a', skin: '#d4956a' }, // برتقالي
    { body: '#404040', hair: '#888888', skin: '#c8a080' }, // رمادي
  ];

  /* ==============================
     الإعداد
     ============================== */
  function init() {
    _npcs = [];
    const chairs  = GameMap.getChairs();
    const world   = GameMap.getWorldSize();

    // --- NPCs جالسون أمام الأجهزة ---
    for (let i = 0; i < chairs.length; i++) {
      const ch = chairs[i];
      // 70% احتمال أن تكون الكرسي مشغولة
      if (Math.random() > 0.70) continue;

      _npcs.push(_createNPC({
        x:       ch.x,
        y:       ch.y,
        state:   'sitting',
        palette: PALETTES[i % PALETTES.length],
        sitDir:  _sitDirection(ch.deviceType)
      }));
    }

    // --- NPCs يتجولون ---
    const wanderCount = 6;
    for (let i = 0; i < wanderCount; i++) {
      _npcs.push(_createNPC({
        x:       Utils.randInt(100, world.w - 100),
        y:       Utils.randInt(100, world.h - 100),
        state:   'wander',
        palette: PALETTES[Utils.randInt(0, PALETTES.length - 1)]
      }));
    }
  }

  function _createNPC({ x, y, state, palette, sitDir = 'down' }) {
    return {
      x, y,
      state,          // 'sitting' | 'wander'
      palette,
      dir:       sitDir,
      frame:     0,
      frameTimer:0,
      moving:    false,

      // للتجوال
      targetX:   x,
      targetY:   y,
      waitTimer: Utils.randFloat(1, 3),
      waiting:   true,

      // للجلوس
      sitDir,
      sitAnim:   0,     // تأثير هزّ الرأس عند الجلوس
      sitTimer:  0
    };
  }

  function _sitDirection(deviceType) {
    // الأجهزة على الجدار العلوي → الـ NPC ينظر للأسفل
    // الأجهزة على الجدار السفلي → للأعلى
    // الحواسيب على اليسار → لليمين
    if (deviceType === 'pc')  return 'right';
    if (deviceType === 'psp') return 'up';
    return 'down';
  }

  /* ==============================
     التحديث كل إطار
     ============================== */
  function update(delta) {
    for (const npc of _npcs) {
      if (npc.state === 'sitting') {
        _updateSitting(npc, delta);
      } else {
        _updateWander(npc, delta);
      }
    }
  }

  /* ---- تحديث الجالس ---- */
  function _updateSitting(npc, delta) {
    npc.moving  = false;
    npc.frame   = 0;
    npc.sitTimer += delta;

    // تأثير هزّ طفيف كأنه يتفاعل مع اللعبة
    if (npc.sitTimer > 1.5) {
      npc.sitTimer = 0;
      npc.sitAnim  = Utils.randInt(0, 2);
    }
  }

  /* ---- تحديث التجوال ---- */
  function _updateWander(npc, delta) {
    if (npc.waiting) {
      npc.waitTimer -= delta;
      npc.moving     = false;
      npc.frame      = 0;
      if (npc.waitTimer <= 0) {
        _pickNewTarget(npc);
        npc.waiting = false;
      }
      return;
    }

    // تحرك نحو الهدف
    const dx    = npc.targetX - npc.x;
    const dy    = npc.targetY - npc.y;
    const dist  = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      // وصلنا — انتظر
      npc.x       = npc.targetX;
      npc.y       = npc.targetY;
      npc.waiting = true;
      npc.waitTimer = Utils.randFloat(1.5, 4);
      npc.moving  = false;
      return;
    }

    npc.moving = true;
    const speed = WALK_SPEED * delta;
    const nx    = dx / dist;
    const ny    = dy / dist;

    // حل التصادم
    const rect   = { x: npc.x, y: npc.y, w: NPC_W, h: NPC_H };
    const result = Collision.resolveMovement(rect, nx * speed, ny * speed);
    const world  = GameMap.getWorldSize();
    const clamped= Collision.clampToWorld({ ...result, w: NPC_W, h: NPC_H }, world);

    // إذا تصادم اختر هدفاً جديداً
    if (result.colX || result.colY) {
      _pickNewTarget(npc);
      npc.waiting   = true;
      npc.waitTimer = Utils.randFloat(0.5, 1.5);
      return;
    }

    npc.x = clamped.x;
    npc.y = clamped.y;

    // تحديث الاتجاه
    if (Math.abs(dx) > Math.abs(dy)) {
      npc.dir = dx > 0 ? 'right' : 'left';
    } else {
      npc.dir = dy > 0 ? 'down' : 'up';
    }

    // animation
    npc.frameTimer += delta;
    if (npc.frameTimer >= FRAME_TIME) {
      npc.frameTimer -= FRAME_TIME;
      npc.frame = (npc.frame + 1) % 3;
    }
  }

  function _pickNewTarget(npc) {
    const world = GameMap.getWorldSize();
    const pad   = 80;
    npc.targetX = Utils.randInt(pad, world.w - pad);
    npc.targetY = Utils.randInt(pad, world.h - pad);
  }

  /* ==============================
     الرسم
     ============================== */
  function draw(ctx) {
    for (const npc of _npcs) {
      if (!Camera.isVisible({ x: npc.x - 10, y: npc.y - 10, w: NPC_W + 20, h: NPC_H + 20 })) continue;
      _drawNPC(ctx, npc);
    }
  }

  function _drawNPC(ctx, npc) {
    const { x, y, palette, dir, frame, moving, state, sitAnim } = npc;
    const p = palette;

    // ظل
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + NPC_W / 2, y + NPC_H + 2, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (state === 'sitting') {
      _drawSitting(ctx, x, y, p, dir, sitAnim);
    } else {
      _drawWalking(ctx, x, y, p, dir, frame, moving);
    }
  }

  /* ---- رسم الجالس ---- */
  function _drawSitting(ctx, x, y, p, dir, sitAnim) {
    const bobY = sitAnim === 1 ? -1 : 0;

    // أرجل (ممدودة للأمام كأنه جالس)
    ctx.fillStyle = p.body;
    ctx.fillRect(x + 4, y + 18, 5, 6);
    ctx.fillRect(x + 11, y + 18, 5, 6);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 3,  y + 23, 7, 3);
    ctx.fillRect(x + 10, y + 23, 7, 3);

    // جسم
    ctx.fillStyle = p.body;
    ctx.fillRect(x + 4, y + 10 + bobY, 12, 10);

    // ذراعان (ممدودتان للأمام كأنه يمسك جهاز التحكم)
    ctx.fillStyle = p.body;
    ctx.fillRect(x + 1,  y + 12 + bobY, 4, 6);
    ctx.fillRect(x + 15, y + 12 + bobY, 4, 6);

    // يدان
    ctx.fillStyle = p.skin;
    ctx.fillRect(x + 1,  y + 17 + bobY, 4, 3);
    ctx.fillRect(x + 15, y + 17 + bobY, 4, 3);

    // رأس
    ctx.fillStyle = p.skin;
    ctx.fillRect(x + 4, y + 1 + bobY, 12, 11);

    // شعر
    ctx.fillStyle = p.hair;
    ctx.fillRect(x + 4, y + 1 + bobY, 12, 4);

    // عيون مركّزة على الشاشة
    _drawSimpleEyes(ctx, x, y + bobY, dir, p.hair);
  }

  /* ---- رسم المشي ---- */
  function _drawWalking(ctx, x, y, p, dir, frame, moving) {
    const swing = moving ? (frame === 1 ? 3 : frame === 2 ? -3 : 0) : 0;

    // أرجل
    ctx.fillStyle = p.body;
    ctx.fillRect(x + 4,  y + 18, 5, 6 + swing);
    ctx.fillRect(x + 11, y + 18, 5, 6 - swing);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 3,  y + 23 + swing, 7, 3);
    ctx.fillRect(x + 10, y + 23 - swing, 7, 3);

    // جسم
    ctx.fillStyle = p.body;
    ctx.fillRect(x + 3, y + 10, 14, 10);

    // ذراعان
    const armSwing = moving ? (frame === 1 ? -3 : frame === 2 ? 3 : 0) : 0;
    ctx.fillRect(x,      y + 11, 4, 8 + armSwing);
    ctx.fillRect(x + 16, y + 11, 4, 8 - armSwing);

    // يدان
    ctx.fillStyle = p.skin;
    ctx.fillRect(x,      y + 18 + armSwing, 4, 3);
    ctx.fillRect(x + 16, y + 18 - armSwing, 4, 3);

    // رأس
    ctx.fillStyle = p.skin;
    ctx.fillRect(x + 4, y + 1, 12, 11);

    // شعر
    ctx.fillStyle = p.hair;
    ctx.fillRect(x + 4, y + 1, 12, 4);

    _drawSimpleEyes(ctx, x, y, dir, p.hair);
  }

  /* ---- عيون بسيطة ---- */
  function _drawSimpleEyes(ctx, x, y, dir, color) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 6,  y + 5, 3, 3);
    ctx.fillRect(x + 11, y + 5, 3, 3);
    ctx.fillStyle = color;
    const ox = dir === 'right' ? 1 : dir === 'left' ? 0 : 0;
    const oy = dir === 'down'  ? 1 : dir === 'up'   ? 0 : 1;
    ctx.fillRect(x + 6  + ox, y + 5 + oy, 2, 2);
    ctx.fillRect(x + 11 + ox, y + 5 + oy, 2, 2);
  }

  /* ==============================
     تصدير
     ============================== */
  return { init, update, draw };

})();