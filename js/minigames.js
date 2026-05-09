/* ==============================
   NCORE GAME — minigames.js
   ألعاب مصغّرة داخل شاشات الأجهزة
   ============================== */

'use strict';

const MiniGames = (() => {

  let _running  = false;
  let _activePC = 0;        // اللعبة النشطة على الحاسوب (0,1,2)
  let _pcTimer  = 0;        // مؤقت تبديل ألعاب PC

  const PC_SWITCH_TIME = 8; // ثواني بين كل لعبة

  /* ==============================
     رسم ألعاب PS (PS1 & PS2)
     شخصية تقفز على منصات
     ============================== */
  function drawPS(ctx, x, y, w, h, type, t) {
    // خلفية المرحلة
    _drawPSBackground(ctx, x, y, w, h, type, t);
    // منصات
    _drawPlatforms(ctx, x, y, w, h, t);
    // الشخصية الرئيسية
    _drawPSHero(ctx, x, y, w, h, type, t);
    // عدو
    _drawPSEnemy(ctx, x, y, w, h, t);
    // HUD داخل الشاشة
    _drawPSHUD(ctx, x, y, w, type);
  }

  /* ---- خلفية PS ---- */
  function _drawPSBackground(ctx, x, y, w, h, type, t) {
    if (type === 'ps1') {
      // سماء ليلية
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#000020');
      grad.addColorStop(1, '#100040');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      // نجوم
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 20; i++) {
        const sx = x + ((i * 37 + 5) % w);
        const sy = y + ((i * 53 + 7) % (h * 0.6));
        const br = Math.sin(t * 2 + i) > 0 ? 1 : 0;
        if (br) ctx.fillRect(sx, sy, 1, 1);
      }
      // أرضية
      ctx.fillStyle = '#1a0040';
      ctx.fillRect(x, y + h - 12, w, 12);
      ctx.fillStyle = '#2a0060';
      ctx.fillRect(x, y + h - 14, w, 3);
    } else {
      // غابة (PS2)
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#001a00');
      grad.addColorStop(1, '#003300');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      // أشجار خلفية
      for (let i = 0; i < 5; i++) {
        const tx = x + 10 + i * (w / 5);
        const ty = y + h * 0.3;
        ctx.fillStyle = '#002800';
        ctx.fillRect(tx - 12, ty, 24, h * 0.7);
        ctx.fillStyle = '#004000';
        ctx.beginPath();
        ctx.moveTo(tx, ty - 20);
        ctx.lineTo(tx - 16, ty + 10);
        ctx.lineTo(tx + 16, ty + 10);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#005500';
        ctx.beginPath();
        ctx.moveTo(tx, ty - 35);
        ctx.lineTo(tx - 12, ty - 10);
        ctx.lineTo(tx + 12, ty - 10);
        ctx.closePath(); ctx.fill();
      }
      // أرضية
      ctx.fillStyle = '#1a3300';
      ctx.fillRect(x, y + h - 12, w, 12);
      ctx.fillStyle = '#225500';
      ctx.fillRect(x, y + h - 14, w, 3);
    }
  }

  /* ---- منصات ---- */
  function _drawPlatforms(ctx, x, y, w, h, t) {
    const platforms = [
      { rx: 0.05, ry: 0.72, rw: 0.20, rh: 0.06 },
      { rx: 0.35, ry: 0.55, rw: 0.20, rh: 0.06 },
      { rx: 0.65, ry: 0.40, rw: 0.20, rh: 0.06 },
      { rx: 0.10, ry: 0.38, rw: 0.15, rh: 0.06 }
    ];
    for (const p of platforms) {
      const px = x + p.rx * w;
      const py = y + p.ry * h;
      const pw = p.rw * w;
      const ph = p.rh * h;
      ctx.fillStyle = '#3a2a0a';
      ctx.fillRect(px, py + 2, pw, ph);
      ctx.fillStyle = '#6a4a1a';
      ctx.fillRect(px, py, pw, ph - 2);
      // حشيش
      ctx.fillStyle = '#2a6a00';
      for (let gx = px + 2; gx < px + pw - 2; gx += 4) {
        ctx.fillRect(gx, py - 2, 2, 3);
      }
    }
  }

  /* ---- بطل PS ---- */
  function _drawPSHero(ctx, x, y, w, h, type, t) {
    // قفز جيبي بسيط
    const jumpCycle = Math.sin(t * 2.5);
    const jumpY     = jumpCycle > 0 ? jumpCycle * 18 : 0;
    const onGround  = jumpY < 1;
    const runFrame  = Math.floor(t * 8) % 2;

    // موضع الشخصية يتحرك يميناً وشمالاً
    const heroX = x + 8 + ((Math.sin(t * 0.4) + 1) / 2) * (w - 28);
    const heroY = y + h - 24 - jumpY;

    if (type === 'ps1') {
      // شخصية كلاسيكية (مربعة)
      // جسم
      ctx.fillStyle = '#c83020';
      ctx.fillRect(heroX + 4, heroY + 8, 10, 10);
      // رأس
      ctx.fillStyle = '#f0a060';
      ctx.fillRect(heroX + 3, heroY + 1, 12, 9);
      // شعر
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(heroX + 3, heroY + 1, 12, 3);
      // عيون
      ctx.fillStyle = '#fff';
      ctx.fillRect(heroX + 5,  heroY + 4, 3, 3);
      ctx.fillRect(heroX + 10, heroY + 4, 3, 3);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(heroX + 6,  heroY + 5, 2, 2);
      ctx.fillRect(heroX + 11, heroY + 5, 2, 2);
      // رجلان
      if (onGround) {
        ctx.fillStyle = '#6a2a00';
        ctx.fillRect(heroX + 4,  heroY + 17, 4, 5 + (runFrame * 2));
        ctx.fillRect(heroX + 10, heroY + 17, 4, 5 - (runFrame * 2));
      } else {
        ctx.fillStyle = '#6a2a00';
        ctx.fillRect(heroX + 3,  heroY + 17, 5, 4);
        ctx.fillRect(heroX + 10, heroY + 17, 5, 4);
      }
      // ظل
      if (jumpY > 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(heroX + 9, y + h - 10, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // شخصية PS2 (أكثر تفصيلاً)
      ctx.fillStyle = '#2060c0';
      ctx.fillRect(heroX + 3, heroY + 8, 12, 11);
      // درع صدر
      ctx.fillStyle = '#4080e0';
      ctx.fillRect(heroX + 5, heroY + 9, 8, 6);
      // رأس
      ctx.fillStyle = '#f0d0b0';
      ctx.fillRect(heroX + 3, heroY + 1, 12, 9);
      // خوذة
      ctx.fillStyle = '#1040a0';
      ctx.fillRect(heroX + 3, heroY + 1, 12, 4);
      ctx.fillRect(heroX + 2, heroY + 3, 14, 2);
      // عيون
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(heroX + 5,  heroY + 5, 3, 3);
      ctx.fillRect(heroX + 10, heroY + 5, 3, 3);
      // أرجل
      ctx.fillStyle = '#1040a0';
      if (onGround) {
        ctx.fillRect(heroX + 4,  heroY + 18, 4, 5 + (runFrame * 2));
        ctx.fillRect(heroX + 10, heroY + 18, 4, 5 - (runFrame * 2));
      } else {
        ctx.fillRect(heroX + 3,  heroY + 18, 5, 4);
        ctx.fillRect(heroX + 10, heroY + 18, 5, 4);
      }
      // ذراع مع سلاح
      ctx.fillStyle = '#2060c0';
      ctx.fillRect(heroX + 15, heroY + 9, 4, 8);
      ctx.fillStyle = '#888';
      ctx.fillRect(heroX + 18, heroY + 8, 2, 10);
    }
  }

  /* ---- عدو PS ---- */
  function _drawPSEnemy(ctx, x, y, w, h, t) {
    const ex = x + w * 0.6 + Math.sin(t * 1.5) * w * 0.25;
    const ey = y + h - 22;

    // جسم العدو (مربع أحمر)
    ctx.fillStyle = '#aa0000';
    ctx.fillRect(ex + 2, ey + 6, 14, 12);
    // رأس
    ctx.fillStyle = '#cc2200';
    ctx.fillRect(ex, ey, 18, 9);
    // قرنان
    ctx.fillStyle = '#880000';
    ctx.fillRect(ex + 2, ey - 4, 3, 5);
    ctx.fillRect(ex + 13, ey - 4, 3, 5);
    // عيون حمراء
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(ex + 3,  ey + 2, 4, 4);
    ctx.fillRect(ex + 11, ey + 2, 4, 4);
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(ex + 4,  ey + 3, 2, 2);
    ctx.fillRect(ex + 12, ey + 3, 2, 2);
    // أرجل
    const ef = Math.floor(t * 4) % 2;
    ctx.fillStyle = '#880000';
    ctx.fillRect(ex + 3,  ey + 17, 5, 4 + ef);
    ctx.fillRect(ex + 10, ey + 17, 5, 4 - ef + 1);
  }

  /* ---- HUD PS ---- */
  function _drawPSHUD(ctx, x, y, w, type) {
    const score = Math.floor(Date.now() / 100) % 99990;
    Utils.drawPixelText(ctx, `SCORE ${String(score).padStart(5,'0')}`, x + 4, y + 3, {
      font: '5px "Press Start 2P"', color: '#ffffff'
    });
    Utils.drawPixelText(ctx, type.toUpperCase(), x + w - 4, y + 3, {
      font: '5px "Press Start 2P"', color: '#f0c040', align: 'right'
    });
    // قلوب
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#ff2040';
      ctx.fillRect(x + 4 + i * 12, y + 10, 4, 4);
      ctx.fillRect(x + 6 + i * 12, y + 8,  4, 4);
      ctx.fillRect(x + 5 + i * 12, y + 13, 6, 2);
    }
  }

  /* ==============================
     رسم ألعاب PC
     تتبدل كل بضع ثوان
     ============================== */
  function drawPC(ctx, x, y, w, h, t) {
    _pcTimer = t % (PC_SWITCH_TIME * 3);
    _activePC = Math.floor(_pcTimer / PC_SWITCH_TIME);

    switch (_activePC) {
      case 0: _drawFireboy(ctx, x, y, w, h, t); break;
      case 1: _drawHobo(ctx, x, y, w, h, t);    break;
      case 2: _drawStickFight(ctx, x, y, w, h, t); break;
    }

    // اسم اللعبة
    const names = ['Fireboy & Watergirl', 'Hobo', 'Stick Fight'];
    Utils.drawPixelText(ctx, names[_activePC], x + w / 2, y + 4, {
      font: '6px "Press Start 2P"', color: '#f0c040', align: 'center'
    });

    // شريط تقدم التبديل
    const prog = (_pcTimer % PC_SWITCH_TIME) / PC_SWITCH_TIME;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x + 4, y + h - 4, w - 8, 3);
    ctx.fillStyle = '#40f080';
    ctx.fillRect(x + 4, y + h - 4, (w - 8) * prog, 3);
  }

  /* ---- لعبة Fireboy & Watergirl ---- */
  function _drawFireboy(ctx, x, y, w, h, t) {
    // خلفية معبد
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#1a0a00');
    grad.addColorStop(1, '#3a1a00');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y + 14, w, h - 14);

    // جدران المعبد
    ctx.fillStyle = '#2a1a08';
    ctx.fillRect(x,         y + 14, 20, h - 14);
    ctx.fillRect(x + w - 20, y + 14, 20, h - 14);
    // تفاصيل حجرية
    ctx.fillStyle = '#1a0a00';
    for (let row = 0; row < 4; row++) {
      for (let side = 0; side < 2; side++) {
        const bx = side === 0 ? x + 2 : x + w - 18;
        ctx.fillRect(bx, y + 18 + row * 14, 16, 10);
      }
    }

    // أرضية
    ctx.fillStyle = '#3a2a10';
    ctx.fillRect(x + 20, y + h - 14, w - 40, 14);

    // بلاطات
    ctx.fillStyle = '#2a1a08';
    for (let bx = x + 22; bx < x + w - 22; bx += 16) {
      ctx.fillRect(bx, y + h - 14, 14, 1);
    }

    // منصات
    const plats = [
      { rx: 0.12, ry: 0.6, rw: 0.25 },
      { rx: 0.55, ry: 0.45, rw: 0.25 },
      { rx: 0.25, ry: 0.30, rw: 0.2 }
    ];
    for (const p of plats) {
      const px = x + p.rx * w, py = y + p.ry * h, pw = p.rw * w;
      ctx.fillStyle = '#4a3010';
      ctx.fillRect(px, py + 3, pw, 8);
      ctx.fillStyle = '#6a4a20';
      ctx.fillRect(px, py, pw, 4);
    }

    // بوابة النار (يمين)
    const gateX = x + w - 32;
    const gateY = y + h - 50;
    ctx.fillStyle = '#ff4400';
    for (let fl = 0; fl < 5; fl++) {
      const fy = gateY + Math.sin(t * 4 + fl) * 3;
      ctx.fillStyle = `rgba(255,${68 + fl * 20},0,${0.6 + fl * 0.08})`;
      ctx.fillRect(gateX + fl * 5 - 2, fy, 6, 30 - fl * 3);
    }

    // بوابة الماء (يسار)
    const wgX = x + 16;
    const wgY = y + h - 50;
    ctx.fillStyle = '#0080ff';
    for (let wl = 0; wl < 5; wl++) {
      const wy = wgY + Math.cos(t * 3 + wl) * 3;
      ctx.fillStyle = `rgba(0,${128 + wl * 20},255,${0.6 + wl * 0.08})`;
      ctx.fillRect(wgX + wl * 5 - 2, wy, 6, 30 - wl * 3);
    }

    // شخصية Fireboy
    const fbJump = Math.max(0, Math.sin(t * 2.8)) * 20;
    const fbX    = x + 30 + Math.sin(t * 0.6) * (w * 0.3);
    const fbY    = y + h - 38 - fbJump;
    _drawFireboyChar(ctx, fbX, fbY, t);

    // شخصية Watergirl
    const wgJump = Math.max(0, Math.sin(t * 2.8 + 1.2)) * 20;
    const wgX    = x + w * 0.55 + Math.sin(t * 0.5 + 1) * (w * 0.25);
    const wgY    = y + h - 38 - wgJump;
    _drawWatergirlChar(ctx, wgX, wgY, t);

    // جواهر
    for (let i = 0; i < 4; i++) {
      const jx = x + 35 + i * (w / 5);
      const jy = y + h * 0.55 + Math.sin(t * 2 + i) * 3;
      ctx.fillStyle = i % 2 === 0 ? '#ff4400' : '#0080ff';
      ctx.beginPath();
      ctx.moveTo(jx,     jy - 5);
      ctx.lineTo(jx + 4, jy);
      ctx.lineTo(jx,     jy + 5);
      ctx.lineTo(jx - 4, jy);
      ctx.closePath(); ctx.fill();
    }
  }

  function _drawFireboyChar(ctx, x, y, t) {
    const run = Math.floor(t * 8) % 2;
    ctx.fillStyle = '#c83020';
    ctx.fillRect(x + 4, y + 8, 10, 12);
    ctx.fillStyle = '#f0a060';
    ctx.fillRect(x + 3, y + 1, 12, 9);
    ctx.fillStyle = '#ff6000';
    ctx.fillRect(x + 3, y, 12, 3);
    ctx.fillRect(x + 6, y - 4, 4, 5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 5, y + 4, 3, 3);
    ctx.fillRect(x + 10, y + 4, 3, 3);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 6, y + 5, 2, 2);
    ctx.fillRect(x + 11, y + 5, 2, 2);
    ctx.fillStyle = '#8b3010';
    ctx.fillRect(x + 4,  y + 19, 4, 5 + run * 2);
    ctx.fillRect(x + 10, y + 19, 4, 5 - run * 2 + 1);
  }

  function _drawWatergirlChar(ctx, x, y, t) {
    const run = Math.floor(t * 8 + 1) % 2;
    ctx.fillStyle = '#2080e0';
    ctx.fillRect(x + 3, y + 8, 12, 12);
    ctx.fillStyle = '#f0d0b0';
    ctx.fillRect(x + 3, y + 1, 12, 9);
    ctx.fillStyle = '#0050b0';
    ctx.fillRect(x + 2, y, 14, 4);
    ctx.fillRect(x + 2, y + 4, 3, 6);
    ctx.fillRect(x + 13, y + 4, 3, 6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 5, y + 4, 3, 3);
    ctx.fillRect(x + 10, y + 4, 3, 3);
    ctx.fillStyle = '#4090ff';
    ctx.fillRect(x + 6, y + 5, 2, 2);
    ctx.fillRect(x + 11, y + 5, 2, 2);
    ctx.fillStyle = '#1060c0';
    ctx.fillRect(x + 4,  y + 19, 4, 5 + run * 2);
    ctx.fillRect(x + 10, y + 19, 4, 5 - run * 2 + 1);
  }

  /* ---- لعبة Hobo ---- */
  function _drawHobo(ctx, x, y, w, h, t) {
    // خلفية شارع
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, y + 14, w, h - 14);
    // رصيف
    ctx.fillStyle = '#383838';
    ctx.fillRect(x, y + h - 16, w, 16);
    ctx.fillStyle = '#444';
    for (let lx = x; lx < x + w; lx += 20) {
      ctx.fillRect(lx, y + h - 16, 18, 1);
    }
    // مباني خلفية
    const bldgs = [
      { rx: 0.02, ry: 0.3, rw: 0.18, rh: 0.7, c: '#1a1a2a' },
      { rx: 0.22, ry: 0.2, rw: 0.14, rh: 0.8, c: '#2a1a1a' },
      { rx: 0.38, ry: 0.35, rw: 0.16, rh: 0.65, c: '#1a2a1a' },
      { rx: 0.60, ry: 0.25, rw: 0.18, rh: 0.75, c: '#1a1a1a' },
      { rx: 0.80, ry: 0.30, rw: 0.18, rh: 0.7, c: '#2a2a1a' }
    ];
    for (const b of bldgs) {
      ctx.fillStyle = b.c;
      ctx.fillRect(x + b.rx * w, y + b.ry * h, b.rw * w, b.rh * h);
      // نوافذ
      ctx.fillStyle = 'rgba(255,200,50,0.4)';
      for (let wr = 0; wr < 4; wr++) {
        for (let wc = 0; wc < 2; wc++) {
          if (Math.random() > 0.3) {
            ctx.fillRect(
              x + b.rx * w + 4 + wc * 10,
              y + b.ry * h + 8 + wr * 12,
              6, 8
            );
          }
        }
      }
    }

    // Hobo الرئيسي
    const hbX = x + 20 + ((Math.sin(t * 0.5) + 1) / 2) * (w - 50);
    const hbY = y + h - 38;
    const hbRun = Math.floor(t * 6) % 2;
    _drawHoboChar(ctx, hbX, hbY, hbRun, 'right');

    // عدو شرطي
    const copX = x + w * 0.65 + Math.sin(t * 1.2) * w * 0.2;
    const copY = y + h - 38;
    _drawCopChar(ctx, copX, copY, Math.floor(t * 5) % 2);

    // أشياء تُرمى (حجارة)
    for (let i = 0; i < 3; i++) {
      const rx = x + 30 + i * 70 + Math.sin(t * 3 + i * 2) * 15;
      const ry = y + h - 24 + Math.sin(t * 4 + i) * 4;
      ctx.fillStyle = '#888';
      ctx.fillRect(rx, ry, 5, 4);
    }

    // نص لعبة
    Utils.drawPixelText(ctx, 'BEAT EM UP!', x + w / 2, y + h - 10, {
      font: '5px "Press Start 2P"', color: '#ff4400', align: 'center'
    });
  }

  function _drawHoboChar(ctx, x, y, frame, dir) {
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(x + 4, y + 8, 12, 12);
    ctx.fillStyle = '#d4956a';
    ctx.fillRect(x + 4, y + 1, 12, 9);
    ctx.fillStyle = '#3a2a10';
    ctx.fillRect(x + 2, y, 16, 3);
    ctx.fillRect(x + 5, y - 5, 10, 6);
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 5, y + 8, 10, 4);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 5,  y + 19, 4, 4 + frame * 2);
    ctx.fillRect(x + 11, y + 19, 4, 4 - frame * 2 + 1);
    // عصا
    ctx.fillStyle = '#8b6040';
    ctx.fillRect(x + 17, y + 6, 2, 18);
  }

  function _drawCopChar(ctx, x, y, frame) {
    ctx.fillStyle = '#1a3a6a';
    ctx.fillRect(x + 4, y + 8, 12, 12);
    ctx.fillStyle = '#e0c090';
    ctx.fillRect(x + 4, y + 1, 12, 9);
    ctx.fillStyle = '#1a1a6a';
    ctx.fillRect(x + 3, y, 14, 4);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x + 8, y + 1, 4, 2);
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 5,  y + 19, 4, 4 + frame * 2);
    ctx.fillRect(x + 11, y + 19, 4, 4 - frame * 2 + 1);
    // هراوة
    ctx.fillStyle = '#4a2a00';
    ctx.fillRect(x - 2, y + 10, 2, 14);
    ctx.fillRect(x - 4, y + 10, 6, 4);
  }

  /* ---- لعبة Stick Fight ---- */
  function _drawStickFight(ctx, x, y, w, h, t) {
    // خلفية
    const grad = ctx.createLinearGradient(x, y + 14, x, y + h);
    grad.addColorStop(0, '#001a33');
    grad.addColorStop(1, '#003366');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y + 14, w, h - 14);

    // أرضية
    ctx.fillStyle = '#1a4466';
    ctx.fillRect(x, y + h - 14, w, 14);
    ctx.fillStyle = '#2a5577';
    ctx.fillRect(x, y + h - 16, w, 3);

    // منصات عائمة
    const sPlats = [
      { rx: 0.1,  ry: 0.55, rw: 0.22 },
      { rx: 0.45, ry: 0.42, rw: 0.22 },
      { rx: 0.72, ry: 0.58, rw: 0.22 }
    ];
    for (const p of sPlats) {
      const px = x + p.rx * w, py = y + p.ry * h, pw = p.rw * w;
      ctx.fillStyle = '#1a3a66';
      ctx.fillRect(px, py + 2, pw, 8);
      ctx.fillStyle = '#2a5a88';
      ctx.fillRect(px, py, pw, 3);
    }

    // Stickman 1
    const s1X = x + 25 + Math.sin(t * 0.7) * (w * 0.3);
    _drawStickman(ctx, s1X, y + h - 36, t, '#ffffff', 1);

    // Stickman 2
    const s2X = x + w * 0.6 + Math.sin(t * 0.6 + 1.5) * (w * 0.25);
    _drawStickman(ctx, s2X, y + h - 36, t + 0.5, '#ff4444', -1);

    // تأثيرات قتال
    if (Math.sin(t * 3) > 0.7) {
      ctx.fillStyle = 'rgba(255,200,0,0.8)';
      const ex = (s1X + s2X) / 2;
      ctx.beginPath();
      for (let sp = 0; sp < 6; sp++) {
        const angle = (sp / 6) * Math.PI * 2 + t * 5;
        ctx.moveTo(ex, y + h - 28);
        ctx.lineTo(ex + Math.cos(angle) * 12, y + h - 28 + Math.sin(angle) * 12);
      }
      ctx.strokeStyle = 'rgba(255,200,0,0.8)';
      ctx.lineWidth = 2; ctx.stroke();
    }
  }

  function _drawStickman(ctx, x, y, t, color, dir) {
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    // رأس
    ctx.beginPath(); ctx.arc(x + 9, y + 6, 5, 0, Math.PI * 2); ctx.stroke();
    // جذع
    ctx.beginPath(); ctx.moveTo(x + 9, y + 11); ctx.lineTo(x + 9, y + 22); ctx.stroke();
    // ذراعان قتالية
    const armA = Math.sin(t * 4) * 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 14);
    ctx.lineTo(x + 9 + Math.cos(armA) * 10 * dir, y + 14 + Math.sin(armA) * 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 14);
    ctx.lineTo(x + 9 - Math.cos(armA + 1) * 10 * dir, y + 14 + Math.sin(armA + 1) * 8);
    ctx.stroke();
    // رجلان
    const legA = Math.sin(t * 5) * 0.6;
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 22);
    ctx.lineTo(x + 9 + Math.cos(legA) * 8,  y + 22 + Math.sin(Math.abs(legA)) * 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 22);
    ctx.lineTo(x + 9 - Math.cos(legA) * 8, y + 22 + Math.sin(Math.abs(legA) + 0.5) * 10);
    ctx.stroke();
  }

  /* ==============================
     إيقاف
     ============================== */
  function stop() {
    _running  = false;
    _activePC = 0;
    _pcTimer  = 0;
  }

  /* ==============================
     تصدير
     ============================== */
  return { drawPS, drawPC, stop };

})();