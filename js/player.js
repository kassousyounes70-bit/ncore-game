/* ==============================
   NCORE GAME — player.js
   اللاعب: حركة، رسم، animation + Sprite Sheets
   ============================== */

'use strict';

const Player = (() => {

  /* ==============================
     ثوابت
     ============================== */
  const SPEED        = 160;
  const W            = 24;    // عرض مربع التصادم (الفيزياء)
  const H            = 28;    // ارتفاع مربع التصادم (الفيزياء)
  const FRAME_TIME   = 0.14;
  const SPRITE_COLS  = 6;
  const SPRITE_ROWS  = 6;
  const TOTAL_FRAMES = SPRITE_COLS * SPRITE_ROWS; // 36

  const SPRITE_DRAW_W = 64;
  const SPRITE_DRAW_H = 64;

  /* ==============================
     الحالة
     ============================== */
  let _x          = 0;
  let _y          = 0;
  let _dir        = 'down';
  let _frame      = 0;
  let _frameTimer = 0;
  let _moving     = false;
  let _charId     = 0;

  /* ==============================
     نظام Sprite Sheets
     ============================== */
  const _sprites = {};

  /* ==============================
     تحميل Sprites مسبقاً
     ============================== */
  function preload() {
    _loadCharSprites(0, 'assets/sprites/characters/heads/troll.png');
  }

  function _loadCharSprites(charId, headPath) {
    const entry = { down: null, up: null, left: null, right: null, loaded: false, hasError: false, headImg: null };
    _sprites[charId] = entry;

    const headImg = new Image();
    headImg.crossOrigin = 'anonymous';
    headImg.src   = headPath;

    headImg.onload  = () => { entry.headImg = headImg; _loadDirections(charId, entry); };
    headImg.onerror = () => { entry.headImg = null;    _loadDirections(charId, entry); };
  }

  function _loadDirections(charId, entry) {
    const dirs   = ['down', 'up', 'left', 'right'];
    let   loaded = 0;

    dirs.forEach(dir => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src   = `assets/sprites/characters/char_${charId}_${dir}.png`;

      img.onload = () => {
        entry[dir] = _processSheet(img, entry.headImg);
        if (++loaded === dirs.length) entry.loaded = true;
      };
      img.onerror = () => {
        console.warn(`[Sprites] char_${charId}_${dir}.png غير موجود`);
        entry.hasError = true;
        if (++loaded === dirs.length) entry.loaded = true; // السماح برسم الاتجاهات الناجحة
      };
    });
  }

  function _processSheet(sheetImg, headImg) {
    const fw     = Math.floor(sheetImg.width  / SPRITE_COLS);
    const fh     = Math.floor(sheetImg.height / SPRITE_ROWS);
    const frames = [];

    for (let row = 0; row < SPRITE_ROWS; row++) {
      for (let col = 0; col < SPRITE_COLS; col++) {
        const cvs = Utils.createCanvas(fw, fh);
        const ctx = cvs.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(sheetImg, col * fw, row * fh, fw, fh, 0, 0, fw, fh);
        _applyChromaKey(ctx, fw, fh, headImg);

        frames.push(cvs);
      }
    }
    return frames;
  }

  function _applyChromaKey(ctx, w, h, headImg) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data      = imageData.data;

    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i+3] > 100 && data[i] > 180 && data[i+1] < 80 && data[i+2] > 180) {
          data[i+3] = 0;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    if (found && headImg && headImg.complete && headImg.naturalWidth > 0) {
      ctx.drawImage(headImg, minX, minY, maxX - minX + 1, maxY - minY + 1);
    }
  }

  /* ==============================
     رسم Sprite مع Fallback محسّن
     ============================== */
  function _drawSprite(ctx, charId, x, y, dir, frame, moving) {
    const sp = _sprites[charId];
    const drawX = x - (SPRITE_DRAW_W - W) / 2;
    const drawY = y - (SPRITE_DRAW_H - H);

    if (!sp || (!sp.loaded && !sp.hasError)) {
      // قيد التحميل: مستطيل رمادي
      ctx.fillStyle = 'rgba(120,120,120,0.5)';
      ctx.fillRect(drawX, drawY, SPRITE_DRAW_W, SPRITE_DRAW_H);
      Utils.drawPixelText(ctx, '...', drawX + SPRITE_DRAW_W / 2, drawY + SPRITE_DRAW_H / 2 - 4, { font: '6px "Press Start 2P"', color: '#fff', align: 'center' });
      return;
    }

    if (!sp[dir] || !sp[dir].length) {
      // خطأ 404 (الصورة غير موجودة): مستطيل أحمر
      ctx.fillStyle = 'rgba(255,50,50,0.5)';
      ctx.fillRect(drawX, drawY, SPRITE_DRAW_W, SPRITE_DRAW_H);
      Utils.drawPixelText(ctx, 'ERR', drawX + SPRITE_DRAW_W / 2, drawY + SPRITE_DRAW_H / 2 - 4, { font: '6px "Press Start 2P"', color: '#fff', align: 'center' });
      return;
    }

    const frames   = sp[dir];
    const f        = moving ? frame % frames.length : 0;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frames[f], drawX, drawY, SPRITE_DRAW_W, SPRITE_DRAW_H);

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + W / 2, y + H + 2, SPRITE_DRAW_W / 3.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ==============================
     الإعداد
     ============================== */
  function init(charId) {
    _charId = charId;
    const spawn = GameMap.getSpawnPoint();
    _x     = spawn.x;
    _y     = spawn.y;
    _dir   = 'down';
    _frame = 0;
    Camera.snapTo(_x + W / 2, _y + H / 2);
  }

  /* ==============================
     التحديث كل إطار
     ============================== */
  function update(delta) {
    const dx  = Joystick.getDx();
    const dy  = Joystick.getDy();
    const mag = Joystick.getMagnitude();
    _moving   = mag > 0.05;

    if (_moving) {
      _dir = Joystick.getDirection();

      const speed   = SPEED * delta;
      const rect    = { x: _x, y: _y, w: W, h: H };
      const result  = Collision.resolveMovement(rect, dx * speed, dy * speed);
      const world   = GameMap.getWorldSize();
      const clamped = Collision.clampToWorld({ x: result.x, y: result.y, w: W, h: H }, world);
      _x = clamped.x;
      _y = clamped.y;

      const ft   = _charId === 0 ? 0.06 : FRAME_TIME;
      const maxF = _charId === 0 ? TOTAL_FRAMES : 3;
      _frameTimer += delta;
      if (_frameTimer >= ft) {
        _frameTimer -= ft;
        _frame = (_frame + 1) % maxF;
      }
    } else {
      _frame      = 0;
      _frameTimer = 0;
    }

    Camera.update(_x + W / 2, _y + H / 2, delta);

    if (typeof Chat !== 'undefined') {
      Chat.update(delta, _x + W / 2, _y + H / 2);
    }
  }

  /* ==============================
     الرسم
     ============================== */
  function draw(ctx) {
    if (_charId === 0) {
      _drawSprite(ctx, 0, _x, _y, _dir, _frame, _moving);
    } else {
      const char = CHARACTERS[_charId - 1];
      if (char) char.draw(ctx, _x, _y, _dir, _frame, _moving);
    }

    if (typeof Chat !== 'undefined') {
      Chat.draw(ctx, _x + W / 2, _y - 5, Network.getMyId());
    }
  }

  /* ==============================
     الشخصيات البرمجية
     ============================== */
  const CHARACTERS = [
    {
      name: 'فتى النار',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#c83020';
        ctx.fillRect(x + 6, y + 12, 12, 14);
        _drawLegs(ctx, x, y, frame, moving, '#8B1010', '#c83020');
        _drawArms(ctx, x, y, dir, frame, moving, '#c83020');
        ctx.fillStyle = '#f0a060';
        ctx.fillRect(x + 5, y + 2, 14, 13);
        ctx.fillStyle = '#ff6000';
        ctx.fillRect(x + 5, y, 14, 4);
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(x + 7, y - 3, 4, 4);
        ctx.fillRect(x + 13, y - 2, 3, 3);
        _drawEyes(ctx, x, y, dir);
      }
    },
    {
      name: 'فتاة الماء',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#2080e0';
        ctx.fillRect(x + 5, y + 12, 14, 16);
        ctx.fillStyle = '#4090f0';
        ctx.fillRect(x + 7, y + 14, 10, 8);
        _drawLegs(ctx, x, y, frame, moving, '#1060c0', '#2080e0');
        _drawArms(ctx, x, y, dir, frame, moving, '#2080e0');
        ctx.fillStyle = '#f0d0b0';
        ctx.fillRect(x + 5, y + 2, 14, 13);
        ctx.fillStyle = '#0050b0';
        ctx.fillRect(x + 4, y, 16, 5);
        ctx.fillRect(x + 4, y + 5, 3, 8);
        ctx.fillRect(x + 17, y + 5, 3, 8);
        _drawEyes(ctx, x, y, dir, '#4090ff');
      }
    },
    {
      name: 'Hobo',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(x + 5, y + 12, 14, 15);
        ctx.fillStyle = '#8b5a30';
        ctx.fillRect(x + 8, y + 14, 5, 5);
        _drawLegs(ctx, x, y, frame, moving, '#4a2e18', '#6b4226');
        _drawArms(ctx, x, y, dir, frame, moving, '#6b4226');
        ctx.fillStyle = '#d4956a';
        ctx.fillRect(x + 5, y + 2, 14, 13);
        ctx.fillStyle = '#3a2a10';
        ctx.fillRect(x + 3, y + 1, 18, 3);
        ctx.fillRect(x + 6, y - 5, 12, 7);
        ctx.fillStyle = '#888';
        ctx.fillRect(x + 6, y + 10, 12, 4);
        _drawEyes(ctx, x, y, dir, '#8B4513');
      }
    },
    {
      name: 'Stickman',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 2;
        ctx.beginPath(); ctx.arc(x + 12, y + 7, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 12, y + 13); ctx.lineTo(x + 12, y + 24); ctx.stroke();
        const armSwing = moving ? (frame === 1 ? 4 : -4) : 0;
        ctx.beginPath(); ctx.moveTo(x + 12, y + 16); ctx.lineTo(x + 4,  y + 20 + armSwing); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 12, y + 16); ctx.lineTo(x + 20, y + 20 - armSwing); ctx.stroke();
        const legSwing = moving ? (frame === 1 ? 4 : -2) : 0;
        ctx.beginPath(); ctx.moveTo(x + 12, y + 24); ctx.lineTo(x + 6,  y + 32 + legSwing); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 12, y + 24); ctx.lineTo(x + 18, y + 32 - legSwing); ctx.stroke();
      }
    },
    {
      name: 'النينجا',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#1a6b1a';
        ctx.fillRect(x + 5, y + 12, 14, 15);
        _drawLegs(ctx, x, y, frame, moving, '#0f4f0f', '#1a6b1a');
        _drawArms(ctx, x, y, dir, frame, moving, '#1a6b1a');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x + 5, y + 2, 14, 13);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 7, y + 6, 4, 3);
        ctx.fillRect(x + 13, y + 6, 4, 3);
      }
    },
    {
      name: 'الزومبي',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#5a7a3a';
        ctx.fillRect(x + 5, y + 12, 14, 15);
        _drawLegs(ctx, x, y, frame, moving, '#3a5a2a', '#5a7a3a');
        ctx.fillStyle = '#6a8a4a';
        ctx.fillRect(x + 5, y + 2, 14, 13);
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(x + 7, y + 6, 3, 3);
        ctx.fillRect(x + 14, y + 6, 3, 3);
      }
    },
    {
      name: 'الفارس',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#a0a0b0';
        ctx.fillRect(x + 4, y + 11, 16, 16);
        _drawLegs(ctx, x, y, frame, moving, '#606070', '#a0a0b0');
        _drawArms(ctx, x, y, dir, frame, moving, '#a0a0b0');
        ctx.fillStyle = '#909098';
        ctx.fillRect(x + 4, y + 1, 16, 14);
        ctx.fillStyle = '#505058';
        ctx.fillRect(x + 7, y + 5, 10, 6);
      }
    },
    {
      name: 'الروبوت',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#4a6080';
        ctx.fillRect(x + 4, y + 12, 16, 15);
        _drawLegs(ctx, x, y, frame, moving, '#3a5070', '#4a6080');
        _drawArms(ctx, x, y, dir, frame, moving, '#4a6080');
        ctx.fillStyle = '#3a5070';
        ctx.fillRect(x + 4, y + 1, 16, 13);
        ctx.fillStyle = moving ? '#00ff00' : '#ff4400';
        ctx.fillRect(x + 7, y + 5, 4, 4);
        ctx.fillRect(x + 13, y + 5, 4, 4);
      }
    },
    {
      name: 'الساحرة',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#4a1a6a';
        ctx.fillRect(x + 4, y + 12, 16, 16);
        _drawLegs(ctx, x, y, frame, moving, '#3a0a5a', '#4a1a6a');
        _drawArms(ctx, x, y, dir, frame, moving, '#4a1a6a');
        ctx.fillStyle = '#f0d0b0';
        ctx.fillRect(x + 5, y + 3, 14, 12);
        ctx.fillStyle = '#2a0a4a';
        ctx.fillRect(x + 2, y + 2, 20, 3);
        ctx.fillRect(x + 7, y - 7, 10, 10);
      }
    },
    {
      name: 'اللص',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x + 5, y + 12, 14, 15);
        _drawLegs(ctx, x, y, frame, moving, '#111', '#1a1a1a');
        _drawArms(ctx, x, y, dir, frame, moving, '#1a1a1a');
        ctx.fillStyle = '#e0b090';
        ctx.fillRect(x + 5, y + 3, 14, 12);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(x + 3, y + 3, 18, 3);
        ctx.fillRect(x + 6, y - 4, 12, 8);
      }
    }
  ];

  /* ==============================
     دوال رسم مشتركة
     ============================== */
  function _drawLegs(ctx, x, y, frame, moving, c1, c2) {
    const swing = moving ? (frame === 1 ? 3 : frame === 2 ? -3 : 0) : 0;
    ctx.fillStyle = c1;
    ctx.fillRect(x + 6,  y + 26, 5, 8 + swing);
    ctx.fillStyle = c2;
    ctx.fillRect(x + 13, y + 26, 5, 8 - swing);
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
     getAllChars
     ============================== */
  function getAllChars() {
    const trollWrapper = {
      name: 'Troll Man',
      draw(ctx, x, y, dir, frame, moving) {
        _drawSprite(ctx, 0, x, y, dir, frame, moving);
      }
    };
    return [trollWrapper, ...CHARACTERS];
  }

  /* ==============================
     Getters
     ============================== */
  function getRect()     { return { x: _x, y: _y, w: W, h: H }; }
  function getCenterX()  { return _x + W / 2; }
  function getCenterY()  { return _y + H / 2; }
  function getCharId()   { return _charId; }
  function getCharName() { return getAllChars()[_charId]?.name || ''; }

  return {
    preload, init, update, draw,
    getRect, getCenterX, getCenterY, getCharId, getCharName, getAllChars
  };

})();
