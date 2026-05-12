'use strict';
const Player = (() => {
  const SPEED=160,W=24,H=28,FRAME_TIME=0.14;
  const SCOLS=6,SROWS=6,SFRAMES=36;
  let _x=0,_y=0,_dir='down',_frame=0,_ft=0,_moving=false,_charId=0;
  const _sprites={};

  /* ====== PRELOAD ====== */
  function preload(){_loadChar(0,'assets/sprites/characters/heads/troll.png');}

  function _loadChar(id,headPath){
    const e={down:[],up:[],left:[],right:[],loaded:false,head:null};
    _sprites[id]=e;
    const h=new Image();h.crossOrigin='anonymous';h.src=headPath;
    h.onload=()=>{e.head=h;_loadDirs(id,e);};
    h.onerror=()=>{e.head=null;_loadDirs(id,e);};
  }

  function _loadDirs(id,e){
    const dirs=['down','up','left','right'];let done=0;
    dirs.forEach(d=>{
      const img=new Image();img.crossOrigin='anonymous';
      img.src=`assets/sprites/characters/char_${id}_${d}.png`;
      img.onload=()=>{
        try{e[d]=_process(img,e.head);}catch(err){console.warn('[Sprites]',err);}
        if(++done===4){e.loaded=true;console.log(`[Sprites] char_${id} ✅`);}
      };
      img.onerror=()=>{if(++done===4)e.loaded=false;};
    });
  }

  function _process(sheet,head){
    const fw=Math.floor(sheet.width/SCOLS),fh=Math.floor(sheet.height/SROWS);
    return Array.from({length:SFRAMES},(_,i)=>{
      const col=i%SCOLS,row=Math.floor(i/SCOLS);
      const c=Utils.createCanvas(fw,fh),ctx=c.getContext('2d');
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(sheet,col*fw,row*fh,fw,fh,0,0,fw,fh);
      _chroma(ctx,fw,fh,head);
      return c;
    });
  }

  function _chroma(ctx,w,h,head){
    const d=ctx.getImageData(0,0,w,h),px=d.data;
    let x0=w,y0=h,x1=0,y1=0,found=false;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      if(px[i+3]>100&&px[i]>180&&px[i+1]<80&&px[i+2]>180){
        px[i+3]=0;found=true;
        if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      }
    }
    ctx.putImageData(d,0,0);
    if(found&&head&&head.complete&&head.naturalWidth>0)
      ctx.drawImage(head,x0,y0,x1-x0+1,y1-y0+1);
  }

  function _drawSprite(ctx,id,x,y,dir,frame,moving){
    const sp=_sprites[id];
    if(!sp?.loaded||!sp[dir]?.length){
      ctx.fillStyle='rgba(120,120,120,0.5)';ctx.fillRect(x,y,W,H);
      Utils.drawPixelText(ctx,'...',x+W/2,y+H/2-4,{font:'5px "Press Start 2P"',color:'#fff',align:'center'});
      return;
    }
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(sp[dir][moving?frame%sp[dir].length:0],x,y,W,H);
    ctx.fillStyle='rgba(0,0,0,0.2)';
    ctx.beginPath();ctx.ellipse(x+W/2,y+H+2,W/3,3,0,0,Math.PI*2);ctx.fill();
  }

  /* ====== INIT ====== */
  function init(charId){
    _charId=charId;
    const s=GameMap.getSpawnPoint();
    _x=s.x;_y=s.y;_dir='down';_frame=0;
    Camera.snapTo(_x+W/2,_y+H/2);
  }

  /* ====== UPDATE ====== */
  function update(delta){
    const dx=Joystick.getDx(),dy=Joystick.getDy(),mag=Joystick.getMagnitude();
    _moving=mag>0.05;
    if(_moving){
      _dir=Joystick.getDirection();
      const spd=SPEED*delta;
      const r={x:_x,y:_y,w:W,h:H};
      const res=Collision.resolveMovement(r,dx*spd,dy*spd);
      const cl=Collision.clampToWorld({x:res.x,y:res.y,w:W,h:H},GameMap.getWorldSize());
      _x=cl.x;_y=cl.y;
      const ft=_charId===0?0.055:FRAME_TIME;
      const mf=_charId===0?SFRAMES:3;
      _ft+=delta;if(_ft>=ft){_ft-=ft;_frame=(_frame+1)%mf;}
    } else {_frame=0;_ft=0;}
    Camera.update(_x+W/2,_y+H/2,delta);
    if(typeof Chat!=='undefined')Chat.update(delta,_x+W/2,_y+H/2);
  }

  /* ====== DRAW ====== */
  function draw(ctx){
    if(_charId===0){_drawSprite(ctx,0,_x,_y,_dir,_frame,_moving);}
    else{const c=CHARS[_charId-1];if(c)c.draw(ctx,_x,_y,_dir,_frame,_moving);}
    if(typeof Chat!=='undefined')Chat.draw(ctx,_x+W/2,_y-5,Network.getMyId());
  }

  /* ====== CHARACTERS 1-10 ====== */
  const CHARS=[
    { name:'فتى النار',
      draw(ctx,x,y,dir,frame,moving){
        ctx.fillStyle='#c83020';ctx.fillRect(x+6,y+12,12,14);
        _legs(ctx,x,y,frame,moving,'#8B1010','#c83020');
        _arms(ctx,x,y,dir,frame,moving,'#c83020');
        ctx.fillStyle='#f0a060';ctx.fillRect(x+5,y+2,14,13);
        ctx.fillStyle='#ff6000';ctx.fillRect(x+5,y,14,4);
        ctx.fillStyle='#ff8800';ctx.fillRect(x+7,y-3,4,4);ctx.fillRect(x+13,y-2,3,3);
        if(moving&&frame%2===0){ctx.fillStyle='rgba(255,140,0,0.85)';ctx.fillRect(x+9,y-5,6,3);}
        _eyes(ctx,x,y,dir,'#1a1a1a');
      }
    },
    { name:'فتاة الماء',
      draw(ctx,x,y,dir,frame,moving){
        ctx.fillStyle='#2080e0';ctx.fillRect(x+5,y+12,14,16);
        ctx.fillStyle='#4090f0';ctx.fillRect(x+7,y+14,10,8);
        _legs(ctx,x,y,frame,moving,'#1060c0','#2080e0');
        _arms(ctx,x,y,dir,frame,moving,'#2080e0');
        ctx.fillStyle='#f0d0b0';ctx.fillRect(x+5,y+2,14,13);
        ctx.fillStyle='#0050b0';ctx.fillRect(x+4,y,16,5);
        ctx.fillRect(x+4,y+5,3,8);ctx.fillRect(x+17,y+5,3,8);
        if(moving&&frame===1){ctx.fillStyle='rgba(100,180,255,0.5)';ctx.fillRect(x+2,y+20,4,4);ctx.fillRect(x+18,y+20,4,4);}
        _eyes(ctx,x,y,dir,'#4090ff');
      }
    },
    { name:'Hobo',
      draw(ctx,x,y,dir,frame,moving){
        ctx.fillStyle='#6b4226';ctx.fillRect(x+5,y+12,14,15);
        ctx.fillStyle='#8b5a30';ctx.fillRect(x+8,y+14,5,5);
        _legs(ctx,x,y,frame,moving,'#4a2e18','#6b4226');
        _arms(ctx,x,y,dir,frame,moving,'#6b4226');
        ctx.fillStyle='#d4956a';ctx.fillRect(x+5,y+2,14,13);
        ctx.fillStyle='#3a2a10';ctx.fillRect(x+3,y+1,18,3);ctx.fillRect(x+6,y-5,12,7);
        ctx.fillStyle='#888';ctx.fillRect(x+6,y+10,12,4);
        _eyes(ctx,x,y,dir,'#8B4513');
        if(dir==='right'||dir==='down'){ctx.fillStyle='#8b6040';ctx.fillRect(x+20,y+8,2,20);}
      }
    },
    { name:'Stickman',
      draw(ctx,x,y,dir,frame,moving){
        ctx.strokeStyle='#fff';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(x+12,y+7,6,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+12,y+13);ctx.lineTo(x+12,y+24);ctx.stroke();
        const as=moving?(frame===1?4:-4):0;
        ctx.beginPath();ctx.moveTo(x+12,y+16);ctx.lineTo(x+4,y+20+as);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+12,y+16);ctx.lineTo(x+20,y+20-as);ctx.stroke();
        const ls=moving?(frame===1?4:-2):0;
        ctx.beginPath();ctx.moveTo(x+12,y+24);ctx.lineTo(x+6,y+32+ls);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+12,y+24);ctx.lineTo(x+18,y+32-ls);ctx.stroke();
        ctx.fillStyle='#fff';ctx.fillRect(x+9,y+5,2,2);ctx.fillRect(x+13,y+5,2,2);
      }
    },
    { name:'النينجا',
      draw(ctx,x,y,dir,frame,moving){
        ctx.fillStyle='#1a6b1a';ctx.fillRect(x+5,y+12,14,15);
        _legs(ctx,x,y,frame,moving,'#0f4f0f','#1a6b1a');
        _arms(ctx,x,y,dir,frame,moving,'#1a6b1a');
        ctx.fillStyle='#1a1a1a';ctx.fillRect(x+5,y+2,14,13);
        ctx.fillStyle='#1a6b1a';ctx.fillRect(x+5,y+2,14,4);
        ctx.fillStyle='#fff';ctx.fillRect(x+7,y+6,4,3);ctx.fillRect(x+13,y+6,4,3);
        ctx.fillStyle='#f00';ctx.fillRect(x+8,y+7,2,2);ctx.fillRect(x+14,y+7,2,2);
        ctx.fillStyle='#cc2200';ctx.fillRect(x+4,y+4,16,2);
        if(dir==='right'){ctx.fillStyle='#c0c0c0';ctx.fillRect(x+19,y+10,10,2);ctx.fillStyle='#8b4513';ctx.fillRect(x+18,y+9,4,4);}
      }
    },
    { name:'الزومبي',
      draw(ctx,x,y,dir,frame,moving){
        ctx.fillStyle='#5a7a3a';ctx.fillRect(x+5,y+12,14,15);
        _legs(ctx,x,y,frame,moving,'#3a5a2a','#5a7a3a');
        if(dir==='down'||dir==='right'){ctx.fillStyle='#5a7a3a';ctx.fillRect(x-4,y+14,8,4);ctx.fillRect(x+20,y+14,8,4);}
        else _arms(ctx,x,y,dir,frame,moving,'#5a7a3a');
        ctx.fillStyle='#6a8a4a';ctx.fillRect(x+5,y+2,14,13);
        ctx.fillStyle='#2a1a0a';ctx.fillRect(x+4,y,4,5);ctx.fillRect(x+10,y-2,3,4);ctx.fillRect(x+16,y,4,5);
        ctx.fillStyle='#cc0000';ctx.fillRect(x+7,y+6,3,3);ctx.fillRect(x+14,y+6,3,3);
        ctx.fillStyle='#8b0000';ctx.fillRect(x+9,y+10,6,2);
      }
    },
    { name:'الفارس',
      draw(ctx,x,y,dir,frame,moving){
        ctx.fillStyle='#a0a0b0';ctx.fillRect(x+4,y+11,16,16);
        ctx.fillStyle='#c0c0d0';ctx.fillRect(x+6,y+13,12,10);
        _legs(ctx,x,y,frame,moving,'#606070','#a0a0b0');
        _arms(ctx,x,y,dir,frame,moving,'#a0a0b0');
        ctx.fillStyle='#909098';ctx.fillRect(x+4,y+1,16,14);
        ctx.fillStyle='#707078';ctx.fillRect(x+4,y+1,16,4);ctx.fillRect(x+4,y+9,16,2);
        ctx.fillStyle='#505058';ctx.fillRect(x+7,y+5,10,6);
        ctx.fillStyle='#ffff00';ctx.fillRect(x+8,y+6,3,3);ctx.fillRect(x+13,y+6,3,3);
        if(dir==='right'||dir==='down'){ctx.fillStyle='#d0d0d0';ctx.fillRect(x+20,y+8,3,18);ctx.fillStyle='#c8a000';ctx.fillRect(x+18,y+12,7,3);}
      }
    },
    { name:'الروبوت',
      draw(ctx,x,y,dir,frame,moving){
        ctx.fillStyle='#4a6080';ctx.fillRect(x+4,y+12,16,15);
        ctx.fillStyle='#5a7090';ctx.fillRect(x+6,y+14,12,9);
        ctx.fillStyle='#40c0f0';ctx.fillRect(x+8,y+15,4,4);
        ctx.fillStyle='#f04060';ctx.fillRect(x+13,y+15,3,3);
        _legs(ctx,x,y,frame,moving,'#3a5070','#4a6080');
        _arms(ctx,x,y,dir,frame,moving,'#4a6080');
        ctx.fillStyle='#3a5070';ctx.fillRect(x+4,y+1,16,13);
        ctx.fillStyle='#4a6080';ctx.fillRect(x+6,y+3,12,9);
        ctx.fillStyle=moving?'#00ff00':'#ff4400';
        ctx.fillRect(x+7,y+5,4,4);ctx.fillRect(x+13,y+5,4,4);
        ctx.fillStyle='#40c0f0';for(let i=0;i<4;i++)ctx.fillRect(x+7+i*3,y+10,2,2);
        ctx.fillStyle='#a0b0c0';ctx.fillRect(x+11,y-4,2,6);
        ctx.fillStyle='#f00';ctx.fillRect(x+10,y-5,4,2);
      }
    },
    { name:'الساحرة',
      draw(ctx,x,y,dir,frame,moving){
        ctx.fillStyle='#4a1a6a';ctx.fillRect(x+4,y+12,16,16);
        ctx.fillStyle='#6a2a8a';ctx.fillRect(x+6,y+14,12,10);
        ctx.fillStyle='#f0d020';ctx.fillRect(x+7,y+15,2,2);ctx.fillRect(x+14,y+18,2,2);
        _legs(ctx,x,y,frame,moving,'#3a0a5a','#4a1a6a');
        _arms(ctx,x,y,dir,frame,moving,'#4a1a6a');
        ctx.fillStyle='#f0d0b0';ctx.fillRect(x+5,y+3,14,12);
        ctx.fillStyle='#2a0a4a';ctx.fillRect(x+2,y+2,20,3);ctx.fillRect(x+7,y-7,10,10);
        ctx.fillStyle='#8a00aa';ctx.fillRect(x+2,y+2,20,1);
        ctx.fillStyle='#c060f0';ctx.fillRect(x+4,y+5,3,10);ctx.fillRect(x+17,y+5,3,10);
        _eyes(ctx,x,y,dir,'#c060f0');
        if(moving){ctx.fillStyle='rgba(240,208,32,0.4)';ctx.beginPath();ctx.arc(x+21,y+10,7,0,Math.PI*2);ctx.fill();}
      }
    },
    { name:'اللص',
      draw(ctx,x,y,dir,frame,moving){
        ctx.fillStyle='#1a1a1a';ctx.fillRect(x+5,y+12,14,15);
        ctx.fillStyle='#2a2a2a';ctx.fillRect(x+7,y+14,10,9);
        _legs(ctx,x,y,frame,moving,'#111','#1a1a1a');
        _arms(ctx,x,y,dir,frame,moving,'#1a1a1a');
        ctx.fillStyle='#e0b090';ctx.fillRect(x+5,y+3,14,12);
        ctx.fillStyle='#0a0a0a';ctx.fillRect(x+3,y+3,18,3);ctx.fillRect(x+6,y-4,12,8);
        ctx.fillStyle='#000';ctx.fillRect(x+6,y+6,12,4);
        ctx.fillStyle='#fff';ctx.fillRect(x+7,y+7,3,2);ctx.fillRect(x+13,y+7,3,2);
        if(dir==='left'||dir==='down'){ctx.fillStyle='#8b6040';ctx.fillRect(x-8,y+14,10,10);ctx.strokeStyle='#6b4020';ctx.lineWidth=1;ctx.strokeRect(x-8,y+14,10,10);}
      }
    }
  ];

  function _legs(ctx,x,y,frame,moving,c1,c2){
    const sw=moving?(frame===1?3:frame===2?-3:0):0;
    ctx.fillStyle=c1;ctx.fillRect(x+6,y+26,5,8+sw);
    ctx.fillStyle=c2;ctx.fillRect(x+13,y+26,5,8-sw);
    ctx.fillStyle='#1a1a1a';
    ctx.fillRect(x+5,y+32+sw,7,4);ctx.fillRect(x+12,y+32-sw,7,4);
  }
  function _arms(ctx,x,y,dir,frame,moving,color){
    const sw=moving?(frame===1?-3:frame===2?3:0):0;
    ctx.fillStyle=color;ctx.fillRect(x+1,y+13,5,10+sw);ctx.fillRect(x+18,y+13,5,10-sw);
  }
  function _eyes(ctx,x,y,dir,color='#1a1a1a'){
    ctx.fillStyle='#fff';ctx.fillRect(x+7,y+6,4,4);ctx.fillRect(x+13,y+6,4,4);
    ctx.fillStyle=color;
    const ox=dir==='right'?2:dir==='left'?0:1,oy=dir==='down'?2:dir==='up'?0:1;
    ctx.fillRect(x+7+ox,y+6+oy,2,2);ctx.fillRect(x+13+ox,y+6+oy,2,2);
  }

  function getAllChars(){
    return [{name:'Troll Man',draw(ctx,x,y,dir,frame,moving){_drawSprite(ctx,0,x,y,dir,frame,moving);}},...CHARS];
  }

  function getRect(){return{x:_x,y:_y,w:W,h:H};}
  function getCenterX(){return _x+W/2;}
  function getCenterY(){return _y+H/2;}
  function getCharId(){return _charId;}
  function getCharName(){return getAllChars()[_charId]?.name||'';}

  return{preload,init,update,draw,getRect,getCenterX,getCenterY,getCharId,getCharName,getAllChars};
})();
