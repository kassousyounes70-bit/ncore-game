'use strict';
const Devices = (() => {
  let _active=null,_near=null;
  let _pCvs=null,_pCtx=null,_pEl=null,_closeBtn=null,_fsBtn=null,_iframe=null;
  let _interactBtn=null;
  let _playBtn=null;        // ← جديد: زر بدء اللعبة للحواسيب التي لديها رابط
  let _isGameDevice=false;  // ← جديد: هل الحاسوب المفتوح حالياً لديه لعبة حقيقية؟
  let _gameLaunched=false;  // ← جديد: هل انطلقت اللعبة عبر triggerNativeTakeover؟
  let _anim=0,_promptA=0,_promptT=0;
  let _isFullscreen=false;
  const RANGE=68;

  function init(){
    _pCvs=Utils.$('device-canvas');
    _pCtx=_pCvs.getContext('2d');
    _pEl=Utils.$('device-popup');
    _closeBtn=Utils.$('device-close-btn');
    _fsBtn=Utils.$('device-fs-btn');
    _iframe=Utils.$('device-iframe');
    _interactBtn=Utils.$('interact-btn');

    _closeBtn.addEventListener('click',close);
    _closeBtn.addEventListener('touchend',e=>{e.preventDefault();close();});
    _fsBtn.addEventListener('click',toggleFullscreen);
    _fsBtn.addEventListener('touchend',e=>{e.preventDefault();toggleFullscreen();});
    _pEl.addEventListener('click',e=>{if(e.target===_pEl)close();});

    // ← جديد: إنشاء زر بدء اللعبة ديناميكياً وإضافته للنافذة
    _playBtn = document.createElement('button');
    _playBtn.id = 'device-play-btn';
    _playBtn.innerHTML = '&#9654; ابدأ اللعبة';
    _playBtn.style.cssText = [
      'display:none',
      'position:absolute',
      'bottom:52px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:linear-gradient(135deg,#1a4a1a,#0a2a0a)',
      'color:#40f080',
      'border:2px solid #40f080',
      'padding:12px 28px',
      'font-family:"Press Start 2P",monospace',
      'font-size:10px',
      'cursor:pointer',
      'z-index:10',
      'letter-spacing:1px',
      'white-space:nowrap',
      'box-shadow:0 0 14px rgba(64,240,128,0.5)'
    ].join(';');
    _playBtn.addEventListener('mouseover',()=>{
      _playBtn.style.background='linear-gradient(135deg,#2a6a2a,#1a4a1a)';
      _playBtn.style.boxShadow='0 0 24px rgba(64,240,128,0.85)';
    });
    _playBtn.addEventListener('mouseout',()=>{
      _playBtn.style.background='linear-gradient(135deg,#1a4a1a,#0a2a0a)';
      _playBtn.style.boxShadow='0 0 14px rgba(64,240,128,0.5)';
    });
    _playBtn.addEventListener('click', _onPlayBtnClick);
    _playBtn.addEventListener('touchend', e=>{ e.preventDefault(); _onPlayBtnClick(); });
    _pEl.appendChild(_playBtn);
  }

  // ← جديد: يُستدعى عند الضغط على زر بدء اللعبة
  function _onPlayBtnClick() {
    if (!_active) return;
    const devs = GameMap.getDevices();
    const devId = devs.indexOf(_active);
    _launchGame(devId);
  }

  function toggleFullscreen() {
    _isFullscreen = !_isFullscreen;
    if(_isFullscreen) {
        _pEl.classList.add('fullscreen');
        _fsBtn.textContent = '🗗 تصغير';
    } else {
        _pEl.classList.remove('fullscreen');
        _fsBtn.textContent = '⛶ تكبير';
    }
    if(_iframe) _iframe.focus();
  }

  function update(delta){
    _anim+=delta;
    const pr=Player.getRect();
    _near=Collision.getNearbyDevice(pr,GameMap.getDevices(),RANGE);
    _promptT+=delta*3;
    _promptA=(_near&&!_active)?0.6+Math.sin(_promptT)*0.4:0;
    
    if (_interactBtn) {
        if (_near && !_active) {
            _interactBtn.classList.remove('hidden');
            _interactBtn.style.display = 'block';
        } else {
            _interactBtn.classList.add('hidden');
            _interactBtn.style.display = 'none';
        }
    }

    if (_active && _iframe.classList.contains('hidden')) {
      if (!_isGameDevice) {
        // حاسوب ميني جيمز: رسم مستمر للأنيميشن
        _render(_active);
      } else if (!_gameLaunched) {
        // حاسوب لعبة قبل الإطلاق: رسم مستمر لتأثيرات المعاينة
        const devId = GameMap.getDevices().indexOf(_active);
        _renderGamePreview(_active, devId);
      }
      // بعد الإطلاق النيتف: الـ canvas يبقى بلا تغيير (رسمنا _renderGameLaunched مرة واحدة)
    }
  }

  function tryOpen(){if(_near&&!_active)open(_near);}

  function open(dev){
    _active=dev;
    _anim=0;
    _gameLaunched=false;
    _pCvs.width=400;_pCvs.height=300;
    _pCtx.imageSmoothingEnabled=false;
    
    // إخفاء زر التفاعل عند فتح الجهاز
    if (_interactBtn) {
        _interactBtn.classList.add('hidden');
        _interactBtn.style.display = 'none';
    }

    Utils.show('device-popup');

    const devs = GameMap.getDevices();
    const devId = devs.indexOf(dev);
    const hasGame = typeof GamesData !== 'undefined' && GamesData[devId];
    _isGameDevice = !!hasGame;

    if (hasGame) {
        // 🔇 إيقاف الموسيقى كلياً عند فتح حاسوب اللعبة
        if (window.AndroidApp && window.AndroidApp.pauseMusic) {
            window.AndroidApp.pauseMusic();
        }

        // ← إظهار شاشة المعاينة + زر البدء (لا نشغّل اللعبة تلقائياً)
        Utils.hide('device-iframe');
        Utils.show('device-canvas');
        _renderGamePreview(dev, devId);

        if (_playBtn) {
            _playBtn.innerHTML = '&#9654; ابدأ اللعبة';
            _playBtn.style.display = 'block';
            _playBtn.disabled = false;
        }

    } else {
        // 🔉 خفض الصوت فقط (لا إيقاف) عند حواسيب الميني جيمز
        if (window.AndroidApp && window.AndroidApp.lowerMusic) {
            window.AndroidApp.lowerMusic();
        }

        if (_playBtn) _playBtn.style.display = 'none';

        Utils.hide('device-iframe');
        Utils.show('device-canvas');
        _render(dev);
    }

    Joystick.hide();Joystick.reset();
  }

  // ← جديد: تشغيل اللعبة فعلياً عند ضغط زر البدء
  function _launchGame(devId) {
    if (!_active) return;

    if (_playBtn) {
        _playBtn.disabled = true;
        _playBtn.innerHTML = '&#9203; جاري التشغيل...';
    }

    if (window.AndroidApp && window.AndroidApp.triggerNativeTakeover) {
        // وضع أندرويد: تسليم التحكم للتطبيق الأصلي
        let requiredKeys = "JOYSTICK_ARROWS,Z,A,ENTER";
        if (devId === 2 || devId === 5) {
            requiredKeys = "JOYSTICK_WASD,J,K,SPACE";
        }
        window.AndroidApp.triggerNativeTakeover(GamesData[devId], requiredKeys);

        // ← المهم: لا نغلق النافذة! تبقى مفتوحة حتى يضغط المستخدم إغلاق عند عودته
        _gameLaunched = true;
        _renderGameLaunched();
        if (_playBtn) {
            _playBtn.innerHTML = '&#9654; إعادة اللعب';
            _playBtn.disabled = false;
        }

    } else {
        // وضع الويب: عرض اللعبة داخل الـ iframe في النافذة المصغرة
        Utils.hide('device-canvas');
        Utils.show('device-iframe');
        if (_playBtn) _playBtn.style.display = 'none';
        _iframe.src = GamesData[devId];
        _iframe.focus();
        _iframe.onload = () => { _iframe.contentWindow.focus(); };
        if (typeof GamepadUI !== 'undefined') GamepadUI.showForGame(devId);
    }
  }

  function close(skipResumeMusic = false){
    const wasGameDevice = _isGameDevice; // ← احفظ قبل الإعادة
    _active=null;
    _isGameDevice=false;
    _gameLaunched=false;
    Utils.hide('device-popup');
    _iframe.src = '';
    if (_playBtn) _playBtn.style.display = 'none';
    if(_isFullscreen) toggleFullscreen();
    
    if (window.AndroidApp && window.AndroidApp.onGameScreenClosed) {
        window.AndroidApp.onGameScreenClosed();
    }

    if (skipResumeMusic !== true) {
        if (wasGameDevice) {
            // 🔊 كان حاسوب لعبة → أعد تشغيل الموسيقى كاملاً
            if (window.AndroidApp && window.AndroidApp.resumeMusic) {
                window.AndroidApp.resumeMusic();
            }
        } else {
            // 🔊 كان حاسوب ميني جيمز → أعد الصوت لمستواه الطبيعي
            if (window.AndroidApp && window.AndroidApp.restoreMusic) {
                window.AndroidApp.restoreMusic();
            }
        }
    }

    if (typeof GamepadUI !== 'undefined') GamepadUI.hide();
    Joystick.reset();Joystick.show();
    MiniGames.stop();
  }

  // رسم شاشة الميني جيمز (الحواسيب العادية)
  function _render(dev){
    const ctx=_pCtx,w=400,h=300;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#1c1c1c';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#404060';ctx.lineWidth=3;ctx.strokeRect(2,2,w-4,h-4);
    ctx.fillStyle='#050520';ctx.fillRect(10,10,w-20,h-36);
    
    const devId = GameMap.getDevices().indexOf(dev);
    MiniGames.drawPC(ctx,11,11,w-22,h-48,_anim, devId);

    ctx.fillStyle='rgba(0,0,0,0.7)';
    ctx.fillRect(10,h/2-25, w-20, 50);
    Utils.drawPixelText(ctx,'سيتم توفير مزيد من الألعاب هنا!',w/2,h/2-4,
        {font:'10px "Press Start 2P"',color:'#40f080',shadow:'#000',align:'center'});
    Utils.drawPixelText(ctx,'ابحث عن الحاسوب السري!',w/2,h/2+12,
        {font:'8px "Press Start 2P"',color:'#f0c040',shadow:'#000',align:'center'});

    ctx.fillStyle='#1a1a2e';ctx.fillRect(0,h-32,w,32);
    ctx.strokeStyle='#2a2a4e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,h-32);ctx.lineTo(w,h-32);ctx.stroke();
    Utils.drawPixelText(ctx,'FLASH GAMES — NostGames',w/2,h-22,
      {font:'6px "Press Start 2P"',color:'#40c0f0',shadow:'#002244',align:'center'});
    
    const gr=ctx.createLinearGradient(0,0,0,12);
    gr.addColorStop(0,'rgba(64,192,240,0.12)');gr.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gr;ctx.fillRect(0,0,w,12);
  }

  // ← جديد: رسم شاشة معاينة اللعبة (قبل الضغط على بدء)
  function _renderGamePreview(dev, devId){
    const ctx=_pCtx, w=400, h=300;
    ctx.clearRect(0,0,w,h);

    // خلفية
    ctx.fillStyle='#060618'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#40f080'; ctx.lineWidth=2; ctx.strokeRect(2,2,w-4,h-4);

    // خطوط إضاءة متحركة في الخلفية
    for(let i=0;i<6;i++){
      const lx=(i*68+_anim*18)%(w+60)-30;
      ctx.fillStyle=`rgba(64,240,128,${0.025+Math.sin(_anim*1.5+i)*0.015})`;
      ctx.fillRect(lx,0,2,h);
    }

    // هالة خضراء مركزية
    const grd=ctx.createRadialGradient(w/2,h/2-20,10,w/2,h/2-20,80);
    grd.addColorStop(0,'rgba(64,240,128,0.18)');
    grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);

    // أيقونة جيمباد (رسم يدوي بالـ canvas)
    const cx=w/2, cy=90;
    ctx.fillStyle='#1a3a1a';
    ctx.beginPath(); ctx.roundRect(cx-36,cy-20,72,40,10); ctx.fill();
    ctx.strokeStyle='#40f080'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(cx-36,cy-20,72,40,10); ctx.stroke();
    // زر D-pad
    ctx.fillStyle='#40f080';
    ctx.fillRect(cx-28,cy-7,8,14); ctx.fillRect(cx-34,cy-1,20,4);
    // زرار دائري
    ctx.beginPath(); ctx.arc(cx+22,cy-6,5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+32,cy,5,0,Math.PI*2); ctx.fill();
    // كابل
    ctx.strokeStyle='#40f080'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(cx-6,cy+20); ctx.bezierCurveTo(cx-6,cy+40,cx+6,cy+40,cx+6,cy+20); ctx.stroke();

    // نص العنوان مع وميض
    const pulse = 0.5 + Math.sin(_anim*3)*0.5;
    Utils.drawPixelText(ctx,'!! لعبة حصرية !!',w/2,148,
      {font:'9px "Press Start 2P"',color:'#f0c040',shadow:'#000',align:'center'});

    ctx.globalAlpha = 0.4 + pulse*0.6;
    Utils.drawPixelText(ctx,'اضغط الزر الأخضر للانطلاق',w/2,175,
      {font:'6px "Press Start 2P"',color:'#40f080',shadow:'#000',align:'center'});
    ctx.globalAlpha = 1;

    // شريط أسفل
    ctx.fillStyle='#0a1a0a'; ctx.fillRect(0,h-32,w,32);
    ctx.strokeStyle='#40f080'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,h-32); ctx.lineTo(w,h-32); ctx.stroke();
    Utils.drawPixelText(ctx,'NostGames — Exclusive Game',w/2,h-22,
      {font:'6px "Press Start 2P"',color:'#40c0f0',shadow:'#002244',align:'center'});
  }

  // ← جديد: رسم شاشة "اللعبة تعمل الآن" (بعد إطلاق اللعبة الأصلية)
  function _renderGameLaunched(){
    const ctx=_pCtx, w=400, h=300;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#050510'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#f0c040'; ctx.lineWidth=2; ctx.strokeRect(2,2,w-4,h-4);

    // تأثير نبض ذهبي
    const grd=ctx.createRadialGradient(w/2,h/2,5,w/2,h/2,90);
    grd.addColorStop(0,'rgba(240,192,64,0.15)');
    grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);

    // أيقونة تشغيل كبيرة
    ctx.fillStyle='#f0c040';
    ctx.beginPath(); ctx.arc(w/2,h/2-28,32,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#050510';
    ctx.beginPath(); ctx.moveTo(w/2-10,h/2-44); ctx.lineTo(w/2+18,h/2-28); ctx.lineTo(w/2-10,h/2-12); ctx.closePath(); ctx.fill();

    Utils.drawPixelText(ctx,'اللعبة تعمل الآن!',w/2,h/2+18,
      {font:'9px "Press Start 2P"',color:'#f0c040',shadow:'#000',align:'center'});
    Utils.drawPixelText(ctx,'اضغط "إغلاق" للعودة',w/2,h/2+40,
      {font:'7px "Press Start 2P"',color:'#40f080',shadow:'#000',align:'center'});
    Utils.drawPixelText(ctx,'إلى العالم الافتراضي',w/2,h/2+57,
      {font:'7px "Press Start 2P"',color:'#40f080',shadow:'#000',align:'center'});

    ctx.fillStyle='#1a1a0a'; ctx.fillRect(0,h-32,w,32);
    ctx.strokeStyle='#f0c040'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,h-32); ctx.lineTo(w,h-32); ctx.stroke();
    Utils.drawPixelText(ctx,'NostGames — Exclusive Game',w/2,h-22,
      {font:'6px "Press Start 2P"',color:'#40c0f0',shadow:'#002244',align:'center'});
  }

  function drawPrompt(ctx){
    if(!_near||_promptA<=0||_active)return;
    const d=_near,cx=d.x+d.w/2,cy=d.y-16;
    ctx.save();ctx.globalAlpha=_promptA;
    Utils.drawPixelRect(ctx,cx-24,cy-11,48,20,3,'rgba(240,192,64,0.92)','#f0c040',2);
    Utils.drawPixelText(ctx,'▶ TAP',cx,cy-7,{font:'6px "Press Start 2P"',color:'#000',align:'center'});
    ctx.restore();
  }

  function hasActive(){return _active!==null;}
  function getNear(){return _near;}
  return{init,update,tryOpen,open,close,drawPrompt,hasActive,getNear};
})();
