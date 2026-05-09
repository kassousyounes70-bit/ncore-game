/* ==============================
   NCORE GAME — chat.js
   إدارة فقاعات المحادثة والتفاعل
   ============================== */

'use strict';

const Chat = (() => {

  const _bubbles = new Map();
  let _inputContainer = null, _inputField = null, _chatBtn = null;
  let _isInputActive = false;

  // إعدادات هندسية جديدة تناسب الخطوط العربية
  const RANGE       = 80;  
  const MAX_WIDTH   = 160;  // زيادة أقصى عرض للفقاعة
  const OFFSET_Y    = 45;   // رفع الفقاعة لتجنب تغطية اللاعب
  const LINE_HEIGHT = 14;   // مسافة مريحة بين الأسطر
  const FONT        = '9px "Press Start 2P", Tahoma, Arial, sans-serif'; // دعم اللغة العربية

  function init() {
    _inputContainer = Utils.$('chat-input-container');
    _inputField     = Utils.$('chat-input');
    _chatBtn        = Utils.$('chat-btn');

    if (_chatBtn) {
      _chatBtn.addEventListener('click', _showInput);
      _chatBtn.addEventListener('touchend', (e) => { e.preventDefault(); _showInput(); }, { passive: false });
    }

    if (_inputField) {
      _inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') _sendMessage();
        if (e.key === 'Escape') _hideInput();
      });
    }
  }

  function update(delta, myX, myY) {
    // 1. تحديث مؤقتات الفقاعات
    for (const [id, b] of _bubbles.entries()) {
      b.timer += delta;
      if (b.timer >= b.duration) _bubbles.delete(id);
    }

    // 2. اكتشاف القرب من لاعبين آخرين لظهور زر TALK
    const isNear = _checkNearbyPlayers(myX, myY);
    if (_chatBtn) {
      if (isNear && !_isInputActive) _chatBtn.classList.remove('hidden');
      else _chatBtn.classList.add('hidden');
    }
  }

  function _checkNearbyPlayers(myX, myY) {
    const players = Network.getPlayers();
    if (!players) return false;

    // استثناء اللاعب نفسه والبحث عن الآخرين
    for (const [id, p] of players.entries()) {
      const d = Utils.distance(myX, myY, p.x, p.y);
      if (d < RANGE) return true;
    }
    return false;
  }

  function _showInput() {
    _isInputActive = true;
    Utils.show(_inputContainer);
    _inputField.focus();
    Joystick.hide(); // إيقاف الحركة أثناء الكتابة
  }

  function _hideInput() {
    _isInputActive = false;
    Utils.hide(_inputContainer);
    _inputField.value = '';
    _inputField.blur();
    Joystick.show();
  }

  function _sendMessage() {
    const text = _inputField.value.trim();
    if (text) Network.sendChatMessage(text);
    _hideInput();
  }

  function addMessage(id, text) {
    // حساب المدة الزمنية للقراءة بشكل أفضل
    const duration = Math.min(Math.max(4, text.length * 0.3), 15);
    _bubbles.set(id, { text, timer: 0, duration });
  }

  function draw(ctx, x, y, id) {
    const b = _bubbles.get(id);
    if (!b) return;

    // تجهيز الخط أولاً لضمان دقة قياس العرض
    ctx.font = FONT;
    
    const lines = _wrapText(ctx, b.text, MAX_WIDTH);
    
    // حساب أقصى عرض للسطر ديناميكياً
    let maxLineWidth = 0;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });

    const bw = Math.min(MAX_WIDTH, maxLineWidth + 16); // هوامش جانبية
    const bh = lines.length * LINE_HEIGHT + 10;        // هوامش علوية وسفلية
    const bx = x - bw / 2;
    const by = y - OFFSET_Y - bh;

    ctx.save();

    // 1. رسم ظل الفقاعة
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(bx + 2, by + 2, bw, bh);

    // 2. رسم خلفية الفقاعة
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(bx, by, bw, bh);
    
    // 3. رسم الإطار
    ctx.strokeStyle = '#000'; 
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    // 4. رسم مثلث الإشارة (الذيل)
    ctx.beginPath();
    ctx.moveTo(x - 4, by + bh);
    ctx.lineTo(x + 4, by + bh);
    ctx.lineTo(x, by + bh + 5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();
    ctx.stroke();

    // 5. رسم النص
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // استخدام fillText مباشرة بدلاً من دالة drawPixelText لحماية اللغة العربية من التشويه
    lines.forEach((line, i) => {
      ctx.fillText(line, x, by + 10 + (i * LINE_HEIGHT));
    });

    ctx.restore();
  }

  function _wrapText(ctx, text, maxWidth) {
    const words = text.split(' '), lines = [];
    let curLine = words[0];
    for (let i = 1; i < words.length; i++) {
      if (ctx.measureText(curLine + " " + words[i]).width < maxWidth - 16) {
        curLine += " " + words[i];
      } else { 
        lines.push(curLine); 
        curLine = words[i]; 
      }
    }
    lines.push(curLine); 
    return lines;
  }

  return { init, update, draw, addMessage, clear: (id) => _bubbles.delete(id) };

})();
