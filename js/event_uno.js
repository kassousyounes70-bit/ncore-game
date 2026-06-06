'use strict';
const EventUno = (() => {
  const TILE=64,GRID_COLS=16,GRID_ROWS=10,ROUND_TIME=30,PUSH_CHARGE=2.85,DODGE_CHANCE=0.85;
  const SAFE_COLS=3,CARD_COLS=3,GRID_START=SAFE_COLS,GRID_END=GRID_COLS-CARD_COLS;
  const WORLD_W=GRID_COLS*TILE,WORLD_H=GRID_ROWS*TILE;
  const COLORS=['red','blue','green','yellow'],NUMBERS=[0,1,2,3,4,5,6,7,8,9],ACTIONS=['skip','reverse','plus2','wild'];
  const COLOR_HEX={red:'#cc1111',blue:'#1144cc',green:'#118811',yellow:'#ccaa00'};
  const TABLE_W=192,TABLE_H=128,TABLE_X=WORLD_W/2-TABLE_W/2,TABLE_Y=WORLD_H/2-TABLE_H/2;

  let _active=false,_players=[],_myId='',_roundNum=0,_phase='idle',_roundTimer=0,_countdownT=3;
  let _targetCard=null,_actionCard=null,_cards=[],_capsules=[],_fragiles=[],_blockers=[];
  let _laserOn=true,_lightsOn=true,_reversed=false,_skipApplied=false,_camX=0,_camY=0,_sweepT=0,_sweepDir=1;
  const _me={x:WORLD_W/2,y:WORLD_H/2,frame:0,ft:0,moving:false,pushCharge:0,dodgeCharge:0,heldCard:null,heldCard2:null,invincible:0,falling:false,fallT:0,jdx:0,jdy:0};

  function enter(players){
    _active=true;_roundNum=0;_phase='idle';_myId=Network.getMyId();_reversed=false;
    _players=players.map((p,i)=>({
      id:p.id,name:p.name||'لاعب',x:SAFE_COLS*TILE/2,y:(1+i%(GRID_ROWS-2))*TILE,
      hearts:3,card:null,card2:null,alive:true,spectating:false,charId:p.charId||0,
      frame:0,ft:0,moving:false,isBot:p.isBot||false,botLevel:p.botLevel||'medium',botTarget:null,botState:'idle'
    }));
    _buildUI();_hideWorldUI();setTimeout(_startRound,500);
  }

  function _hideWorldUI(){
    ['report-btn','interact-btn'].forEach(id=>{
      const el=Utils.$(id);if(el){el.classList.add('hidden');el.style.display='none';}
    });
  }

  function _showWorldUI(){
    ['report-btn','interact-btn'].forEach(id=>{
      const el=Utils.$(id);if(el){el.classList.remove('hidden');el.style.display='block';}
    });
  }

  function _startRound(){
    if(!_active)return;
    _roundNum++;_phase='camSweep';_sweepT=0;_sweepDir=1;_roundTimer=ROUND_TIME;
    _laserOn=true;_lightsOn=true;_skipApplied=false;_me.heldCard=null;_me.heldCard2=null;
    _targetCard={color:COLORS[Math.floor(Math.random()*COLORS.length)],number:NUMBERS[Math.floor(Math.random()*NUMBERS.length)]};
    _actionCard=_roundNum>1&&Math.random()<0.55?ACTIONS[Math.floor(Math.random()*ACTIONS.length)]:null;
    if(_actionCard==='reverse')_reversed=!_reversed;
    _buildCards();_buildCapsules();_buildFragiles();_buildBlockers();_resetPositions();
  }

  function _buildCards(){
    _cards=[];
    const alive=_getAlivePlayers().length;
    const zoneX=_reversed?0:GRID_END*TILE;
    const correct=Math.max(1,Math.floor(alive*0.9));
    for(let i=0;i<correct;i++){
      _cards.push({color:_targetCard.color,number:_targetCard.number,x:zoneX+Utils.randInt(8,CARD_COLS*TILE-8),y:Utils.randInt(TILE,WORLD_H-TILE),taken:false,real:true,isSecond:false});
    }
    const bluffs=Utils.randInt(3,7);
    for(let i=0;i<bluffs;i++){
      _cards.push({color:_fakeSimilarColor(_targetCard.color),number:_fakeSimilarNum(_targetCard.number),x:zoneX+Utils.randInt(8,CARD_COLS*TILE-8),y:Utils.randInt(TILE,WORLD_H-TILE),taken:false,real:false,isSecond:false});
    }
    if(_actionCard==='plus2'){
      for(let i=0;i<correct;i++){
        _cards.push({color:COLORS[Math.floor(Math.random()*COLORS.length)],number:NUMBERS[Math.floor(Math.random()*NUMBERS.length)],x:zoneX+Utils.randInt(8,CARD_COLS*TILE-8),y:Utils.randInt(TILE,WORLD_H-TILE),taken:false,real:true,isSecond:true});
      }
    }
  }

  function _fakeSimilarColor(c){
    const m={red:'#ff4400',blue:'#0055ff',green:'#00aa33',yellow:'#ffcc00'};
    return m[c]||c;
  }

  function _fakeSimilarNum(n){
    if(n===1)return 7;if(n===7)return 1;if(n===6)return 9;if(n===9)return 6;return(n+1)%10;
  }

  function _buildCapsules(){
    _capsules=[];
    const cx=_reversed?GRID_END*TILE:0;
    COLORS.forEach((color,i)=>{
      _capsules.push({color,open:true,occupants:[],x:cx+Utils.randInt(4,SAFE_COLS*TILE-TILE-4),y:(i*2+0.5)*TILE,w:TILE*1.2,h:TILE*1.2});
    });
  }

  function _buildFragiles(){
    _fragiles=[];
    const count=Utils.randInt(6,14);
    for(let i=0;i<count;i++){
      let fx=Utils.randInt(GRID_START,GRID_END-1)*TILE;
      let fy=Utils.randInt(1,GRID_ROWS-2)*TILE;
      if(fx>TABLE_X-TILE&&fx<TABLE_X+TABLE_W+TILE&&fy>TABLE_Y-TILE&&fy<TABLE_Y+TABLE_H+TILE)continue;
      _fragiles.push({x:fx,y:fy,w:TILE,h:TILE,state:'normal',crackT:0});
    }
  }

  function _buildBlockers(){
    _blockers=[];
    const count=Utils.randInt(4,8);
    for(let i=0;i<count;i++){
      let bx=Utils.randInt(GRID_START,GRID_END-1)*TILE;
      let by=Utils.randInt(0,GRID_ROWS-1)*TILE;
      if(bx>TABLE_X-TILE&&bx<TABLE_X+TABLE_W+TILE&&by>TABLE_Y-TILE&&by<TABLE_Y+TABLE_H+TILE)continue;
      _blockers.push({x:bx,y:by,w:TILE,h:TILE/3,visible:Math.random()<0.5,timer:Utils.randFloat(1.2,3.0),period:Utils.randFloat(1.2,3.0)});
    }
  }

  function _resetPositions(){
    const sx=_reversed?WORLD_W-SAFE_COLS*TILE/2:SAFE_COLS*TILE/2;
    _me.x=sx;_me.y=WORLD_H/2;_me.heldCard=null;_me.heldCard2=null;_me.falling=false;_me.fallT=0;
    _players.forEach((p,i)=>{p.x=sx;p.y=(1+i%(GRID_ROWS-2))*TILE;p.card=null;p.card2=null;p.spectating=false;});
  }

  function update(delta){
    if(!_active)return;
    switch(_phase){
      case 'camSweep':_updateSweep(delta);break;
      case 'countdown':_updateCountdown(delta);break;
      case 'running':_updateRunning(delta);break;
    }
    if(_phase==='running'||_phase==='result'){
      _camX=Utils.clamp(_me.x-window.innerWidth/2,0,Math.max(0,WORLD_W-window.innerWidth));
      _camY=Utils.clamp(_me.y-window.innerHeight/2,0,Math.max(0,WORLD_H-window.innerHeight));
    }
  }

  function _updateSweep(delta){
    _sweepT+=delta;
    const dur=2.0;
    const prog=Math.min(_sweepT/dur,1);
    if(_sweepDir===1){
      _camX=Utils.lerp(0,WORLD_W-window.innerWidth,prog);
    }
    if(_sweepT>=dur&&_sweepDir===1){
      _sweepDir=-1;_sweepT=0;
    }else if(_sweepDir===-1){
      _camX=Utils.lerp(WORLD_W-window.innerWidth,0,prog);
      if(_sweepT>=dur){_camX=0;_phase='countdown';_countdownT=3;}
    }
    _camY=Utils.clamp(_me.y-window.innerHeight/2,0,Math.max(0,WORLD_H-window.innerHeight));
  }

  function _updateCountdown(delta){
    _countdownT-=delta;
    if(_countdownT<=0){_phase='running';_laserOn=false;}
  }

  function _updateRunning(delta){
    _roundTimer-=delta;
    if(_actionCard==='skip'&&!_skipApplied&&_roundTimer<=15){
      _skipApplied=true;_roundTimer=Math.max(0,_roundTimer-5);UI.showToast('⏭ SKIP! -5s!',1500);
    }
    if(_actionCard==='wild')_lightsOn=false;
    for(const b of _blockers){
      b.timer-=delta;
      if(b.timer<=0){b.visible=!b.visible;b.timer=b.period;}
    }
    for(const f of _fragiles){
      if(f.state==='cracked'){
        f.crackT-=delta;
        if(f.crackT<=0){f.state='fallen';_onTileFallen(f);}
      }
    }
    if(!_me.falling){
      _updateMeMovement(delta);
      _me.pushCharge=Math.min(1,_me.pushCharge+delta/PUSH_CHARGE);
      _me.dodgeCharge=Math.min(1,_me.dodgeCharge+delta/2.5);
      if(_me.invincible>0)_me.invincible-=delta;
      _checkPickup();_checkCapsule();_checkFragileMe();
    }else{
      _me.fallT+=delta;
      if(_me.fallT>1.0){_me.falling=false;_me.fallT=0;_loseHeart(_myId);}
    }
    _updateBots(delta);
    if(_roundTimer<=0)_endRound();
  }

  function _updateMeMovement(delta){
    const jx=_me.jdx||Joystick.getDx();
    const jy=_me.jdy||Joystick.getDy();
    const mag=Math.sqrt(jx*jx+jy*jy);
    _me.moving=mag>0.05;
    if(_me.moving){
      const spd=160*delta;
      const nx=_me.x+jx*spd,ny=_me.y+jy*spd;
      if(_canMove(nx,_me.y))_me.x=Utils.clamp(nx,0,WORLD_W);
      if(_canMove(_me.x,ny))_me.y=Utils.clamp(ny,0,WORLD_H);
      _me.ft+=delta;
      if(_me.ft>=0.13){_me.ft=0;_me.frame=(_me.frame+1)%3;}
    }else{_me.frame=0;_me.ft=0;}
  }

  function _canMove(nx,ny){
    if(nx<10||nx>WORLD_W-10||ny<10||ny>WORLD_H-10)return false;
    const lx=_reversed?GRID_END*TILE:SAFE_COLS*TILE;
    if(_laserOn){
      if(!_reversed&&nx>lx-10)return false;
      if(_reversed&&nx<lx+10)return false;
    }
    for(const b of _blockers){
      if(!b.visible)continue;
      if(nx>b.x&&nx<b.x+b.w&&ny>b.y&&ny<b.y+b.h)return false;
    }
    if(nx>TABLE_X-12&&nx<TABLE_X+TABLE_W+12&&ny>TABLE_Y-12&&ny<TABLE_Y+TABLE_H+12)return false;
    return true;
  }

  function _updateBots(delta){
    for(const p of _players){
      if(!p.isBot||!p.alive||p.spectating||p.falling)continue;
      _updateBot(p,delta);
    }
  }

  function _updateBot(bot,delta){
    const spd=(bot.botLevel==='hard'?170:bot.botLevel==='medium'?130:90)*delta;
    const dodgeChance=bot.botLevel==='hard'?0.9:bot.botLevel==='medium'?0.5:0.2;
    if(!bot.card){
      let nearest=null,nd=Infinity;
      for(const c of _cards){
        if(c.taken)continue;
        const d=Utils.distance(bot.x,bot.y,c.x,c.y);
        if(d<nd){nd=d;nearest=c;}
      }
      if(nearest){
        const dx=nearest.x-bot.x,dy=nearest.y-bot.y;
        const dm=Math.sqrt(dx*dx+dy*dy);
        if(dm>8){
          const nx=bot.x+dx/dm*spd,ny=bot.y+dy/dm*spd;
          let moved=false;
          if(_canMove(nx,bot.y)){bot.x=Utils.clamp(nx,0,WORLD_W);moved=true;}
          if(_canMove(bot.x,ny)){bot.y=Utils.clamp(ny,0,WORLD_H);moved=true;}
          if(!moved){bot.x+=(Math.random()-0.5)*20;bot.y+=(Math.random()-0.5)*20;}
          if(Math.random()<dodgeChance)_botAvoidFragiles(bot,delta,spd);
          bot.moving=moved;
          bot.ft+=delta;
          if(bot.ft>=0.13){bot.ft=0;bot.frame=(bot.frame+1)%3;}
        }else{nearest.taken=true;bot.card=nearest;}
      }
    }else{
      let target=null;
      for(const cap of _capsules){
        if(!cap.open)continue;
        if(bot.card.color===cap.color||bot.card.number===_targetCard.number){target=cap;break;}
      }
      if(target){
        const dx=target.x+target.w/2-bot.x,dy=target.y+target.h/2-bot.y;
        const dm=Math.sqrt(dx*dx+dy*dy);
        if(dm>12){
          const nx=bot.x+dx/dm*spd,ny=bot.y+dy/dm*spd;
          let moved=false;
          if(_canMove(nx,bot.y)){bot.x=Utils.clamp(nx,0,WORLD_W);moved=true;}
          if(_canMove(bot.x,ny)){bot.y=Utils.clamp(ny,0,WORLD_H);moved=true;}
          if(!moved){bot.x+=(Math.random()-0.5)*20;bot.y+=(Math.random()-0.5)*20;}
        }else{target.occupants.push(bot.id);}
      }
    }
  }

  function _botAvoidFragiles(bot,delta,spd){
    for(const f of _fragiles){
      if(f.state==='fallen')continue;
      const near=Utils.distance(bot.x,bot.y,f.x+f.w/2,f.y+f.h/2)<TILE*1.2;
      if(near){
        const avoidX=bot.x+(bot.y-f.y)*0.5;
        if(_canMove(avoidX,bot.y))bot.x=Utils.clamp(avoidX,0,WORLD_W);
        break;
      }
    }
  }

  function _checkPickup(){
    for(const c of _cards){
      if(c.taken)continue;
      if(Utils.distance(_me.x,_me.y,c.x,c.y)<28){
        if(_actionCard==='plus2'&&_me.heldCard&&!_me.heldCard2&&c.isSecond){
          c.taken=true;_me.heldCard2=c;UI.showToast('🃏',800);
        }else if(!_me.heldCard&&!c.isSecond){
          c.taken=true;_me.heldCard=c;UI.showToast('🃏',600);
        }
        break;
      }
    }
  }

  function _checkCapsule(){
    if(!_me.heldCard)return;
    if(_actionCard==='plus2'&&!_me.heldCard2)return;
    for(const cap of _capsules){
      if(!cap.open)continue;
      if(Utils.distance(_me.x,_me.y,cap.x+cap.w/2,cap.y+cap.h/2)>36)continue;
      if(_me.heldCard.color===cap.color||_me.heldCard.number===_targetCard.number){
        cap.occupants.push(_myId);UI.showToast('✅',800);
      }else{
        UI.showToast('❌',800);_me.heldCard=null;
      }
      break;
    }
  }

  function _checkFragileMe(){
    for(const f of _fragiles){
      if(f.state==='fallen')continue;
      if(_me.x>f.x&&_me.x<f.x+f.w&&_me.y>f.y&&_me.y<f.y+f.h){
        if(f.state==='normal'){f.state='cracked';f.crackT=1.2;}
        else if(f.state==='cracked'){f.state='fallen';_me.falling=true;_me.fallT=0;}
      }
    }
  }

  function _onTileFallen(tile){
    for(const p of _players){
      if(!p.alive||p.spectating)continue;
      if(p.x>tile.x&&p.x<tile.x+tile.w&&p.y>tile.y&&p.y<tile.y+tile.h){
        p.falling=true;p.fallT=0;
        setTimeout(()=>{p.falling=false;p.fallT=0;_loseHeart(p.id);},1000);
      }
    }
  }

  function _loseHeart(id){
    if(id===_myId){
      const me=_getMyPlayer();
      if(!me)return;
      me.hearts--;
      if(me.hearts<=0){me.alive=false;UI.showToast('💀',2500);}
      else{me.spectating=true;UI.showToast(`💔 (${me.hearts}/3)`,1500);}
    }else{
      const p=_players.find(x=>x.id===id);
      if(!p)return;
      p.hearts--;
      if(p.hearts<=0)p.alive=false;
      else p.spectating=true;
    }
  }

  function _endRound(){
    _phase='result';_lightsOn=true;
    const me=_getMyPlayer();
    const allInCapsule=_capsules.some(c=>c.occupants.includes(_myId));
    const anyInCapsule=_capsules.some(c=>c.occupants.length>0);
    if(!anyInCapsule){
      if(_roundNum>1){
        if(me&&me.alive)me.hearts=Math.max(0,me.hearts-1);
        _players.forEach(p=>{if(p.alive)p.hearts=Math.max(0,p.hearts-1);});
        UI.showToast('⚖️',2000);
      }else{
        UI.showToast('⚖️',2000);
      }
    }else{
      if(me&&me.alive&&!me.spectating&&!allInCapsule)_loseHeart(_myId);
      _players.forEach(p=>{
        if(!p.alive||p.spectating)return;
        const inCap=_capsules.some(c=>c.occupants.includes(p.id));
        if(!inCap)_loseHeart(p.id);
      });
    }
    if(me)me.spectating=false;
    _players.forEach(p=>{p.spectating=false;});
    const alive=_getAlivePlayers();
    if(alive.length<=1){
      _phase='gameover';
      if(alive.length===0)UI.showToast('🤝',4000);
      else UI.showToast(`🏆 ${alive[0].name}`,4000);
      setTimeout(exit,5000);
      return;
    }
    setTimeout(_startRound,3000);
  }

  function push(dir){
    if(_me.pushCharge<1)return;
    _me.pushCharge=0;
    const off={up:{dx:0,dy:-TILE},down:{dx:0,dy:TILE},left:{dx:-TILE,dy:0},right:{dx:TILE,dy:0}};
    const o=off[dir];if(!o)return;
    for(const p of _players){
      if(!p.alive||p.spectating||p.invincible>0)continue;
      if(Utils.distance(_me.x,_me.y,p.x,p.y)>TILE*1.2)continue;
      p.x=Utils.clamp(p.x+o.dx,0,WORLD_W);p.y=Utils.clamp(p.y+o.dy,0,WORLD_H);
      _checkFragilePlayer(p);
      Network.sendPush(p.id,p.x,p.y);
      UI.showToast(`💥 ${p.name}`,600);
      break;
    }
  }

  function steal(){
    if(_me.pushCharge<1)return;
    for(const p of _players){
      if(!p.alive||!p.card||p.invincible>0||_me.invincible>0)continue;
      if(Utils.distance(_me.x,_me.y,p.x,p.y)>TILE*0.9)continue;
      if(Math.random()<DODGE_CHANCE&&p.isBot&&p.botLevel==='hard'){
        UI.showToast(`${p.name} 💨`,600);return;
      }
      _me.heldCard=p.card;p.card=null;
      UI.showToast(`🃏 ${p.name}`,800);
      return;
    }
  }

  function dodge(){
    if(_me.dodgeCharge<1)return;
    _me.dodgeCharge=0;
    if(Math.random()<DODGE_CHANCE){
      _me.invincible=0.9;UI.showToast('💨',600);
    }else{
      UI.showToast('😵',600);
    }
  }

  function _checkFragilePlayer(p){
    for(const f of _fragiles){
      if(f.state==='fallen')continue;
      if(p.x>f.x&&p.x<f.x+f.w&&p.y>f.y&&p.y<f.y+f.h){
        if(f.state==='normal'){f.state='cracked';f.crackT=1.2;}
        else if(f.state==='cracked'){
          f.state='fallen';p.falling=true;
          setTimeout(()=>{p.falling=false;_loseHeart(p.id);},1000);
        }
      }
    }
  }

  function draw(ctx){
    if(!_active)return;
    const cw=window.innerWidth,ch=window.innerHeight;
    ctx.save();
    ctx.translate(-_camX,-_camY);
    _drawFloor(ctx);
    _drawTable(ctx);
    _drawBigScreen(ctx);
    _drawFragiles(ctx);
    _drawBlockers(ctx);
    _drawLaser(ctx);
    _drawCapsules(ctx);
    _drawCards(ctx);
    _drawPlayers(ctx);
    _drawMe(ctx);
    ctx.restore();
    if(!_lightsOn)_drawDarkness(ctx,cw,ch);
    _drawHUD(ctx,cw,ch);
    if(_phase==='countdown'&&_countdownT>0)_drawCountdown(ctx,cw,ch);
    if(_phase==='camSweep')_drawTargetCardBig(ctx,cw,ch);
  }

  function _drawFloor(ctx){
    for(let r=0;r<GRID_ROWS;r++){
      for(let c=0;c<GRID_COLS;c++){
        const inSafe=c<SAFE_COLS||c>=GRID_END;
        ctx.fillStyle=inSafe?((r+c)%2===0?'#0d0025':'#0a001e'):((r+c)%2===0?'#111':'#0a0a0a');
        ctx.fillRect(c*TILE,r*TILE,TILE,TILE);
      }
    }
    ctx.strokeStyle='rgba(136,0,255,0.05)';ctx.lineWidth=1;
    for(let x=0;x<=WORLD_W;x+=TILE){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_H);ctx.stroke();}
    for(let y=0;y<=WORLD_H;y+=TILE){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke();}
  }

  function _drawTable(ctx){
    ctx.fillStyle='#1a0530';ctx.fillRect(TABLE_X,TABLE_Y,TABLE_W,TABLE_H);
    ctx.strokeStyle='#8800ff';ctx.lineWidth=4;ctx.strokeRect(TABLE_X,TABLE_Y,TABLE_W,TABLE_H);
    ctx.fillStyle='#2a0a4a';ctx.fillRect(TABLE_X+10,TABLE_Y+10,TABLE_W-20,TABLE_H-20);
    ctx.strokeStyle='#ff0088';ctx.lineWidth=2;ctx.strokeRect(TABLE_X+10,TABLE_Y+10,TABLE_W-20,TABLE_H-20);
    const cw=32,ch=32;
    const chairs=[
      {x:TABLE_X+TABLE_W/2-cw/2,y:TABLE_Y-ch-10},
      {x:TABLE_X+TABLE_W/2-cw/2,y:TABLE_Y+TABLE_H+10},
      {x:TABLE_X-cw-10,y:TABLE_Y+TABLE_H/2-ch/2},
      {x:TABLE_X+TABLE_W+10,y:TABLE_Y+TABLE_H/2-ch/2}
    ];
    chairs.forEach(c=>{
      ctx.fillStyle='#111';ctx.fillRect(c.x,c.y,cw,ch);
      ctx.strokeStyle='#00ff88';ctx.lineWidth=2;ctx.strokeRect(c.x,c.y,cw,ch);
    });
    Utils.drawPixelText(ctx,'UNO ARENA',TABLE_X+TABLE_W/2,TABLE_Y+TABLE_H/2,{font:'12px "Press Start 2P"',color:'#ff0088',align:'center'});
  }

  function _drawBigScreen(ctx){
    const sx=WORLD_W/2-150,sy=10,sw=300,sh=60;
    ctx.fillStyle='#0a0a1a';ctx.fillRect(sx,sy,sw,sh);
    ctx.strokeStyle='#6030c0';ctx.lineWidth=3;ctx.strokeRect(sx,sy,sw,sh);
    const t=Date.now()/1000;
    const pulse=0.7+Math.sin(t*2)*0.3;
    const bg=ctx.createLinearGradient(sx,sy,sx,sy+sh);
    bg.addColorStop(0,`rgba(0,10,40,${pulse})`);
    bg.addColorStop(1,`rgba(10,0,40,${pulse})`);
    ctx.fillStyle=bg;ctx.fillRect(sx,sy,sw,sh);
    Utils.drawPixelText(ctx,'CURSED FLOOR',sx+sw/2,sy+20,{font:'10px "Press Start 2P"',color:'#c080ff',shadow:'#4000a0',align:'center'});
    Utils.drawPixelText(ctx,'SURVIVE!',sx+sw/2,sy+44,{font:'8px "Press Start 2P"',color:'#f0c040',shadow:'#806000',align:'center'});
  }

  function _drawFragiles(ctx){
    for(const f of _fragiles){
      if(f.state==='fallen'){
        ctx.fillStyle='#050505';ctx.fillRect(f.x,f.y,f.w,f.h);
        ctx.strokeStyle='#222';ctx.lineWidth=1;ctx.strokeRect(f.x,f.y,f.w,f.h);
        continue;
      }
      ctx.fillStyle='rgba(0,100,255,0.1)';ctx.fillRect(f.x,f.y,f.w,f.h);
      ctx.strokeStyle='rgba(0,200,255,0.3)';ctx.lineWidth=1;ctx.strokeRect(f.x+2,f.y+2,f.w-4,f.h-4);
      if(f.state==='cracked'){
        ctx.strokeStyle='rgba(255,0,0,0.8)';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(f.x+10,f.y+10);ctx.lineTo(f.x+f.w-10,f.y+f.h-10);ctx.stroke();
        ctx.beginPath();ctx.moveTo(f.x+f.w-10,f.y+10);ctx.lineTo(f.x+10,f.y+f.h-10);ctx.stroke();
      }
    }
  }

  function _drawBlockers(ctx){
    for(const b of _blockers){
      if(!b.visible)continue;
      ctx.fillStyle='#3a0a6a';ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.strokeStyle='#8800ff';ctx.lineWidth=2;ctx.strokeRect(b.x,b.y,b.w,b.h);
    }
  }

  function _drawLaser(ctx){
    if(!_laserOn)return;
    const lx=_reversed?GRID_END*TILE:SAFE_COLS*TILE;
    const t=Date.now()/1000;
    const a=0.6+Math.sin(t*8)*0.4;
    ctx.fillStyle=`rgba(255,0,0,${a})`;ctx.fillRect(lx-3,0,6,WORLD_H);
  }

  function _drawCapsules(ctx){
    const t=Date.now()/1000;
    for(const cap of _capsules){
      const c=COLOR_HEX[cap.color]||'#444';
      const cx=cap.x+cap.w/2,cy=cap.y+cap.h/2,r=cap.w/2;
      if(!cap.open){
        ctx.fillStyle='rgba(60,60,60,0.5)';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#555';ctx.lineWidth=2;ctx.strokeRect(cap.x,cap.y,cap.w,cap.h);
        continue;
      }
      const pulse=0.6+Math.sin(t*3)*0.4;
      ctx.fillStyle=c+'22';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
      const gr=ctx.createRadialGradient(cx,cy,0,cx,cy,r+10);
      gr.addColorStop(0,c+Math.floor(pulse*70).toString(16).padStart(2,'0'));
      gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gr;ctx.fillRect(cap.x-10,cap.y-10,cap.w+20,cap.h+20);
    }
  }

  function _drawCards(ctx){
    for(const c of _cards){
      if(c.taken)continue;
      _drawUNOCard(ctx,c.x-16,c.y-24,32,46,c.color,c.number,c.real);
    }
  }

  function _drawUNOCard(ctx,x,y,w,h,color,number,real){
    const bg=COLOR_HEX[color]||color;
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(x+3,y+3,w,h);
    ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(x,y,w,h,4);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(x+3,y+3,w-6,h-6,3);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.15)';ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w*.35,h*.28,Math.PI/4,0,Math.PI*2);ctx.fill();
    ctx.font=`bold ${Math.floor(h*.36)}px "Press Start 2P"`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#fff';ctx.fillText(number.toString(),x+w/2,y+h/2);
    if(!real){
      ctx.fillStyle='rgba(0,0,0,0.2)';ctx.beginPath();ctx.roundRect(x,y,w,h,4);ctx.fill();
    }
  }

  function _drawPlayers(ctx){
    for(const p of _players){
      if(!p.alive&&!p.spectating)continue;
      ctx.save();
      if(p.spectating)ctx.globalAlpha=0.35;
      if(p.falling){
        const s=1-p.fallT*0.8;
        ctx.translate(p.x,p.y);ctx.scale(s,s);ctx.translate(-p.x,-p.y);
        ctx.globalAlpha=(ctx.globalAlpha||1)*(1-p.fallT);
      }
      const char=Player.getAllChars()[p.charId];
      if(char)char.draw(ctx,p.x-12,p.y-14,'down',p.frame,p.moving);
      Utils.drawPixelText(ctx,p.name,p.x,p.y-24,{font:'5px "Press Start 2P"',color:p.isBot?'#40c0f0':'#f0c040',align:'center'});
      let h='';for(let i=0;i<p.hearts;i++)h+='❤️';
      ctx.font='8px serif';ctx.textAlign='center';ctx.fillText(h,p.x,p.y-34);
      if(p.card)_drawUNOCard(ctx,p.x+10,p.y-22,16,22,p.card.color,p.card.number,true);
      ctx.restore();
    }
  }

  function _drawMe(ctx){
    const me=_getMyPlayer();
    if(!me||(!me.alive&&!me.spectating))return;
    ctx.save();
    if(me.spectating)ctx.globalAlpha=0.35;
    if(_me.invincible>0)ctx.globalAlpha=0.5+Math.sin(Date.now()/80)*0.5;
    if(_me.falling){
      const s=1-_me.fallT*0.8;
      ctx.translate(_me.x,_me.y);ctx.scale(s,s);ctx.translate(-_me.x,-_me.y);
      ctx.globalAlpha=(ctx.globalAlpha||1)*(1-_me.fallT);
    }
    const char=Player.getAllChars()[Player.getCharId()];
    if(char)char.draw(ctx,_me.x-12,_me.y-14,'down',_me.frame,_me.moving);
    if(_me.heldCard)_drawUNOCard(ctx,_me.x+10,_me.y-22,16,22,_me.heldCard.color,_me.heldCard.number,true);
    ctx.restore();
  }

  function _drawDarkness(ctx,cw,ch){
    const gr=ctx.createRadialGradient(_me.x-_camX,_me.y-_camY,TILE*.4,_me.x-_camX,_me.y-_camY,TILE*2.8);
    gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,0.97)');
    ctx.fillStyle=gr;ctx.fillRect(0,0,cw,ch);
  }

  function _drawHUD(ctx,cw,ch){
    const me=_getMyPlayer();
    if(_targetCard&&_phase!=='camSweep'){
      ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(cw/2-50,8,100,56);
      ctx.strokeStyle='#f0c040';ctx.lineWidth=2;ctx.strokeRect(cw/2-50,8,100,56);
      Utils.drawPixelText(ctx,'TARGET',cw/2,12,{font:'5px "Press Start 2P"',color:'#aaa',align:'center'});
      _drawUNOCard(ctx,cw/2-14,18,28,40,_targetCard.color,_targetCard.number,true);
    }
    if(_phase==='running'){
      const tc=_roundTimer<6?'#ff0088':'#f0c040';
      const tp=_roundTimer<6?0.6+Math.sin(Date.now()/100)*.4:1;
      ctx.save();ctx.globalAlpha=tp;
      Utils.drawPixelText(ctx,Math.ceil(_roundTimer)+'s',cw/2,70,{font:'10px "Press Start 2P"',color:tc,align:'center'});
      ctx.restore();
    }
    if(me){
      let h='';for(let i=0;i<me.hearts;i++)h+='❤️';
      ctx.font='14px serif';ctx.textAlign='left';ctx.fillText(h,14,24);
    }
    Utils.drawPixelText(ctx,`R${_roundNum}`,14,ch-56,{font:'6px "Press Start 2P"',color:'#888',align:'left'});
    _drawBar(ctx,14,ch-40,80,12,_me.pushCharge,'#ff4400','👊');
    _drawBar(ctx,14,ch-24,80,12,_me.dodgeCharge,'#00aaff','💨');
  }

  function _drawBar(ctx,x,y,w,h,charge,color,icon){
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(x,y,w+20,h);
    ctx.fillStyle=color;ctx.fillRect(x,y,w*charge,h);
    ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;ctx.strokeRect(x,y,w+20,h);
    ctx.font='9px serif';ctx.textAlign='left';ctx.fillText(icon,x+w+2,y+h-1);
  }

  function _drawTargetCardBig(ctx,cw,ch){
    if(!_targetCard)return;
    const t=Date.now()/1000;
    const pulse=0.85+Math.sin(t*3)*.15;
    ctx.save();ctx.globalAlpha=pulse;
    const cw2=80,ch2=116;
    _drawUNOCard(ctx,cw/2-cw2/2,ch/2-ch2/2,cw2,ch2,_targetCard.color,_targetCard.number,true);
    ctx.restore();
  }

  function _drawCountdown(ctx,cw,ch){
    const n=Math.ceil(_countdownT);
    const scale=1+(_countdownT%1)*.6;
    ctx.save();
    ctx.translate(cw/2,ch/2);ctx.scale(scale,scale);
    ctx.font='bold 52px "Press Start 2P"';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='rgba(255,0,136,.9)';ctx.fillText(n===3?'3':n===2?'2':'GO!',2,2);
    ctx.fillStyle='#fff';ctx.fillText(n===3?'3':n===2?'2':'GO!',0,0);
    ctx.restore();
  }

  function _buildUI(){
    if(document.getElementById('uno-btns'))return;
    const wrap=document.createElement('div');
    wrap.id='uno-btns';
    wrap.style.cssText='position:fixed;bottom:24px;right:24px;z-index:50;display:grid;grid-template-columns:48px 48px 48px;grid-template-rows:48px 48px 48px 48px;gap:4px;';
    const s=(bg)=>`background:${bg};border:2px solid rgba(255,255,255,0.4);color:#fff;font-size:16px;cursor:pointer;border-radius:6px;display:flex;align-items:center;justify-content:center;`;
    const btns=[
      {id:'uno-up',icon:'⬆',dir:'up',col:2,row:1,bg:'#333'},
      {id:'uno-left',icon:'⬅',dir:'left',col:1,row:2,bg:'#333'},
      {id:'uno-dodge',icon:'💨',dir:'dodge',col:2,row:2,bg:'#005588'},
      {id:'uno-right',icon:'➡',dir:'right',col:3,row:2,bg:'#333'},
      {id:'uno-down',icon:'⬇',dir:'down',col:2,row:3,bg:'#333'},
      {id:'uno-steal',icon:'🃏',dir:'steal',col:3,row:3,bg:'#550000'}
    ];
    for(const b of btns){
      const btn=document.createElement('button');
      btn.id=b.id;btn.innerHTML=b.icon;
      btn.style.cssText=s(b.bg)+`;grid-column:${b.col};grid-row:${b.row}`;
      btn.addEventListener('touchstart',e=>{
        e.preventDefault();
        if(b.dir==='dodge')dodge();else if(b.dir==='steal')steal();else push(b.dir);
      },{passive:false});
      btn.addEventListener('mousedown',()=>{
        if(b.dir==='dodge')dodge();else if(b.dir==='steal')steal();else push(b.dir);
      });
      wrap.appendChild(btn);
    }
    document.body.appendChild(wrap);
  }

  function _removeUI(){
    const el=document.getElementById('uno-btns');
    if(el)el.remove();
  }

  function _getMyPlayer(){return _players.find(p=>p.id===_myId)||null;}
  function _getAlivePlayers(){
    const list=_players.filter(p=>p.alive);
    const me=_getMyPlayer();
    if(me&&me.alive)list.push(me);
    return list;
  }

  function exit(){
    _active=false;_removeUI();_showWorldUI();
    if(typeof EventManager!=='undefined'){
      EventManager.startTransitionOut(()=>{UI.showToast('🌍',2000);});
    }
  }

  function isActive(){return _active;}

  return{enter,exit,update,draw,push,steal,dodge,isActive};
})();
