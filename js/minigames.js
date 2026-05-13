'use strict';
const MiniGames = (() => {
  let _pcIdx=0;
  const SWITCH=9; // ثوان بين كل لعبة

  /* الألعاب المعروضة على الحواسيب */
  const GAMES=[
    {name:'Fireboy & Watergirl', fn:_fireboy},
    {name:'Hobo Beat \'em Up',   fn:_hobo},
    {name:'Stick Fighter',       fn:_stickfight},
  ];

  // تم التعديل هنا: إضافة devId لمعرفة رقم الجهاز الحالي
  function drawPC(ctx,x,y,w,h,t,devId){
    
    // التعديل الأهم: إذا كان هناك رابط حقيقي لهذا الحاسوب، لا ترسم الألعاب الوهمية!
    if (typeof GamesData !== 'undefined' && devId != null && GamesData[devId]) {
      ctx.fillStyle = '#000'; // جعل الشاشة سوداء فارغة خلف الإطار
      ctx.fillRect(x,y,w,h);
      return; 
    }

    _pcIdx=Math.floor((t%( SWITCH*GAMES.length))/SWITCH)%GAMES.length;
    GAMES[_pcIdx].fn(ctx,x,y,w,h,t);
    
    // اسم اللعبة
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(x,y,w,16);
    Utils.drawPixelText(ctx,GAMES[_pcIdx].name,x+w/2,y+2,
      {font:'6px "Press Start 2P"',color:'#f0c040',shadow:'#000',align:'center'});
      
    // رسم رقم الحاسوب (ID) في الزاوية العلوية اليمنى
    if (devId != null) {
      Utils.drawPixelText(ctx, 'ID:' + devId, x+w-2, y+2,
        {font:'5px "Press Start 2P"',color:'#ffffff',shadow:'#000000',align:'right'});
    }

    // شريط تقدم
    const prog=(t%SWITCH)/SWITCH;
    ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(x,y+h-4,w,4);
    ctx.fillStyle='#40f080';ctx.fillRect(x,y+h-4,w*prog,4);
  }

  /* ======= Fireboy & Watergirl ======= */
  function _fireboy(ctx,x,y,w,h,t){
    // خلفية معبد
    const bg=ctx.createLinearGradient(x,y,x,y+h);
    bg.addColorStop(0,'#1a0800');bg.addColorStop(1,'#3a1200');
    ctx.fillStyle=bg;ctx.fillRect(x,y,w,h);
    // جدران المعبد
    ctx.fillStyle='#2a1608';
    ctx.fillRect(x,y+16,22,h-16);ctx.fillRect(x+w-22,y+16,22,h-16);
    for(let r=0;r<5;r++){
      ctx.fillStyle=r%2===0?'#1e1006':'#261408';
      ctx.fillRect(x+2,y+18+r*16,18,14);ctx.fillRect(x+w-20,y+18+r*16,18,14);
    }
    // أرضية
    ctx.fillStyle='#3a2008';ctx.fillRect(x+22,y+h-16,w-44,16);
    for(let bx=x+24;bx<x+w-24;bx+=18)ctx.fillRect(bx,y+h-16,16,1);
    // منصات
    [[0.12,0.62,0.28],[0.45,0.48,0.28],[0.62,0.34,0.22]].forEach(([rx,ry,rw])=>{
      const px=x+rx*w,py=y+ry*h,pw=rw*w;
      ctx.fillStyle='#4a2c0e';ctx.fillRect(px,py+3,pw,8);
      ctx.fillStyle='#6a4820';ctx.fillRect(px,py,pw,4);
      ctx.fillStyle='#2a6a00';for(let gx=px+2;gx<px+pw-2;gx+=5)ctx.fillRect(gx,py-2,3,3);
    });
    // جواهر
    for(let i=0;i<5;i++){
      const jx=x+38+i*(w/6),jy=y+h*0.5+Math.sin(t*2+i)*4;
      ctx.fillStyle=i%2===0?'#ff5500':'#0088ff';
      ctx.beginPath();ctx.moveTo(jx,jy-5);ctx.lineTo(jx+4,jy);ctx.lineTo(jx,jy+5);ctx.lineTo(jx-4,jy);ctx.closePath();ctx.fill();
    }
    // بوابة نار
    const gfx=x+w-32,gfy=y+h-54;
    for(let fl=0;fl<5;fl++){const fy=gfy+Math.sin(t*4+fl)*3;ctx.fillStyle=`rgba(255,${70+fl*20},0,0.7)`;ctx.fillRect(gfx+fl*5-2,fy,6,32-fl*3);}
    // بوابة ماء
    const gwx=x+18,gwy=y+h-54;
    for(let wl=0;wl<5;wl++){const wy=gwy+Math.cos(t*3+wl)*3;ctx.fillStyle=`rgba(0,${130+wl*20},255,0.7)`;ctx.fillRect(gwx+wl*5-2,wy,6,32-wl*3);}
    // شخصية نار
    const fbj=Math.max(0,Math.sin(t*2.8))*22;
    const fbx=x+32+((Math.sin(t*0.6)+1)/2)*(w*0.28);
    _fbChar(ctx,fbx,y+h-40-fbj,t);
    // شخصية ماء
    const wgj=Math.max(0,Math.sin(t*2.8+1.2))*22;
    const wgx=x+w*0.55+Math.sin(t*0.5+1)*(w*0.22);
    _wgChar(ctx,wgx,y+h-40-wgj,t);
    // HUD
    const sc=Math.floor(t*80)%99999;
    Utils.drawPixelText(ctx,`${sc}`,x+w-6,y+18,{font:'5px "Press Start 2P"',color:'#fff',shadow:'#000',align:'right'});
  }

  function _fbChar(ctx,x,y,t){
    const run=Math.floor(t*8)%2;
    ctx.fillStyle='#c83020';ctx.fillRect(x+4,y+8,10,12);
    ctx.fillStyle='#f0a060';ctx.fillRect(x+3,y+1,12,9);
    ctx.fillStyle='#ff6000';ctx.fillRect(x+3,y,12,3);ctx.fillRect(x+6,y-4,4,5);
    ctx.fillStyle='#fff';ctx.fillRect(x+5,y+4,3,3);ctx.fillRect(x+10,y+4,3,3);
    ctx.fillStyle='#000';ctx.fillRect(x+6,y+5,2,2);ctx.fillRect(x+11,y+5,2,2);
    ctx.fillStyle='#8b3010';ctx.fillRect(x+4,y+19,4,5+run*2);ctx.fillRect(x+10,y+19,4,5-run*2+1);
  }

  function _wgChar(ctx,x,y,t){
    const run=Math.floor(t*8+1)%2;
    ctx.fillStyle='#2080e0';ctx.fillRect(x+3,y+8,12,12);
    ctx.fillStyle='#f0d0b0';ctx.fillRect(x+3,y+1,12,9);
    ctx.fillStyle='#0050b0';ctx.fillRect(x+2,y,14,4);ctx.fillRect(x+2,y+4,3,6);ctx.fillRect(x+13,y+4,3,6);
    ctx.fillStyle='#fff';ctx.fillRect(x+5,y+4,3,3);ctx.fillRect(x+10,y+4,3,3);
    ctx.fillStyle='#4090ff';ctx.fillRect(x+6,y+5,2,2);ctx.fillRect(x+11,y+5,2,2);
    ctx.fillStyle='#1060c0';ctx.fillRect(x+4,y+19,4,5+run*2);ctx.fillRect(x+10,y+19,4,5-run*2+1);
  }

  /* ======= Hobo Beat 'em Up ======= */
  function _hobo(ctx,x,y,w,h,t){
    // خلفية شارع
    ctx.fillStyle='#1e1e1e';ctx.fillRect(x,y+16,w,h-16);
    ctx.fillStyle='#2a2a2a';ctx.fillRect(x,y+h-18,w,18);
    for(let lx=x;lx<x+w;lx+=22)ctx.fillRect(lx,y+h-18,20,1);
    // مباني
    [[0.02,0.28,0.18,'#111122'],[0.22,0.18,0.16,'#1a1108'],[0.40,0.32,0.18,'#0e1a0e'],
     [0.60,0.22,0.18,'#111'],[0.80,0.28,0.18,'#1a1a0a']].forEach(([rx,ry,rw,col])=>{
      ctx.fillStyle=col;ctx.fillRect(x+rx*w,y+ry*h,rw*w,(1-ry)*h-18);
      ctx.fillStyle='rgba(255,200,50,0.35)';
      for(let wr=0;wr<4;wr++)for(let wc=0;wc<2;wc++){
        if(Math.sin(t+rx*10+wr*3+wc)>0)ctx.fillRect(x+rx*w+4+wc*12,y+ry*h+6+wr*14,8,10);
      }
    });
    // Hobo
    const hbx=x+22+((Math.sin(t*0.5)+1)/2)*(w-52);
    const hbr=Math.floor(t*6)%2;
    _hoboChar(ctx,hbx,y+h-38,hbr);
    // شرطي
    const cpx=x+w*0.65+Math.sin(t*1.2)*w*0.18;
    _copChar(ctx,cpx,y+h-38,Math.floor(t*5)%2);
    // حجارة
    for(let i=0;i<3;i++){
      const rx=x+32+i*68+Math.sin(t*3+i*2)*14;
      const ry=y+h-26+Math.sin(t*4+i)*4;
      ctx.fillStyle='#777';ctx.fillRect(rx,ry,6,5);
    }
    Utils.drawPixelText(ctx,'BEAT EM UP!',x+w/2,y+h-10,{font:'5px "Press Start 2P"',color:'#ff4400',shadow:'#000',align:'center'});
  }

  function _hoboChar(ctx,x,y,frame){
    ctx.fillStyle='#6b4226';ctx.fillRect(x+4,y+8,12,12);
    ctx.fillStyle='#d4956a';ctx.fillRect(x+4,y+1,12,9);
    ctx.fillStyle='#3a2a10';ctx.fillRect(x+2,y,16,3);ctx.fillRect(x+5,y-5,10,6);
    ctx.fillStyle='#888';ctx.fillRect(x+5,y+8,10,4);
    ctx.fillStyle='#111';ctx.fillRect(x+4,y+19,4,4+frame*2);ctx.fillRect(x+10,y+19,4,4-frame*2+1);
    ctx.fillStyle='#8b6040';ctx.fillRect(x+17,y+6,2,18);
  }

  function _copChar(ctx,x,y,frame){
    ctx.fillStyle='#1a3a6a';ctx.fillRect(x+4,y+8,12,12);
    ctx.fillStyle='#e0c090';ctx.fillRect(x+4,y+1,12,9);
    ctx.fillStyle='#1a1a6a';ctx.fillRect(x+3,y,14,4);
    ctx.fillStyle='#aaa';ctx.fillRect(x+8,y+1,4,2);
    ctx.fillStyle='#111';ctx.fillRect(x+4,y+19,4,4+frame*2);ctx.fillRect(x+10,y+19,4,4-frame*2+1);
    ctx.fillStyle='#4a2a00';ctx.fillRect(x-2,y+10,2,14);ctx.fillRect(x-4,y+10,6,4);
  }

  /* ======= Stick Fighter ======= */
  function _stickfight(ctx,x,y,w,h,t){
    const bg=ctx.createLinearGradient(x,y+16,x,y+h);
    bg.addColorStop(0,'#00112a');bg.addColorStop(1,'#002a55');
    ctx.fillStyle=bg;ctx.fillRect(x,y+16,w,h-16);
    ctx.fillStyle='#1a3d66';ctx.fillRect(x,y+h-14,w,14);
    ctx.fillStyle='#244d77';ctx.fillRect(x,y+h-16,w,3);
    // منصات
    [[0.08,0.54,0.24],[0.42,0.40,0.24],[0.70,0.56,0.22]].forEach(([rx,ry,rw])=>{
      const px=x+rx*w,py=y+ry*h,pw=rw*w;
      ctx.fillStyle='#1a3866';ctx.fillRect(px,py+2,pw,8);
      ctx.fillStyle='#2a5888';ctx.fillRect(px,py,pw,3);
    });
    // Stickman 1
    const s1x=x+28+Math.sin(t*0.7)*(w*0.28);
    _stick(ctx,s1x,y+h-36,t,'#ffffff',1);
    // Stickman 2
    const s2x=x+w*0.6+Math.sin(t*0.6+1.5)*(w*0.22);
    _stick(ctx,s2x,y+h-36,t+0.5,'#ff4444',-1);
    // تأثير ضربة
    if(Math.sin(t*3)>0.72){
      const ex=(s1x+s2x)/2,ey=y+h-28;
      ctx.strokeStyle='rgba(255,220,0,0.85)';ctx.lineWidth=2;
      for(let sp=0;sp<6;sp++){
        const ang=(sp/6)*Math.PI*2+t*5;
        ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex+Math.cos(ang)*13,ey+Math.sin(ang)*13);ctx.stroke();
      }
    }
  }

  function _stick(ctx,x,y,t,color,dir){
    ctx.strokeStyle=color;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x+9,y+6,5,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+9,y+11);ctx.lineTo(x+9,y+22);ctx.stroke();
    const aa=Math.sin(t*4)*0.8;
    ctx.beginPath();ctx.moveTo(x+9,y+14);ctx.lineTo(x+9+Math.cos(aa)*10*dir,y+14+Math.sin(aa)*8);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+9,y+14);ctx.lineTo(x+9-Math.cos(aa+1)*10*dir,y+14+Math.sin(aa+1)*8);ctx.stroke();
    const la=Math.sin(t*5)*0.6;
    ctx.beginPath();ctx.moveTo(x+9,y+22);ctx.lineTo(x+9+Math.cos(la)*8,y+22+Math.sin(Math.abs(la))*10);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+9,y+22);ctx.lineTo(x+9-Math.cos(la)*8,y+22+Math.sin(Math.abs(la)+0.5)*10);ctx.stroke();
  }

  function stop(){_pcIdx=0;}
  return{drawPC,stop};
})();
