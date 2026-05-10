/* ==============================
   NCORE GAME — main.js
   نقطة الدخول الرئيسية للعبة
   ============================== */

'use strict';

(function () {

  /* ==============================
     منع سلوكيات المتصفح الافتراضية
     ============================== */
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => {
    if (e.target.closest('#joystick-zone')) e.preventDefault();
  }, { passive: false });

  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  }, { passive: false });

  /* ==============================
     التحقق من دعم المتصفح
     ============================== */
  function _checkSupport() {
    const issues = [];
    if (!window.HTMLCanvasElement)
      issues.push('Canvas غير مدعوم');
    if (!window.requestAnimationFrame)
      issues.push('requestAnimationFrame غير مدعوم');
    if (!window.performance || !window.performance.now)
      issues.push('Performance API غير مدعومة');
    return issues;
  }

  /* ==============================
     رسالة خطأ
     ============================== */
  function _showError(msg) {
    document.body.innerHTML = `
      <div style="
        display:flex; align-items:center; justify-content:center;
        height:100vh; background:#0a0a0f; color:#f04060;
        font-family:'Press Start 2P',monospace; font-size:12px;
        text-align:center; padding:20px; line-height:2;
      ">
        <div>
          <div style="font-size:24px; margin-bottom:20px;">⚠️</div>
          <div>${msg}</div>
          <div style="margin-top:16px; font-size:9px; color:#888;">
            حاول استخدام متصفح حديث مثل Chrome أو Firefox
          </div>
        </div>
      </div>
    `;
  }

  /* ==============================
     معالجة الأخطاء العامة
     ============================== */
  window.addEventListener('error', (e) => {
    console.error('[NCORE] خطأ غير متوقع:', e.message, e.filename, e.lineno);
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.error('[NCORE] Promise مرفوض:', e.reason);
  });

  /* ==============================
     تحديث شريط التحميل
     ============================== */
  function _updateLoadingUI(percent) {
    const loadingBar = document.getElementById('loading-bar');
    const loadingPercent = document.getElementById('loading-percent');
    if (loadingBar && loadingPercent) {
      loadingBar.style.width = `${percent}%`;
      loadingPercent.innerText = `${Math.floor(percent)}%`;
    }
  }

  /* ==============================
     بدء اللعبة (متزامن مع الموارد)
     ============================== */
  async function _start() {
    const issues = _checkSupport();
    if (issues.length > 0) {
      _showError('متصفحك لا يدعم هذه اللعبة:<br>' + issues.join('<br>'));
      return;
    }

    try {
      // إجبار واجهة التحميل على البقاء حتى يكتمل الـ Promise المرتجع من Player.preload
      await Player.preload(_updateLoadingUI);

      // إخفاء الشاشة بعد الاكتمال
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }

      Game.init();
      console.log('%c🎮 NCORE GAME — تم التشغيل بنجاح', 'color:#f0c040; font-size:14px;');
      console.log('%c🕹️ ncore-game.vercel.app', 'color:#40c0f0; font-size:11px;');
    } catch (err) {
      console.error('[NCORE] فشل في التشغيل أو التحميل:', err);
      _showError('فشل تشغيل اللعبة.<br>افتح الـ Console للتفاصيل.');
    }
  }

  /* ==============================
     انتظار تحميل الصفحة
     ============================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _start);
  } else {
    _start();
  }

})();
