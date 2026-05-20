'use strict';
const Network = (() => {
  const SERVER='https://ncore-mmo-server.onrender.com';
  const SEND_RATE=100,INTERP=0.18,PW=24,PH=28;
  let _sock=null,_connected=false,_myId=null,_charId=0,_lastSend=0,_onConn=null;
  const _players=new Map();

  function connect(charId,onConnect){
    _charId=charId;_onConn=onConnect;
    _sock=io(SERVER,{transports:['websocket'],reconnection:true,reconnectionDelay:1500,timeout:10000});
    _reg();
  }

  function _reg(){
    _sock.on('connect',()=>{
      _connected=true;_myId=_sock.id;
      const sp=GameMap.getSpawnPoint();
      _sock.emit('player:join',{charId:_charId,x:sp.x,y:sp.y,dir:'down',name:'لاعب'});
      _onConn&&_onConn();
    });
    
    _sock.on('players:list', players => {
      _players.clear();
      for(const[id,d] of Object.entries(players)) {
        if(id!==_myId) {
            _players.set(id,_mk(d));
        }
      }
    });
    
    _sock.on('player:joined', ({id,data}) => {
      if(id===_myId) return;
      _players.set(id,_mk(data));
      UI.showToast('لاعب جديد دخل الصالة 🎮',1800);
    });
    
    _sock.on('player:moved',({id,x,y,dir})=>{
      const p=_players.get(id);if(!p)return;
      if(p.tx!==x||p.ty!==y)p.lastMove=performance.now();
      p.tx=x;p.ty=y;p.dir=dir;
    });

    _sock.on('chat:message',({id, text})=>{
      if(window.Chat && id !== _myId) Chat.addBubble(id, text);
    });

    _sock.on('player:left',id=>{_players.delete(id);});
    _sock.on('disconnect',()=>{_connected=false;UI.showToast('جارِ إعادة الاتصال ⏳',2000);});
    _sock.on('reconnect',()=>{
      _connected=true;
      const sp=GameMap.getSpawnPoint();
      _sock.emit('player:join',{charId:_charId,x:sp.x,y:sp.y,dir:'down',name:'لاعب'});
      UI.showToast('تمت إعادة الاتصال ✅',1500);
    });
    _sock.on('connect_error',()=>{});
    _sock.on('error:full',()=>UI.showToast('الصالة ممتلئة! حاول لاحقاً 😅',3000));
  }

  function _mk(d){
    return{x:d.x,y:d.y,tx:d.x,ty:d.y,charId:d.charId||0,dir:d.dir||'down',
      frame:0,ft:0,moving:false,name:d.name||'لاعب',lastMove:0};
  }

  function sendPosition(cx,cy,rect,dir){
    if(!_connected)return;
    const now=performance.now();if(now-_lastSend<SEND_RATE)return;
    _lastSend=now;
    _sock.emit('player:move',{x:Math.round(cx),y:Math.round(cy),dir});
  }

  function sendChat(text) {
     if(!_connected) return;
     _sock.emit('chat:message', text);
  }

  function _interp(){
    const FT=0.16;
    const now=performance.now();
    for(const p of _players.values()){
      p.x=Utils.lerp(p.x,p.tx,INTERP);p.y=Utils.lerp(p.y,p.ty,INTERP);
      p.moving=(now-p.lastMove)<150;
      if(p.moving){p.ft+=0.016;if(p.ft>=FT){p.ft-=FT;p.frame=(p.frame+1)%3;}}
      else{p.frame=0;p.ft=0;}
    }
  }

  function drawOtherPlayers(ctx,allChars){
    _interp();
    for(const p of _players.values()){
      if(!Camera.isVisible({x:p.x-20,y:p.y-20,w:PW+40,h:PH+40}))continue;
      const char=allChars[p.charId];if(!char)continue;
      
      ctx.fillStyle='rgba(0,0,0,0.22)';
      ctx.beginPath();ctx.ellipse(p.x,p.y+PH/2+4,10,4,0,0,Math.PI*2);ctx.fill();
      char.draw(ctx,p.x-PW/2,p.y-PH/2,p.dir,p.frame,p.moving);
      _drawName(ctx,p);
    }
  }

  function _drawName(ctx,p){
    const nx=p.x,ny=p.y-PH/2-16;
    const tw=p.name.length*6+10;
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(nx-tw/2,ny-8,tw,11);
    Utils.drawPixelText(ctx,p.name,nx,ny-7,{font:'5px "Press Start 2P"',color:'#f0c040',shadow:'#000',align:'center'});
  }

  function getPlayerCount(){return _players.size;}
  function isConnected(){return _connected;}
  function getMyId(){return _myId;}
  function getPlayers(){return _players;}

  return{connect,sendPosition,drawOtherPlayers,getPlayerCount,isConnected,getMyId, sendChat, getPlayers};
})();
