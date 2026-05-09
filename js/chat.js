/* ==============================
   NCORE GAME — chat.js
   إدارة فقاعات المحادثة ومنطق الظهور
   ============================== */

'use strict';

const Chat = (() => {

  // خريطة الرسائل النشطة (key: playerId -> { text, timer, duration })
  const _bubbles = new Map();

  // إعدادات الفقاعة
  const PADDING      = 6;
  const LINE_HEIGHT  = 9;
  const MAX_WIDTH    = 120;
  const OFFSET_Y     = 45; // الارتفاع فوق رأس اللاعب

  /** إضافة رسالة جديدة للاعب **/
  function addMessage(playerId, text) {
    // حساب المدة: ثانية واحدة لكل 5 حروف، بحد أدنى 3 ثوانٍ وحد أقصى 12 ثانية
    const duration = Math.min(Math.max(3, text.length * 0.2), 12);

    _bubbles.set(playerId, {
      text: text,
      timer: 0,
      duration: duration
    });
  }

  /** تحديث المؤقتات في كل إطار **/
  function update(delta) {
    for (const [id, bubble] of _bubbles.entries()) {
      bubble.timer += delta;
      if (bubble.timer >= bubble.duration) {
        _bubbles.delete(id);
      }
    }
  }

  /** رسم الفقاعات فوق اللاعبين **/
  function draw(ctx, playerX, playerY, playerId) {
    const bubble = _bubbles.get(playerId);
    if (!bubble) return;

    ctx.save();
    
    const text  = bubble.text;
    const lines = _wrapText(ctx, text, MAX_WIDTH);
    
    // حساب أبعاد الفقاعة
    const bw = Math.min(MAX_WIDTH, ctx.measureText(text).width + PADDING * 2);
    const bh = lines.length * LINE_HEIGHT + PADDING;
    
    const bx = playerX - bw / 2;
    const by = playerY - OFFSET_Y - bh;

    // 1. رسم ظل الفقاعة
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(bx + 2, by + 2, bw, bh);

    // 2. رسم خلفية الفقاعة (نمط بكسلي)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx, by, bw, bh);
    
    // 3. رسم الإطار
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    // 4. رسم مثلث الإشارة (الذيل)
    ctx.beginPath();
    ctx.moveTo(playerX - 4, by + bh);
    ctx.lineTo(playerX + 4, by + bh);
    ctx.lineTo(playerX, by + bh + 6);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();

    // 5. رسم النص
    ctx.fillStyle = '#000000';
    lines.forEach((line, i) => {
      Utils.drawPixelText(ctx, line, playerX, by + PADDING + (i * LINE_HEIGHT), {
        font: '5px "Press Start 2P"',
        align: 'center',
        color: '#000'
      });
    });

    ctx.restore();
  }

  /** تقسيم النص الطويل لأسطر **/
  function _wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth - PADDING * 2) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  function clear(id) { _bubbles.delete(id); }

  return { init: () => {}, update, draw, addMessage, clear };

})();
                          
