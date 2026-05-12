'use strict';
const UI = (() => {
  let _sel=0,_onStart=null,_prevCvs=[],_raf=0,_pt=0;

  /* ====== LOADING ====== */
  function showLoading(onDone){
    Utils.show('loading-screen');Utils.hide('character-select-screen');Utils.hide('game-container');
    const bar=Utils.$('loading-bar'),pct=Utils.$('loading-percent'),lbl=Utils.$('loading-label');
    let prog=0;
    const steps=[
      {t:15,d:120,l:'تحميل الأصوات...'},
      {t:35,d:200,l:'بناء الخريطة...'},
      {t:60,d:300,l:'رسم الشخصيات...'},
      {t:80,d:200,l:'إعداد الأجهزة...'},
      {t:95,d:150,l:'تهيئة العالم...'},
      {t:100,d:100,l:'جاهز! 🎮'}
    ];
    let si=0;
    function next(){
      if(si>=steps.length){setTimeout(()=>{Utils.hide('loading-screen');onDone&&onDone();},400);return;}
      const s=steps[si++];if(lbl)lbl.textContent=s.l;
      const inc=(s.t-prog)/10;let ticks=0;
      const iv=setInterval(()=>{
        prog+=inc;ticks++;
        bar.style.width=Math.min(prog,100)+'%';
        pct.textContent=Math.floor(Math.min(prog,100))+'%';
        if(ticks>=10){clearInterval(iv);setTimeout(next,s.d);}
      },30);
    }
    next();
  }

  /* ====== CHARACTER SELECT ====== */
  function showCharacterSelect(onStart){
    _onStart=onStart;
    Utils.show('character-select-screen');Utils.hide('loading-screen');Utils.hide('game-container');
    _buildGrid();_startPreview();
  }

  function _buildGrid(){
    const grid=Utils.$('character-grid');grid.innerHTML='';_prevCvs=[];
    Player.getAllChars().forEach((char,i)=>{
      const card=document.createElement('div');card.className='char-card';card.dataset.id=i;
      const cvs=document.createElement('canvas');cvs.width=56;cvs.height=64;
      cvs.style.width='56px';cvs.style.height='64px';_prevCvs.push(cvs);
      const lbl=document.createElement('div');lbl.className='char-name';lbl.textContent=char.name;
      card.appendChild(cvs);card.appendChild(lbl);grid.appendChild(card);
      card.addEventListener('click',()=>_select(i));
    });
    _select(0);
  }

  function _select(id){
    _sel=id;
    document.querySelectorAll('.char-card').forEach((c,i)=>c.classList.toggle('selected',i===id));
    Utils.show('start-btn');
    Utils.$('start-btn').onclick=()=>_onStart&&_onStart(_sel);
  }

  function _startPreview(){
    if(_raf)cancelAnimationFrame(_raf);
    _pt=0;let last=performance.now();
    function loop(now){
      const delta=(now-last)/1000;last=now;_pt+=delta;
      const frame=Math.floor(_pt*7)%3;
      _prevCvs.forEach((cvs,i)=>{
        const ctx=cvs.getContext('2d');
        ctx.imageSmoothingEnabled=false;
        ctx.fillStyle='#0e0e1e';ctx.fillRect(0,0,cvs.width,cvs.height);
        ctx.fillStyle='rgba(0,0,0,0.28)';
        ctx.beginPath();ctx.ellipse(cvs.width/2,cvs.height-4,13,4,0,0,Math.PI*2);ctx.fill();
        ctx.save();ctx.translate(cvs.width/2-12,cvs.height/2-18);
        Player.getAllChars()[i].draw(ctx,0,0,'down',frame,true);
        ctx.restore();
        if(i===_sel){ctx.strokeStyle='rgba(64,240,128,0.85)';ctx.lineWidth=2;ctx.strokeRect(1,1,cvs.width-2,cvs.height-2);}
      });
      _raf=requestAnimationFrame(loop);
    }
    _raf=requestAnimationFrame(loop);
  }

  function stopPreviewAnimation(){if(_raf){cancelAnimationFrame(_raf);_raf=0;}}

  /* ====== HUD ====== */
  function showHUD(name){
    Utils.show('hud');
    const el=Utils.$('hud-character-name');if(el)el.textContent='⚡ '+name;
  }
  function hideHUD(){Utils.hide('hud');}

  /* ====== TOAST ====== */
  let _toast=null,_toastTimer=null;
  function showToast(msg,dur=2500){
    if(!_toast){
      _toast=document.createElement('div');
      _toast.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'+
        'background:rgba(10,10,20,0.94);border:2px solid #f0c040;padding:12px 22px;'+
        'font-family:"Press Start 2P",monospace;font-size:10px;color:#f0c040;z-index:999;'+
        'text-align:center;pointer-events:none;line-height:1.8;transition:opacity 0.4s;';
      document.body.appendChild(_toast);
    }
    _toast.textContent=msg;_toast.style.display='block';_toast.style.opacity='1';
    if(_toastTimer)clearTimeout(_toastTimer);
    _toastTimer=setTimeout(()=>{
      _toast.style.opacity='0';setTimeout(()=>{_toast.style.display='none';},400);
    },dur);
  }

  function showGame(){Utils.hide('loading-screen');Utils.hide('character-select-screen');Utils.show('game-container');}
  function getSelectedChar(){return _sel;}

  return{showLoading,showCharacterSelect,stopPreviewAnimation,showHUD,hideHUD,showToast,showGame,getSelectedChar};
})();
