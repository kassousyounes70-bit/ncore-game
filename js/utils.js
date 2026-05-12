'use strict';
const Utils = (() => {
  function clamp(v,mn,mx){return Math.max(mn,Math.min(mx,v));}
  function lerp(a,b,t){return a+(b-a)*t;}
  function distance(x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1;return Math.sqrt(dx*dx+dy*dy);}
  function angleBetween(x1,y1,x2,y2){return Math.atan2(y2-y1,x2-x1);}
  function randInt(mn,mx){return Math.floor(Math.random()*(mx-mn+1))+mn;}
  function randFloat(mn,mx){return Math.random()*(mx-mn)+mn;}
  function randFrom(arr){return arr[Math.floor(Math.random()*arr.length)];}
  function degToRad(d){return d*(Math.PI/180);}
  function rectOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
  function pointInRect(px,py,r){return px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h;}
  function circleRectOverlap(c,r){const nx=clamp(c.x,r.x,r.x+r.w),ny=clamp(c.y,r.y,r.y+r.h),dx=c.x-nx,dy=c.y-ny;return dx*dx+dy*dy<=c.r*c.r;}

  function drawPixelRect(ctx,x,y,w,h,cut=4,fill=null,stroke=null,lw=2){
    ctx.beginPath();
    ctx.moveTo(x+cut,y);ctx.lineTo(x+w-cut,y);ctx.lineTo(x+w,y+cut);
    ctx.lineTo(x+w,y+h-cut);ctx.lineTo(x+w-cut,y+h);ctx.lineTo(x+cut,y+h);
    ctx.lineTo(x,y+h-cut);ctx.lineTo(x,y+cut);ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
  }

  function drawPixelText(ctx,text,x,y,{font='8px "Press Start 2P"',color='#fff',shadow='#000',shadowOff=2,align='left',baseline='top'}={}){
    ctx.font=font;ctx.textAlign=align;ctx.textBaseline=baseline;
    ctx.fillStyle=shadow;ctx.fillText(text,x+shadowOff,y+shadowOff);
    ctx.fillStyle=color;ctx.fillText(text,x,y);
  }

  function drawPixelImage(ctx,src,dx,dy,scale=1){
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(src,dx,dy,src.width*scale,src.height*scale);
  }

  function createCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function now(){return performance.now();}

  function createTimer(dur){
    let e=0;
    return{
      tick(d){e+=d;if(e>=dur){e-=dur;return true;}return false;},
      reset(){e=0;},
      progress(){return clamp(e/dur,0,1);}
    };
  }

  function $(id){return document.getElementById(id);}
  function show(el){if(typeof el==='string')el=$(el);el&&el.classList.remove('hidden');}
  function hide(el){if(typeof el==='string')el=$(el);el&&el.classList.add('hidden');}
  function hexToRgba(hex,a=1){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}
  function hsl(h,s,l,a=1){return `hsla(${h},${s}%,${l}%,${a})`;}

  return{clamp,lerp,distance,angleBetween,randInt,randFloat,randFrom,degToRad,
    rectOverlap,pointInRect,circleRectOverlap,drawPixelRect,drawPixelText,
    drawPixelImage,createCanvas,now,createTimer,$,show,hide,hexToRgba,hsl};
})();
