/* ==============================
   NCORE GAME — map.js
   بناء خريطة صالة الألعاب ورسمها
   ============================== */

'use strict';

const GameMap = (() => {

  /* ==============================
     ثوابت العالم
     ============================== */
  const WORLD_W    = 1920;
  const WORLD_H    = 1440;
  const TILE       = 32;     // حجم البلاطة الأساسية
  const WALL_T     = TILE;   // سُمك الجدار

  // مدخل الصالة (يمين الخريطة)
  const DOOR_X     = WORLD_W - WALL_T;
  const DOOR_Y     = WORLD_H / 2 - 48;
  const DOOR_W     = WALL_T;
  const DOOR_H     = 96;

  // نقطة تولّد اللاعب (أمام المدخل مباشرة)
  const SPAWN_X    = WORLD_W - WALL_T - 48;
  const SPAWN_Y    = WORLD_H / 2 - 16;

  /* ==============================
     قوائم العناصر
     ============================== */
  let _obstacles = [];   // حواجز الـ Collision
  let _devices   = [];   // أجهزة تفاعلية
  let _chairs    = [];   // كراسي NPC
  let _lights    = [];   // مصابيح الزينة

  /* ==============================
     الإعداد — بناء الخريطة
     ============================== */
  function init() {
    _obstacles = [];
    _devices   = [];
    _chairs    = [];
    _lights    = [];

    _buildWalls();
    _buildDevices();
    _buildDecorations();

    // تمرير الحواجز لنظام الـ Collision
    Collision.setObstacles(_obstacles);
  }

  /* ==============================
     بناء الجدران
     ============================== */
  function _buildWalls() {
    const W = WORLD_W, H = WORLD_H, T = WALL_T;

    // جدار علوي
    _addWall(0, 0, W, T);
    // جدار سفلي
    _addWall(0, H - T, W, T);
    // جدار يساري
    _addWall(0, T, T, H - T * 2);
    // جدار يميني — مع فتحة المدخل
    _addWall(W - T, T,          T, DOOR_Y - T);
    _addWall(W - T, DOOR_Y + DOOR_H, T, H - T - (DOOR_Y + DOOR_H));

    // إطار المدخل (حاجز رمزي للزخرفة)
    _obstacles.push({ x: DOOR_X, y: DOOR_Y - 8,        w: 4, h: 8,      type: 'door_frame' });
    _obstacles.push({ x: DOOR_X, y: DOOR_Y + DOOR_H,   w: 4, h: 8,      type: 'door_frame' });
  }

  function _addWall(x, y, w, h) {
    _obstacles.push({ x, y, w, h, type: 'wall' });
  }

  /* ==============================
     بناء الأجهزة
     ============================== */
  function _buildDevices() {
    const pad = WALL_T + 8;

    /* ---- PS1 (3 وحدات) — الجدار العلوي ---- */
    const ps1Positions = [200, 400, 600];
    for (const px of ps1Positions) {
      _addDevice({ x: px, y: pad, w: 96, h: 72, type: 'ps1', label: 'PlayStation 1' });
    }

    /* ---- PS2 (3 وحدات) — الجدار العلوي (يمين PS1) ---- */
    const ps2Positions = [820, 1020, 1220];
    for (const px of ps2Positions) {
      _addDevice({ x: px, y: pad, w: 96, h: 72, type: 'ps2', label: 'PlayStation 2' });
    }

    /* ---- PSP (3 وحدات) — الجدار السفلي ---- */
    const pspPositions = [300, 650, 1000];
    for (const px of pspPositions) {
      _addDevice({
        x: px,
        y: WORLD_H - WALL_T - 80,
        w: 64, h: 64,
        type: 'psp',
        label: 'PSP'
      });
    }

    /* ---- حواسيب (3 وحدات) — الجدار الأيسر ---- */
    const pcPositions = [250, 500, 750];
    for (const py of pcPositions) {
      _addDevice({ x: pad, y: py, w: 80, h: 64, type: 'pc', label: 'Computer' });
    }

    // تسجيل كراسي للـ NPCs
    _buildChairs();
  }

  function _addDevice(dev) {
    _devices.push(dev);
    _obstacles.push({ x: dev.x, y: dev.y, w: dev.w, h: dev.h, type: 'device' });
  }

  /* ==============================
     كراسي NPC — أمام كل جهاز
     ============================== */
  function _buildChairs() {
    for (const dev of _devices) {
      let cx = dev.x + dev.w / 2 - 8;
      let cy;

      if (dev.y < WORLD_H / 2) {
        // أجهزة الجدار العلوي → الكرسي تحتها
        cy = dev.y + dev.h + 8;
      } else {
        // أجهزة الجدار السفلي → الكرسي فوقها
        cy = dev.y - 32;
      }

      if (dev.x < WORLD_W / 2 && dev.type === 'pc') {
        // حواسيب الجدار الأيسر → الكرسي على يمينها
        cx = dev.x + dev.w + 8;
        cy = dev.y + dev.h / 2 - 8;
      }

      _chairs.push({ x: cx, y: cy, w: 20, h: 20, deviceType: dev.type });
    }
  }

  /* ==============================
     زخارف الصالة
     ============================== */
  function _buildDecorations() {
    // مصابيح السقف (للرسم فقط — لا collision)
    const cols = Math.floor((WORLD_W - WALL_T * 2) / 192);
    const rows = Math.floor((WORLD_H - WALL_T * 2) / 192);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        _lights.push({
          x: WALL_T + 96 + c * 192,
          y: WALL_T + 96 + r * 192
        });
      }
    }
  }

  /* ==============================
     الرسم
     ============================== */
  function draw(ctx) {
    _drawFloor(ctx);
    _drawWalls(ctx);
    _drawDevices(ctx);
    _drawDoor(ctx);
    _drawLights(ctx);
  }

  /* ---- الأرضية ---- */
  function _drawFloor(ctx) {
    // بلاطات متناوبة
    const c1 = '#1a1a2e';
    const c2 = '#16213e';

    for (let row = 0; row < WORLD_H / TILE; row++) {
      for (let col = 0; col < WORLD_W / TILE; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? c1 : c2;
        ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
    }

    // خطوط الشبكة الخفيفة
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth   = 1;
    for (let x = 0; x <= WORLD_W; x += TILE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke();
    }
    for (let y = 0; y <= WORLD_H; y += TILE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
    }

    // سجادة وسط الصالة
    const rugX = WALL_T + 80, rugY = WALL_T + 80;
    const rugW = WORLD_W - WALL_T * 2 - 160;
    const rugH = WORLD_H - WALL_T * 2 - 160;
    ctx.fillStyle   = 'rgba(60,30,80,0.25)';
    ctx.fillRect(rugX, rugY, rugW, rugH);
    ctx.strokeStyle = 'rgba(180,100,240,0.15)';
    ctx.lineWidth   = 3;
    ctx.strokeRect(rugX + 8, rugY + 8, rugW - 16, rugH - 16);
  }

  /* ---- الجدران ---- */
  function _drawWalls(ctx) {
    const W = WORLD_W, H = WORLD_H, T = WALL_T;

    // لون الجدار
    const wallGrad = ctx.createLinearGradient(0, 0, 0, T);
    wallGrad.addColorStop(0, '#2a1a3e');
    wallGrad.addColorStop(1, '#1a0f2e');

    const wallSegs = [
      { x: 0,     y: 0,     w: W,   h: T   },   // علوي
      { x: 0,     y: H - T, w: W,   h: T   },   // سفلي
      { x: 0,     y: T,     w: T,   h: H - T * 2 }, // يساري
      { x: W - T, y: T,     w: T,   h: DOOR_Y - T },            // يميني-أعلى
      { x: W - T, y: DOOR_Y + DOOR_H, w: T, h: H - T - (DOOR_Y + DOOR_H) } // يميني-أسفل
    ];

    for (const seg of wallSegs) {
      // جسم الجدار
      ctx.fillStyle = '#1e1030';
      ctx.fillRect(seg.x, seg.y, seg.w, seg.h);

      // خط حافة داخلية
      ctx.strokeStyle = 'rgba(120,60,200,0.4)';
      ctx.lineWidth   = 2;
      ctx.strokeRect(seg.x + 2, seg.y + 2, seg.w - 4, seg.h - 4);

      // أضواء LED على الجدار العلوي
      if (seg.y === 0) {
        for (let lx = T + 32; lx < W - T; lx += 64) {
          ctx.fillStyle = `hsl(${(lx / W) * 360},80%,60%)`;
          ctx.fillRect(lx, 4, 8, 4);
        }
      }
    }

    // إضاءة جانبية للجدران
    const glowL = ctx.createLinearGradient(T, 0, T + 24, 0);
    glowL.addColorStop(0, 'rgba(120,60,200,0.08)');
    glowL.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowL;
    ctx.fillRect(T, T, 24, H - T * 2);
  }

  /* ---- المدخل ---- */
  function _drawDoor(ctx) {
    const x = DOOR_X, y = DOOR_Y, h = DOOR_H, w = DOOR_W;

    // فتحة المدخل
    ctx.fillStyle = '#0a0510';
    ctx.fillRect(x, y, w + 4, h);

    // إطار المدخل
    ctx.strokeStyle = '#f0c040';
    ctx.lineWidth   = 3;
    ctx.strokeRect(x - 1, y - 2, w + 3, h + 4);

    // سهم اتجاه الدخول
    ctx.fillStyle = 'rgba(240,192,64,0.6)';
    const ax = x + 4, ay = y + h / 2;
    ctx.beginPath();
    ctx.moveTo(ax + 12, ay);
    ctx.lineTo(ax,      ay - 10);
    ctx.lineTo(ax,      ay + 10);
    ctx.closePath();
    ctx.fill();

    // نص ENTER
    Utils.drawPixelText(ctx, 'ENTER', x - 10, y + h + 8, {
      font: '7px "Press Start 2P"', color: '#f0c040', align: 'left'
    });
  }

  /* ---- الأجهزة ---- */
  function _drawDevices(ctx) {
    for (const dev of _devices) {
      if (!Camera.isVisible(dev)) continue;
      switch (dev.type) {
        case 'ps1': _drawPS1(ctx, dev); break;
        case 'ps2': _drawPS2(ctx, dev); break;
        case 'psp': _drawPSP(ctx, dev); break;
        case 'pc':  _drawPC(ctx, dev);  break;
      }
    }
  }

  /* ---- PlayStation 1 ---- */
  function _drawPS1(ctx, d) {
    const { x, y, w, h } = d;

    // طاولة
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x - 6, y + h - 8, w + 12, 12);

    // هيكل التلفاز
    ctx.fillStyle = '#c8c0b0';
    Utils.drawPixelRect(ctx, x, y, w, h - 14, 4, '#b0a898', '#888070', 2);

    // إطار الشاشة
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 8, y + 6, w - 16, h - 28);

    // شاشة التشويش (static)
    _drawStaticScreen(ctx, x + 9, y + 7, w - 18, h - 30);

    // أنوب التلفاز
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(x + w - 10, y + h - 20, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 18, y + h - 20, 4, 0, Math.PI * 2); ctx.fill();

    // جهاز PS1 أسفل التلفاز
    ctx.fillStyle = '#d0c8b8';
    ctx.fillRect(x + 8, y + h - 14, w - 16, 8);
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 12, y + h - 12, w - 24, 4);
    ctx.fillStyle = '#40c0f0';
    ctx.fillRect(x + w / 2 - 2, y + h - 13, 4, 3);

    // اسم
    Utils.drawPixelText(ctx, 'PS1', x + w / 2, y + h + 2, {
      font: '6px "Press Start 2P"', color: '#40c0f0', align: 'center'
    });
  }

  /* ---- PlayStation 2 ---- */
  function _drawPS2(ctx, d) {
    const { x, y, w, h } = d;

    // طاولة
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x - 6, y + h - 8, w + 12, 12);

    // تلفاز أحدث (أرفع)
    Utils.drawPixelRect(ctx, x, y, w, h - 16, 3, '#404040', '#222', 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + 6, y + 5, w - 12, h - 26);
    _drawStaticScreen(ctx, x + 7, y + 6, w - 14, h - 28);

    // قاعدة التلفاز
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + w / 2 - 10, y + h - 18, 20, 4);
    ctx.fillRect(x + w / 2 - 14, y + h - 16, 28, 3);

    // جهاز PS2 (أسود رفيع)
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 4, y + h - 14, w - 8, 10);
    ctx.fillStyle = '#0070d0';
    ctx.fillRect(x + 8, y + h - 12, 18, 6);
    ctx.fillStyle = '#333';
    ctx.fillRect(x + w - 18, y + h - 11, 10, 4);

    Utils.drawPixelText(ctx, 'PS2', x + w / 2, y + h + 2, {
      font: '6px "Press Start 2P"', color: '#0070d0', align: 'center'
    });
  }

  /* ---- PSP ---- */
  function _drawPSP(ctx, d) {
    const { x, y, w, h } = d;

    // جسم PSP
    Utils.drawPixelRect(ctx, x, y + 10, w, h - 10, 8, '#1a1a1a', '#444', 2);

    // شاشة مطفأة
    ctx.fillStyle = '#050510';
    ctx.fillRect(x + 10, y + 14, w - 20, h - 28);
    // انعكاس خفيف
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x + 11, y + 15, (w - 22) / 2, 4);

    // زر Home
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke();

    // D-Pad
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + 8,  y + h - 22, 6, 18);
    ctx.fillRect(x + 5,  y + h - 16, 12, 6);

    // أزرار X O
    ctx.fillStyle = '#00aaff';
    ctx.beginPath(); ctx.arc(x + w - 14, y + h - 12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cc0000';
    ctx.beginPath(); ctx.arc(x + w - 8, y + h - 18, 3, 0, Math.PI * 2); ctx.fill();

    // حامل صغير
    ctx.fillStyle = '#333';
    ctx.fillRect(x + w / 2 - 8, y + h, 16, 6);

    Utils.drawPixelText(ctx, 'PSP', x + w / 2, y + h + 8, {
      font: '6px "Press Start 2P"', color: '#aaa', align: 'center'
    });
  }

  /* ---- حاسوب ---- */
  function _drawPC(ctx, d) {
    const { x, y, w, h } = d;

    // طاولة
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(x - 4, y + h - 4, w + 24, 8);
    ctx.fillRect(x - 4, y + h + 2, 6, 16);
    ctx.fillRect(x + w + 14, y + h + 2, 6, 16);

    // شاشة
    Utils.drawPixelRect(ctx, x, y, w, h - 10, 3, '#1e1e2e', '#404060', 2);
    ctx.fillStyle = '#050520';
    ctx.fillRect(x + 5, y + 5, w - 10, h - 22);
    _drawPCScreen(ctx, x + 6, y + 6, w - 12, h - 24);

    // عنق الشاشة
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(x + w / 2 - 4, y + h - 12, 8, 10);
    ctx.fillRect(x + w / 2 - 10, y + h - 4, 20, 4);

    // لوحة المفاتيح
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(x + w + 4, y + h - 20, 40, 24);
    // مفاتيح صغيرة
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        ctx.fillStyle = '#3a3a5e';
        ctx.fillRect(x + w + 7 + col * 6, y + h - 18 + row * 7, 4, 5);
      }
    }

    // الفأرة
    ctx.fillStyle = '#2a2a3e';
    Utils.drawPixelRect(ctx, x + w + 48, y + h - 14, 12, 18, 3, '#2a2a3e', '#4a4a6e', 1);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w + 54, y + h - 14);
    ctx.lineTo(x + w + 54, y + h - 6);
    ctx.stroke();

    Utils.drawPixelText(ctx, 'PC', x + w / 2, y + h + 6, {
      font: '6px "Press Start 2P"', color: '#40f080', align: 'center'
    });
  }

  /* ---- تشويش التلفاز (Static) ---- */
  function _drawStaticScreen(ctx, x, y, w, h) {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x, y, w, h);

    // حبيبات عشوائية
    for (let i = 0; i < 120; i++) {
      const px  = x + Utils.randInt(0, w - 1);
      const py  = y + Utils.randInt(0, h - 1);
      const br  = Utils.randInt(40, 200);
      ctx.fillStyle = `rgb(${br},${br},${br})`;
      ctx.fillRect(px, py, Utils.randInt(1, 2), 1);
    }

    // خط أبيض أفقي يمر (Scanline وهمي)
    const scanY = y + ((Date.now() / 30) % h);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, scanY, w, 2);
  }

  /* ---- شاشة الحاسوب ---- */
  function _drawPCScreen(ctx, x, y, w, h) {
    // خلفية سطح المكتب
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#000428');
    grad.addColorStop(1, '#004e92');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // نجوم صغيرة
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(
        x + Utils.randInt(2, w - 2),
        y + Utils.randInt(2, h - 2),
        1, 1
      );
    }

    // شريط المهام
    ctx.fillStyle = '#1a1a6a';
    ctx.fillRect(x, y + h - 6, w, 6);
    ctx.fillStyle = '#4040aa';
    ctx.fillRect(x + 1, y + h - 5, 14, 4);
  }

  /* ---- مصابيح السقف ---- */
  function _drawLights(ctx) {
    for (const l of _lights) {
      if (!Camera.isVisible({ x: l.x - 8, y: l.y - 8, w: 16, h: 16 })) continue;

      // هالة ضوئية
      const grd = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 90);
      grd.addColorStop(0, 'rgba(255,240,200,0.06)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(l.x - 90, l.y - 90, 180, 180);

      // مصباح
      ctx.fillStyle = '#fff8e0';
      ctx.fillRect(l.x - 4, l.y - 2, 8, 4);
      ctx.fillStyle = 'rgba(255,240,200,0.9)';
      ctx.fillRect(l.x - 2, l.y - 1, 4, 2);
    }
  }

  /* ==============================
     Getters
     ============================== */
  function getWorldSize()  { return { w: WORLD_W, h: WORLD_H }; }
  function getDevices()    { return _devices; }
  function getChairs()     { return _chairs; }
  function getSpawnPoint() { return { x: SPAWN_X, y: SPAWN_Y }; }
  function getDoorRect()   { return { x: DOOR_X, y: DOOR_Y, w: DOOR_W, h: DOOR_H }; }

  /* ==============================
     تصدير
     ============================== */
  return {
    init,
    draw,
    getWorldSize,
    getDevices,
    getChairs,
    getSpawnPoint,
    getDoorRect
  };

})();