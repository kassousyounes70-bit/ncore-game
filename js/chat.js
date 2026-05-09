/* ==============================
   NCORE GAME — chat.js
   إدارة فقاعات المحادثة والتفاعل
   ============================== */

'use strict';

const Chat = (() => {

  const _bubbles = new Map();
  let _inputContainer = null, _inputField = null, _chatBtn = null;
  let _isInputActive = false;

  const RANGE      = 80;  // المدى لظهور زر TALK
  const MAX_WIDTH  = 130;
  const OFFSET_Y   = 40;

  function init() {
    _inputContainer = Utils.$('chat-input-container');
    _inputField     = Utils.$('chat-input');
    _chatBtn        = Utils.$('chat-btn');

    if (_chatBtn) {
      _chatBtn.addEventListener('click', _showInput);
      _chatBtn.addEventListener('touchend', (e) => { e.preventDefault(); _showInput(); });
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
    // جلب جميع اللاعبين من Network والتحقق من المسافة
    const players = Network.getPlayers(); // تأكد من وجود دالة getPlayers في Network ترجع Map اللاعبين
    if (!players) return false;

    for (const p of players.values()) {
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
    const duration = Math.min(Math.max(3, text.length * 0.25), 15);
    _bubbles.set(id, { text, timer: 0, duration });
  }

  function draw(ctx, x, y, id) {
    const b = _bubbles.get(id);
    if (!b) return;

    const lines = _wrapText(ctx, b.text, MAX_WIDTH);
    const bw = Math.min(MAX_WIDTH, ctx.measureText(b.text).width + 12);
    const bh = lines.length * 10 + 6;
    const bx = x - bw / 2, by = y - OFFSET_Y - bh;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#000';
    lines.forEach((line, i) => {
      Utils.drawPixelText(ctx, line, x, by + 8 + (i * 10), {
        font: '5px "Press Start 2P"', align: 'center'
      });
    });
  }

  function _wrapText(ctx, text, maxWidth) {
    const words = text.split(' '), lines = [];
    let curLine = words[0];
    for (let i = 1; i < words.length; i++) {
      if (ctx.measureText(curLine + " " + words[i]).width < maxWidth - 10) curLine += " " + words[i];
      else { lines.push(curLine); curLine = words[i]; }
    }
    lines.push(curLine); return lines;
  }

  return { init, update, draw, addMessage, clear: (id) => _bubbles.delete(id) };
})();
