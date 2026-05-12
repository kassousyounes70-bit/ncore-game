'use strict';
const Chat = (() => {
  const MAX_CHARS = 100;
  const PROXIMITY_DIST = 200; // تم زيادة المسافة لضمان ظهور الزر
  
  const activeBubbles = new Map(); 

  let chatBtn, chatModal, chatInput, chatSendBtn, chatCloseBtn;

  function init() {
    chatBtn = document.getElementById('chat-action-btn');
    chatModal = document.getElementById('chat-modal');
    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    chatCloseBtn = document.getElementById('chat-close-btn');

    if(chatBtn) chatBtn.onclick = openChat;
    if(chatCloseBtn) chatCloseBtn.onclick = closeChat;
    
    if(chatSendBtn) {
        chatSendBtn.onclick = sendChat;
    }
    
    if(chatInput) {
       chatInput.maxLength = MAX_CHARS;
       chatInput.addEventListener('keypress', (e) => {
          if(e.key === 'Enter') sendChat();
       });
    }
  }

  function update(myPlayer, otherPlayers) {
     if(!myPlayer) return;

     let isNear = false;
     if (otherPlayers) {
         for (const [id, p] of otherPlayers.entries()) {
            // استخدام Math.hypot مباشرة لتفادي أي خطأ إذا كانت الدالة مفقودة في utils.js
            const dist = Math.hypot(myPlayer.x - p.x, myPlayer.y - p.y);
            if (dist < PROXIMITY_DIST) {
               isNear = true; 
               break;
            }
         }
     }

     if(chatBtn && chatModal) {
        if(isNear && chatModal.classList.contains('hidden')) {
           chatBtn.classList.remove('hidden');
        } else if (!isNear) {
           chatBtn.classList.add('hidden');
           // إغلاق النافذة تلقائياً إذا ابتعد اللاعب
           if(!chatModal.classList.contains('hidden')) closeChat();
        }
     }

     const delta = 16.6; 
     for (const [id, bubble] of activeBubbles.entries()) {
        bubble.timer -= delta;
        if (bubble.timer <= 0) {
           activeBubbles.delete(id);
        }
     }
  }

  function drawBubbles(ctx, myPlayer, otherPlayers) {
     if (myPlayer && activeBubbles.has('me')) {
        _drawBubble(ctx, myPlayer.x, myPlayer.y, activeBubbles.get('me'));
     }
     if (otherPlayers) {
         for (const [id, p] of otherPlayers.entries()) {
            if (activeBubbles.has(id)) {
               _drawBubble(ctx, p.x, p.y, activeBubbles.get(id));
            }
         }
     }
  }

  function _drawBubble(ctx, x, y, bubble) {
     ctx.save();
     ctx.font = '20px "Press Start 2P", monospace';
     ctx.textAlign = 'center';
     ctx.textBaseline = 'bottom';
     ctx.direction = "rtl";

     const text = bubble.text;
     const metrics = ctx.measureText(text);
     const tw = metrics.width + 24; 
     const th = 36;                 
     const bx = x;
     const by = y - 45;             

     let alpha = 1;
     if (bubble.timer < 500) alpha = bubble.timer / 500;
     ctx.globalAlpha = Math.max(0, alpha);

     ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
     ctx.strokeStyle = '#0a0a0f';
     ctx.lineWidth = 3;
     
     ctx.fillRect(bx - tw/2, by - th, tw, th);
     ctx.strokeRect(bx - tw/2, by - th, tw, th);

     ctx.beginPath();
     ctx.moveTo(bx - 6, by);
     ctx.lineTo(bx + 6, by);
     ctx.lineTo(bx, by + 8);
     ctx.fill();
     ctx.stroke();

     ctx.fillStyle = '#0a0a0f';
     ctx.fillText(text, bx, by - 10);
     ctx.restore();
  }

  function openChat() {
     chatModal.classList.remove('hidden');
     chatBtn.classList.add('hidden');
     chatInput.value = '';
     chatInput.focus();
  }

  function closeChat() {
     chatModal.classList.add('hidden');
  }

  function sendChat() {
     const text = chatInput.value.trim();
     if(text.length > 0) {
        const safeText = text.substring(0, MAX_CHARS); 
        addBubble('me', safeText);
        
        if (window.Network && Network.isConnected()) {
            Network.sendChat(safeText);
        }
     }
     closeChat();
  }

  function addBubble(playerId, text) {
     const duration = 2000 + (text.length * 100);
     activeBubbles.set(playerId, { text: text, timer: duration });
  }

  return { init, update, drawBubbles, addBubble };
})();
