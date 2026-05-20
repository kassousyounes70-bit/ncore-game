'use strict';
const Chat = (() => {
  const MAX_CHARS = 100;
  const activeBubbles = new Map();
  let chatBtn, chatModal, chatInput, chatSendBtn, chatCloseBtn;

  function init() {
    chatBtn      = Utils.$('chat-action-btn');
    chatModal    = Utils.$('chat-modal');
    chatInput    = Utils.$('chat-input');
    chatSendBtn  = Utils.$('chat-send-btn');
    chatCloseBtn = Utils.$('chat-close-btn');
    if(!chatInput) return;

    chatInput.maxLength = MAX_CHARS;
    chatInput.addEventListener('keypress', e => { if(e.key==='Enter') sendChat(); });

    if(chatBtn) { 
      chatBtn.onclick = openChat; 
      chatBtn.ontouchstart = e=>{ e.preventDefault(); openChat(); };
      chatBtn.classList.remove('hidden'); 
      chatBtn.style.display = 'block'; 
    }
    if(chatCloseBtn) { chatCloseBtn.onclick = closeChat; }
    if(chatSendBtn)  { chatSendBtn.onclick  = sendChat;  }
  }

  // ✅ التعديل: الآن تستقبل delta الفعلية من اللعبة
  function update(delta = 16.6) {
    for(const [id, b] of activeBubbles.entries()) {
      b.timer -= delta;
      if(b.timer <= 0) activeBubbles.delete(id);
    }
  }

  function drawBubbles(ctx, myPlayer, otherPlayers) {
    if(myPlayer && activeBubbles.has('me'))
      _drawBubble(ctx, myPlayer.x, myPlayer.y, activeBubbles.get('me'));
    if(otherPlayers) {
      for(const [id, p] of otherPlayers.entries()) {
        if(activeBubbles.has(id)) _drawBubble(ctx, p.x, p.y, activeBubbles.get(id));
      }
    }
  }

  function _drawBubble(ctx, x, y, bubble) {
    ctx.save();

    const FONT_SIZE = 20;
    ctx.font = `${FONT_SIZE}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction    = 'rtl';

    const text    = bubble.text;
    const metrics = ctx.measureText(text);
    const tw = Math.max(metrics.width + 28, 70);
    const th = FONT_SIZE + 20;
    const bx = x;
    const by = y - 55;

    let alpha = 1;
    if(bubble.timer < 600) alpha = bubble.timer / 600;
    ctx.globalAlpha = Math.max(0, alpha);

    ctx.fillStyle   = 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = '#0a0a0f';
    ctx.lineWidth   = 2.5;
    _roundRect(ctx, bx - tw/2, by - th/2, tw, th, 8);
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx-7, by + th/2);
    ctx.lineTo(bx+7, by + th/2);
    ctx.lineTo(bx,   by + th/2 + 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill();
    ctx.strokeStyle = '#0a0a0f'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx-7, by + th/2 + 1);
    ctx.lineTo(bx,   by + th/2 + 10);
    ctx.lineTo(bx+7, by + th/2 + 1);
    ctx.stroke();

    ctx.fillStyle   = '#0a0a0f';
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillText(text, bx, by);

    ctx.restore();
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  }

  function openChat() {
    if(!chatModal) return;
    chatModal.style.display = 'flex';
    chatModal.classList.remove('hidden');
    if(chatBtn){ chatBtn.classList.add('hidden'); chatBtn.style.display='none'; }
    if(chatInput){ chatInput.value=''; chatInput.focus(); }
  }

  function closeChat() {
    if(chatModal) {
        chatModal.style.display = 'none';
        chatModal.classList.add('hidden');
    }
    if(chatBtn){ chatBtn.classList.remove('hidden'); chatBtn.style.display='block'; }
  }

  function sendChat() {
    if(!chatInput) return;
    const text = chatInput.value.trim().substring(0, MAX_CHARS);
    if(text.length > 0) {
      addBubble('me', text);
      if(typeof Network !== 'undefined' && Network.isConnected())
        Network.sendChat(text);
    }
    closeChat();
  }

  function addBubble(playerId, text) {
    const duration = Math.min(2000 + text.length * 80, 6000);
    activeBubbles.set(playerId, { text, timer: duration });
  }

  return { init, update, drawBubbles, addBubble };
})();
