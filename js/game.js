'use strict';
const Game = (() => {
  const S={LOADING:'loading',SELECT:'select',PLAYING:'playing',PAUSED:'paused'};
  let _state=S.LOADING,_cvs=null,_ctx=null,_last=0,_raf=null,_debug=false;

  function init(){
    _cvs=Utils.$('game-canvas');_ctx=_cvs.getContext('2d');
    _ctx.imageSmoothingEnabled=false;
    _resize();window.addEventListener('resize',_resize);
    UI.showLoading(()=>{_initSystems();UI.showCharacterSelect(_onChar);_state=S.SELECT;});
  }

  function _initSystems(){
    GameMap.init();
    Camera.init(_cvs.width,_cvs.height,2560,1920,0.12);
    Devices.init();Joystick.init();
    
    // تهيئة نظام المحادثة
    if(window.Chat) Chat.init();
  }

  function _onChar(charId){
    UI.stopPreviewAnimation();UI.showGame();
    Player.init(charId);NPC.init();
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
      Network.sendPosition(Player.getCenterX(),Player.getCenterY(),Player.getRect(),Joystick.getDirection());
    }
    NPC.update(delta);Devices.update(delta);
    
    // تحديث المحادثة المكانية (فحص المسافات والمؤقتات)
    if(window.Chat && Network.isConnected()) {
       Chat.update({x: Player.getCenterX(), y: Player.getCenterY()}, Network.getPlayers());
    }

    // عداد اللاعبين
    const el=Utils.$('hud-players-count');
    if(el)el.textContent='👥 '+(Network.getPlayerCount()+1);
  }

  function _draw(){
    const ctx=_ctx,cw=_cvs.width,ch=_cvs.height;
    ctx.fillStyle='#050510';ctx.fillRect(0,0,cw,ch);
    Camera.beginDraw(ctx);
      GameMap.draw(ctx);
      Devices.drawPrompt(ctx);
      NPC.draw(ctx);
      Network.drawOtherPlayers(ctx,Player.getAllChars());
      Player.draw(ctx);
      
      // رسم فقاعات الدردشة (تُرسم آخر شيء لتكون فوق الجميع)
      if(window.Chat) {
         Chat.drawBubbles(ctx, {x: Player.getCenterX(), y: Player.getCenterY()}, Network.getPlayers());
      }

      if(_debug)Collision.debugDraw(ctx,Camera.getOffset());
    Camera.endDraw(ctx);
    _vignette(ctx,cw,ch);
  }

  function _vignette(ctx,w,h){
    const gr=ctx.createRadialGradient(w/2,h/2,h*0.3,w/2,h/2,h*0.88);
    gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,10,0.52)');
    ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);
  }

  function _regInteract(){
    const gc=Utils.$('game-container');
    function onTap(e){
      const t=e.target;
      if(t.closest('#joystick-zone')||t.closest('#device-popup')||t.closest('#hud')||t.closest('#chat-action-btn')||t.closest('#chat-modal'))return;
      if(Devices.hasActive())Devices.close();
      else if(Devices.getNear())Devices.tryOpen();
    }
    gc.addEventListener('click',onTap);
    gc.addEventListener('touchend',e=>{
        // استثناء عناصر الواجهة من منع اللمس
        if(e.target.closest('#chat-input')||e.target.closest('#chat-modal')||e.target.closest('#chat-action-btn')) return;
        e.preventDefault();onTap(e);
    },{passive:false});
  }

  function _resize(){
    if(!_cvs)return;
    _cvs.width=window.innerWidth;_cvs.height=window.innerHeight;
    _ctx.imageSmoothingEnabled=false;
    if(_state===S.PLAYING)Camera.resize(_cvs.width,_cvs.height);
  }

  function pause(){if(_state===S.PLAYING){_state=S.PAUSED;if(_raf)cancelAnimationFrame(_raf);}}
  function resume(){if(_state===S.PAUSED){_state=S.PLAYING;_last=performance.now();_raf=requestAnimationFrame(_loop);}}

  document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
  window.addEventListener('keydown',e=>{
    if(e.code==='F2'){e.preventDefault();_debug=!_debug;UI.showToast(_debug?'🔴 Debug ON':'✅ Debug OFF',1200);}
  });

  return{init,pause,resume};
})();
