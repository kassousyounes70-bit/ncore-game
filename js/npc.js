'use strict';
const NPC = (() => {
  const NW=20,NH=26,WS=50,FT=0.18;
  let _npcs=[];

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

  function init(){
    _npcs=[];
    const chairs=GameMap.getChairs();
    const world=GameMap.getWorldSize();
    // جالسون أمام الحواسيب
    chairs.forEach((ch,i)=>{
      if(Math.random()>0.65)return;
      _npcs.push(_mk({x:ch.x,y:ch.y,state:'sit',pal:PALS[i%PALS.length],dir:'down'}));
    });
    // متجولون (8 شخصيات)
    for(let i=0;i<8;i++){
      _npcs.push(_mk({
        x:Utils.randInt(120,world.w-120),
        y:Utils.randInt(120,world.h-120),
        state:'wander',pal:PALS[Utils.randInt(0,PALS.length-1)],dir:'down'
      }));
    }
  }

  function _mk({x,y,state,pal,dir}){
    return{x,y,state,pal,dir,frame:0,ft:0,moving:false,
      tx:x,ty:y,wt:Utils.randFloat(1,3),waiting:true,
      sitAnim:0,sitT:0};
  }

  function update(delta){
    for(const n of _npcs){
      n.state==='sit'?_sit(n,delta):_wander(n,delta);
    }
  }

  function _sit(n,delta){
    n.moving=false;n.frame=0;
    n.sitT+=delta;
    if(n.sitT>1.8){n.sitT=0;n.sitAnim=Utils.randInt(0,2);}
  }

  function _wander(n,delta){
    if(n.waiting){
      n.wt-=delta;n.moving=false;n.frame=0;
      if(n.wt<=0){_pick(n);n.waiting=false;}return;
    }
    const dx=n.tx-n.x,dy=n.ty-n.y,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<3){n.x=n.tx;n.y=n.ty;n.waiting=true;n.wt=Utils.randFloat(1.5,4);n.moving=false;return;}
    n.moving=true;
    const spd=WS*delta,nx=dx/dist,ny=dy/dist;
    const r={x:n.x,y:n.y,w:NW,h:NH};
    const res=Collision.resolveMovement(r,nx*spd,ny*spd);
    if(res.colX||res.colY){_pick(n);n.waiting=true;n.wt=Utils.randFloat(0.5,1.5);return;}
    const cl=Collision.clampToWorld({x:res.x,y:res.y,w:NW,h:NH},GameMap.getWorldSize());
    n.x=cl.x;n.y=cl.y;
    n.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
    n.ft+=delta;if(n.ft>=FT){n.ft-=FT;n.frame=(n.frame+1)%3;}
  }

  function _pick(n){
    const w=GameMap.getWorldSize();
    n.tx=Utils.randInt(80,w.w-80);n.ty=Utils.randInt(80,w.h-80);
  }

  function draw(ctx){
    for(const n of _npcs){
      if(!Camera.isVisible({x:n.x-12,y:n.y-12,w:NW+24,h:NH+24}))continue;
      _draw(ctx,n);
    }
  }

  function _draw(ctx,n){
    const{x,y,pal:p,dir,frame,moving,state,sitAnim}=n;
    // ظل
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.beginPath();ctx.ellipse(x+NW/2,y+NH+2,9,3,0,0,Math.PI*2);ctx.fill();
    state==='sit'?_drawSit(ctx,x,y,p,dir,sitAnim):_drawWalk(ctx,x,y,p,dir,frame,moving);
  }

  function _drawSit(ctx,x,y,p,dir,anim){
    const by=anim===1?-1:0;
    // أرجل
    ctx.fillStyle=p.body;ctx.fillRect(x+4,y+18,5,6);ctx.fillRect(x+11,y+18,5,6);
    ctx.fillStyle='#111';ctx.fillRect(x+3,y+23,7,3);ctx.fillRect(x+10,y+23,7,3);
    // جسم
    ctx.fillStyle=p.body;ctx.fillRect(x+3,y+10+by,14,10);
    // ذراعان للأمام
    ctx.fillRect(x,y+12+by,4,7);ctx.fillRect(x+16,y+12+by,4,7);
    ctx.fillStyle=p.skin;ctx.fillRect(x,y+18+by,4,3);ctx.fillRect(x+16,y+18+by,4,3);
    // رأس
    ctx.fillStyle=p.skin;ctx.fillRect(x+4,y+1+by,12,11);
    ctx.fillStyle=p.hair;ctx.fillRect(x+4,y+1+by,12,4);
    _simpleEyes(ctx,x,y+by,dir,p.hair);
  }

  function _drawWalk(ctx,x,y,p,dir,frame,moving){
    const sw=moving?(frame===1?3:frame===2?-3:0):0;
    ctx.fillStyle=p.body;ctx.fillRect(x+4,y+18,5,6+sw);ctx.fillRect(x+11,y+18,5,6-sw);
    ctx.fillStyle='#111';ctx.fillRect(x+3,y+23+sw,7,3);ctx.fillRect(x+10,y+23-sw,7,3);
    ctx.fillStyle=p.body;ctx.fillRect(x+3,y+10,14,10);
    const as=moving?(frame===1?-3:frame===2?3:0):0;
    ctx.fillRect(x,y+11,4,8+as);ctx.fillRect(x+16,y+11,4,8-as);
    ctx.fillStyle=p.skin;ctx.fillRect(x,y+18+as,4,3);ctx.fillRect(x+16,y+18-as,4,3);
    ctx.fillStyle=p.skin;ctx.fillRect(x+4,y+1,12,11);
    ctx.fillStyle=p.hair;ctx.fillRect(x+4,y+1,12,4);
    _simpleEyes(ctx,x,y,dir,p.hair);
  }

  function _simpleEyes(ctx,x,y,dir,color){
    ctx.fillStyle='#fff';ctx.fillRect(x+6,y+5,3,3);ctx.fillRect(x+11,y+5,3,3);
    ctx.fillStyle=color;
    const ox=dir==='right'?1:dir==='left'?0:0,oy=dir==='down'?1:dir==='up'?0:1;
    ctx.fillRect(x+6+ox,y+5+oy,2,2);ctx.fillRect(x+11+ox,y+5+oy,2,2);
  }

  return{init,update,draw};
})();
