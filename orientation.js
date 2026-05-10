/* ==============================
   NCORE GAME — orientation.js
   نظام تدوير الشاشة (وضع أفقي) مع واجهة ملء الشاشة
   ============================== */

'use strict';

const OrientationManager = (() => {
  function init() {
    // إنشاء زر التدوير برمجياً لمنع المساس بملف HTML الخاص بك
    const btn = document.createElement('button');
    btn.innerText = '🔄 الشاشة كاملة';
    Object.assign(btn.style, {
      position: 'absolute',
      top: '15px',
      right: '15px',
      zIndex: '9999',
      padding: '8px 12px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: '#fff',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '6px',
      fontFamily: 'sans-serif',
      fontSize: '12px',
      cursor: 'pointer'
    });

    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
  }

  function toggle() {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      // طلب ملء الشاشة أولاً (إجباري لنجاح التدوير في الهواتف)
      elem.requestFullscreen().then(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch((err) => {
            console.warn("تعذر فرض الوضع الأفقي برمجياً:", err);
          });
        }
      }).catch(err => {
        console.error('Fullscreen API failed:', err);
      });
    } else {
      document.exitFullscreen();
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    }
  }

  return { init };
})();

window.addEventListener('DOMContentLoaded', OrientationManager.init);
