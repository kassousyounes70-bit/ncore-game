'use strict';
(function(){
  document.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('gesturestart',e=>e.preventDefault());
  document.addEventListener('touchmove',e=>{if(e.target.closest('#joystick-zone'))e.preventDefault();},{passive:false});
  let lastTap=0;
  document.addEventListener('touchend',e=>{const now=Date.now();if(now-lastTap<300)e.preventDefault();lastTap=now;},{passive:false});

  function _checkSupport(){
    const i=[];
    if(!window.HTMLCanvasElement)i.push('Canvas غير مدعوم');
    if(!window.requestAnimationFrame)i.push('requestAnimationFrame غير مدعوم');
    if(!window.performance?.now)i.push('Performance API غير مدعومة');
    return i;
  }

  function _showError(msg){
    document.body.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;
      height:100vh;background:#0a0a0f;color:#f04060;font-family:'Press Start 2P',monospace;
      font-size:12px;text-align:center;padding:20px;line-height:2;">
      <div><div style="font-size:24px;margin-bottom:20px;">⚠️</div><div>${msg}</div>
      <div style="margin-top:16px;font-size:9px;color:#888;">استخدم Chrome أو Firefox</div></div></div>`;
  }

  window.addEventListener('error',e=>console.error('[NCORE]',e.message,e.lineno));
  window.addEventListener('unhandledrejection',e=>console.error('[NCORE] Promise:',e.reason));

  async function _preloadAllAssets() {
    const loadingPercent = document.getElementById('loading-percent');
    const loadingBar = document.getElementById('loading-bar');
    const label = document.getElementById('loading-label');

    if(label) label.textContent = 'جارِ فك تشفير الموارد والشخصيات...';

    try {
        if(window.Player && Player.loadCharAsync) {
            await Player.loadCharAsync(0, 'assets/sprites/characters/heads/troll.webp');
        }

        if(loadingPercent) loadingPercent.textContent = '100%';
        if(loadingBar) loadingBar.style.width = '100%';

        await new Promise(r => setTimeout(r, 200));

    } catch (e) {
        console.error('[Preload Error]', e);
        if(label) label.textContent = 'حدث خطأ في تحميل بعض الموارد، قد تظهر عيوب بصرية.';
        await new Promise(r => setTimeout(r, 1000));
    }
  }

  async function _start(){
    const issues=_checkSupport();
    if(issues.length>0){_showError(issues.join('<br>'));return;}

    try{
      await _preloadAllAssets();

      Game.init();
      
      // ✅ إضافة استدعاء تهيئة الدردشة
      if (typeof Chat !== 'undefined' && Chat.init) {
        Chat.init();
        console.log('[Chat] تم تهيئة نظام الدردشة ✅');
      } else {
        console.warn('[Chat] Chat غير معرف أو لا يحتوي على init()');
      }

      console.log('%c🎮 NCORE GAME ✅','color:#f0c040;font-size:14px;');
      console.log('%c🌐 ncore-mmo-server.onrender.com','color:#40c0f0;font-size:11px;');
    }catch(err){
      console.error('[NCORE] فشل التشغيل:',err);
      _showError('فشل تشغيل اللعبة — افتح Console للتفاصيل');
    }
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',_start):_start();
})();
