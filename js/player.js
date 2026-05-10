/* ==============================
   NCORE GAME — player.js
   اللاعب: حركة، رسم، animation + Sprite Sheets
   (نسخة التصحيح المدمج للهواتف - Mobile Debugging)
   ============================== */

'use strict';

const Player = (() => {

  const SPEED        = 160;
  const W            = 24;    
  const H            = 28;    
  const FRAME_TIME   = 0.14;
  const SPRITE_COLS  = 6;
  const SPRITE_ROWS  = 6;
  const TOTAL_FRAMES = SPRITE_COLS * SPRITE_ROWS; 

  const SPRITE_DRAW_W = 64;
  const SPRITE_DRAW_H = 64;

  let _x          = 0;
  let _y          = 0;
  let _dir        = 'down';
  let _frame      = 0;
  let _frameTimer = 0;
  let _moving     = false;
  let _charId     = 0;

  const _sprites = {};

  function preload(onProgress) {
    return new Promise((resolve) => {
      _loadCharSprites(0, 'assets/sprites/characters/heads/troll.png', onProgress, resolve);
    });
  }

  function _loadCharSprites(charId, headPath, onProgress, onComplete) {
    const entry = { down: null, up: null, left: null, right: null, loaded: false, hasError: false, headImg: null };
    _sprites[charId] = entry;

    const headImg = new Image();
    // تمت إزالة crossOrigin لتجنب أخطاء CORS الصامتة على نفس الخادم
    headImg.src = headPath;

    if (onProgress) onProgress(10); 

    headImg.onload  = () => { 
      entry.headImg = headImg; 
      _loadDirections(charId, entry, onProgress, onComplete); 
    };
    headImg.onerror = () => { 
      entry.headImg = null;    
      _loadDirections(charId, entry, onProgress, onComplete); 
    };
  }

  function _loadDirections(charId, entry, onProgress, onComplete) {
    const dirs   = ['down', 'up', 'left', 'right'];
    let   loaded = 0;
    const baseProgress = 20; 

    if (onProgress) onProgress(baseProgress);

    dirs.forEach(dir => {
      const img = new Image();
      img.src = `assets/sprites/characters/char_${charId}_${dir}.png`;

      const checkFinish = () => {
        loaded++;
        const currentProgress = baseProgress + (loaded / dirs.length) * 80;
        if (onProgress) onProgress(currentProgress);
        
        if (loaded === dirs.length) {
          entry.loaded = true;
          if (onComplete) onComplete();
        }
      };

      img.onload = () => {
        try {
          entry[dir] = _processSheet(img, entry.headImg);
        } catch (err) {
          alert(`[خطأ في معالجة ${dir}] ${err.name}: ${err.message}`);
          entry.hasError = true;
        }
        checkFinish();
      };

      img.onerror = () => {
        entry.hasError = true;
        checkFinish(); 
      };
    });
  }

  function _processSheet(sheetImg, headImg) {
    if (typeof Utils === 'undefined' || typeof Utils.createCanvas !== 'function') {
      throw new Error("دالة Utils.createCanvas غير موجودة. تأكد من ملف utils.js");
    }

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

    const targetR = 255;
    const targetG = 0;
    const targetB = 255;
    const tolerance = 130; 

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i+3] === 0) continue;

        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];

        const distance = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));

        if (distance < tolerance) {
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
      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;
      
      const imgRatio = headImg.naturalWidth / headImg.naturalHeight;
      const boxRatio = boxW / boxH;
      
      let drawW = boxW;
      let drawH = boxH;
      let drawX = minX;
      let drawY = minY;
      
      if (imgRatio > boxRatio) {
        drawH = boxW / imgRatio;
        drawY = minY + (boxH - drawH) / 2;
      } else {
        drawW = boxH * imgRatio;
        drawX = minX + (boxW - drawW) / 2;
      }
      
      ctx.imageSmoothingEnabled = true; 
      ctx.drawImage(headImg, drawX, drawY, drawW, drawH);
    }
  }

  function _drawSprite(ctx, charId, x, y, dir, frame, moving) {
    const sp = _sprites[charId];
    const drawX = x - (SPRITE_DRAW_W - W) / 2;
    const drawY = y - (SPRITE_DRAW_H - H);

    if (!sp || (!sp.loaded && !sp.hasError)) {
      ctx.fillStyle = 'rgba(120,120,120,0.5)';
      ctx.fillRect(drawX, drawY, SPRITE_DRAW_W, SPRITE_DRAW_H);
      return;
    }

    if (!sp[dir] || !sp[dir].length) {
      ctx.fillStyle = 'rgba(255,50,50,0.5)';
      ctx.fillRect(drawX, drawY, SPRITE_DRAW_W, SPRITE_DRAW_H);
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

  function init(charId) {
    _charId = charId;
    const spawn = GameMap.getSpawnPoint();
    _x     = spawn.x;
    _y     = spawn.y;
    _dir   = 'down';
    _frame = 0;
    Camera.snapTo(_x + W / 2, _y + H / 2);
  }

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

  const CHARACTERS = [
    {
      name: 'فتى النار',
      draw(ctx, x, y, dir, frame, moving) {
        ctx.fillStyle = '#c83020'; ctx.fillRect(x + 6, y + 12, 12, 14);
      }
    }
    // تم اختصار باقي الشخصيات البرمجية هنا لتوفير المساحة، انسخ المصفوفة CHARACTERS القديمة كاملة وضعها هنا
  ];

  function getAllChars() {
    const trollWrapper = {
      name: 'Troll Man',
      draw(ctx, x, y, dir, frame, moving) { _drawSprite(ctx, 0, x, y, dir, frame, moving); }
    };
    return [trollWrapper, ...CHARACTERS];
  }

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
