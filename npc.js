'use strict';
const NPC = (() => {
  const NW=20,NH=26,WS=50,FT=0.18;
  let _npcs=[];
  let _trash=[];

  const PALS=[
    {body:'#c83020',hair:'#1a1a1a',skin:'#f0a060'},
    {body:'#2060c0',hair:'#8b4513',skin:'#f0d0b0'},
    {body:'#208040',hair:'#1a1a1a',skin:'#d4956a'},
    {body:'#806020',hair:'#2a1a0a',skin:'#f0c090'},
    {body:'#602080',hair:'#c060f0',skin:'#f0d0b0'},
    {body:'#208080',hair:'#1a1a1a',skin:'#e0b090'},
    {body:'#c06020',hair:'#1a1a1a',skin:'#d4956a'},
    {body:'#404040',hair:'#888',    skin:'#c8a080'},
  ];
  const PAL_CLEANER={body:'#e8e0a0',hair:'#3a2a10',skin:'#f0c090',hat:'#f0e060'};
  const PAL_GUARD  ={body:'#1a3a6a',hair:'#1a1a1a',skin:'#f0c090',badge:'#f0d020'};

  // ============================================================
  //  دالة spawn آمنة — تتحقق من العوائق قبل وضع الشخصية
  // ============================================================
  function _safePos(minX,minY,maxX,maxY,tries=30){
    const obs=Collision.getObstacles();
    for(let i=0;i<tries;i++){
      const x=Utils.randInt(minX,maxX);
      const y=Utils.randInt(minY,maxY);
      const r={x,y,w:NW,h:NH};
      let ok=true;
      for(const o of obs){
        if(Utils.rectOverlap(r,o)){ok=false;break;}
      }
      if(ok)return{x,y};
    }
    // fallback آمن إذا فشلت كل المحاولات
    return{x:minX,y:minY};
  }

  // نقطة هدف آمنة لا تقع داخل عائق
  function _safePick(n){
    const w=GameMap.getWorldSize();
    const p=_safePos(80,80,w.w-80,w.h-80);
    n.tx=p.x; n.ty=p.y;
  }

  // ============================================================
  //  INIT
  // ============================================================
  function init(){
    _npcs=[];_trash=[];
    const chairs=GameMap.getChairs();
    const world=GameMap.getWorldSize();

    // جالسون أمام الحواسيب
    chairs.forEach((ch,i)=>{
      if(Math.random()>0.65)return;
      const sleeping=Math.random()<0.15;
      _npcs.push(_mk({x:ch.x,y:ch.y,
        state:sleeping?'sleep':'sit',
        pal:PALS[i%PALS.length],dir:'down'}));
    });

    // زوج محادثة
    const cp=_safePos(200,200,world.w-200,world.h-200);
    const pA=_mk({x:cp.x,   y:cp.y,state:'chat',pal:PALS[0],dir:'right'});
    const pB=_mk({x:cp.x+28,y:cp.y,state:'chat',pal:PALS[1],dir:'left'});
    pA.chatPartner=pB; pB.chatPartner=pA;
    _npcs.push(pA,pB);

    // راقص
    {const p=_safePos(150,150,world.w-150,world.h-150);
    _npcs.push(_mk({x:p.x,y:p.y,state:'dance',
      pal:PALS[Utils.randInt(2,5)],dir:'down'}));}

    // عامل نظافة
    {const p=_safePos(100,100,world.w-100,world.h-100);
    _npcs.push(_mk({x:p.x,y:p.y,state:'clean',pal:PAL_CLEANER,dir:'right'}));}

    // آكلان/شاربان
    for(let i=0;i<2;i++){
      const p=_safePos(150,150,world.w-150,world.h-150);
      _npcs.push(_mk({x:p.x,y:p.y,state:'eat',
        pal:PALS[Utils.randInt(0,PALS.length-1)],dir:'down'}));
    }

    // حارسان أمن
    for(let i=0;i<2;i++){
      const p=_safePos(100,100,world.w-100,world.h-100);
      _npcs.push(_mk({x:p.x,y:p.y,state:'guard',
        pal:PAL_GUARD,dir:i===0?'right':'left'}));
    }

    // هاتف
    {const p=_safePos(150,150,world.w-150,world.h-150);
    _npcs.push(_mk({x:p.x,y:p.y,state:'phone',
      pal:PALS[Utils.randInt(0,PALS.length-1)],dir:'down'}));}

    // قهوة
    {const p=_safePos(150,150,world.w-150,world.h-150);
    _npcs.push(_mk({x:p.x,y:p.y,state:'coffee',
      pal:PALS[Utils.randInt(0,PALS.length-1)],dir:'right'}));}

    // متجولون عاديون
    for(let i=0;i<6;i++){
      const p=_safePos(120,120,world.w-120,world.h-120);
      _npcs.push(_mk({x:p.x,y:p.y,state:'wander',
        pal:PALS[Utils.randInt(0,PALS.length-1)],dir:'down'}));
    }
  }

  // ============================================================
  //  FACTORY
  // ============================================================
  function _mk({x,y,state,pal,dir}){
    return{
      x,y,state,pal,dir,
      frame:0,ft:0,moving:false,
      tx:x,ty:y,wt:Utils.randFloat(1,3),waiting:true,
      sitAnim:0,sitT:0,
      mouthOpen:false,mouthT:0,
      talkTimer:0,talkInterval:Utils.randFloat(2,6),
      talking:false,talkDuration:0,talkElapsed:0,
      danceFrame:0,danceT:0,
      eatT:0,eatPhase:0,
      eatItem:Math.random()<0.5?'juice':'food',
      eatDone:false,trashDropped:false,
      sleepT:0,sleepBob:0,
      phoneT:0,
      coffeeT:0,coffeeSip:false,
      guardPatrol:0,guardDir:dir,guardWait:0,
      cleanTarget:null,cleanReached:false,sweepT:0,
      chatPartner:null,chatFaceT:0,
    };
  }

  // ============================================================
  //  UPDATE
  // ============================================================
  function update(delta){
    const cleaner=_npcs.find(n=>n.state==='clean');
    if(cleaner && _trash.length>0 && !cleaner.cleanTarget){
      cleaner.cleanTarget=_trash[0];
      cleaner.cleanReached=false;
    }
    for(const n of _npcs){
      switch(n.state){
        case 'sit':    _sit(n,delta);       break;
        case 'sleep':  _sleep(n,delta);     break;
        case 'wander': _wander(n,delta);    break;
        case 'chat':   _chat(n,delta);      break;
        case 'dance':  _dance(n,delta);     break;
        case 'clean':  _cleanWalk(n,delta); break;
        case 'eat':    _eat(n,delta);       break;
        case 'guard':  _guard(n,delta);     break;
        case 'phone':  _phone(n,delta);     break;
        case 'coffee': _coffee(n,delta);    break;
      }
      _updateMouth(n,delta);
    }
  }

  function _sit(n,delta){
    n.moving=false;n.frame=0;
    n.sitT+=delta;
    if(n.sitT>1.8){n.sitT=0;n.sitAnim=Utils.randInt(0,2);}
  }

  function _sleep(n,delta){
    n.moving=false;n.frame=0;
    n.sleepT+=delta;
    n.sleepBob=Math.sin(n.sleepT*1.2)*2;
  }

  function _wander(n,delta){
    if(n.waiting){
      n.wt-=delta;n.moving=false;n.frame=0;
      if(n.wt<=0){_safePick(n);n.waiting=false;}
      return;
    }
    _moveToTarget(n,delta,WS);
  }

  function _chat(n,delta){
    n.moving=false;n.frame=0;
    n.chatFaceT+=delta;
    if(n.chatFaceT>5){
      n.chatFaceT=0;
      n.dir=n.dir==='right'?'down':'right';
    }
  }

  function _dance(n,delta){
    n.moving=false;
    n.danceT+=delta;
    if(n.danceT>=0.15){n.danceT=0;n.danceFrame=(n.danceFrame+1)%8;}
  }

  function _cleanWalk(n,delta){
    if(n.cleanTarget){
      const dx=n.cleanTarget.x-n.x,dy=n.cleanTarget.y-n.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<16){
        n.cleanReached=true;n.sweepT+=delta;
        n.moving=false;n.frame=0;
        if(n.sweepT>1.8){
          const idx=_trash.indexOf(n.cleanTarget);
          if(idx!==-1)_trash.splice(idx,1);
          n.cleanTarget=null;n.sweepT=0;n.cleanReached=false;
        }
      } else {
        n.cleanReached=false;
        _moveToTarget(n,delta,WS*0.8,{x:n.cleanTarget.x,y:n.cleanTarget.y});
      }
    } else {
      _wander(n,delta);
    }
  }

  function _eat(n,delta){
    if(n.eatDone){_wander(n,delta);return;}
    n.moving=false;n.frame=0;
    n.eatT+=delta;
    n.eatPhase=Math.min(3,Math.floor(n.eatT/1.5));
    if(n.eatPhase>=3 && !n.trashDropped){
      _trash.push({x:n.x+Utils.randInt(-8,8),
                   y:n.y+Utils.randInt(-4,4),
                   type:n.eatItem,life:1});
      n.trashDropped=true;n.eatDone=true;
      n.waiting=true;n.wt=Utils.randFloat(2,4);
    }
  }

  function _guard(n,delta){
    n.guardWait-=delta;
    if(n.guardWait>0){n.moving=false;n.frame=0;return;}
    n.guardPatrol+=delta;
    const speed=WS*0.7*delta;
    // استخدام resolveMovement للحارس أيضاً
    const ddx=n.dir==='right'?speed:-speed;
    const r={x:n.x,y:n.y,w:NW,h:NH};
    const res=Collision.resolveMovement(r,ddx,0);
    n.x=res.x;
    // إذا اصطدم يعكس الاتجاه
    if(res.colX){
      n.dir=n.dir==='right'?'left':'right';
      n.guardWait=Utils.randFloat(0.5,1);
    }
    n.moving=true;
    n.ft+=delta;if(n.ft>=FT){n.ft-=FT;n.frame=(n.frame+1)%3;}
    if(n.guardPatrol>Utils.randFloat(3,5)){
      n.guardPatrol=0;
      n.dir=n.dir==='right'?'left':'right';
      n.guardWait=Utils.randFloat(0.5,1.5);
      n.moving=false;
    }
    const world=GameMap.getWorldSize();
    n.x=Math.max(40,Math.min(world.w-40,n.x));
  }

  function _phone(n,delta){
    n.moving=false;n.frame=0;
    n.phoneT+=delta;
    if(n.phoneT>Utils.randFloat(5,8)){
      n.phoneT=0;_safePick(n);n.waiting=false;n.moving=true;
    }
    if(!n.waiting && n.moving)_moveToTarget(n,delta,WS*0.6);
  }

  function _coffee(n,delta){
    n.moving=false;n.frame=0;
    n.coffeeT+=delta;
    n.coffeeSip=Math.sin(n.coffeeT*2)>0.7;
    if(n.coffeeT>10){
      n.coffeeT=0;_safePick(n);n.waiting=false;
    }
    if(!n.waiting && n.moving)_moveToTarget(n,delta,WS*0.5);
  }

  // ============================================================
  //  MOVE HELPER — مع التصادم الكامل
  // ============================================================
  function _moveToTarget(n,delta,speed,tgt){
    const tx=tgt?tgt.x:n.tx, ty=tgt?tgt.y:n.ty;
    const dx=tx-n.x,dy=ty-n.y,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<4){
      n.x=tx;n.y=ty;n.waiting=true;
      n.wt=Utils.randFloat(1.5,4);n.moving=false;return;
    }
    n.moving=true;
    const spd=speed*delta,nx=dx/dist,ny=dy/dist;
    const r={x:n.x,y:n.y,w:NW,h:NH};
    const res=Collision.resolveMovement(r,nx*spd,ny*spd);
    // إذا اصطدم في كلا المحورين — اختر هدفاً جديداً آمناً
    if(res.colX && res.colY){
      _safePick(n);n.waiting=true;
      n.wt=Utils.randFloat(0.5,1.5);return;
    }
    // إذا اصطدم في محور واحد فقط — حاول الالتفاف
    const cl=Collision.clampToWorld(
      {x:res.x,y:res.y,w:NW,h:NH},GameMap.getWorldSize());
    n.x=cl.x;n.y=cl.y;
    n.dir=Math.abs(dx)>Math.abs(dy)
      ?(dx>0?'right':'left')
      :(dy>0?'down':'up');
    n.ft+=delta;if(n.ft>=FT){n.ft-=FT;n.frame=(n.frame+1)%3;}
  }

  // ============================================================
  //  MOUTH
  // ============================================================
  function _updateMouth(n,delta){
    if(n.state==='chat'){
      if(n.chatPartner){
        const turn=Math.floor(Date.now()/800)%2;
        const isMeTurn=(turn===0&&n.chatPartner.dir==='left')
                     ||(turn===1&&n.chatPartner.dir==='right');
        if(isMeTurn){
          n.mouthT+=delta;
          if(n.mouthT>=0.1){n.mouthT=0;n.mouthOpen=!n.mouthOpen;}
        } else {n.mouthOpen=false;}
      }
      return;
    }
    if(n.state==='eat'){
      if(n.eatPhase===1||n.eatPhase===2){
        n.mouthT+=delta;
        if(n.mouthT>=0.15){n.mouthT=0;n.mouthOpen=!n.mouthOpen;}
      } else {n.mouthOpen=false;}
      return;
    }
    if(n.state==='coffee'){n.mouthOpen=n.coffeeSip;return;}
    n.talkTimer+=delta;
    if(n.talkTimer>=n.talkInterval){
      n.talkTimer=0;n.talkInterval=Utils.randFloat(3,8);
      n.talkDuration=Utils.randFloat(1.5,3.0);
      n.talkElapsed=0;n.talking=true;
    }
    if(n.talking){
      n.talkElapsed+=delta;
      if(n.talkElapsed>=n.talkDuration){
        n.talking=false;n.mouthOpen=false;return;
      }
      n.mouthT+=delta;
      if(n.mouthT>=0.1){n.mouthT=0;n.mouthOpen=!n.mouthOpen;}
    }
  }

  // ============================================================
  //  DRAW
  // ============================================================
  function draw(ctx){
    for(const t of _trash){
      if(!Camera.isVisible({x:t.x-8,y:t.y-8,w:16,h:16}))continue;
      _drawTrash(ctx,t);
    }
    for(const n of _npcs){
      if(!Camera.isVisible({x:n.x-12,y:n.y-12,w:NW+24,h:NH+24}))continue;
      _drawNPC(ctx,n);
    }
  }

  function _drawTrash(ctx,t){
    if(t.type==='juice'){
      ctx.fillStyle='#e06020';ctx.fillRect(t.x,t.y,6,8);
      ctx.fillStyle='#f0a060';ctx.fillRect(t.x+1,t.y+1,4,3);
      ctx.fillStyle='#fff';ctx.fillRect(t.x+1,t.y+2,4,1);
    } else {
      ctx.fillStyle='#e8e0a0';ctx.fillRect(t.x,t.y,8,6);
      ctx.fillStyle='#c8c080';ctx.fillRect(t.x+1,t.y+2,6,1);
    }
  }

  function _drawNPC(ctx,n){
    const{x,y,pal:p,dir,frame,moving,state,sitAnim,mouthOpen,
          sleepBob,danceFrame,eatPhase,coffeeSip,sweepT,cleanReached}=n;
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.beginPath();ctx.ellipse(x+NW/2,y+NH+2,9,3,0,0,Math.PI*2);ctx.fill();
    switch(state){
      case 'sit':   _drawSit(ctx,x,y,p,dir,sitAnim,mouthOpen);break;
      case 'sleep': _drawSleep(ctx,x,y,p,sleepBob);break;
      case 'chat':  _drawWalk(ctx,x,y,p,dir,0,false,mouthOpen);break;
      case 'dance': _drawDance(ctx,x,y,p,dir,danceFrame);break;
      case 'clean': _drawCleaner(ctx,x,y,p,dir,frame,moving,sweepT,cleanReached,mouthOpen);break;
      case 'eat':   _drawEat(ctx,x,y,p,dir,eatPhase,mouthOpen);break;
      case 'guard': _drawGuard(ctx,x,y,p,dir,frame,moving);break;
      case 'phone': _drawPhone(ctx,x,y,p,dir,frame,moving,mouthOpen);break;
      case 'coffee':_drawCoffee(ctx,x,y,p,dir,coffeeSip,mouthOpen);break;
      default:      _drawWalk(ctx,x,y,p,dir,frame,moving,mouthOpen);break;
    }
  }

  // --- جلوس ---
  function _drawSit(ctx,x,y,p,dir,anim,mouthOpen){
    const by=anim===1?-1:0;
    ctx.fillStyle=p.body;ctx.fillRect(x+4,y+18,5,6);ctx.fillRect(x+11,y+18,5,6);
    ctx.fillStyle='#111';ctx.fillRect(x+3,y+23,7,3);ctx.fillRect(x+10,y+23,7,3);
    ctx.fillStyle=p.body;ctx.fillRect(x+3,y+10+by,14,10);
    ctx.fillRect(x,y+12+by,4,7);ctx.fillRect(x+16,y+12+by,4,7);
    ctx.fillStyle=p.skin;ctx.fillRect(x,y+18+by,4,3);ctx.fillRect(x+16,y+18+by,4,3);
    ctx.fillStyle=p.skin;ctx.fillRect(x+4,y+1+by,12,11);
    ctx.fillStyle=p.hair;ctx.fillRect(x+4,y+1+by,12,4);
    _simpleEyes(ctx,x,y+by,dir,p.hair);
    _npcMouth(ctx,x,y+by,dir,mouthOpen,p.skin);
  }

  // --- نوم ---
  function _drawSleep(ctx,x,y,p,bob){
    const b=Math.round(bob);
    ctx.fillStyle=p.body;ctx.fillRect(x+3,y+10,14,12);
    ctx.fillRect(x,y+12,4,8);ctx.fillRect(x+16,y+12,4,8);
    ctx.fillStyle=p.skin;ctx.fillRect(x,y+19,4,3);ctx.fillRect(x+16,y+19,4,3);
    ctx.fillStyle=p.body;ctx.fillRect(x+4,y+20,5,6);ctx.fillRect(x+11,y+20,5,6);
    ctx.fillStyle='#111';ctx.fillRect(x+3,y+25,7,3);ctx.fillRect(x+10,y+25,7,3);
    ctx.fillStyle=p.skin;ctx.fillRect(x+4,y+2+b,12,11);
    ctx.fillStyle=p.hair;ctx.fillRect(x+4,y+2+b,12,4);
    ctx.fillStyle='#555';
    ctx.fillRect(x+6,y+7+b,3,1);ctx.fillRect(x+11,y+7+b,3,1);
    ctx.fillStyle='rgba(200,220,255,0.9)';
    ctx.font='bold 6px monospace';ctx.fillText('z',x+18,y+2);
    ctx.font='bold 8px monospace';ctx.fillText('Z',x+20,y-3);
  }

  // --- مشي عادي ---
  function _drawWalk(ctx,x,y,p,dir,frame,moving,mouthOpen){
    const sw=moving?(frame===1?3:frame===2?-3:0):0;
    ctx.fillStyle=p.body;
    ctx.fillRect(x+4,y+18,5,6+sw);ctx.fillRect(x+11,y+18,5,6-sw);
    ctx.fillStyle='#111';
    ctx.fillRect(x+3,y+23+sw,7,3);ctx.fillRect(x+10,y+23-sw,7,3);
    ctx.fillStyle=p.body;ctx.fillRect(x+3,y+10,14,10);
    const as=moving?(frame===1?-3:frame===2?3:0):0;
    ctx.fillRect(x,y+11,4,8+as);ctx.fillRect(x+16,y+11,4,8-as);
    ctx.fillStyle=p.skin;
    ctx.fillRect(x,y+18+as,4,3);ctx.fillRect(x+16,y+18-as,4,3);
    ctx.fillStyle=p.skin;ctx.fillRect(x+4,y+1,12,11);
    ctx.fillStyle=p.hair;ctx.fillRect(x+4,y+1,12,4);
    _simpleEyes(ctx,x,y,dir,p.hair);
    _npcMouth(ctx,x,y,dir,mouthOpen,p.skin);
  }

  // --- رقص محسّن (8 فريمات، الذراعان متصلتان بالجسم) ---
  function _drawDance(ctx,x,y,p,dir,df){
    // قيم الحركة لكل فريم
    const bobs  =[ 0,-2,-3,-2, 0, 1, 0,-1];
    const legSws=[ 0, 3,-3, 3, 0,-3, 3,-3];
    const armLYs=[ 0,-4,-7,-9,-7,-4, 0, 2]; // إزاحة Y للذراع الأيسر
    const armRYs=[ 0, 2, 0,-4,-7,-9,-7,-4]; // إزاحة Y للذراع الأيمن
    const bob =bobs  [df%8];
    const lsw =legSws[df%8];
    const alY =armLYs[df%8];
    const arY =armRYs[df%8];

    // أرجل
    ctx.fillStyle=p.body;
    ctx.fillRect(x+4, y+18, 5, 8+lsw);
    ctx.fillRect(x+11,y+18, 5, 8-lsw);
    ctx.fillStyle='#111';
    ctx.fillRect(x+3, y+24+lsw, 7,3);
    ctx.fillRect(x+10,y+24-lsw, 7,3);

    // جسم
    ctx.fillStyle=p.body;
    ctx.fillRect(x+3,y+10+bob,14,10);

    // ذراع يسار — متصل بالجسم عند y+11
    ctx.fillStyle=p.body;
    ctx.fillRect(x,   y+11+bob,  4, 8+alY);   // العضد
    ctx.fillStyle=p.skin;
    ctx.fillRect(x,   y+18+bob+alY, 4,3);      // الكف

    // ذراع يمين — متصل بالجسم عند y+11
    ctx.fillStyle=p.body;
    ctx.fillRect(x+16,y+11+bob,  4, 8+arY);
    ctx.fillStyle=p.skin;
    ctx.fillRect(x+16,y+18+bob+arY,4,3);

    // رأس
    ctx.fillStyle=p.skin;ctx.fillRect(x+4,y+1+bob,12,11);
    ctx.fillStyle=p.hair;ctx.fillRect(x+4,y+1+bob,12,4);
    _simpleEyes(ctx,x,y+bob,dir,p.hair);

    // ابتسامة دائمة
    ctx.fillStyle='#9a5040';
    ctx.fillRect(x+6,y+9+bob,3,1);
    ctx.fillRect(x+11,y+9+bob,3,1);
  }

  // --- عامل نظافة ---
  function _drawCleaner(ctx,x,y,p,dir,frame,moving,sweepT,cleanReached,mouthOpen){
    const sw=moving?(frame===1?3:frame===2?-3:0):0;
    ctx.fillStyle=p.body;
    ctx.fillRect(x+4,y+18,5,6+sw);ctx.fillRect(x+11,y+18,5,6-sw);
    ctx.fillStyle='#444';
    ctx.fillRect(x+3,y+23+sw,7,3);ctx.fillRect(x+10,y+23-sw,7,3);
    ctx.fillStyle=p.body;ctx.fillRect(x+3,y+10,14,10);
    const sweepOffset=cleanReached?(Math.sin(sweepT*6)*4):0;
    ctx.fillStyle=p.body;
    ctx.fillRect(x,   y+11,4,8);
    ctx.fillRect(x+16,y+11,4,8+sweepOffset);
    ctx.fillStyle=p.skin;
    ctx.fillRect(x,   y+18,4,3);
    ctx.fillRect(x+16,y+18,4,3);
    // مكنسة
    ctx.fillStyle='#8b5a30';ctx.fillRect(x+19,y+5,2,22);
    ctx.fillStyle='#c8a060';ctx.fillRect(x+16+sweepOffset,y+24,10,3);
    ctx.fillStyle=p.skin;ctx.fillRect(x+4,y+1,12,11);
    ctx.fillStyle=p.hair;ctx.fillRect(x+4,y+1,12,4);
    ctx.fillStyle=p.hat||'#f0e060';
    ctx.fillRect(x+3,y-1,14,3);ctx.fillRect(x+5,y-4,10,4);
    _simpleEyes(ctx,x,y,dir,p.hair);
    _npcMouth(ctx,x,y,dir,mouthOpen,p.skin);
  }

  // --- أكل/شرب ---
  function _drawEat(ctx,x,y,p,dir,phase,mouthOpen){
    ctx.fillStyle=p.body;
    ctx.fillRect(x+4,y+18,5,6);ctx.fillRect(x+11,y+18,5,6);
    ctx.fillStyle='#111';
    ctx.fillRect(x+3,y+23,7,3);ctx.fillRect(x+10,y+23,7,3);
    ctx.fillStyle=p.body;ctx.fillRect(x+3,y+10,14,10);
    const lift=phase===1?-5:phase===2?-8:0;
    ctx.fillStyle=p.body;
    ctx.fillRect(x,   y+11,     4,8);
    ctx.fillRect(x+16,y+11+lift,4,8);
    ctx.fillStyle=p.skin;
    ctx.fillRect(x,   y+18,     4,3);
    ctx.fillRect(x+16,y+18+lift,4,3);
    if(phase>=0&&phase<3){
      ctx.fillStyle='#e06020';
      ctx.fillRect(phase>=1?x+17:x+17, phase>=1?y+14+lift:y+19, 5,7);
      ctx.fillStyle='#fff';
      ctx.fillRect(phase>=1?x+18:x+18, phase>=1?y+15+lift:y+20, 3,2);
    }
    ctx.fillStyle=p.skin;ctx.fillRect(x+4,y+1,12,11);
    ctx.fillStyle=p.hair;ctx.fillRect(x+4,y+1,12,4);
    _simpleEyes(ctx,x,y,dir,p.hair);
    _npcMouth(ctx,x,y,dir,mouthOpen,p.skin);
  }

  // --- حارس أمن ---
  function _drawGuard(ctx,x,y,p,dir,frame,moving){
    const sw=moving?(frame===1?3:frame===2?-3:0):0;
    ctx.fillStyle='#111a2a';
    ctx.fillRect(x+4,y+18,5,6+sw);ctx.fillRect(x+11,y+18,5,6-sw);
    ctx.fillStyle='#0a1020';
    ctx.fillRect(x+3,y+23+sw,7,3);ctx.fillRect(x+10,y+23-sw,7,3);
    ctx.fillStyle=p.body;ctx.fillRect(x+3,y+10,14,10);
    const as=moving?(frame===1?-3:frame===2?3:0):0;
    ctx.fillRect(x,   y+11,4,8+as);ctx.fillRect(x+16,y+11,4,8-as);
    ctx.fillStyle=p.skin;
    ctx.fillRect(x,   y+18+as,4,3);ctx.fillRect(x+16,y+18-as,4,3);
    ctx.fillStyle=p.badge||'#f0d020';ctx.fillRect(x+7,y+13,4,3);
    ctx.fillStyle=p.skin;ctx.fillRect(x+4,y+1,12,11);
    ctx.fillStyle='#1a3a6a';ctx.fillRect(x+3,y,14,5);ctx.fillRect(x+2,y+3,16,2);
    ctx.fillStyle='#f0d020';ctx.fillRect(x+7,y+1,6,3);
    _simpleEyes(ctx,x,y,dir,p.hair||'#1a1a1a');
  }

  // --- هاتف ---
  function _drawPhone(ctx,x,y,p,dir,frame,moving,mouthOpen){
    _drawWalk(ctx,x,y,p,dir,frame,moving,mouthOpen);
    ctx.fillStyle='#1a1a1a';ctx.fillRect(x+17,y+13,4,7);
    ctx.fillStyle='#4090ff';ctx.fillRect(x+18,y+14,2,4);
    ctx.fillStyle=p.hair||'#1a1a1a';
    ctx.fillRect(x+7,y+7,2,2);ctx.fillRect(x+12,y+7,2,2);
  }

  // --- قهوة ---
  function _drawCoffee(ctx,x,y,p,dir,sip,mouthOpen){
    _drawWalk(ctx,x,y,p,dir,0,false,mouthOpen);
    const sipOff=sip?-3:0;
    ctx.fillStyle='#c8a060';ctx.fillRect(x+17,y+14+sipOff,5,7);
    ctx.fillStyle='#3a1a00';ctx.fillRect(x+18,y+15+sipOff,3,3);
    if(!sip){
      ctx.strokeStyle='rgba(200,200,200,0.6)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x+19,y+13);
      ctx.quadraticCurveTo(x+22,y+9,x+19,y+6);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x+21,y+12);
      ctx.quadraticCurveTo(x+24,y+8,x+21,y+5);ctx.stroke();
    }
  }

  // ============================================================
  //  SHARED HELPERS
  // ============================================================
  function _simpleEyes(ctx,x,y,dir,color){
    ctx.fillStyle='#fff';
    ctx.fillRect(x+6,y+5,3,3);ctx.fillRect(x+11,y+5,3,3);
    ctx.fillStyle=color;
    const ox=dir==='right'?1:0, oy=dir==='down'?1:dir==='up'?0:1;
    ctx.fillRect(x+6+ox,y+5+oy,2,2);ctx.fillRect(x+11+ox,y+5+oy,2,2);
  }

  function _npcMouth(ctx,x,y,dir,open,skinColor){
    if(dir==='up')return;
    const mx=x+(dir==='right'?8:dir==='left'?6:7);
    const my=y+10;
    if(open){
      ctx.fillStyle='#3a1a0a';ctx.fillRect(mx,my,3,2);
      ctx.fillStyle=skinColor||'#c8785a';
      ctx.fillRect(mx-1,my-1,5,1);ctx.fillRect(mx-1,my+2,5,1);
    } else {
      ctx.fillStyle='#9a5040';ctx.fillRect(mx,my,3,1);
    }
  }

  return{init,update,draw};
})();
