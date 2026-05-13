'use strict';
const Joystick = (() => {
  let _base=null,_thumb=null,_zone=null;
  let _active=false,_tid=null;
  let _bx=0,_by=0,_r=0;
  let _dx=0,_dy=0,_mag=0;
  const _keys={up:false,down:false,left:false,right:false};

  // التحقق من هوية اللاعب: هل يستخدم تطبيقنا؟
  const _isAppClient = navigator.userAgent.includes("NostaGamesClient");

  function init(){
    _base=Utils.$('joystick-base');
    _thumb=Utils.$('joystick-thumb');
    _zone=Utils.$('joystick-zone');
    
    // إذا كان من التطبيق، قم بإخفاء المنطقة مبكراً
    if (_isAppClient && _zone) {
        _zone.style.display = 'none';
        return; // توقف هنا ولا تكمل ربط الأحداث لأننا لن نحتاج العصا
    }

    if(!_base||!_thumb||!_zone)return;
    _upd();
    _zone.addEventListener('touchstart',_ts,{passive:false});
    window.addEventListener('touchmove',_tm,{passive:false});
    window.addEventListener('touchend',_te,{passive:false});
    window.addEventListener('touchcancel',_te,{passive:false});
    _zone.addEventListener('mousedown',_md);
    window.addEventListener('mousemove',_mm);
    window.addEventListener('mouseup',_mu);
    window.addEventListener('keydown',_kd);
    window.addEventListener('keyup',_ku);
    window.addEventListener('resize',_upd);
  }

  function _upd(){if(!_base)return;const r=_base.getBoundingClientRect();_bx=r.left+r.width/2;_by=r.top+r.height/2;_r=r.width/2;}
  function _ts(e){e.preventDefault();if(_active)return;const t=e.changedTouches[0];_tid=t.identifier;_active=true;_upd();_proc(t.clientX,t.clientY);}
  function _tm(e){e.preventDefault();if(!_active)return;for(const t of e.changedTouches){if(t.identifier===_tid){_proc(t.clientX,t.clientY);break;}}}
  function _te(e){for(const t of e.changedTouches){if(t.identifier===_tid){_rst();break;}}}
  function _md(e){_active=true;_upd();_proc(e.clientX,e.clientY);}
  function _mm(e){if(_active)_proc(e.clientX,e.clientY);}
  function _mu(){if(_active)_rst();}
  function _kd(e){if(e.code==='ArrowUp'||e.code==='KeyW')_keys.up=true;if(e.code==='ArrowDown'||e.code==='KeyS')_keys.down=true;if(e.code==='ArrowLeft'||e.code==='KeyA')_keys.left=true;if(e.code==='ArrowRight'||e.code==='KeyD')_keys.right=true;}
  function _ku(e){if(e.code==='ArrowUp'||e.code==='KeyW')_keys.up=false;if(e.code==='ArrowDown'||e.code==='KeyS')_keys.down=false;if(e.code==='ArrowLeft'||e.code==='KeyA')_keys.left=false;if(e.code==='ArrowRight'||e.code==='KeyD')_keys.right=false;}

  function _proc(cx,cy){
    const rdx=cx-_bx,rdy=cy-_by,dist=Math.sqrt(rdx*rdx+rdy*rdy);
    const cd=Math.min(dist,_r),ang=Math.atan2(rdy,rdx);
    _thumb.style.transform=`translate(calc(-50% + ${Math.cos(ang)*cd}px), calc(-50% + ${Math.sin(ang)*cd}px))`;
    _mag=Utils.clamp(dist/_r,0,1);_dx=Math.cos(ang)*_mag;_dy=Math.sin(ang)*_mag;
  }

  function _rst(){_active=false;_tid=null;_dx=0;_dy=0;_mag=0;if(_thumb)_thumb.style.transform='translate(-50%,-50%)';}

  function update(){
    // إذا كان من التطبيق، لا تقم بتحديث أوامر العصا الداخلية للعبة
    if(_isAppClient) return; 

    if(!_active){
      let kx=0,ky=0;
      if(_keys.left)kx-=1;if(_keys.right)kx+=1;
      if(_keys.up)ky-=1;if(_keys.down)ky+=1;
      if(kx!==0||ky!==0){const l=Math.sqrt(kx*kx+ky*ky);_dx=kx/l;_dy=ky/l;_mag=1;}
      else{_dx=0;_dy=0;_mag=0;}
    }
  }

  function reset(){
      if(_isAppClient) return; 
      _rst();_keys.up=false;_keys.down=false;_keys.left=false;_keys.right=false;
  }
  
  function show(){
      // إذا كان اللاعب من التطبيق، تجاهل أمر الإظهار تماماً!
      if (_isAppClient) return; 
      if(_zone)Utils.show(_zone);
  }
  
  function hide(){
      if(_zone)Utils.hide(_zone);
  }
  
  function getDx(){return _dx;}
  function getDy(){return _dy;}
  function getMagnitude(){return _mag;}
  function isMoving(){return _mag>0.05;}
  function getDirection(){
    if(!isMoving())return 'idle';
    return Math.abs(_dx)>=Math.abs(_dy)?(_dx>0?'right':'left'):(_dy>0?'down':'up');
  }

  return{init,update,reset,show,hide,getDx,getDy,getMagnitude,isMoving,getDirection};
})();
