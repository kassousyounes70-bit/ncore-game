'use strict';
const Game = (() => {
  const S={LOADING:'loading',SELECT:'select',PLAYING:'playing',PAUSED:'paused'};
  let _state=S.LOADING,_cvs=null,_ctx=null,_last=0,_raf=null,_debug=false;

  function init(){
    _cvs=Utils.$('game-canvas');_ctx=_cvs.getContext('2d');
    _ctx.imageSmoothingEnabled=false;
    _resize();window.addEventListener('resize',_resize);
    
    Player.preload();
    UI.showLoading(()=>{
        _initSystems();
        UI.showCharacterSelect(_onChar);
        _state=S.SELECT;
    });
  }

  function _initSystems(){
    GameMap.init();
    Camera.init(_cvs.width,_cvs.height,2560,1920,0.12);
    Devices.init();Joystick.init();
    if(window.Chat) Chat.init();
    MiniMap.init();
    Report.init(); // إضافة نظام التبليغ
  }

  function _onChar(charId){
    UI.stopPreviewAnimation();UI.showGame();
    Player.init(charId);NPC.init();
    Camera.snapTo(Player.getCenterX(), Player.getCenterY());
    UI.showHUD(Player.getCharName());
    Joystick.show();_regInteract();
    Network.connect(charId,()=>UI.showToast('مرحباً بك في صالة الألعاب! 🎮',2500));
    _state=S.PLAYING;_last=performance.now();_raf=requestAnimationFrame(_loop);
  }

  function _loop(ts){
    if(_state!==S.PLAYING)return;
    const delta=Math.min((ts-_last)/1000,0.05);_last=ts;
    _update(delta);_draw();_raf=requestAnimationFrame(_loop);
  }

  function _update(delta){
    const open=Devices.hasActive();
    Joystick.update();
    
    if(!open){
      Player.update(delta);
      Camera.update(Player.getCenterX(), Player.getCenterY(), delta);
      Network.sendPosition(Player.getCenterX(),Player.getCenterY(),Player.getRect(),Joystick.getDirection());
    }
    
    NPC.update(delta);
    Devices.update(delta);
    PoliceSystem.update(delta); // تحديث نظام الشرطة
    
    if(window.Chat && Network.isConnected()) {
       Chat.update(delta);
    }

    const el=Utils.$('hud-players-count');
    if(el)el.textContent='👥 '+(Network.getPlayerCount()+1);
  }

  function _draw(){
    console.log('[Game] _draw running');
    const ctx = _ctx;
    const cw = _cvs.width, ch = _cvs.height;
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, cw, ch);
    
    Camera.beginDraw(ctx);
      GameMap.draw(ctx);
      Devices.drawPrompt(ctx);
      NPC.draw(ctx);
      Network.drawOtherPlayers(ctx,Player.getAllChars());
      Player.draw(ctx);
      
      // استدعاء آمن لفقاعات الدردشة
      if(window.Chat) {
        if(typeof Chat.drawBubbles === 'function') {
          Chat.drawBubbles(ctx, {x: Player.getCenterX(), y: Player.getCenterY()}, Network.getPlayers());
        } else {
          console.error('[Game] Chat موجود لكن drawBubbles ليست دالة!');
          console.log('محتويات Chat:', Object.keys(window.Chat));
        }
      } else {
        console.warn('[Game] Chat غير معرف');
      }
      
      if(_debug) Collision.debugDraw(ctx,Camera.getOffset());
      PoliceSystem.draw(ctx); // رسم رجال الشرطة
    Camera.endDraw(ctx);
    
    // رسم المؤثرات والخريطة المصغرة
    _vignette(ctx, cw, ch);
    PoliceSystem.drawFlash(ctx, cw, ch); // وميض الخريطة
    PoliceSystem.drawStars(ctx);         // عرض النجوم في HUD
    
    MiniMap.draw(
      Player.getCenterX(),
      Player.getCenterY(),
      _getPlayerAngle(),
      Network.getPlayers()
    );
  }

  function _vignette(ctx,w,h){
    const gr=ctx.createRadialGradient(w/2,h/2,h*0.3,w/2,h/2,h*0.88);
    gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,10,0.52)');
    ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);
  }

  function _regInteract(){
    const interactBtn = Utils.$('interact-btn');
    if (interactBtn) {
      const onInteract = (e) => {
        e.preventDefault();
        if(Devices.hasActive()) Devices.close();
        else if(Devices.getNear()) Devices.tryOpen();
      };
      interactBtn.addEventListener('click', onInteract);
      interactBtn.addEventListener('touchend', onInteract, {passive: false});
    }
  }

  function _resize(){
    if(!_cvs)return;
    _cvs.width=window.innerWidth;_cvs.height=window.innerHeight;
    if(_ctx) _ctx.imageSmoothingEnabled=false;
    if(_state===S.PLAYING)Camera.resize(_cvs.width,_cvs.height);
  }

  function _getPlayerAngle(){
    const dir = Joystick.getDirection();
    const map = { right:0, down:Math.PI/2, left:Math.PI, up:-Math.PI/2, idle:0 };
    return map[dir] || 0;
  }

  function pause(){if(_state===S.PLAYING){_state=S.PAUSED;if(_raf)cancelAnimationFrame(_raf);}}
  function resume(){if(_state===S.PAUSED){_state=S.PLAYING;_last=performance.now();_raf=requestAnimationFrame(_loop);}}

  document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
  window.addEventListener('keydown',e=>{
    if(e.code==='F2'){e.preventDefault();_debug=!_debug;UI.showToast(_debug?'🔴 Debug ON':'✅ Debug OFF',1200);}
  });

  return{init,pause,resume};
})();