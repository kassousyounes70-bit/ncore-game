'use strict';
const Collision = (() => {
  let _obs = [];

  function setObstacles(list){ _obs = list; }
  function addObstacle(r){ _obs.push(r); }
  function getObstacles(){ return _obs; }

  // التحقق من تداخل مستطيل اللاعب مع أي عائق
  function checkRect(a){
    for(const o of _obs){
      if(Utils.rectOverlap(a, o)) return o;
    }
    return null;
  }
  
  function checkRectType(a, type){
    for(const o of _obs){
      if(o.type === type && Utils.rectOverlap(a, o)) return o;
    }
    return null;
  }

  // الخوارزمية الجديدة الاحترافية لحل التصادم (منع الانتقال الآني)
  function resolveMovement(rect, dx, dy) {
    let nx = rect.x;
    let ny = rect.y;
    let cx = false;
    let cy = false;

    // 1. معالجة محور X أولاً
    if (dx !== 0) {
      nx += dx;
      const oX = checkRect({ x: nx, y: rect.y, w: rect.w, h: rect.h });
      if (oX) {
        cx = true;
        // إذا كان يتحرك يميناً، أوقفه عند الحافة اليسرى للعائق
        if (dx > 0) nx = oX.x - rect.w;
        // إذا كان يتحرك يساراً، أوقفه عند الحافة اليمنى للعائق
        else nx = oX.x + oX.w;
      }
    }

    // 2. معالجة محور Y ثانياً (باستخدام nx الآمن)
    if (dy !== 0) {
      ny += dy;
      const oY = checkRect({ x: nx, y: ny, w: rect.w, h: rect.h });
      if (oY) {
        cy = true;
        // إذا كان يتحرك للأسفل، أوقفه عند الحافة العلوية للعائق
        if (dy > 0) ny = oY.y - rect.h;
        // إذا كان يتحرك للأعلى، أوقفه عند الحافة السفلية للعائق
        else ny = oY.y + oY.h;
      }
    }

    return { x: nx, y: ny, colX: cx, colY: cy };
  }

  function clampToWorld(rect, world){
    return {
      x: Utils.clamp(rect.x, 0, world.w - rect.w),
      y: Utils.clamp(rect.y, 0, world.h - rect.h)
    };
  }

  function getNearbyDevice(pr, devs, range=72){
    const cx = pr.x + pr.w/2, cy = pr.y + pr.h/2;
    let nearest = null, nd = Infinity;
    for(const d of devs){
      const dist = Utils.distance(cx, cy, d.x + d.w/2, d.y + d.h/2);
      if(dist <= range && dist < nd){ nearest = d; nd = dist; }
    }
    return nearest;
  }

  function debugDraw(ctx, cam={x:0, y:0}){
    ctx.save();
    for(const o of _obs){
      ctx.fillStyle = o.type === 'wall' ? 'rgba(255,0,0,0.3)' : o.type === 'device' ? 'rgba(0,128,255,0.3)' : 'rgba(0,255,0,0.3)';
      ctx.fillRect(o.x - cam.x, o.y - cam.y, o.w, o.h);
      ctx.strokeStyle = ctx.fillStyle.replace('0.3','0.8');
      ctx.lineWidth = 1; 
      ctx.strokeRect(o.x - cam.x, o.y - cam.y, o.w, o.h);
    }
    ctx.restore();
  }

  return {
    setObstacles, addObstacle, getObstacles, checkRect, checkRectType,
    resolveMovement, clampToWorld, getNearbyDevice, debugDraw
  };
})();
