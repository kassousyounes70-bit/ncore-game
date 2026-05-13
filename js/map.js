'use strict';
const GameMap = (() => {
  const WORLD_W=2560,WORLD_H=1920,T=32;
  const DOOR_X=WORLD_W-T,DOOR_Y=WORLD_H/2-80,DOOR_H=160;
  const SPAWN_X=WORLD_W-T-70,SPAWN_Y=WORLD_H/2-14;
  let _obs=[],_devs=[],_chairs=[];

  function init(){
    _obs=[];_devs=[];_chairs=[];
    _buildWalls();_placeComputers();
    Collision.setObstacles(_obs);
  }

  function _buildWalls(){
    const W=WORLD_W,H=WORLD_H;
    _w(0,0,W,T);_w(0,H-T,W,T);_w(0,T,T,H-T*2);
    _w(W-T,T,T,DOOR_Y-T);
    _w(W-T,DOOR_Y+DOOR_H,T,H-T-(DOOR_Y+DOOR_H));
  }
  function _w(x,y,w,h){_obs.push({x,y,w,h,type:'wall'});}

  function _placeComputers(){
    // ---- جدار يسار (5 حواسيب) ----
    for(let i=0;i<5;i++) _addPC(T+8,220+i*330,'right');
    // ---- جزيرة صف 1 — 5 أزواج ظهر لظهر (10 حواسيب) ----
    [300,620,940,1260,1580].forEach(x=>{
      _addPC(x,320,'down'); _addPC(x,460,'up');
    });
    // ---- جزيرة صف 2 — 5 أزواج ظهر لظهر (10 حواسيب) ----
    [400,720,1040,1360,1680].forEach(x=>{
      _addPC(x,820,'down'); _addPC(x,960,'up');
    });
    // ---- جدار سفلي (5 حواسيب) ----
    [250,600,950,1300,1650].forEach(x=>_addPC(x,WORLD_H-T-100,'up'));
  }

  function _addPC(x,y,facing){
    const w=96,h=72;
    _devs.push({x,y,w,h,type:'pc',label:'Computer',facing});
    _obs.push({x,y,w,h,type:'device'});
    let cx=x+w/2-10,cy=y;
    if(facing==='down') cy=y+h+8;
    else if(facing==='up') cy=y-36;
    else if(facing==='right'){cx=x+w+8;cy=y+h/2-10;}
    else{cx=x-36;cy=y+h/2-10;}
    _chairs.push({x:cx,y:cy,w:20,h:20});
  }

  function draw(ctx){
    _drawFloor(ctx);_drawWalls(ctx);_drawDecorations(ctx);
    _drawAllPCs(ctx);_drawDoor(ctx);_drawCeilingLights(ctx);
  }

  /* ======================== FLOOR ======================== */
  function _drawFloor(ctx){
    for(let r=0;r*32<WORLD_H;r++){
      for(let c=0;c*32<WORLD_W;c++){
        ctx.fillStyle=(r+c)%2===0?'#1a1a2e':'#16213e';
        ctx.fillRect(c*32,r*32,32,32);
      }
    }
    ctx.strokeStyle='rgba(255,255,255,0.025)';ctx.lineWidth=1;
    for(let x=0;x<=WORLD_W;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_H);ctx.stroke();}
    for(let y=0;y<=WORLD_H;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke();}
    // سجادات تحت الجزر
    _carpet(ctx,240,260,1440,320);
    _carpet(ctx,340,760,1440,320);
    // بقع مشروبات
    _spill(ctx,470,640,'#8b2500',0.45);
    _spill(ctx,1120,480,'#1a6fb5',0.4);
    _spill(ctx,790,1080,'#1a8c1a',0.35);
    _spill(ctx,1500,780,'#cc8800',0.4);
  }

  function _carpet(ctx,x,y,w,h){
    ctx.fillStyle='rgba(50,20,80,0.28)';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='rgba(160,90,255,0.18)';ctx.lineWidth=3;
    ctx.strokeRect(x+6,y+6,w-12,h-12);
    ctx.strokeStyle='rgba(160,90,255,0.09)';
    ctx.strokeRect(x+14,y+14,w-28,h-28);
    // نقش هندسي بسيط وسط السجادة
    ctx.strokeStyle='rgba(160,90,255,0.12)';ctx.lineWidth=1;
    const cx=x+w/2,cy=y+h/2;
    ctx.strokeRect(cx-40,cy-20,80,40);
    ctx.beginPath();ctx.moveTo(cx-40,cy-20);ctx.lineTo(cx+40,cy+20);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+40,cy-20);ctx.lineTo(cx-40,cy+20);ctx.stroke();
  }

  function _spill(ctx,x,y,color,a){
    ctx.save();ctx.globalAlpha=a;
    ctx.fillStyle=color;
    ctx.beginPath();ctx.ellipse(x,y,20,11,0.4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+14,y+6,11,7,-0.5,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=a*0.35;ctx.fillStyle='#fff';
    ctx.beginPath();ctx.ellipse(x-5,y-3,5,3,0.4,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  /* ======================== WALLS ======================== */
  function _drawWalls(ctx){
    const W=WORLD_W,H=WORLD_H;
    const segs=[
      {x:0,y:0,w:W,h:T},{x:0,y:H-T,w:W,h:T},
      {x:0,y:T,w:T,h:H-T*2},
      {x:W-T,y:T,w:T,h:DOOR_Y-T},
      {x:W-T,y:DOOR_Y+DOOR_H,w:T,h:H-T-(DOOR_Y+DOOR_H)}
    ];
    for(const s of segs){
      ctx.fillStyle='#160830';ctx.fillRect(s.x,s.y,s.w,s.h);
      _bricks(ctx,s.x,s.y,s.w,s.h);
      ctx.strokeStyle='rgba(130,60,220,0.45)';ctx.lineWidth=2;
      ctx.strokeRect(s.x+2,s.y+2,s.w-4,s.h-4);
    }
    // LED شريط الجدار العلوي
    for(let lx=T+12;lx<W-T;lx+=52){
      const hue=(lx/W)*360;
      ctx.fillStyle=`hsl(${hue},95%,62%)`;ctx.fillRect(lx,3,12,4);
      const gr=ctx.createRadialGradient(lx+6,5,0,lx+6,5,22);
      gr.addColorStop(0,`hsla(${hue},95%,62%,0.35)`);gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gr;ctx.fillRect(lx-16,0,44,30);
    }
    // ملصقات الجدران
    const posters=[
      {x:120,y:4,w:52,h:26,c1:'#ff4400',c2:'#ff8800',t:'PACMAN'},
      {x:300,y:4,w:52,h:26,c1:'#0044ff',c2:'#00ccff',t:'MARIO'},
      {x:500,y:4,w:52,h:26,c1:'#008800',c2:'#00ff00',t:'ZELDA'},
      {x:700,y:4,w:52,h:26,c1:'#880088',c2:'#ff00ff',t:'SONIC'},
      {x:900,y:4,w:52,h:26,c1:'#884400',c2:'#ffaa00',t:'MK'},
      {x:1200,y:4,w:52,h:26,c1:'#004488',c2:'#0088ff',t:'SF2'},
      {x:1500,y:4,w:52,h:26,c1:'#880000',c2:'#ff4444',t:'DOOM'},
      {x:1800,y:4,w:52,h:26,c1:'#448800',c2:'#aaff00',t:'GTA'},
      // جدار يسار
      {x:4,y:200,w:26,h:52,c1:'#ff4400',c2:'#ffcc00',t:'NFS',side:true},
      {x:4,y:500,w:26,h:52,c1:'#0044ff',c2:'#00ffcc',t:'FIFA',side:true},
      {x:4,y:900,w:26,h:52,c1:'#008800',c2:'#88ff00',t:'PES',side:true},
    ];
    for(const p of posters) _poster(ctx,p);
  }

  function _bricks(ctx,wx,wy,ww,wh){
    ctx.fillStyle='rgba(255,255,255,0.035)';
    for(let r=0;r*12<wh;r++){
      const off=r%2===0?0:12;
      for(let c=-1;c*24<ww+24;c++){
        ctx.fillRect(wx+c*24+off+1,wy+r*12+1,22,10);
      }
    }
  }

  function _poster(ctx,p){
    if(!Camera.isVisible({x:p.x,y:p.y,w:p.w,h:p.h}))return;
    ctx.fillStyle='#0a0a0a';ctx.fillRect(p.x-2,p.y-2,p.w+4,p.h+4);
    const g=ctx.createLinearGradient(p.x,p.y,p.x+(p.side?0:p.w),p.y+(p.side?p.h:0));
    g.addColorStop(0,p.c1);g.addColorStop(1,p.c2);
    ctx.fillStyle=g;ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillRect(p.x+3,p.y+3,p.w-6,4);ctx.fillRect(p.x+3,p.y+9,p.w-9,3);
    Utils.drawPixelText(ctx,p.t,p.x+p.w/2,p.y+p.h-10,
      {font:'5px "Press Start 2P"',color:'#fff',shadow:'rgba(0,0,0,0.8)',align:'center'});
    ctx.fillStyle='rgba(255,255,255,0.18)';ctx.fillRect(p.x+2,p.y+2,p.w-4,3);
  }

  /* ======================== DECORATIONS ======================== */
  function _drawDecorations(ctx){
    _vendingMachine(ctx,2020,48);
    _trashBin(ctx,190,190);_trashBin(ctx,1760,520);_trashBin(ctx,960,1220);_trashBin(ctx,500,1600);
    _plant(ctx,110,420,false);_plant(ctx,2060,310,true);
    _plant(ctx,110,1250,false);_plant(ctx,2160,920,false);_plant(ctx,1800,1750,true);
    _cables(ctx);
  }

  function _vendingMachine(ctx,x,y){
    if(!Camera.isVisible({x,y,w:64,h:130}))return;
    ctx.fillStyle='#bb1a00';ctx.fillRect(x,y,64,130);
    ctx.fillStyle='#7a1000';ctx.fillRect(x+56,y,8,130);
    ctx.fillStyle='#dd2200';ctx.fillRect(x,y,64,5);
    ctx.fillStyle='#000820';ctx.fillRect(x+8,y+8,48,36);
    const sg=ctx.createLinearGradient(x+8,y+8,x+8,y+44);
    sg.addColorStop(0,'#0044cc');sg.addColorStop(1,'#001a66');
    ctx.fillStyle=sg;ctx.fillRect(x+9,y+9,46,34);
    Utils.drawPixelText(ctx,'NCORE',x+32,y+14,{font:'5px "Press Start 2P"',color:'#fff',align:'center'});
    const cans=[['#cc0000','#ff0000'],['#0055cc','#0088ff'],['#008800','#00cc00'],
                ['#cc8800','#ffcc00'],['#880088','#cc44cc'],['#004488','#0088cc']];
    for(let r=0;r<3;r++)for(let c=0;c<2;c++){
      const [b,t]=cans[r*2+c];
      ctx.fillStyle=b;ctx.fillRect(x+10+c*24,y+52+r*20,20,16);
      ctx.fillStyle=t;ctx.fillRect(x+10+c*24,y+52+r*20,20,5);
      ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(x+11+c*24,y+52+r*20,8,4);
    }
    ctx.fillStyle='#666';ctx.fillRect(x+18,y+118,28,6);ctx.fillStyle='#444';ctx.fillRect(x+26,y+119,12,4);
    ctx.strokeStyle='#330800';ctx.lineWidth=2;ctx.strokeRect(x,y,64,130);
    const gr=ctx.createRadialGradient(x+32,y+25,4,x+32,y+25,45);
    gr.addColorStop(0,'rgba(0,68,204,0.2)');gr.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gr;ctx.fillRect(x-15,y,94,60);
  }

  function _trashBin(ctx,x,y){
    if(!Camera.isVisible({x,y,w:30,h:38}))return;
    ctx.fillStyle='#252525';ctx.fillRect(x+2,y+8,26,30);
    ctx.fillStyle='#181818';ctx.fillRect(x+2,y+8,26,5);
    ctx.fillStyle='#303030';ctx.fillRect(x,y+3,30,7);
    ctx.fillStyle='#3a3a3a';ctx.fillRect(x+2,y+4,26,4);
    ctx.strokeStyle='#3a3a3a';ctx.lineWidth=1;
    for(let l=0;l<3;l++)ctx.strokeRect(x+5+l*7,y+15,5,17);
    ctx.fillStyle='#7a3800';ctx.fillRect(x+3,y+1,7,6);
    ctx.fillStyle='#3a7a00';ctx.fillRect(x+14,y,6,7);
    ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.strokeRect(x+2,y+8,26,30);
  }

  function _plant(ctx,x,y,dead){
    if(!Camera.isVisible({x,y,w:34,h:52}))return;
    ctx.fillStyle='#7a3c10';ctx.fillRect(x+5,y+34,24,18);
    ctx.fillStyle='#9a5020';ctx.fillRect(x+3,y+32,28,5);
    ctx.fillStyle='#5a2c0a';ctx.fillRect(x+7,y+48,20,4);
    ctx.fillStyle='#2e1200';ctx.fillRect(x+6,y+34,22,5);
    ctx.strokeStyle='#3a2000';ctx.lineWidth=1;ctx.strokeRect(x+3,y+32,28,22);
    if(dead){
      ctx.fillStyle='#7a6010';
      ctx.fillRect(x+15,y+18,4,16);ctx.fillRect(x+4,y+16,14,4);
      ctx.fillRect(x+18,y+22,10,4);ctx.fillRect(x+8,y+26,8,3);
    } else {
      ctx.fillStyle='#1a6e1a';ctx.fillRect(x+11,y+8,12,26);
      ctx.fillStyle='#248f24';ctx.fillRect(x+4,y+12,26,18);
      ctx.fillStyle='#1a6e1a';ctx.fillRect(x+8,y,18,18);
      ctx.fillStyle='#2db52d';ctx.fillRect(x+10,y+2,14,12);
      ctx.fillStyle='#70e070';ctx.fillRect(x+11,y+2,5,4);
      ctx.fillRect(x+6,y+14,4,4);
    }
  }

  function _cables(ctx){
    ctx.save();ctx.strokeStyle='rgba(30,30,30,0.75)';ctx.lineWidth=2;ctx.setLineDash([5,4]);
    [[260,390,290,440,255,480],[640,420,610,470,640,510],
     [960,900,940,950,970,990],[1300,430,1280,480,1310,520]].forEach(pts=>{
      ctx.beginPath();ctx.moveTo(pts[0],pts[1]);
      for(let i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);ctx.stroke();
    });
    ctx.setLineDash([]);ctx.restore();
  }

  /* ======================== PC STATION ======================== */
  function _drawAllPCs(ctx){
    for(const d of _devs){
      if(!Camera.isVisible(d))continue;
      _drawPC(ctx,d.x,d.y,d.facing||'down');
    }
  }

  function _drawPC(ctx,x,y,facing){
    _desk(ctx,x,y);
    _monitor(ctx,x,y);
    _keyboard(ctx,x,y);
    _chair(ctx,x,y,facing);
    _accessories(ctx,x,y);
  }

  function _desk(ctx,x,y){
    // سطح الطاولة
    ctx.fillStyle='#5c3d1e';ctx.fillRect(x,y,96,72);
    ctx.fillStyle='#4a3016';
    for(let g=0;g<5;g++)ctx.fillRect(x+4+g*18,y+2,2,68);
    ctx.fillStyle='#7a5232';ctx.fillRect(x,y,96,3);ctx.fillRect(x,y,3,72);
    ctx.fillStyle='#2c180a';ctx.fillRect(x+93,y,3,72);ctx.fillRect(x,y+69,96,3);
    // أرجل
    ctx.fillStyle='#3a2010';
    ctx.fillRect(x+4,y+72,8,10);ctx.fillRect(x+84,y+72,8,10);
    ctx.fillStyle='#2a1408';
    ctx.fillRect(x+4,y+79,8,3);ctx.fillRect(x+84,y+79,8,3);
    ctx.strokeStyle='#180a00';ctx.lineWidth=2;ctx.strokeRect(x,y,96,72);
  }

  function _monitor(ctx,x,y){
    const mx=x+20,my=y+4,mw=58,mh=44;
    // إطار الشاشة
    ctx.fillStyle='#1c1c1c';ctx.fillRect(mx,my,mw,mh);
    ctx.fillStyle='#282828';ctx.fillRect(mx,my,mw,3);ctx.fillRect(mx,my,3,mh);
    ctx.fillStyle='#101010';ctx.fillRect(mx+mw-3,my,3,mh);ctx.fillRect(mx,my+mh-3,mw,3);
    // الشاشة
    const sx=mx+5,sy=my+5,sw=mw-10,sh=mh-14;
    const sg=ctx.createLinearGradient(sx,sy,sx,sy+sh);
    sg.addColorStop(0,'#000880');sg.addColorStop(0.5,'#000560');sg.addColorStop(1,'#000340');
    ctx.fillStyle=sg;ctx.fillRect(sx,sy,sw,sh);
    // سطح المكتب (Windows 98 نمط)
    ctx.fillStyle='#008080';ctx.fillRect(sx,sy,sw,sh*0.7);
    ctx.fillStyle='#c0c0c0';ctx.fillRect(sx,sy+sh-7,sw,7);
    ctx.fillStyle='#000080';ctx.fillRect(sx,sy+sh-6,18,5);
    ctx.fillStyle='#00aa00';ctx.fillRect(sx+1,sy+sh-5,14,4);
    Utils.drawPixelText(ctx,'Start',sx+2,sy+sh-5,{font:'3px "Press Start 2P"',color:'#fff'});
    // أيقونات
    ctx.fillStyle='#ffff40';ctx.fillRect(sx+3,sy+3,6,6);
    ctx.fillStyle='#40ffff';ctx.fillRect(sx+3,sy+11,6,6);
    ctx.fillStyle='#ff8040';ctx.fillRect(sx+13,sy+3,6,6);
    // بريق الشاشة
    ctx.fillStyle='rgba(255,255,255,0.07)';ctx.fillRect(sx,sy,sw,3);ctx.fillRect(sx,sy,3,sh);
    // LED أخضر
    ctx.fillStyle='#00ff44';ctx.fillRect(mx+mw-7,my+mh-6,4,4);
    // عنق الشاشة
    ctx.fillStyle='#1c1c1c';ctx.fillRect(mx+mw/2-4,my+mh,8,6);ctx.fillRect(mx+mw/2-14,my+mh+4,28,4);
    ctx.strokeStyle='#0a0a0a';ctx.lineWidth=1;
    ctx.strokeRect(mx+mw/2-4,my+mh,8,6);ctx.strokeRect(mx+mw/2-14,my+mh+4,28,4);
    // إطار الشاشة الكلي
    ctx.strokeStyle='#080808';ctx.lineWidth=2;ctx.strokeRect(mx,my,mw,mh);
  }

  function _keyboard(ctx,x,y){
    const kx=x+8,ky=y+54,kw=68,kh=14;
    ctx.fillStyle='#c8c0a8';ctx.fillRect(kx,ky,kw,kh);
    ctx.fillStyle='#aaa090';
    for(let r=0;r<3;r++)for(let c=0;c<9;c++)ctx.fillRect(kx+3+c*7,ky+2+r*4,5,3);
    ctx.fillStyle='#aaa090';ctx.fillRect(kx+18,ky+11,32,2);
    ctx.fillStyle='#b8b098';ctx.fillRect(kx,ky,kw,2);ctx.fillRect(kx,ky,2,kh);
    ctx.fillStyle='#888070';ctx.fillRect(kx+kw-2,ky,2,kh);ctx.fillRect(kx,ky+kh-2,kw,2);
    ctx.strokeStyle='#808070';ctx.lineWidth=1;ctx.strokeRect(kx,ky,kw,kh);
    // الفأرة
    ctx.fillStyle='#1a1a1a';ctx.fillRect(x+80,y+46,16,22);
    ctx.fillStyle='#c8c0a8';
    Utils.drawPixelRect(ctx,x+81,y+47,14,20,3,'#c8c0a8','#808070',1);
    ctx.strokeStyle='#808070';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x+88,y+47);ctx.lineTo(x+88,y+55);ctx.stroke();
    // لوحة الفأرة
    ctx.fillStyle='#111';ctx.fillRect(x+77,y+43,22,28);
    ctx.fillStyle='#1a1a1a';ctx.fillRect(x+78,y+44,20,26);
  }

  function _chair(ctx,x,y,facing){
    let cx,cy;
    if(facing==='down'){cx=x+38;cy=y+82;}
    else if(facing==='up'){cx=x+38;cy=y-32;}
    else if(facing==='right'){cx=x+106;cy=y+26;}
    else{cx=x-30;cy=y+26;}
    // عجلات
    ctx.fillStyle='#111';
    [[cx-14,cy+22],[cx+9,cy+22],[cx-14,cy+30],[cx+9,cy+30]].forEach(([wx,wy])=>{
      ctx.fillRect(wx,wy,6,4);
    });
    // القاعدة
    ctx.fillStyle='#2a2a2a';ctx.fillRect(cx-2,cy+8,5,18);ctx.fillRect(cx-11,cy+22,24,4);
    // المقعد
    ctx.fillStyle='#10104a';ctx.fillRect(cx-15,cy-4,31,15);
    ctx.fillStyle='#18186a';ctx.fillRect(cx-13,cy-3,27,9);
    ctx.fillStyle='#2020a0';ctx.fillRect(cx-11,cy-2,23,4);
    // الظهر
    ctx.fillStyle='#10104a';ctx.fillRect(cx-11,cy-24,23,22);
    ctx.fillStyle='#18186a';ctx.fillRect(cx-9,cy-22,19,18);
    ctx.fillStyle='#2020a0';ctx.fillRect(cx-7,cy-20,15,6);
    // مساند الذراعين
    ctx.fillStyle='#1a1a1a';
    ctx.fillRect(cx-17,cy-9,4,13);ctx.fillRect(cx+14,cy-9,4,13);
    ctx.fillStyle='#222';ctx.fillRect(cx-17,cy-10,4,4);ctx.fillRect(cx+14,cy-10,4,4);
    ctx.strokeStyle='#080820';ctx.lineWidth=1;ctx.strokeRect(cx-15,cy-24,31,48);
  }

  function _accessories(ctx,x,y){
    const seed=(x*7+y*13)%10;
    if(seed<7){
      const cx=x+10+(seed*9)%55,cy=y+6;
      const cols=['#cc1a00','#0044cc','#008800','#cc7700','#880088','#006688','#cc0044'];
      const c=cols[seed%cols.length];
      // علبة عصير
      ctx.fillStyle=c;ctx.fillRect(cx,cy,10,18);
      ctx.fillStyle='#aaa';ctx.fillRect(cx-1,cy,12,2);ctx.fillRect(cx-1,cy+16,12,2);
      ctx.fillStyle='#888';ctx.fillRect(cx+3,cy-2,4,3);ctx.fillRect(cx+4,cy-4,2,3);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(cx+1,cy+3,8,7);
      ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fillRect(cx+1,cy+1,3,15);
      ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=1;ctx.strokeRect(cx,cy,10,18);
    }
    // سماعات رأس (20% فرصة)
    if(seed<2){
      const hx=x+74,hy=y+8;
      ctx.strokeStyle='#111';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(hx,hy+8,8,Math.PI,0);ctx.stroke();
      ctx.fillStyle='#2a2a2a';ctx.fillRect(hx-10,hy+5,7,9);ctx.fillRect(hx+4,hy+5,7,9);
      ctx.strokeStyle='#111';ctx.lineWidth=1;
      ctx.strokeRect(hx-10,hy+5,7,9);ctx.strokeRect(hx+4,hy+5,7,9);
    }
  }

  /* ======================== DOOR ======================== */
  function _drawDoor(ctx){
    ctx.fillStyle='#050510';ctx.fillRect(DOOR_X,DOOR_Y,T+6,DOOR_H);
    ctx.strokeStyle='#f0c040';ctx.lineWidth=3;
    ctx.strokeRect(DOOR_X-2,DOOR_Y-4,T+6,DOOR_H+8);
    // سهم دخول
    ctx.fillStyle='rgba(240,192,64,0.75)';
    ctx.beginPath();ctx.moveTo(DOOR_X+16,DOOR_Y+DOOR_H/2);
    ctx.lineTo(DOOR_X+2,DOOR_Y+DOOR_H/2-14);
    ctx.lineTo(DOOR_X+2,DOOR_Y+DOOR_H/2+14);ctx.closePath();ctx.fill();
    // لافتة نيون
    _neon(ctx,DOOR_X-90,DOOR_Y-56,'ENTER');
  }

  function _neon(ctx,x,y,text){
    ctx.save();ctx.shadowColor='#f0c040';ctx.shadowBlur=18;
    ctx.fillStyle='rgba(8,8,18,0.92)';ctx.fillRect(x,y,130,32);
    ctx.strokeStyle='#f0c040';ctx.lineWidth=2;ctx.strokeRect(x,y,130,32);
    Utils.drawPixelText(ctx,text,x+65,y+7,{font:'10px "Press Start 2P"',color:'#f0c040',shadow:'#a07000',align:'center'});
    ctx.restore();
  }

  /* ======================== CEILING LIGHTS ======================== */
  function _drawCeilingLights(ctx){
    for(let r=0;r<7;r++)for(let c=0;c<9;c++){
      const lx=T+140+c*270,ly=T+140+r*240;
      if(!Camera.isVisible({x:lx-90,y:ly-90,w:180,h:180}))continue;
      const gr=ctx.createRadialGradient(lx,ly,0,lx,ly,120);
      gr.addColorStop(0,'rgba(255,250,220,0.09)');gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gr;ctx.fillRect(lx-120,ly-120,240,240);
      ctx.fillStyle='#fff8e0';ctx.fillRect(lx-7,ly-2,14,4);
      ctx.fillStyle='rgba(255,250,220,0.9)';ctx.fillRect(lx-4,ly-1,8,2);
    }
  }

  function getWorldSize(){return{w:WORLD_W,h:WORLD_H};}
  function getDevices(){return _devs;}
  function getChairs(){return _chairs;}
  function getSpawnPoint(){return{x:SPAWN_X,y:SPAWN_Y};}
  function getDoorRect(){return{x:DOOR_X,y:DOOR_Y,w:T,h:DOOR_H};}
  return{init,draw,getWorldSize,getDevices,getChairs,getSpawnPoint,getDoorRect};
})();
