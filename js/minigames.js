/* ==============================
   NCORE GAME — minigames.js
   ألعاب مصغّرة داخل شاشات الأجهزة
   (نسخة محصنة ضد التجمد)
   ============================== */

'use strict';

const MiniGames = (() => {

  let _running  = false;
  let _activePC = 0;
  let _pcTimer  = 0;

  const PC_SWITCH_TIME = 8;

  /* ==============================
     رسم ألعاب PS (PS1 & PS2)
     ============================== */
  function drawPS(ctx, x, y, w, h, type, t) {
    try {
      _drawPSBackground(ctx, x, y, w, h, type, t);
      _drawPlatforms(ctx, x, y, w, h, t);
      _drawPSHero(ctx, x, y, w, h, type, t);
      _drawPSEnemy(ctx, x, y, w, h, t);
      _drawPSHUD(ctx, x, y, w, type);
    } catch (err) {
      console.warn("MiniGames Error (PS):", err);
    }
  }

  function _drawPSBackground(ctx, x, y, w, h, type, t) {
    if (type === 'ps1') {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#000020');
      grad.addColorStop(1, '#100040');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 20; i++) {
        const sx = x + ((i * 37 + 5) % w);
        const sy = y + ((i * 53 + 7) % (h * 0.6));
        if (Math.sin(t * 2 + i) > 0) ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.fillStyle = '#1a0040';
      ctx.fillRect(x, y + h - 12, w, 12);
    } else {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#001a00');
      grad.addColorStop(1, '#003300');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      
      ctx.fillStyle = '#1a3300';
      ctx.fillRect(x, y + h - 12, w, 12);
    }
  }

  function _drawPlatforms(ctx, x, y, w, h, t) {
    const platforms = [
      { rx: 0.05, ry: 0.72, rw: 0.20, rh: 0.06 },
      { rx: 0.35, ry: 0.55, rw: 0.20, rh: 0.06 },
      { rx: 0.65, ry: 0.40, rw: 0.20, rh: 0.06 }
    ];
    platforms.forEach(p => {
      const px = x + p.rx * w, py = y + p.ry * h;
      const pw = p.rw * w, ph = p.rh * h;
      ctx.fillStyle = '#6a4a1a';
      ctx.fillRect(px, py, pw, ph);
    });
  }

  function _drawPSHero(ctx, x, y, w, h, type, t) {
    const heroX = x + 8 + ((Math.sin(t * 0.4) + 1) / 2) * (w - 28);
    const jumpY = Math.max(0, Math.sin(t * 2.5)) * 18;
    const heroY = y + h - 24 - jumpY;

    ctx.fillStyle = (type === 'ps1') ? '#c83020' : '#2060c0';
    ctx.fillRect(heroX + 4, heroY + 8, 10, 10);
    ctx.fillStyle = '#f0a060';
    ctx.fillRect(heroX + 3, heroY + 1, 12, 9);
  }

  function _drawPSEnemy(ctx, x, y, w, h, t) {
    const ex = x + w * 0.6 + Math.sin(t * 1.5) * w * 0.25;
    const ey = y + h - 22;
    ctx.fillStyle = '#aa0000';
    ctx.fillRect(ex, ey, 18, 18);
  }

  function _drawPSHUD(ctx, x, y, w, type) {
    Utils.drawPixelText(ctx, type.toUpperCase(), x + w - 4, y + 3, {
      font: '5px "Press Start 2P"', color: '#f0c040', align: 'right'
    });
  }

  /* ==============================
     رسم ألعاب PC
     ============================== */
  function drawPC(ctx, x, y, w, h, t) {
    try {
      _pcTimer = t % (PC_SWITCH_TIME * 3);
      _activePC = Math.floor(_pcTimer / PC_SWITCH_TIME);

      switch (_activePC) {
        case 0: _drawFireboy(ctx, x, y, w, h, t); break;
        case 1: _drawHobo(ctx, x, y, w, h, t);    break;
        case 2: _drawStickFight(ctx, x, y, w, h, t); break;
      }
    } catch (err) {
      console.warn("MiniGames Error (PC):", err);
    }
  }

  function _drawFireboy(ctx, x, y, w, h, t) {
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(x, y + 14, w, h - 14);
    // رسم بسيط للشخصيات لمنع التعقيد المسبب للبطء
    ctx.fillStyle = '#ff4400';
    ctx.fillRect(x + 30, y + h - 30, 10, 15);
    ctx.fillStyle = '#0080ff';
    ctx.fillRect(x + w - 40, y + h - 30, 10, 15);
  }

  function _drawHobo(ctx, x, y, w, h, t) {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, y + 14, w, h - 14);
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(x + 40, y + h - 30, 12, 12);
  }

  function _drawStickFight(ctx, x, y, w, h, t) {
    ctx.fillStyle = '#001a33';
    ctx.fillRect(x, y + 14, w, h - 14);
    _drawStickman(ctx, x + 30, y + h - 36, t, '#ffffff', 1);
    _drawStickman(ctx, x + w - 40, y + h - 36, t + 0.5, '#ff4444', -1);
  }

  function _drawStickman(ctx, x, y, t, color, dir) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + 9, y + 6, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 9, y + 11); ctx.lineTo(x + 9, y + 22); ctx.stroke();
  }

  function stop() {
    _running = false;
  }

  return { drawPS, drawPC, stop };

})();
