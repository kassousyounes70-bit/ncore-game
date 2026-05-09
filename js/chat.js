/* ==============================
   NCORE GAME — chat.js
   إدارة فقاعات المحادثة والتفاعل (نسخة الخط الكبير 20px)
   ============================== */

'use strict';

const Chat = (() => {

  const _bubbles = new Map();
  let _inputContainer = null, _inputField = null, _chatBtn = null;
  let _isInputActive = false;

  // إعدادات هندسية جديدة للخط الكبير (20px)
  const RANGE       = 80;  
  const MAX_WIDTH   = 280;  // زيادة العرض لاستيعاب الخط الكبير
  const OFFSET_Y    = 65;   // رفع الفقاعة للأعلى أكثر لكي لا تغطي اللاعب
  const LINE_HEIGHT = 28;   // مسافة كافية بين الأسطر (Font 20px + 8px spacing)
  const FONT        = 'bold 20px Arial, Tahoma, sans-serif'; // خط عريض وواضح جداً للعربية

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
    for (const [id, b] of _bubbles.entries()) {
      b.timer += delta;
      if (b.timer >= b.duration) _bubbles.delete(id);
    }

    const isNear = _checkNearbyPlayers(myX, myY);
    if (_chatBtn) {
      if (isNear && !_isInputActive) _chatBtn.classList.remove('hidden');
      else _chatBtn.classList.add('hidden');
    }
  }

  function _checkNearbyPlayers(myX, myY) {
    const players = Network.getPlayers();
    if (!players) return false;

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
    Joystick.hide();
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
    // زيادة وقت الظهور قليلاً لأن النص الكبير يأخذ مساحة أكبر في القراءة
    const duration = Math.min(Math.max(5, text.length * 0.35), 18);
    _bubbles.set(id, { text, timer: 0, duration });
  }

  function draw(ctx, x, y, id) {
    const b = _bubbles.get(id);
    if (!b) return;

    ctx.font = FONT;
    const lines = _wrapText(ctx, b.text, MAX_WIDTH);
    
    let maxLineWidth = 0;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });

    // حساب أبعاد الفقاعة بناءً على النص الضخم الجديد
    const bw = maxLineWidth + 24; // زيادة الهوامش الجانبية
    const bh = lines.length * LINE_HEIGHT + 16;
    const bx = x - bw / 2;
    const by = y - OFFSET_Y - bh;

    ctx.save();

    // 1. ظل الفقاعة
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(bx + 3, by + 3, bw, bh);

    // 2. خلفية الفقاعة
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.fillRect(bx, by, bw, bh);
    
    // 3. الإطار
    ctx.strokeStyle = '#000'; 
    ctx.lineWidth = 2; // إطار أسمك ليناسب الخط الكبير
    ctx.strokeRect(bx, by, bw, bh);

    // 4. الذيل
    ctx.beginPath();
    ctx.moveTo(x - 8, by + bh);
    ctx.lineTo(x + 8, by + bh);
    ctx.lineTo(x, by + bh + 8);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();

    // 5. النص (fillText لضمان أعلى جودة للحروف العربية)
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    lines.forEach((line, i) => {
      // تعديل موضع النص ليكون في منتصف الأسطر تماماً
      ctx.fillText(line, x, by + (LINE_HEIGHT / 2) + 10 + (i * LINE_HEIGHT));
    });

    ctx.restore();
  }

  function _wrapText(ctx, text, maxWidth) {
    const words = text.split(' '), lines = [];
    let curLine = words[0];
    for (let i = 1; i < words.length; i++) {
      // قياس العرض باستخدام maxWidth مخصوم منه الهوامش
      if (ctx.measureText(curLine + " " + words[i]).width < maxWidth - 30) {
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
