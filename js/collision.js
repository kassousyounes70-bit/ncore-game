'use strict';
const Collision = (() => {
  let _obs = [];

  function setObstacles(list){_obs=list;}
  function addObstacle(r){_obs.push(r);}
  function getObstacles(){return _obs;}

  function checkRect(a){for(const o of _obs){if(Utils.rectOverlap(a,o))return o;}return null;}
  function checkRectType(a,type){for(const o of _obs){if(o.type===type&&Utils.rectOverlap(a,o))return o;}return null;}

  function resolveMovement(rect,dx,dy){
    let nx=rect.x,ny=rect.y,cx=false,cy=false;
    const tx={x:rect.x+dx,y:rect.y,w:rect.w,h:rect.h};
    if(checkRect(tx)){cx=true;nx=dx>0?_snapL(rect):_snapR(rect,dx);}
    else nx=rect.x+dx;
    const ty={x:nx,y:rect.y+dy,w:rect.w,h:rect.h};
    if(checkRect(ty)){cy=true;ny=dy>0?_snapT(rect,ny):_snapB(rect,ny,dy);}
    else ny=rect.y+dy;
    return{x:nx,y:ny,colX:cx,colY:cy};
  }

  function _snapL(r){let b=r.x;for(const o of _obs){const t={x:r.x+1,y:r.y,w:r.w,h:r.h};if(Utils.rectOverlap(t,o))b=o.x-r.w;}return b;}
  function _snapR(r,dx){let b=r.x+dx;for(const o of _obs){const t={x:r.x+dx,y:r.y,w:r.w,h:r.h};if(Utils.rectOverlap(t,o))b=o.x+o.w;}return b;}
  function _snapT(r,nx){let b=r.y;for(const o of _obs){const t={x:nx,y:r.y+1,w:r.w,h:r.h};if(Utils.rectOverlap(t,o))b=o.y-r.h;}return b;}
  function _snapB(r,nx,dy){let b=r.y+dy;for(const o of _obs){const t={x:nx,y:r.y+dy,w:r.w,h:r.h};if(Utils.rectOverlap(t,o))b=o.y+o.h;}return b;}

  function clampToWorld(rect,world){
    return{x:Utils.clamp(rect.x,0,world.w-rect.w),y:Utils.clamp(rect.y,0,world.h-rect.h)};
  }

  function getNearbyDevice(pr,devs,range=72){
    const cx=pr.x+pr.w/2,cy=pr.y+pr.h/2;
    let nearest=null,nd=Infinity;
    for(const d of devs){
      const dist=Utils.distance(cx,cy,d.x+d.w/2,d.y+d.h/2);
      if(dist<=range&&dist<nd){nearest=d;nd=dist;}
    }
    return nearest;
  }

  function debugDraw(ctx,cam={x:0,y:0}){
    ctx.save();
    for(const o of _obs){
      ctx.fillStyle=o.type==='wall'?'rgba(255,0,0,0.3)':o.type==='device'?'rgba(0,128,255,0.3)':'rgba(0,255,0,0.3)';
      ctx.fillRect(o.x-cam.x,o.y-cam.y,o.w,o.h);
      ctx.strokeStyle=ctx.fillStyle.replace('0.3','0.8');
      ctx.lineWidth=1;ctx.strokeRect(o.x-cam.x,o.y-cam.y,o.w,o.h);
    }
    ctx.restore();
  }

  return{setObstacles,addObstacle,getObstacles,checkRect,checkRectType,
    resolveMovement,clampToWorld,getNearbyDevice,debugDraw};
})();
