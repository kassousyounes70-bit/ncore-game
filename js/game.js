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
    Report.init();
    EventManager.init(); // إدارة الفعاليات
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
    // إذا كان اللوبي نشطاً، نحدّث اللوبي فقط ونخرج
    if(EventLobby.isActive()){
      Joystick.update();
      EventLobby.update(delta);
      EventManager.updateTransition(delta);
      return;
    }
    // إذا كانت لعبة Uno نشطة، نحدّثها ونخرج
    if(EventUno.isActive()){
      Joystick.update();
      EventUno.update(delta);
      EventManager.updateTransition(delta);
      return;
    }

    const open=Devices.hasActive();
    Joystick.update();
    
    if(!open){
      Player.update(delta);
      Camera.update(Player.getCenterX(), Player.getCenterY(), delta);
      Network.sendPosition(Player.getCenterX(),Player.getCenterY(),Player.getRect(),Joystick.getDirection());
    }
    
    NPC.update(delta);
    Devices.update(delta);
    PoliceSystem.update(delta);
    EventManager.update(delta); // تحديث قرب باب الفعاليات
    
    if(window.Chat && Network.isConnected()) {
       Chat.update(delta);
    }

    const el=Utils.$('hud-players-count');
    if(el)el.textContent='👥 '+(Network.getPlayerCount()+1);
  }

  function _draw(){
    const ctx = _ctx;
    const cw = _cvs.width, ch = _cvs.height;
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, cw, ch);
    
    // إذا كان اللوبي نشطاً، نرسم اللوبي ونخرج
    if(EventLobby.isActive()){
      EventLobby.draw(ctx);
      EventManager.drawTransition(ctx, cw, ch);
      return;
    }
    // إذا كانت لعبة Uno نشطة، نرسمها ونخرج
    if(EventUno.isActive()){
      EventUno.draw(ctx);
      EventManager.drawTransition(ctx, cw, ch);
      return;
    }

    Camera.beginDraw(ctx);
      GameMap.draw(ctx);
      Devices.drawPrompt(ctx);
      NPC.draw(ctx);
      Network.drawOtherPlayers(ctx,Player.getAllChars());
      Player.draw(ctx);
      
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
      PoliceSystem.draw(ctx);
    Camera.endDraw(ctx);
    
    _vignette(ctx, cw, ch);
    PoliceSystem.drawFlash(ctx, cw, ch);
    PoliceSystem.drawStars(ctx);
    
    MiniMap.draw(
      Player.getCenterX(),
      Player.getCenterY(),
      _getPlayerAngle(),
      Network.getPlayers()
    );
    
    // رسم مؤشر باب الفعاليات وانتقالاتها
    EventManager.drawPrompt(ctx);
    EventManager.drawTransition(ctx, cw, ch);
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
        // إذا كان اللوبي نشطاً، نتعامل مع الضغط داخله (مثل زر الخروج)
        if(EventLobby.isActive()){
          EventLobby.handleTap(e.clientX, e.clientY);
          return;
        }
        if(Devices.hasActive()) Devices.close();
        else if(Devices.getNear()) Devices.tryOpen();
        else if(EventManager.isNearDoor()) EventManager.tryOpenMenu();
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