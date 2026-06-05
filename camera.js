'use strict';
const Camera = (() => {
  let _x=0,_y=0,_tx=0,_ty=0,_sm=0.10;
  let _vw=0,_vh=0,_ww=0,_wh=0;
  let _sx=0,_sy=0,_sp=0,_sd=0,_st=0;

  function init(vw,vh,ww,wh,sm=0.10){_vw=vw;_vh=vh;_ww=ww;_wh=wh;_sm=sm;}
  function resize(vw,vh){_vw=vw;_vh=vh;}

  function update(tx,ty,delta){
    _tx=Utils.clamp(tx-_vw/2,0,Math.max(0,_ww-_vw));
    _ty=Utils.clamp(ty-_vh/2,0,Math.max(0,_wh-_vh));
    const f=1-Math.pow(_sm,delta*60);
    _x=Math.round(Utils.lerp(_x,_tx,f));
    _y=Math.round(Utils.lerp(_y,_ty,f));
    if(_st>0){
      _st-=delta;
      const p=_st/_sd;
      _sx=Utils.randFloat(-_sp*p,_sp*p);
      _sy=Utils.randFloat(-_sp*p,_sp*p);
    } else {_sx=0;_sy=0;}
  }

  function beginDraw(ctx){ctx.save();ctx.translate(-(_x+_sx),-(_y+_sy));}
  function endDraw(ctx){ctx.restore();}
  function worldToScreen(wx,wy){return{x:wx-_x-_sx,y:wy-_y-_sy};}
  function screenToWorld(sx,sy){return{x:sx+_x+_sx,y:sy+_y+_sy};}

  function isVisible(r,m=40){
    return r.x+r.w+m>_x&&r.x-m<_x+_vw&&r.y+r.h+m>_y&&r.y-m<_y+_vh;
  }

  function shake(p=6,d=0.3){_sp=p;_sd=d;_st=d;}
  function snapTo(tx,ty){
    _x=Utils.clamp(tx-_vw/2,0,Math.max(0,_ww-_vw));
    _y=Utils.clamp(ty-_vh/2,0,Math.max(0,_wh-_vh));
    _tx=_x;_ty=_y;
  }

  function getX(){return _x;}function getY(){return _y;}
  function getViewW(){return _vw;}function getViewH(){return _vh;}
  function getOffset(){return{x:_x,y:_y};}

  return{init,resize,update,beginDraw,endDraw,worldToScreen,screenToWorld,
    isVisible,shake,snapTo,getX,getY,getViewW,getViewH,getOffset};
})();
