'use strict';
const Devices = (() => {
  let _active=null,_near=null;
  let _pCvs=null,_pCtx=null,_pEl=null,_closeBtn=null,_fsBtn=null,_iframe=null;
  let _interactBtn=null;
  let _playBtn=null;
  let _isGameDevice=false;
  let _gameLaunched=false;
  let _gamePreviewImg=null;
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

    _gamePreviewImg = new Image();
    _gamePreviewImg.onerror = () => { _gamePreviewImg._failed = true; };

    _playBtn = document.createElement('button');
    _playBtn.id = 'device-play-btn';
    _playBtn.innerHTML = '&#9654;&nbsp; ابدأ اللعبة';
    _playBtn.style.cssText = [
      'display:none',
      'position:absolute',
      'top:65%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'background:rgba(0,0,0,0.72)',
      'color:#ffffff',
      'border:2px solid rgba(255,255,255,0.85)',
      'border-radius:6px',
      'padding:14px 34px',
      'font-family:"Press Start 2P",monospace',
      'font-size:11px',
      'cursor:pointer',
      'z-index:10',
      'letter-spacing:1px',
      'white-space:nowrap',
      'box-shadow:0 0 22px rgba(255,255,255,0.25)',
      'backdrop-filter:blur(3px)',
      '-webkit-backdrop-filter:blur(3px)',
      'transition:background 0.15s,box-shadow 0.15s'
    ].join(';');
    _playBtn.addEventListener('mouseover',()=>{
      _playBtn.style.background='rgba(30,30,30,0.88)';
      _playBtn.style.boxShadow='0 0 32px rgba(255,255,255,0.45)';
    });
    _playBtn.addEventListener('mouseout',()=>{
      _playBtn.style.background='rgba(0,0,0,0.72)';
      _playBtn.style.boxShadow='0 0 22px rgba(255,255,255,0.25)';
    });
    _playBtn.addEventListener('click', _onPlayBtnClick);
    _playBtn.addEventListener('touchend', e=>{ e.preventDefault(); _onPlayBtnClick(); });
    _pEl.appendChild(_playBtn);
  }

  // ========== المساعدة: بناء requiredKeys من GameControls ==========
  function _getRequiredKeysForDevice(devId) {
    // التحقق من وجود GameControls وإعدادات مخصصة لهذا الجهاز
    if (typeof GameControls !== 'undefined' && GameControls[devId]) {
      const cfg = GameControls[devId];
      const joystickType = (cfg.joystick === 'wasd') ? 'JOYSTICK_WASD' : 'JOYSTICK_ARROWS';
      const buttonsStr = cfg.buttons.map(btn => btn.toUpperCase()).join(',');
      return `${joystickType},${buttonsStr}`;
    }
    // القيمة الافتراضية الآمنة (إذا لم يتم تعريف GameControls أو الجهاز)
    return "JOYSTICK_ARROWS,Z,A,ENTER";
  }

  function _onPlayBtnClick(){
    if(!_active) return;
    const devId = GameMap.getDevices().indexOf(_active);
    _launchGame(devId);
  }

  function toggleFullscreen(){
    _isFullscreen=!_isFullscreen;
    if(_isFullscreen){
      _pEl.classList.add('fullscreen');
      _fsBtn.textContent='🗗 تصغير';
    } else {
      _pEl.classList.remove('fullscreen');
      _fsBtn.textContent='⛶ تكبير';
    }
    if(_iframe) _iframe.focus();
  }

  function update(delta){
    _anim+=delta;
    const pr=Player.getRect();
    _near=Collision.getNearbyDevice(pr,GameMap.getDevices(),RANGE);
    _promptT+=delta*3;
    _promptA=(_near&&!_active)?0.6+Math.sin(_promptT)*0.4:0;

    if(_interactBtn){
      if(_near&&!_active){
        _interactBtn.classList.remove('hidden');
        _interactBtn.style.display='block';
      } else {
        _interactBtn.classList.add('hidden');
        _interactBtn.style.display='none';
      }
    }

    if(_active && _iframe.classList.contains('hidden')){
      if(!_isGameDevice){
        _render(_active);
      } else if(!_gameLaunched){
        const devId=GameMap.getDevices().indexOf(_active);
        _renderGamePreview(devId);
      }
    }
  }

  function tryOpen(){if(_near&&!_active)open(_near);}

  function open(dev){
    _active=dev;
    _anim=0;
    _gameLaunched=false;
    _pCvs.width=400;_pCvs.height=300;
    _pCtx.imageSmoothingEnabled=false;

    if(_interactBtn){
      _interactBtn.classList.add('hidden');
      _interactBtn.style.display='none';
    }

    Utils.show('device-popup');

    const devId=GameMap.getDevices().indexOf(dev);
    const gameEntry = (typeof GamesData!=='undefined') ? GamesData[devId] : null;
    _isGameDevice = !!gameEntry;

    if(window.AndroidApp && window.AndroidApp.lowerMusic){
      window.AndroidApp.lowerMusic();
    }

    if(_isGameDevice){
      const imgUrl = (typeof gameEntry==='object') ? gameEntry.image : null;
      if(imgUrl && _gamePreviewImg.src !== imgUrl){
        _gamePreviewImg._failed = false;
        _gamePreviewImg.src = imgUrl;
      }

      Utils.hide('device-iframe');
      Utils.show('device-canvas');
      _renderGamePreview(devId);

      if(_playBtn){
        _playBtn.innerHTML='&#9654;&nbsp; ابدأ اللعبة';
        _playBtn.style.display='block';
        _playBtn.disabled=false;
      }
    } else {
      if(_playBtn) _playBtn.style.display='none';
      Utils.hide('device-iframe');
      Utils.show('device-canvas');
      _render(dev);
    }

    Joystick.hide();Joystick.reset();
  }

  // ========== تشغيل اللعبة معتمداً على GameControls فقط ==========
  function _launchGame(devId){
    if(!_active) return;
    const gameEntry = GamesData[devId];
    const gameUrl = (typeof gameEntry==='object') ? gameEntry.url : gameEntry;

    if(_playBtn){
      _playBtn.disabled=true;
      _playBtn.innerHTML='&#9203;&nbsp; جاري التشغيل...';
    }

    if(window.AndroidApp && window.AndroidApp.triggerNativeTakeover){
      // وضع أندرويد: إيقاف الموسيقى
      if(window.AndroidApp.pauseMusic) window.AndroidApp.pauseMusic();

      const onReturnFocus = () => {
        if(_gameLaunched && window.AndroidApp && window.AndroidApp.resumeMusic){
          window.AndroidApp.resumeMusic();
        }
        window.removeEventListener('focus', onReturnFocus);
      };
      window.addEventListener('focus', onReturnFocus);

      // استخدام الدالة المساعدة لقراءة الإعدادات من GameControls (بدون شروط صلبة)
      const requiredKeys = _getRequiredKeysForDevice(devId);
      window.AndroidApp.triggerNativeTakeover(gameUrl, requiredKeys);

      _gameLaunched = true;
      _renderGameLaunched();
      if(_playBtn){
        _playBtn.innerHTML='&#9654;&nbsp; إعادة اللعب';
        _playBtn.disabled=false;
      }
    } else {
      // وضع الويب (دون تغيير)
      Utils.hide('device-canvas');
      Utils.show('device-iframe');
      if(_playBtn) _playBtn.style.display='none';
      _iframe.src = gameUrl;
      _iframe.focus();
      _iframe.onload = () => { _iframe.contentWindow.focus(); };
      if(typeof GamepadUI!=='undefined') GamepadUI.showForGame(devId);
    }
  }

  function close(skipResumeMusic=false){
    Utils.hide('device-popup');
    _iframe.src='';
    if(_playBtn) _playBtn.style.display='none';
    if(_isFullscreen) toggleFullscreen();

    if(window.AndroidApp && window.AndroidApp.onGameScreenClosed){
      window.AndroidApp.onGameScreenClosed();
    }

    if(skipResumeMusic!==true){
      if(window.AndroidApp && window.AndroidApp.restoreMusic){
        window.AndroidApp.restoreMusic();
      }
    }

    _active=null;
    _isGameDevice=false;
    _gameLaunched=false;

    if(typeof GamepadUI!=='undefined') GamepadUI.hide();
    Joystick.reset();Joystick.show();
    MiniGames.stop();
  }

  // دوال الرسم (لم تتغير)
  function _render(dev){
    const ctx=_pCtx,w=400,h=300;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#1c1c1c';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#404060';ctx.lineWidth=3;ctx.strokeRect(2,2,w-4,h-4);
    ctx.fillStyle='#050520';ctx.fillRect(10,10,w-20,h-36);

    const devId=GameMap.getDevices().indexOf(dev);
    MiniGames.drawPC(ctx,11,11,w-22,h-48,_anim,devId);

    ctx.fillStyle='rgba(0,0,0,0.7)';
    ctx.fillRect(10,h/2-25,w-20,50);
    Utils.drawPixelText(ctx,'سيتم توفير مزيد من الألعاب هنا!',w/2,h/2-4,
      {font:'10px "Press Start 2P"',color:'#40f080',shadow:'#000',align:'center'});
    Utils.drawPixelText(ctx,'ابحث عن الحاسوب السري!',w/2,h/2+12,
      {font:'8px "Press Start 2P"',color:'#f0c040',shadow:'#000',align:'center'});

    ctx.fillStyle='#1a1a2e';ctx.fillRect(0,h-32,w,32);
    ctx.strokeStyle='#2a2a4e';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,h-32);ctx.lineTo(w,h-32);ctx.stroke();
    Utils.drawPixelText(ctx,'FLASH GAMES — NostGames',w/2,h-22,
      {font:'6px "Press Start 2P"',color:'#40c0f0',shadow:'#002244',align:'center'});

    const gr=ctx.createLinearGradient(0,0,0,12);
    gr.addColorStop(0,'rgba(64,192,240,0.12)');gr.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gr;ctx.fillRect(0,0,w,12);
  }

  function _renderGamePreview(devId){
    const ctx=_pCtx, w=400, h=300;
    ctx.clearRect(0,0,w,h);

    const imgReady = _gamePreviewImg &&
                     _gamePreviewImg.complete &&
                     _gamePreviewImg.naturalWidth>0 &&
                     !_gamePreviewImg._failed;

    if(imgReady){
      const iw=_gamePreviewImg.naturalWidth;
      const ih=_gamePreviewImg.naturalHeight;
      const scale=Math.max(w/iw, h/ih);
      const sw=iw*scale, sh=ih*scale;
      const sx=(w-sw)/2, sy=(h-sh)/2;
      ctx.drawImage(_gamePreviewImg, sx, sy, sw, sh);
      ctx.fillStyle='rgba(0,0,0,0.38)';
      ctx.fillRect(0,0,w,h);
    } else {
      ctx.fillStyle='#0a0a18';
      ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='#40f080';ctx.lineWidth=2;ctx.strokeRect(2,2,w-4,h-4);
      const pulse=0.5+Math.sin(_anim*4)*0.5;
      ctx.globalAlpha=0.5+pulse*0.5;
      Utils.drawPixelText(ctx,'جاري تحميل الصورة...',w/2,h/2,
        {font:'8px "Press Start 2P"',color:'#40f080',shadow:'#000',align:'center'});
      ctx.globalAlpha=1;
    }

    const glow=0.3+Math.sin(_anim*2)*0.2;
    ctx.strokeStyle=`rgba(255,255,255,${glow})`;
    ctx.lineWidth=2;
    ctx.strokeRect(2,2,w-4,h-4);
  }

  function _renderGameLaunched(){
    const ctx=_pCtx, w=400, h=300;
    const imgReady = _gamePreviewImg &&
                     _gamePreviewImg.complete &&
                     _gamePreviewImg.naturalWidth>0 &&
                     !_gamePreviewImg._failed;
    if(imgReady){
      const iw=_gamePreviewImg.naturalWidth;
      const ih=_gamePreviewImg.naturalHeight;
      const scale=Math.max(w/iw, h/ih);
      const sw=iw*scale, sh=ih*scale;
      const sx=(w-sw)/2, sy=(h-sh)/2;
      ctx.drawImage(_gamePreviewImg, sx, sy, sw, sh);
    } else {
      ctx.fillStyle='#050510';
      ctx.fillRect(0,0,w,h);
    }
    ctx.fillStyle='rgba(0,0,0,0.62)';
    ctx.fillRect(0,0,w,h);
    Utils.drawPixelText(ctx,'اللعبة تعمل الآن!',w/2,h/2-18,
      {font:'9px "Press Start 2P"',color:'#f0c040',shadow:'#000',align:'center'});
    Utils.drawPixelText(ctx,'اضغط "إغلاق" للعودة',w/2,h/2+8,
      {font:'7px "Press Start 2P"',color:'#ffffff',shadow:'#000',align:'center'});
    Utils.drawPixelText(ctx,'إلى العالم الافتراضي',w/2,h/2+26,
      {font:'7px "Press Start 2P"',color:'#ffffff',shadow:'#000',align:'center'});
  }

  function drawPrompt(ctx){
    if(!_near||_promptA<=0||_active) return;
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
