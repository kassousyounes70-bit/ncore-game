'use strict';
const Devices = (() => {
  let _active=null,_near=null;
  let _pCvs=null,_pCtx=null,_pEl=null,_closeBtn=null,_fsBtn=null,_iframe=null;
  let _interactBtn=null; 
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
    
    // ربط زر التفاعل
    _interactBtn=Utils.$('interact-btn');

    _closeBtn.addEventListener('click',close);
    _closeBtn.addEventListener('touchend',e=>{e.preventDefault();close();});
    
    _fsBtn.addEventListener('click',toggleFullscreen);
    _fsBtn.addEventListener('touchend',e=>{e.preventDefault();toggleFullscreen();});

    _pEl.addEventListener('click',e=>{if(e.target===_pEl)close();});
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
    
    // --- إصلاح الذكاء الاصطناعي لزر التفاعل ---
    if (_interactBtn) {
        if (_near && !_active) {
            _interactBtn.classList.remove('hidden');
            _interactBtn.style.display = 'block';
        } else {
            _interactBtn.classList.add('hidden');
            _interactBtn.style.display = 'none';
        }
    }

    if(_active && _iframe.classList.contains('hidden')){
       _render(_active);
    }
  }

  function tryOpen(){if(_near&&!_active)open(_near);}

  function open(dev){
    _active=dev;_anim=0;
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

    if (typeof GamesData !== 'undefined' && GamesData[devId]) {
        Utils.hide('device-canvas');
        Utils.show('device-iframe');
        _iframe.src = GamesData[devId];
        
        _iframe.focus();
        _iframe.onload = () => {
            _iframe.contentWindow.focus();
            
            // =========================================
            // 🚀 إرسال الإشارة إلى تطبيق الأندرويد!
            // =========================================
            if (window.AndroidApp && window.AndroidApp.onGameScreenOpened) {
                window.AndroidApp.onGameScreenOpened(GamesData[devId]);
            }
        };

        if (typeof GamepadUI !== 'undefined') {
            GamepadUI.showForGame(devId);
        }

    } else {
        Utils.hide('device-iframe');
        Utils.show('device-canvas');
        _render(dev);
    }

    Joystick.hide();Joystick.reset();
  }

  function close(){
    _active=null;
    Utils.hide('device-popup');
    _iframe.src = ''; 
    if(_isFullscreen) toggleFullscreen();
    
    // =========================================
    // 🛑 إرسال إشارة للتطبيق أن الشاشة أُغلقت
    // =========================================
    if (window.AndroidApp && window.AndroidApp.onGameScreenClosed) {
        window.AndroidApp.onGameScreenClosed();
    }

    if (typeof GamepadUI !== 'undefined') {
        GamepadUI.hide();
    }
    Joystick.reset();Joystick.show();
    MiniGames.stop();
  }

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
