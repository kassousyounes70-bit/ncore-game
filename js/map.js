'use strict';
const GameMap = (() => {
  const WORLD_W=2560,WORLD_H=1920,T=32;
  const DOOR_X=WORLD_W-T,DOOR_Y=WORLD_H/2-80,DOOR_H=160;
  const SPAWN_X=WORLD_W-T-70,SPAWN_Y=WORLD_H/2-14;

  // منطقة البناء — الزاوية اليمنى العلوية
  const BX=WORLD_W-440, BY=T+20, BW=380, BH=300;
  // كشك التذاكر داخل منطقة البناء
  const BOOTH_X=BX+30, BOOTH_Y=BY+60, BOOTH_W=100, BOOTH_H=80;
  // طاولة الجوائز
  const TROPHY_X=180, TROPHY_Y=WORLD_H-T-160, TROPHY_W=130, TROPHY_H=60;
  // لوحة الإعلانات (على الجدار الأيسر)
  const BOARD_X=T, BOARD_Y=600, BOARD_W=26, BOARD_H=180;
  // شاشة العرض الكبيرة
  const SCREEN_X=900, SCREEN_Y=T, SCREEN_W=200, SCREEN_H=20;
  // باب Staff Only
  const STAFF_X=60, STAFF_Y=WORLD_H-T-120;
  // آلة البيع
  const VEND_X=2020, VEND_Y=48, VEND_W=64, VEND_H=130;

  let _obs=[],_devs=[],_chairs=[];
  let _t=0; // مؤقت للرسوم المتحركة

  // ============================================================
  //  INIT
  // ============================================================
  function init(){
    _obs=[];_devs=[];_chairs=[];
    _buildWalls();
    _placeComputers();
    _placeSceneryObstacles();
    Collision.setObstacles(_obs);
  }

  function update(delta){ _t+=delta; }

  function _buildWalls(){
    const W=WORLD_W,H=WORLD_H;
    _w(0,0,W,T);_w(0,H-T,W,T);_w(0,T,T,H-T*2);
    _w(W-T,T,T,DOOR_Y-T);
    _w(W-T,DOOR_Y+DOOR_H,T,H-T-(DOOR_Y+DOOR_H));
  }
  function _w(x,y,w,h){_obs.push({x,y,w,h,type:'wall'});}

  function _placeComputers(){
    for(let i=0;i<5;i++) _addPC(T+8,220+i*330,'right');
    [300,620,940,1260,1580].forEach(x=>{
      _addPC(x,320,'down'); _addPC(x,460,'up');
    });
    [400,720,1040,1360,1680].forEach(x=>{
      _addPC(x,820,'down'); _addPC(x,960,'up');
    });
    [250,600,950,1300,1650].forEach(x=>_addPC(x,WORLD_H-T-100,'up'));
  }

  function _addPC(x,y,facing){
    const w=96,h=72;
    _devs.push({x,y,w,h,type:'pc',label:'Computer',facing});
    _obs.push({x,y,w,h,type:'device'});
    let cx=x+w/2-10,cy=y;
    if(facing==='down')      cy=y+h+8;
    else if(facing==='up')   cy=y-36;
    else if(facing==='right'){cx=x+w+8;cy=y+h/2-10;}
    else                     {cx=x-36; cy=y+h/2-10;}
    _chairs.push({x:cx,y:cy,w:20,h:20});
  }

  // عوائق الديكور الجديد
  function _placeSceneryObstacles(){
    // كشك التذاكر
    _obs.push({x:BOOTH_X,  y:BOOTH_Y,  w:BOOTH_W,  h:BOOTH_H,  type:'wall'});
    // طاولة الجوائز
    _obs.push({x:TROPHY_X, y:TROPHY_Y, w:TROPHY_W, h:TROPHY_H, type:'wall'});
    // لوحة الإعلانات
    _obs.push({x:BOARD_X,  y:BOARD_Y,  w:BOARD_W,  h:BOARD_H,  type:'wall'});
    // شاشة العرض (إطارها فقط)
    _obs.push({x:SCREEN_X, y:SCREEN_Y, w:SCREEN_W, h:SCREEN_H, type:'wall'});
    // باب Staff Only (حاجز رفيع)
    _obs.push({x:STAFF_X,  y:STAFF_Y-60,  w:60,  h:4,  type:'wall'});
    // آلة البيع
    _obs.push({x:VEND_X,   y:VEND_Y,   w:VEND_W,   h:VEND_H,   type:'wall'});
    // سقالة البناء
    _obs.push({x:BX+180,   y:BY+20,    w:90,   h:BH-60,type:'wall'});
    // حدود منطقة البناء (شريط التحذير — عائق مؤقت)
    _obs.push({x:BX-8,y:BY-8,w:BW+16,h:8,   type:'wall'});
    _obs.push({x:BX-8,y:BY+BH,w:BW+16,h:8,  type:'wall'});
    _obs.push({x:BX-8,y:BY,   w:8,h:BH,     type:'wall'});
  }

  // ============================================================
  //  DRAW
  // ============================================================
  function draw(ctx){
    _drawFloor(ctx);
    _drawWalls(ctx);
    _drawDecorations(ctx);
    _drawAllPCs(ctx);
    _drawDoor(ctx);
    _drawCeilingLights(ctx);
    // إضافات جديدة
    _drawBigScreen(ctx);
    _drawTrophyTable(ctx);
    _drawStaffDoor(ctx);
    _drawNoticeboard(ctx);
    _drawConstructionZone(ctx);
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
    _carpet(ctx,240,260,1440,320);
    _carpet(ctx,340,760,1440,320);
    _carpet(ctx,TROPHY_X-20,TROPHY_Y-40,180,120);
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
    for(let lx=T+12;lx<W-T;lx+=52){
      const hue=(lx/W)*360;
      ctx.fillStyle=`hsl(${hue},95%,62%)`;ctx.fillRect(lx,3,12,4);
      const gr=ctx.createRadialGradient(lx+6,5,0,lx+6,5,22);
      gr.addColorStop(0,`hsla(${hue},95%,62%,0.35)`);gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gr;ctx.fillRect(lx-16,0,44,30);
    }
    const posters=[
      {x:120,y:4,w:52,h:26,c1:'#ff4400',c2:'#ff8800',t:'PACMAN'},
      {x:300,y:4,w:52,h:26,c1:'#0044ff',c2:'#00ccff',t:'MARIO'},
      {x:500,y:4,w:52,h:26,c1:'#008800',c2:'#00ff00',t:'ZELDA'},
      {x:700,y:4,w:52,h:26,c1:'#880088',c2:'#ff00ff',t:'SONIC'},
      {x:900,y:4,w:52,h:26,c1:'#884400',c2:'#ffaa00',t:'MK'},
      {x:1200,y:4,w:52,h:26,c1:'#004488',c2:'#0088ff',t:'SF2'},
      {x:1500,y:4,w:52,h:26,c1:'#880000',c2:'#ff4444',t:'DOOM'},
      {x:1800,y:4,w:52,h:26,c1:'#448800',c2:'#aaff00',t:'GTA'},
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
      for(let c=-1;c*24<ww+24;c++)ctx.fillRect(wx+c*24+off+1,wy+r*12+1,22,10);
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
    _vendingMachine(ctx,VEND_X,VEND_Y);
    _trashBin(ctx,190,190);_trashBin(ctx,1760,520);
    _trashBin(ctx,960,1220);_trashBin(ctx,500,1600);
    _plant(ctx,110,420,false);_plant(ctx,2060,310,true);
    _plant(ctx,110,1250,false);_plant(ctx,2160,920,false);
    _plant(ctx,1800,1750,true);
    // نباتات جديدة
    _plant(ctx,TROPHY_X+140,TROPHY_Y-30,false);
    _plant(ctx,STAFF_X-30,STAFF_Y-80,false);
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
      const[b,t]=cans[r*2+c];
      ctx.fillStyle=b;ctx.fillRect(x+10+c*24,y+52+r*20,20,16);
      ctx.fillStyle=t;ctx.fillRect(x+10+c*24,y+52+r*20,20,5);
      ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(x+11+c*24,y+52+r*20,8,4);
    }
    ctx.fillStyle='#666';ctx.fillRect(x+18,y+118,28,6);
    ctx.fillStyle='#444';ctx.fillRect(x+26,y+119,12,4);
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

  /* ======================== شاشة العرض الكبيرة ======================== */
  function _drawBigScreen(ctx){
    const sx=SCREEN_X,sy=SCREEN_Y+4,sw=SCREEN_W,sh=100;
    if(!Camera.isVisible({x:sx,y:sy,w:sw,h:sh}))return;
    ctx.fillStyle='#0a0a1a';ctx.fillRect(sx-4,sy-2,sw+8,sh+8);
    ctx.strokeStyle='#6030c0';ctx.lineWidth=3;ctx.strokeRect(sx-4,sy-2,sw+8,sh+8);
    const pulse=0.7+Math.sin(_t*2)*0.3;
    const bg=ctx.createLinearGradient(sx,sy,sx,sy+sh);
    bg.addColorStop(0,`rgba(0,10,40,${pulse})`);
    bg.addColorStop(1,`rgba(10,0,40,${pulse})`);
    ctx.fillStyle=bg;ctx.fillRect(sx,sy,sw,sh);
    ctx.save();
    ctx.shadowColor='#8040ff';ctx.shadowBlur=12*pulse;
    Utils.drawPixelText(ctx,'NCORE ARENA',sx+sw/2,sy+18,
      {font:'8px "Press Start 2P"',color:'#c080ff',shadow:'#4000a0',align:'center'});
    const alpha=0.5+Math.sin(_t*3)*0.5;
    ctx.globalAlpha=alpha;
    Utils.drawPixelText(ctx,'LIVE TOURNAMENT',sx+sw/2,sy+42,
      {font:'5px "Press Start 2P"',color:'#f0c040',shadow:'#806000',align:'center'});
    ctx.globalAlpha=1;
    ctx.fillStyle=`rgba(240,192,64,${alpha})`;
    ctx.beginPath();ctx.moveTo(sx+sw/2-6,sy+62);
    ctx.lineTo(sx+sw/2+6,sy+62);
    ctx.lineTo(sx+sw/2,sy+72);ctx.closePath();ctx.fill();
    ctx.restore();
    ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fillRect(sx,sy,sw,4);
    ctx.fillStyle='#1a1a2a';
    ctx.fillRect(sx+sw/2-15,sy+sh+6,30,10);
    ctx.fillRect(sx+sw/2-25,sy+sh+14,50,6);
  }

  /* ======================== طاولة الجوائز ======================== */
  function _drawTrophyTable(ctx){
    const tx=TROPHY_X,ty=TROPHY_Y;
    if(!Camera.isVisible({x:tx,y:ty,w:TROPHY_W,h:TROPHY_H+40}))return;
    ctx.fillStyle='#5c3d1e';ctx.fillRect(tx,ty+40,TROPHY_W,20);
    ctx.fillStyle='#3a2010';
    ctx.fillRect(tx+10,ty+58,20,30);ctx.fillRect(tx+100,ty+58,20,30);
    ctx.strokeStyle='#2a1408';ctx.lineWidth=2;ctx.strokeRect(tx,ty+40,TROPHY_W,20);
    ctx.fillStyle='#1a5a1a';ctx.fillRect(tx+5,ty+38,TROPHY_W-10,5);
    _trophy(ctx,tx+50,ty,24,28,'#f0d020','#c8a000');
    _trophy(ctx,tx+15,ty+8,18,22,'#d0d0d0','#a0a0a0');
    _trophy(ctx,tx+90,ty+8,18,22,'#c87820','#a05010');
    ctx.fillStyle='#0a0a1a';ctx.fillRect(tx+25,ty-20,80,18);
    ctx.strokeStyle='#f0c040';ctx.lineWidth=1;ctx.strokeRect(tx+25,ty-20,80,18);
    Utils.drawPixelText(ctx,'CHAMPIONS',tx+65,ty-14,
      {font:'4px "Press Start 2P"',color:'#f0c040',align:'center'});
  }

  function _trophy(ctx,x,y,w,h,c1,c2){
    ctx.fillStyle=c1;
    ctx.fillRect(x,y+h*0.2,w,h*0.5);
    ctx.fillRect(x-w*0.15,y,w*1.3,h*0.25);
    ctx.fillRect(x-w*0.2,y+h*0.2,w*0.2,h*0.25);
    ctx.fillRect(x+w,y+h*0.2,w*0.2,h*0.25);
    ctx.fillStyle=c2;
    ctx.fillRect(x+w*0.35,y+h*0.7,w*0.3,h*0.15);
    ctx.fillRect(x+w*0.1,y+h*0.85,w*0.8,h*0.15);
    ctx.fillStyle='rgba(255,255,255,0.35)';
    ctx.fillRect(x+w*0.2,y+h*0.05,w*0.3,h*0.15);
  }

  /* ======================== باب Staff Only ======================== */
  function _drawStaffDoor(ctx){
    const dx=STAFF_X,dy=STAFF_Y;
    if(!Camera.isVisible({x:dx,y:dy-80,w:70,h:100}))return;
    ctx.fillStyle='#2a0a4a';ctx.fillRect(dx,dy-60,60,64);
    ctx.strokeStyle='#8040c0';ctx.lineWidth=2;ctx.strokeRect(dx,dy-60,60,64);
    ctx.fillStyle='#1a0530';ctx.fillRect(dx+3,dy-57,54,58);
    ctx.strokeStyle='#4a1a8a';ctx.lineWidth=1;
    ctx.strokeRect(dx+8,dy-52,20,24);ctx.strokeRect(dx+32,dy-52,18,24);
    ctx.strokeRect(dx+8,dy-24,42,18);
    ctx.fillStyle='#c8a020';ctx.fillRect(dx+46,dy-38,6,10);
    ctx.beginPath();ctx.arc(dx+49,dy-33,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#1a0a00';ctx.fillRect(dx-5,dy-80,72,18);
    ctx.strokeStyle='#ff4400';ctx.lineWidth=1;ctx.strokeRect(dx-5,dy-80,72,18);
    Utils.drawPixelText(ctx,'STAFF ONLY',dx+31,dy-74,
      {font:'4px "Press Start 2P"',color:'#ff4400',align:'center'});
    const blink=Math.sin(_t*3)>0;
    ctx.fillStyle=blink?'#ff2200':'#440000';
    ctx.save();
    if(blink){ctx.shadowColor='#ff2200';ctx.shadowBlur=10;}
    ctx.beginPath();ctx.arc(dx+30,dy-65,5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  /* ======================== لوحة الإعلانات ======================== */
  function _drawNoticeboard(ctx){
    const bx=BOARD_X,by=BOARD_Y;
    if(!Camera.isVisible({x:bx,y:by,w:BOARD_W,h:BOARD_H}))return;
    ctx.fillStyle='#3a2010';ctx.fillRect(bx,by,26,180);
    ctx.strokeStyle='#7a5030';ctx.lineWidth=2;ctx.strokeRect(bx,by,26,180);
    ctx.fillStyle='#c8a060';ctx.fillRect(bx+2,by+4,22,172);
    const notices=[
      {y:by+8, c:'#ffeeaa',tc:'#330000'},
      {y:by+48,c:'#aaffaa',tc:'#003300'},
      {y:by+88,c:'#aaaaff',tc:'#000033'},
      {y:by+128,c:'#ffaaaa',tc:'#330000'},
    ];
    for(const n of notices){
      ctx.fillStyle=n.c;ctx.fillRect(bx+3,n.y,20,34);
      ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=1;ctx.strokeRect(bx+3,n.y,20,34);
      ctx.fillStyle=n.tc;
      ctx.fillRect(bx+5,n.y+4,16,2);ctx.fillRect(bx+5,n.y+9,14,2);
      ctx.fillRect(bx+5,n.y+14,16,2);ctx.fillRect(bx+5,n.y+19,10,2);
      ctx.fillStyle='#cc0000';
      ctx.beginPath();ctx.arc(bx+13,n.y+1,3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.5)';
      ctx.beginPath();ctx.arc(bx+12,n.y,1,0,Math.PI*2);ctx.fill();
    }
  }

  /* ======================== منطقة البناء ======================== */
  function _drawConstructionZone(ctx){
    if(!Camera.isVisible({x:BX,y:BY,w:BW,h:BH+40}))return;
    // أرضية بيتون
    ctx.fillStyle='#2a2a2a';ctx.fillRect(BX,BY,BW,BH);
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    for(let x=BX;x<BX+BW;x+=24){ctx.beginPath();ctx.moveTo(x,BY);ctx.lineTo(x,BY+BH);ctx.stroke();}
    for(let y=BY;y<BY+BH;y+=24){ctx.beginPath();ctx.moveTo(BX,y);ctx.lineTo(BX+BW,y);ctx.stroke();}
    // الشريط الأصفر/الأسود
    _drawBarricade(ctx,BX-8,BY-8,BW+16,BH+16);
    // الكشك
    _drawTicketBooth(ctx,BOOTH_X,BOOTH_Y);
    // السقالة
    _drawScaffolding(ctx,BX+180,BY+20);
    // لافتة تحت البناء
    _drawComingSoon(ctx,BX+BW/2,BY+BH-20);
  }

  function _drawBarricade(ctx,x,y,w,h){
    ctx.save();
    const sw=18;
    // أعلى
    for(let i=0;i<w;i+=sw*2){
      ctx.fillStyle='#f0c000';ctx.fillRect(x+i,y,sw,5);
      ctx.fillStyle='#111';   ctx.fillRect(x+i+sw,y,sw,5);
    }
    // أسفل
    for(let i=0;i<w;i+=sw*2){
      ctx.fillStyle='#f0c000';ctx.fillRect(x+i,y+h-5,sw,5);
      ctx.fillStyle='#111';   ctx.fillRect(x+i+sw,y+h-5,sw,5);
    }
    // يسار
    for(let i=0;i<h;i+=sw*2){
      ctx.fillStyle='#f0c000';ctx.fillRect(x,y+i,5,sw);
      ctx.fillStyle='#111';   ctx.fillRect(x,y+i+sw,5,sw);
    }
    // يمين
    for(let i=0;i<h;i+=sw*2){
      ctx.fillStyle='#f0c000';ctx.fillRect(x+w-5,y+i,5,sw);
      ctx.fillStyle='#111';   ctx.fillRect(x+w-5,y+i+sw,5,sw);
    }
    // مخاريط تحذير
    const cones=[x+20,x+w/3,x+w/2,x+w*0.7,x+w-30];
    for(const cx of cones){
      ctx.fillStyle='#ff6600';
      ctx.beginPath();ctx.moveTo(cx,y+h+4);
      ctx.lineTo(cx-8,y+h+24);ctx.lineTo(cx+8,y+h+24);ctx.closePath();ctx.fill();
      ctx.fillStyle='#fff';ctx.fillRect(cx-8,y+h+12,16,4);
      ctx.fillStyle='#333';ctx.fillRect(cx-10,y+h+22,20,4);
    }
    ctx.restore();
  }

  function _drawTicketBooth(ctx,x,y){
    // جدران
    ctx.fillStyle='#3a2060';ctx.fillRect(x,y,BOOTH_W,BOOTH_H);
    // سقف مائل
    ctx.fillStyle='#5030a0';
    ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+BOOTH_W+5,y);
    ctx.lineTo(x+BOOTH_W-5,y-20);ctx.lineTo(x+5,y-20);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#8060d0';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+BOOTH_W+5,y);
    ctx.lineTo(x+BOOTH_W-5,y-20);ctx.lineTo(x+5,y-20);ctx.closePath();ctx.stroke();
    // نافذة
    ctx.fillStyle='#000820';ctx.fillRect(x+15,y+10,70,35);
    ctx.strokeStyle='#8060d0';ctx.lineWidth=2;ctx.strokeRect(x+15,y+10,70,35);
    ctx.fillStyle='rgba(100,100,255,0.1)';ctx.fillRect(x+16,y+11,68,33);
    // شق التذاكر
    ctx.fillStyle='#1a0a30';ctx.fillRect(x+25,y+45,50,6);
    ctx.strokeStyle='#6040a0';ctx.lineWidth=1;ctx.strokeRect(x+25,y+45,50,6);
    // رف
    ctx.fillStyle='#5030a0';ctx.fillRect(x+5,y+55,BOOTH_W-10,6);
    // باب
    ctx.fillStyle='#2a1050';ctx.fillRect(x+35,y+58,30,22);
    ctx.strokeStyle='#6040a0';ctx.lineWidth=1;ctx.strokeRect(x+35,y+58,30,22);
    ctx.fillStyle='#c8a020';ctx.fillRect(x+60,y+67,4,6);
    // لافتة التذاكر
    ctx.fillStyle='#0a0520';ctx.fillRect(x+5,y-42,BOOTH_W-10,20);
    ctx.strokeStyle='#f0c040';ctx.lineWidth=2;ctx.strokeRect(x+5,y-42,BOOTH_W-10,20);
    ctx.fillStyle='#f0e060';ctx.fillRect(x+10,y-40,16,16);
    ctx.fillStyle='#c8a000';ctx.fillRect(x+12,y-38,12,12);
    ctx.fillStyle='#f0e060';ctx.fillRect(x+16,y-35,4,6);
    Utils.drawPixelText(ctx,'TICKETS',x+BOOTH_W/2+10,y-34,
      {font:'5px "Press Start 2P"',color:'#f0c040',align:'center'});
    // غطاء "قريباً" على النافذة
    ctx.fillStyle='rgba(10,5,30,0.92)';ctx.fillRect(x+18,y+14,66,27);
    Utils.drawPixelText(ctx,'COMING',x+51,y+22,
      {font:'4px "Press Start 2P"',color:'#a080ff',align:'center'});
    Utils.drawPixelText(ctx,'SOON!',x+51,y+31,
      {font:'4px "Press Start 2P"',color:'#f0c040',align:'center'});
    // ضوء يومض
    const p=0.5+Math.sin(_t*2.5)*0.5;
    ctx.save();ctx.globalAlpha=p;
    ctx.shadowColor='#f0c040';ctx.shadowBlur=15;
    ctx.fillStyle='#f0c040';
    ctx.beginPath();ctx.arc(x+BOOTH_W/2,y-50,5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function _drawScaffolding(ctx,x,y){
    ctx.fillStyle='#808080';
    ctx.fillRect(x,  y,6,BH-40);
    ctx.fillRect(x+80,y,6,BH-40);
    for(let fy=y+20;fy<y+BH-60;fy+=50){
      ctx.fillStyle='#707070';ctx.fillRect(x,fy,86,5);
      if(fy===y+20){
        ctx.fillStyle='#8b5a20';ctx.fillRect(x+2,fy-6,82,8);
        ctx.fillStyle='#7a4a10';
        for(let bx=x+4;bx<x+82;bx+=14)ctx.fillRect(bx,fy-5,12,6);
      }
    }
    ctx.strokeStyle='#606060';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(x+6,y);ctx.lineTo(x+80,y+50);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+80,y);ctx.lineTo(x+6,y+50);ctx.stroke();
    // رافعة
    ctx.fillStyle='#505050';ctx.fillRect(x+38,y-40,10,50);
    ctx.fillRect(x+38,y-40,50,8);
    ctx.strokeStyle='#303030';ctx.lineWidth=2;ctx.setLineDash([3,2]);
    ctx.beginPath();ctx.moveTo(x+84,y-35);ctx.lineTo(x+84,y+20);ctx.stroke();
    ctx.setLineDash([]);
    // صندوق يتأرجح
    const hookY=y+10+Math.sin(_t*0.5)*20;
    ctx.fillStyle='#804000';ctx.fillRect(x+76,hookY,18,14);
    ctx.strokeStyle='#402000';ctx.lineWidth=1;ctx.strokeRect(x+76,hookY,18,14);
    ctx.fillStyle='#c06000';ctx.fillRect(x+78,hookY+2,14,5);
    // كومة رمل
    ctx.fillStyle='#c8a840';
    ctx.beginPath();ctx.ellipse(x+110,y+BH-60,25,12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e0c060';
    ctx.beginPath();ctx.ellipse(x+110,y+BH-64,18,8,0,0,Math.PI);ctx.fill();
    // طوب
    for(let bi=0;bi<3;bi++){
      ctx.fillStyle=bi%2===0?'#c05030':'#a04020';
      ctx.fillRect(x+140+bi*20,y+BH-60,18,12);
      ctx.strokeStyle='#802010';ctx.lineWidth=1;
      ctx.strokeRect(x+140+bi*20,y+BH-60,18,12);
    }
  }

  function _drawComingSoon(ctx,cx,y){
    ctx.save();
    const pulse=0.6+Math.sin(_t*1.5)*0.4;
    ctx.globalAlpha=pulse;
    ctx.shadowColor='#f0c040';ctx.shadowBlur=20*pulse;
    ctx.fillStyle='rgba(10,5,20,0.85)';ctx.fillRect(cx-100,y-12,200,22);
    ctx.strokeStyle='#f0c040';ctx.lineWidth=1;ctx.strokeRect(cx-100,y-12,200,22);
    Utils.drawPixelText(ctx,'UNDER CONSTRUCTION',cx,y,
      {font:'5px "Press Start 2P"',color:'#f0c040',align:'center'});
    ctx.restore();
  }

  /* ======================== PC STATIONS ======================== */
  function _drawAllPCs(ctx){
    for(let i=0;i<_devs.length;i++){
      const d=_devs[i];
      if(!Camera.isVisible(d))continue;
      _drawPC(ctx,d.x,d.y,d.facing||'down',i);
    }
  }

  function _drawPC(ctx,x,y,facing,devId){
    _desk(ctx,x,y);_monitor(ctx,x,y,devId);
    _keyboard(ctx,x,y);_chair(ctx,x,y,facing);_accessories(ctx,x,y);
  }

  function _desk(ctx,x,y){
    ctx.fillStyle='#5c3d1e';ctx.fillRect(x,y,96,72);
    ctx.fillStyle='#4a3016';
    for(let g=0;g<5;g++)ctx.fillRect(x+4+g*18,y+2,2,68);
    ctx.fillStyle='#7a5232';ctx.fillRect(x,y,96,3);ctx.fillRect(x,y,3,72);
    ctx.fillStyle='#2c180a';ctx.fillRect(x+93,y,3,72);ctx.fillRect(x,y+69,96,3);
    ctx.fillStyle='#3a2010';
    ctx.fillRect(x+4,y+72,8,10);ctx.fillRect(x+84,y+72,8,10);
    ctx.fillStyle='#2a1408';
    ctx.fillRect(x+4,y+79,8,3);ctx.fillRect(x+84,y+79,8,3);
    ctx.strokeStyle='#180a00';ctx.lineWidth=2;ctx.strokeRect(x,y,96,72);
  }

  function _monitor(ctx,x,y,devId){
    const mx=x+20,my=y+4,mw=58,mh=44;
    ctx.fillStyle='#1c1c1c';ctx.fillRect(mx,my,mw,mh);
    ctx.fillStyle='#282828';ctx.fillRect(mx,my,mw,3);ctx.fillRect(mx,my,3,mh);
    ctx.fillStyle='#101010';ctx.fillRect(mx+mw-3,my,3,mh);ctx.fillRect(mx,my+mh-3,mw,3);
    const sx=mx+5,sy=my+5,sw=mw-10,sh=mh-14;
    const sg=ctx.createLinearGradient(sx,sy,sx,sy+sh);
    sg.addColorStop(0,'#000880');sg.addColorStop(0.5,'#000560');sg.addColorStop(1,'#000340');
    ctx.fillStyle=sg;ctx.fillRect(sx,sy,sw,sh);
    ctx.fillStyle='#008080';ctx.fillRect(sx,sy,sw,sh*0.7);
    ctx.fillStyle='#c0c0c0';ctx.fillRect(sx,sy+sh-7,sw,7);
    ctx.fillStyle='#000080';ctx.fillRect(sx,sy+sh-6,18,5);
    ctx.fillStyle='#00aa00';ctx.fillRect(sx+1,sy+sh-5,14,4);
    Utils.drawPixelText(ctx,'Start',sx+2,sy+sh-5,{font:'3px "Press Start 2P"',color:'#fff'});
    ctx.fillStyle='#ffff40';ctx.fillRect(sx+3,sy+3,6,6);
    ctx.fillStyle='#40ffff';ctx.fillRect(sx+3,sy+11,6,6);
    ctx.fillStyle='#ff8040';ctx.fillRect(sx+13,sy+3,6,6);
    ctx.fillStyle='rgba(255,255,255,0.07)';ctx.fillRect(sx,sy,sw,3);ctx.fillRect(sx,sy,3,sh);
    ctx.fillStyle='#00ff44';ctx.fillRect(mx+mw-7,my+mh-6,4,4);
    ctx.fillStyle='#1c1c1c';
    ctx.fillRect(mx+mw/2-4,my+mh,8,6);ctx.fillRect(mx+mw/2-14,my+mh+4,28,4);
    ctx.strokeStyle='#0a0a0a';ctx.lineWidth=1;
    ctx.strokeRect(mx+mw/2-4,my+mh,8,6);ctx.strokeRect(mx+mw/2-14,my+mh+4,28,4);
    ctx.strokeStyle='#080808';ctx.lineWidth=2;ctx.strokeRect(mx,my,mw,mh);
    if(devId!=null){
      Utils.drawPixelText(ctx,devId.toString(),mx+mw-6,my+14,
        {font:'6px "Press Start 2P"',color:'#fff',align:'right',shadow:'#000'});
    }
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
    ctx.fillStyle='#1a1a1a';ctx.fillRect(x+80,y+46,16,22);
    ctx.fillStyle='#c8c0a8';
    Utils.drawPixelRect(ctx,x+81,y+47,14,20,3,'#c8c0a8','#808070',1);
    ctx.strokeStyle='#808070';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x+88,y+47);ctx.lineTo(x+88,y+55);ctx.stroke();
    ctx.fillStyle='#111';ctx.fillRect(x+77,y+43,22,28);
    ctx.fillStyle='#1a1a1a';ctx.fillRect(x+78,y+44,20,26);
  }

  function _chair(ctx,x,y,facing){
    let cx,cy;
    if(facing==='down')      {cx=x+38;cy=y+82;}
    else if(facing==='up')   {cx=x+38;cy=y-32;}
    else if(facing==='right'){cx=x+106;cy=y+26;}
    else                     {cx=x-30; cy=y+26;}
    ctx.fillStyle='#111';
    [[cx-14,cy+22],[cx+9,cy+22],[cx-14,cy+30],[cx+9,cy+30]].forEach(([wx,wy])=>{
      ctx.fillRect(wx,wy,6,4);
    });
    ctx.fillStyle='#2a2a2a';ctx.fillRect(cx-2,cy+8,5,18);ctx.fillRect(cx-11,cy+22,24,4);
    ctx.fillStyle='#10104a';ctx.fillRect(cx-15,cy-4,31,15);
    ctx.fillStyle='#18186a';ctx.fillRect(cx-13,cy-3,27,9);
    ctx.fillStyle='#2020a0';ctx.fillRect(cx-11,cy-2,23,4);
    ctx.fillStyle='#10104a';ctx.fillRect(cx-11,cy-24,23,22);
    ctx.fillStyle='#18186a';ctx.fillRect(cx-9,cy-22,19,18);
    ctx.fillStyle='#2020a0';ctx.fillRect(cx-7,cy-20,15,6);
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
      ctx.fillStyle=c;ctx.fillRect(cx,cy,10,18);
      ctx.fillStyle='#aaa';ctx.fillRect(cx-1,cy,12,2);ctx.fillRect(cx-1,cy+16,12,2);
      ctx.fillStyle='#888';ctx.fillRect(cx+3,cy-2,4,3);ctx.fillRect(cx+4,cy-4,2,3);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(cx+1,cy+3,8,7);
      ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fillRect(cx+1,cy+1,3,15);
      ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=1;ctx.strokeRect(cx,cy,10,18);
    }
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
    ctx.fillStyle='rgba(240,192,64,0.75)';
    ctx.beginPath();ctx.moveTo(DOOR_X+16,DOOR_Y+DOOR_H/2);
    ctx.lineTo(DOOR_X+2,DOOR_Y+DOOR_H/2-14);
    ctx.lineTo(DOOR_X+2,DOOR_Y+DOOR_H/2+14);ctx.closePath();ctx.fill();
    _neon(ctx,DOOR_X-90,DOOR_Y-56,'ENTER');
  }

  function _neon(ctx,x,y,text){
    ctx.save();ctx.shadowColor='#f0c040';ctx.shadowBlur=18;
    ctx.fillStyle='rgba(8,8,18,0.92)';ctx.fillRect(x,y,130,32);
    ctx.strokeStyle='#f0c040';ctx.lineWidth=2;ctx.strokeRect(x,y,130,32);
    Utils.drawPixelText(ctx,text,x+65,y+7,
      {font:'10px "Press Start 2P"',color:'#f0c040',shadow:'#a07000',align:'center'});
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

  /* ======================== EXPORTS ======================== */
  function getWorldSize(){return{w:WORLD_W,h:WORLD_H};}
  function getDevices(){return _devs;}
  function getChairs(){return _chairs;}
  function getSpawnPoint(){return{x:SPAWN_X,y:SPAWN_Y};}
  function getDoorRect(){return{x:DOOR_X,y:DOOR_Y,w:T,h:DOOR_H};}
  return{init,update,draw,getWorldSize,getDevices,getChairs,getSpawnPoint,getDoorRect};
})();
