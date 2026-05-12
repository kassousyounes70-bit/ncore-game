'use strict';
const Chat = (() => {
  const activeBubbles = new Map(); 
  let chatBtn, chatModal, chatInput, chatSendBtn, chatCloseBtn;

  function init() {
    // الحماية القصوى: بناء الزر برمجياً إذا لم يكن موجوداً
    chatBtn = document.getElementById('chat-action-btn');
    if(!chatBtn) {
        chatBtn = document.createElement('button');
        chatBtn.id = 'chat-action-btn';
        chatBtn.className = 'pixel-btn';
        chatBtn.textContent = '💬 تحدث';
        chatBtn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:40;padding:12px 18px;font-size:10px;display:none;box-shadow:4px 4px 0 #a07000, inset -2px -2px 0 rgba(0,0,0,0.3);';
        const container = document.getElementById('game-container') || document.body;
        container.appendChild(chatBtn);
    }

    // بناء نافذة الدردشة برمجياً إذا لم تكن موجودة
    chatModal = document.getElementById('chat-modal');
    if(!chatModal) {
        chatModal = document.createElement('div');
        chatModal.id = 'chat-modal';
        chatModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:none;align-items:center;justify-content:center;z-index:100;';
        chatModal.innerHTML = `
            <div style="background:#1a1a2e;border:4px solid #2a2a4e;padding:20px;display:flex;flex-direction:column;gap:15px;width:300px;text-align:center;">
                <h3 style="color:#f0c040;font-family:'Press Start 2P',monospace;font-size:10px;">محادثة قريبة</h3>
                <input type="text" id="chat-input" placeholder="اكتب رسالتك..." dir="auto" style="padding:10px;font-family:'Press Start 2P',monospace;font-size:8px;background:#0a0a0f;color:#fff;border:2px solid #2a2a4e;outline:none;" />
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button id="chat-send-btn" class="pixel-btn" style="background:#40f080;">إرسال</button>
                    <button id="chat-close-btn" class="pixel-btn" style="background:#f04060;">إلغاء</button>
                </div>
            </div>
        `;
        document.body.appendChild(chatModal);
    }

    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    chatCloseBtn = document.getElementById('chat-close-btn');

    chatBtn.onclick = openChat;
    chatCloseBtn.onclick = closeChat;
    chatSendBtn.onclick = sendChat;
    
    // قراءة أقصى طول للدردشة من ملف الإضافات
    const maxLen = (typeof Addon !== 'undefined') ? Addon.Settings.maxChatChars : 100;
    chatInput.maxLength = maxLen;
    
    chatInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendChat();
    });
  }

  function update(myPlayer, otherPlayers) {
     if(!myPlayer) return;

     let isNear = false;
     // قراءة المسافة من ملف الإضافات
     const distLimit = (typeof Addon !== 'undefined') ? Addon.Settings.chatDistance : 200;

     if (otherPlayers) {
         for (const [id, p] of otherPlayers.entries()) {
            const dist = Math.hypot(myPlayer.x - p.x, myPlayer.y - p.y);
            if (dist < distLimit) {
               isNear = true; 
               break;
            }
         }
     }

     if(chatBtn && chatModal) {
        const isModalOpen = (chatModal.style.display === 'flex');
        // فرض الظهور والإخفاء عبر inline styles لتخطي أي CSS يعرقله
        if(isNear && !isModalOpen) {
           chatBtn.style.display = 'block';
        } else if (!isNear) {
           chatBtn.style.display = 'none';
           if(isModalOpen) closeChat();
        }
     }

     const delta = 16.6; 
     for (const [id, bubble] of activeBubbles.entries()) {
        bubble.timer -= delta;
        if (bubble.timer <= 0) activeBubbles.delete(id);
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
     const tw = Math.max(metrics.width + 24, 60); 
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
     chatModal.style.display = 'flex';
     chatBtn.style.display = 'none';
     chatInput.value = '';
     chatInput.focus();
  }

  function closeChat() {
     chatModal.style.display = 'none';
  }

  function sendChat() {
     const text = chatInput.value.trim();
     const maxLen = (typeof Addon !== 'undefined') ? Addon.Settings.maxChatChars : 100;
     if(text.length > 0) {
        const safeText = text.substring(0, maxLen); 
        addBubble('me', safeText);
        
        if (typeof Network !== 'undefined' && Network.isConnected()) {
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
  
