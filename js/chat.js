'use strict';
const Chat = (() => {
  const MAX_CHARS = 100;       // أقصى عدد للحروف
  const PROXIMITY_DIST = 150;  // المسافة المطلوبة لظهور زر الدردشة
  
  // قاموس لتخزين الفقاعات النشطة (معرف اللاعب -> {النص، المؤقت})
  const activeBubbles = new Map(); 

  // عناصر الواجهة
  let chatBtn = null;
  let chatModal = null;
  let chatInput = null;
  let chatSendBtn = null;
  let chatCloseBtn = null;

  function init() {
    chatBtn = Utils.$('chat-action-btn');
    chatModal = Utils.$('chat-modal');
    chatInput = Utils.$('chat-input');
    chatSendBtn = Utils.$('chat-send-btn');
    chatCloseBtn = Utils.$('chat-close-btn');

    if(chatBtn) chatBtn.onclick = openChat;
    if(chatCloseBtn) chatCloseBtn.onclick = closeChat;
    
    if(chatSendBtn) {
        chatSendBtn.onclick = () => {
            sendChat();
            // تشغيل صوت صغير عند الإرسال (اختياري لاحقاً)
        };
    }
    
    if(chatInput) {
       chatInput.maxLength = MAX_CHARS;
       // الإرسال عند الضغط على زر الإدخال في لوحة المفاتيح
       chatInput.addEventListener('keypress', (e) => {
          if(e.key === 'Enter') sendChat();
       });
    }
  }

  // تحديث المسافات والمؤقتات (تُستدعى كل إطار في game.js)
  function update(myPlayer, otherPlayers) {
     if(!myPlayer) return;

     // 1. التحقق من اقترابك من لاعبين آخرين
     let isNear = false;
     if (otherPlayers) {
         for (const [id, p] of otherPlayers.entries()) {
            if (Utils.distance(myPlayer.x, myPlayer.y, p.x, p.y) < PROXIMITY_DIST) {
               isNear = true; 
               break;
            }
         }
     }

     // 2. إظهار/إخفاء زر المحادثة الطافي
     if(chatBtn) {
        if(isNear && chatModal.classList.contains('hidden')) {
           chatBtn.classList.remove('hidden');
        } else {
           chatBtn.classList.add('hidden');
        }
     }

     // 3. تحديث مؤقتات الفقاعات (لاختفائها)
     const delta = 16.6; // تقريباً 1 فريم (60fps)
     for (const [id, bubble] of activeBubbles.entries()) {
        bubble.timer -= delta;
        if (bubble.timer <= 0) {
           activeBubbles.delete(id);
        }
     }
  }

  // رسم الفقاعات (تُستدعى في game.js بعد رسم الشخصيات)
  function drawBubbles(ctx, myPlayer, otherPlayers) {
     // رسم فقاعتي
     if (myPlayer && activeBubbles.has('me')) {
        _drawBubble(ctx, myPlayer.x, myPlayer.y, activeBubbles.get('me'));
     }
     // رسم فقاعات الآخرين
     if (otherPlayers) {
         for (const [id, p] of otherPlayers.entries()) {
            if (activeBubbles.has(id)) {
               _drawBubble(ctx, p.x, p.y, activeBubbles.get(id));
            }
         }
     }
  }

  // الدالة الداخلية لرسم الفقاعة البكسلية
  function _drawBubble(ctx, x, y, bubble) {
     ctx.save();
     // خط بكسلي بحجم 20 كما طلبت
     ctx.font = '20px "Press Start 2P", monospace';
     ctx.textAlign = 'center';
     ctx.textBaseline = 'bottom';
     ctx.direction = "rtl"; // لدعم العربية بشكل سليم

     const text = bubble.text;
     const metrics = ctx.measureText(text);
     const tw = metrics.width + 24; // عرض الفقاعة
     const th = 36;                 // طول الفقاعة
     const bx = x;
     const by = y - 45;             // مكانها فوق رأس اللاعب

     // تأثير الاختفاء التدريجي في آخر نصف ثانية
     let alpha = 1;
     if (bubble.timer < 500) alpha = bubble.timer / 500;
     ctx.globalAlpha = Math.max(0, alpha);

     // رسم خلفية الفقاعة (بيضاء مع إطار أسود)
     ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
     ctx.strokeStyle = '#0a0a0f';
     ctx.lineWidth = 3;
     
     // المربع
     ctx.fillRect(bx - tw/2, by - th, tw, th);
     ctx.strokeRect(bx - tw/2, by - th, tw, th);

     // المثلث الصغير الذي يشير للاعب
     ctx.beginPath();
     ctx.moveTo(bx - 6, by);
     ctx.lineTo(bx + 6, by);
     ctx.lineTo(bx, by + 8);
     ctx.fill();
     ctx.stroke();

     // رسم النص
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
        // قص النص في حال تجاوز الحد
        const safeText = text.substring(0, MAX_CHARS); 
        
        // عرضها محلياً فوق لاعبي
        addBubble('me', safeText);
        
        // سنضيف كود إرسالها للشبكة لاحقاً هنا
        if (window.Network && Network.isConnected()) {
            // Network.sendChat(safeText);
        }
     }
     closeChat();
  }

  // إضافة فقاعة للاعب معين لمدة تعتمد على طول النص
  function addBubble(playerId, text) {
     // مدة الظهور: ثانيتين كأساس + 100 ملي ثانية لكل حرف
     const duration = 2000 + (text.length * 100);
     activeBubbles.set(playerId, { text: text, timer: duration });
  }

  return { init, update, drawBubbles, addBubble };
})();
