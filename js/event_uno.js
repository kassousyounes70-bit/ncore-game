'use strict';
const EventUno = (() => {

  // ═══════════════════════════════
  //  CONSTANTS
  // ═══════════════════════════════
  const TILE         = 64;
  const GRID_COLS    = 32;
  const GRID_ROWS    = 14;
  const ROUND_TIME   = 30;
  const PUSH_CHARGE  = 2.85;
  const DODGE_CHANCE = 0.85;

  const SAFE_COLS  = 4;
  const GRID_START = SAFE_COLS;
  const GRID_END   = GRID_COLS - SAFE_COLS;
  const WORLD_W    = GRID_COLS * TILE;
  const WORLD_H    = GRID_ROWS * TILE;

  const COLORS  = ['red','blue','green','yellow'];
  const NUMBERS = [0,1,2,3,4,5,6,7,8,9];
  const ACTIONS = ['skip','reverse','plus2','wild'];

  const COLOR_HEX = {
    red:'#cc1111', blue:'#1144cc',
    green:'#118811', yellow:'#ccaa00'
  };

  // ═══════════════════════════════
  //  STATE
  // ═══════════════════════════════
  let _active      = false;
  let _players     = [];
  let _myId        = '';
  let _roundNum    = 0;
  let _phase       = 'idle';
  let _roundTimer  = 0;
  let _countdownT  = 3;
  let _targetCard  = null;
  let _actionCard  = null;
  let _cards       = [];
  let _capsules    = [];
  let _fragiles    = [];
  let _blockers    = [];
  let _laserOn     = true;
  let _lightsOn    = true;
  let _reversed    = false;
  let _skipApplied = false;

  // متغيرات بطاقة الأكشن الجديدة
  let _pendingAction = null;
  let _actionTimer   = 0;
  let _actionShown   = false;
  let _actionDisplayT= 0;

  let _camX = 0, _camY = 0;
  let _sweepT = 0, _sweepDir = 1;
  let _freeCam = { x:0, y:0, active:false };

  // اللاعب الحالي — مع إضافة متغيرات الانزلاق
  const _me = {
    x: SAFE_COLS*TILE/2, y: WORLD_H/2,
    frame:0, ft:0, moving:false,
    pushCharge:0, dodgeCharge:0,
    heldCard:null, heldCard2:null,
    invincible:0, falling:false, fallT:0,
    jdx:0, jdy:0,
    alive:true, hearts:3, spectating:false,
    _lostThisRound: false,
    _frozen: false,
    // انزلاق
    slideX:0, slideY:0, slideT:0,
    slideFromX:0, slideFromY:0, slideTargetX:0, slideTargetY:0,
  };

  // ═══════════════════════════════
  //  ENTER
  // ═══════════════════════════════
  function enter(players) {
    _active = true; _roundNum = 0; _phase = 'idle';
    _myId = Network.getMyId(); _reversed = false;
    _freeCam.active = false;

    // إعادة تعيين _me
    _me.alive = true; _me.hearts = 3; _me.spectating = false;
    _me.falling = false; _me.fallT = 0;
    _me.pushCharge = 0; _me.dodgeCharge = 0;
    _me.heldCard = null; _me.heldCard2 = null;
    _me.invincible = 0;
    _me._lostThisRound = false;
    _me._frozen = false;
    _me.slideT = 0;

    // ✅ فلترة اللاعب الحالي من القائمة — يُدار عبر _me فقط
    _players = players.filter(p => p.id !== _myId).map((p,i)=>({
      id: p.id, name: p.name||'لاعب',
      x: SAFE_COLS*TILE/2, y: (1+i%(GRID_ROWS-2))*TILE,
      hearts: 3, card: null, card2: null,
      alive: true, spectating: false, charId: p.charId||0,
      frame: 0, ft: 0, moving: false,
      isBot: p.isBot||false, botLevel: p.botLevel||'medium',
      falling: false, fallT: 0, invincible: 0,
      _pauseT: 0,
      _lostThisRound: false,
      _frozen: false,
      // انزلاق
      slideX:0, slideY:0, slideT:0,
      slideFromX:0, slideFromY:0, slideTargetX:0, slideTargetY:0,
    }));

    _buildUI();
    _hideWorldUI();
    setTimeout(_startRound, 500);
  }

  // ═══════════════════════════════
  //  WORLD UI
  // ═══════════════════════════════
  function _hideWorldUI() {
    ['report-btn','interact-btn'].forEach(id=>{
      const el=Utils.$(id);
      if(el){el.classList.add('hidden');el.style.display='none';}
    });
  }

  function _showWorldUI() {
    ['report-btn','interact-btn'].forEach(id=>{
      const el=Utils.$(id);
      if(el){el.classList.remove('hidden');el.style.display='block';}
    });
  }

  // ═══════════════════════════════
  //  ROUND SETUP
  // ═══════════════════════════════
  function _startRound() {
    if(!_active) return;
    _roundNum++;
    _phase = 'camSweep'; _sweepT = 0; _sweepDir = 1;
    _roundTimer = ROUND_TIME;
    _laserOn = true; _lightsOn = true; _skipApplied = false;
    _me.heldCard = null; _me.heldCard2 = null;
    _me._lostThisRound = false;
    _me._frozen = false;
    _me.slideT = 0;

    _actionCard = null;
    _actionShown = false;
    _actionDisplayT = 0;
    _pendingAction = (_roundNum>1 && Math.random()<0.55)
      ? ACTIONS[Math.floor(Math.random()*ACTIONS.length)] : null;
    _actionTimer = _pendingAction ? Utils.randFloat(5, 20) : 0;

    _players.forEach(p => {
      p._lostThisRound = false;
      p._frozen = false;
      p.slideT = 0;
    });

    _targetCard = {
      color : COLORS[Math.floor(Math.random()*COLORS.length)],
      number: NUMBERS[Math.floor(Math.random()*NUMBERS.length)],
    };

    // ========== صوت البطاقة المستهدفة (يُبث للجميع) ==========
    setTimeout(() => {
      if(_active && _targetCard && Network.sendEventSound) {
        Network.sendEventSound(_targetCard.color);
        setTimeout(() => {
          const numNames = ['zero','one','two','three','four','five','six','seven','eight','nine'];
          Network.sendEventSound(numNames[_targetCard.number] || 'zero');
        }, 900);
      }
    }, 800);

    _buildCards();
    _buildCapsules();
    _buildFragiles();
    _buildBlockers();
    _resetPositions();
  }

  // ═══════════════════════════════
  //  BUILD CARDS
  // ═══════════════════════════════
  function _buildCards() {
    _cards = [];
    const alive = _getAlivePlayers().length;
    const deadZone  = SAFE_COLS * TILE + TILE * 4;
    const zoneStartX = deadZone;
    const zoneEndX   = GRID_END * TILE - TILE;

    const correctCount = Math.max(1, alive - Math.ceil(alive * 0.1));

    for(let i=0;i<correctCount;i++){
      _cards.push({
        color:_targetCard.color, number:_targetCard.number,
        x:Utils.randInt(zoneStartX,zoneEndX),
        y:Utils.randInt(TILE,WORLD_H-TILE),
        taken:false, real:true, isSecond:false,
      });
    }

    const fakeCount = Math.floor(alive * 1.5);
    for(let i=0;i<fakeCount;i++){
      let rc=COLORS[Math.floor(Math.random()*COLORS.length)];
      let rn=NUMBERS[Math.floor(Math.random()*NUMBERS.length)];
      if(rc===_targetCard.color && rn===_targetCard.number) rc=_fakeSimilarColor(rc);
      _cards.push({
        color:rc, number:rn,
        x:Utils.randInt(zoneStartX,zoneEndX),
        y:Utils.randInt(TILE,WORLD_H-TILE),
        taken:false, real:false, isSecond:false,
      });
    }

    if(_pendingAction === 'plus2'){
      for(let i=0;i<correctCount;i++){
        _cards.push({
          color:COLORS[Math.floor(Math.random()*COLORS.length)],
          number:NUMBERS[Math.floor(Math.random()*NUMBERS.length)],
          x:Utils.randInt(zoneStartX,zoneEndX),
          y:Utils.randInt(TILE,WORLD_H-TILE),
          taken:false, real:true, isSecond:true,
        });
      }
    }
  }

  function _fakeSimilarColor(c){
    const m={red:'blue',blue:'green',green:'yellow',yellow:'red'};
    return m[c];
  }

  // ═══════════════════════════════
  //  BUILD CAPSULES
  // ═══════════════════════════════
  function _buildCapsules() {
    _capsules = [];
    const cx = _reversed ? GRID_END*TILE : 0;
    let startY = TILE;

    COLORS.forEach((color,i)=>{
      _capsules.push({
        type:'color', value:color,
        x: cx + TILE*0.5, y: startY + (i*TILE*3),
        w: TILE*1.5, h: TILE*2.2,
        occupantsCount:0,
        pulseT: Math.random()*Math.PI*2,
      });
    });

    let nums=[_targetCard.number];
    while(nums.length<4){
      let n=NUMBERS[Math.floor(Math.random()*10)];
      if(!nums.includes(n)) nums.push(n);
    }
    nums.sort(()=>Math.random()-0.5).forEach((num,i)=>{
      _capsules.push({
        type:'number', value:num,
        x: cx + TILE*2.5, y: startY + (i*TILE*3),
        w: TILE*1.5, h: TILE*2.2,
        occupantsCount:0,
        pulseT: Math.random()*Math.PI*2,
      });
    });
  }

  // ═══════════════════════════════
  //  BUILD FRAGILES & BLOCKERS
  // ═══════════════════════════════
  function _buildFragiles() {
    _fragiles=[];
    const count=Utils.randInt(15,30);
    for(let i=0;i<count;i++){
      _fragiles.push({
        x:Utils.randInt(GRID_START,GRID_END-1)*TILE,
        y:Utils.randInt(1,GRID_ROWS-2)*TILE,
        w:TILE, h:TILE, state:'normal', crackT:0,
      });
    }
  }

  function _buildBlockers() {
    _blockers=[];
    const count=Utils.randInt(8,14);
    for(let i=0;i<count;i++){
      _blockers.push({
        x:Utils.randInt(GRID_START,GRID_END-1)*TILE,
        y:Utils.randInt(0,GRID_ROWS-1)*TILE,
        w:TILE, h:TILE/3,
        visible:Math.random()<0.5,
        timer:Utils.randFloat(1.2,3.0),
        period:Utils.randFloat(1.2,3.0),
      });
    }
  }

  // ═══════════════════════════════
  //  RESET POSITIONS
  // ═══════════════════════════════
  function _resetPositions() {
    const sx = _reversed ? WORLD_W-SAFE_COLS*TILE/2 : SAFE_COLS*TILE/2;
    _me.x=sx; _me.y=WORLD_H/2;
    _me.heldCard=null; _me.heldCard2=null;
    _me.falling=false; _me.fallT=0;
    _me.slideT=0;

    if(_me.hearts>0){
      _me.alive=true;
      _me.spectating=false;
      _freeCam.active=false;
    } else {
      _me.alive=false;
      _me.spectating=true;
      _freeCam.active=true;
    }

    _players.forEach((p,i)=>{
      if(p.hearts<=0){
        p.alive=false; p.spectating=true; return;
      }
      p.x=sx; p.y=(1+i%(GRID_ROWS-2))*TILE;
      p.card=null; p.card2=null;
      p.falling=false; p.fallT=0;
      p.alive=true; p.spectating=false;
      p._lostThisRound=false;
      p.slideT=0;
    });
  }

  // ═══════════════════════════════
  //  UPDATE
  // ═══════════════════════════════
  function update(delta) {
    if(!_active) return;
    switch(_phase){
      case 'camSweep' : _updateSweep(delta);    break;
      case 'countdown': _updateCountdown(delta); break;
      case 'running'  : _updateRunning(delta);   break;
    }

    if((_phase==='running'||_phase==='result') && !_freeCam.active){
      _camX=Utils.clamp(_me.x-window.innerWidth/2,  0,Math.max(0,WORLD_W-window.innerWidth));
      _camY=Utils.clamp(_me.y-window.innerHeight/2, 0,Math.max(0,WORLD_H-window.innerHeight));
    }
  }

  function _updateSweep(delta) {
    _sweepT+=delta;
    const dur=2.5, prog=Math.min(_sweepT/dur,1);
    if(_sweepDir===1) _camX=Utils.lerp(0,WORLD_W-window.innerWidth,prog);
    if(_sweepT>=dur && _sweepDir===1){ _sweepDir=-1; _sweepT=0; }
    else if(_sweepDir===-1){
      _camX=Utils.lerp(WORLD_W-window.innerWidth,0,prog);
      if(_sweepT>=dur){ _camX=0; _phase='countdown'; _countdownT=3; }
    }
    _camY=Utils.clamp(WORLD_H/2-window.innerHeight/2,0,Math.max(0,WORLD_H-window.innerHeight));
  }

  function _updateCountdown(delta) {
    const prevCeil = Math.ceil(_countdownT);
    _countdownT -= delta;
    const newCeil = Math.ceil(_countdownT);
    
    // تشغيل صوت العد التنازلي عند تغير الثانية (3,2,1)
    if(prevCeil !== newCeil && newCeil >= 1 && newCeil <= 3) {
      if(Network.sendEventSound) Network.sendEventSound(`cont_${newCeil}`);
    }
    
    if(_countdownT <= 0){
      _phase='running'; _laserOn=false;
      if(Network.sendEventSound) Network.sendEventSound('GO');
    }
  }

  function _applyActionCard(action) {
    // بث صوت الأكشن للجميع
    if(Network.sendEventSound) Network.sendEventSound(action);
    
    switch(action){
      case 'skip':
        _roundTimer = Math.max(0, _roundTimer - 5);
        UI.showToast('⏭ SKIP! الوقت -5 ثوانٍ!', 2500);
        break;
      case 'reverse':
        _me._frozen = true;
        _players.forEach(p=>{ p._frozen=true; });
        setTimeout(()=>{
          _reversed = !_reversed;
          const mirrorX = (x) => WORLD_W - x;
          _me.x = mirrorX(_me.x);
          _players.forEach(p=>{ p.x = mirrorX(p.x); });
          _cards.forEach(c=>{ c.x = mirrorX(c.x); });
          _capsules.forEach(c=>{ c.x = mirrorX(c.x); });
          _me._frozen = false;
          _players.forEach(p=>{ p._frozen=false; });
          UI.showToast('🔄 REVERSE! الخريطة انقلبت!', 2500);
        }, 600);
        break;
      case 'plus2':
        UI.showToast('+2 🃏 التقط بطاقتين!', 2500);
        break;
      case 'wild':
        _lightsOn = false;
        UI.showToast('🌑 WILD! انطفأت الأنوار!', 2500);
        break;
    }
  }

  // دالة تحديث الانزلاق (للبوتات واللاعبين)
  function _updateSlides(delta) {
    const SLIDE_SPEED = 8; // سرعة الانزلاق
    // تحديث انزلاق اللاعبين الآخرين
    for(const p of _players) {
      if(p.slideT && p.slideT > 0) {
        p.slideT = Math.max(0, p.slideT - delta * SLIDE_SPEED);
        const t = p.slideT;
        p.x = Utils.lerp(p.slideTargetX, p.slideFromX, t);
        p.y = Utils.lerp(p.slideTargetY, p.slideFromY, t);
        p.moving = true;
        p.ft += delta;
        if(p.ft >= 0.08){ p.ft=0; p.frame=(p.frame+1)%3; }
      }
    }
    // تحديث انزلاق _me (إذا احتجنا له لاحقاً، لكن ليس مستخدماً حالياً)
    if(_me.slideT > 0) {
      _me.slideT = Math.max(0, _me.slideT - delta * SLIDE_SPEED);
      const t = _me.slideT;
      _me.x = Utils.lerp(_me.slideTargetX, _me.slideFromX, t);
      _me.y = Utils.lerp(_me.slideTargetY, _me.slideFromY, t);
    }
  }

  function _updateRunning(delta) {
    _roundTimer-=delta;

    if(_pendingAction && !_actionShown){
      _actionTimer -= delta;
      if(_actionTimer <= 0){
        _actionShown = true;
        _actionCard  = _pendingAction;
        _actionDisplayT = 3.0;
        _applyActionCard(_actionCard);
      }
    }
    if(_actionDisplayT > 0) _actionDisplayT -= delta;

    if(_actionCard==='skip' && !_skipApplied && _roundTimer<=15){
      _skipApplied=true;
      _roundTimer=Math.max(0,_roundTimer-5);
      UI.showToast('⏭ SKIP! -5 ثوانٍ!',1500);
    }
    if(_actionCard==='wild') _lightsOn=false;

    for(const b of _blockers){
      b.timer-=delta;
      if(b.timer<=0){b.visible=!b.visible;b.timer=b.period;}
    }

    for(const f of _fragiles){
      if(f.state==='cracked'){
        f.crackT-=delta;
        if(f.crackT<=0){f.state='fallen';_onTileFallen(f);}
      }
    }

    const dt=delta;
    for(const cap of _capsules) cap.pulseT=(cap.pulseT||0)+dt*3;

    if(_freeCam.active){
      const jx=Joystick.getDx(), jy=Joystick.getDy();
      _freeCam.x=Utils.clamp(_freeCam.x+jx*500*delta,0,Math.max(0,WORLD_W-window.innerWidth));
      _freeCam.y=Utils.clamp(_freeCam.y+jy*500*delta,0,Math.max(0,WORLD_H-window.innerHeight));
      _camX=_freeCam.x; _camY=_freeCam.y;
    } else if(_me.alive&&!_me.spectating&&!_me.falling){
      _updateMeMovement(delta);
      _me.pushCharge =Math.min(1,_me.pushCharge+delta/PUSH_CHARGE);
      _me.dodgeCharge=Math.min(1,_me.dodgeCharge+delta/2.5);
      if(_me.invincible>0) _me.invincible-=delta;
      _checkPickup();
      _checkFragileMe();
    }

    if(_me.falling&&_me.alive){
      _me.fallT+=delta;
      if(_me.fallT>1.0){
        _me.falling=false; _me.fallT=0;
        _me.spectating=true;
        _freeCam.active=true;
        _freeCam.x=_camX; _freeCam.y=_camY;
        _loseHeart(_myId);
      }
    }

    _updateSlides(delta);   // تحديث الانزلاق قبل حركة البوتات
    _updateBots(delta);
    if(_roundTimer<=0) _endRound();
  }

  function _updateMeMovement(delta) {
    if(_me._frozen) return;
    const jx=_me.jdx||Joystick.getDx();
    const jy=_me.jdy||Joystick.getDy();
    const mag=Math.sqrt(jx*jx+jy*jy);
    _me.moving=mag>0.05;
    if(_me.moving){
      const spd=160*delta;
      const nx=_me.x+jx*spd, ny=_me.y+jy*spd;
      if(_canMove(nx,_me.y)) _me.x=Utils.clamp(nx,0,WORLD_W);
      if(_canMove(_me.x,ny)) _me.y=Utils.clamp(ny,0,WORLD_H);
      _me.ft+=delta;
      if(_me.ft>=0.13){_me.ft=0;_me.frame=(_me.frame+1)%3;}
    } else {_me.frame=0;_me.ft=0;}
  }

  function _canMove(nx,ny) {
    if(nx<0||nx>WORLD_W||ny<0||ny>WORLD_H) return false;
    const lx=_reversed?GRID_END*TILE:SAFE_COLS*TILE;
    if(_laserOn){
      if(!_reversed&&nx>lx-10) return false;
      if(_reversed&&nx<lx+10) return false;
    }
    for(const b of _blockers){
      if(!b.visible) continue;
      if(nx>b.x&&nx<b.x+b.w&&ny>b.y&&ny<b.y+b.h) return false;
    }
    return true;
  }

  // ═══════════════════════════════
  //  BOTS AI
  // ═══════════════════════════════
  function _updateBots(delta) {
    for(const p of _players){
      if(!p.isBot||!p.alive||p._frozen) continue;
      // إذا كان البوت في حالة انزلاق، لا نتحكم بحركته
      if(p.slideT && p.slideT > 0) continue;

      if(p.falling){
        p.fallT=(p.fallT||0)+delta;
        if(p.fallT>1.0){
          p.falling=false; p.fallT=0;
          p.spectating=true;
          _loseHeart(p.id);
        }
        continue;
      }
      if(p.spectating) continue;

      const baseSpd=p.botLevel==='hard'?170:p.botLevel==='medium'?130:90;
      const spd=baseSpd*delta;
      const wander=(Math.random()-0.5)*(p.botLevel==='easy'?30:p.botLevel==='medium'?15:5);

      if(p.botLevel==='easy'&&Math.random()<0.01) p._pauseT=0.5;
      if(p._pauseT>0){ p._pauseT-=delta; p.moving=false; continue; }

      if(!p.card){
        let nearest=null, nd=Infinity;
        for(const c of _cards){
          if(c.taken) continue;
          if(p.botLevel==='hard'){
            const onFrag=_fragiles.some(f=>
              f.state!=='fallen'&&c.x>f.x&&c.x<f.x+f.w&&c.y>f.y&&c.y<f.y+f.h
            );
            if(onFrag&&nd<Infinity) continue;
          }
          const d=Utils.distance(p.x,p.y,c.x,c.y);
          if(d<nd){nd=d;nearest=c;}
        }
        if(nearest){
          const dx=nearest.x-p.x+wander, dy=nearest.y-p.y+wander;
          const dm=Math.sqrt(dx*dx+dy*dy);
          if(dm>8){
            const nx=p.x+dx/dm*spd, ny=p.y+dy/dm*spd;
            if(_canMove(nx,p.y)) p.x=Utils.clamp(nx,0,WORLD_W);
            if(_canMove(p.x,ny)) p.y=Utils.clamp(ny,0,WORLD_H);
            _checkFragileBot(p);
            p.moving=true;
            p.ft+=delta;
            if(p.ft>=0.13){p.ft=0;p.frame=(p.frame+1)%3;}
          } else {
            nearest.taken=true; p.card=nearest;
          }
        }
        if(p.botLevel==='hard'&&_me.heldCard&&_me.alive&&!_me.spectating){
          if(Utils.distance(p.x,p.y,_me.x,_me.y)<TILE*0.9&&Math.random()<0.008){
            p.card=_me.heldCard; _me.heldCard=null;
            UI.showToast(`🤖 ${p.name} سرق بطاقتك!`,1000);
          }
        }
      } else {
        let target=null;
        for(const cap of _capsules){
          if((cap.type==='color'&&p.card.color===cap.value)||
             (cap.type==='number'&&p.card.number===cap.value)){
            target=cap; break;
          }
        }
        if(target){
          const dx=(target.x+target.w/2)-p.x+wander;
          const dy=(target.y+target.h/2)-p.y+wander;
          const dm=Math.sqrt(dx*dx+dy*dy);
          if(dm>12){
            const nx=p.x+dx/dm*spd, ny=p.y+dy/dm*spd;
            if(_canMove(nx,p.y)) p.x=Utils.clamp(nx,0,WORLD_W);
            if(_canMove(p.x,ny)) p.y=Utils.clamp(ny,0,WORLD_H);
            _checkFragileBot(p);
            p.moving=true;
            p.ft+=delta;
            if(p.ft>=0.13){p.ft=0;p.frame=(p.frame+1)%3;}
          } else {
            if(p.botLevel==='hard'&&_me.alive&&!_me.spectating){
              if(Utils.distance(p.x,p.y,_me.x,_me.y)<TILE&&Math.random()<0.006){
                _me.x=Utils.clamp(_me.x+(Math.random()-0.5)*TILE*2,0,WORLD_W);
                _me.y=Utils.clamp(_me.y+(Math.random()-0.5)*TILE*2,0,WORLD_H);
                UI.showToast(`🤖 ${p.name} دفعك!`,800);
              }
            }
          }
        }
      }
    }
  }

  function _checkFragileBot(p) {
    for(const f of _fragiles){
      if(f.state==='fallen') continue;
      if(p.x>f.x&&p.x<f.x+f.w&&p.y>f.y&&p.y<f.y+f.h){
        if(f.state==='normal'){ f.state='cracked'; f.crackT=0.8; }
        else if(f.state==='cracked'){ f.state='fallen'; p.falling=true; p.fallT=0; }
      }
    }
  }

  // ═══════════════════════════════
  //  PICKUP / FRAGILE / CAPSULE
  // ═══════════════════════════════
  function _checkPickup() {
    for(const c of _cards){
      if(c.taken) continue;
      if(Utils.distance(_me.x,_me.y,c.x,c.y)<28){
        if(_pendingAction==='plus2'&&_me.heldCard&&!_me.heldCard2&&c.isSecond){
          c.taken=true; _me.heldCard2=c; UI.showToast('🃏 بطاقة إضافية!',800);
        } else if(!_me.heldCard&&!c.isSecond){
          c.taken=true; _me.heldCard=c; UI.showToast('🃏 تم الالتقاط',600);
        }
      }
    }
  }

  function _checkFragileMe() {
    for(const f of _fragiles){
      if(f.state==='fallen') continue;
      const on=_me.x>f.x&&_me.x<f.x+f.w&&_me.y>f.y&&_me.y<f.y+f.h;
      if(!on) continue;
      if(f.state==='normal'){ f.state='cracked'; f.crackT=0.8; }
      else if(f.state==='cracked'){ f.state='fallen'; _me.falling=true; _me.fallT=0; }
    }
  }

  function _onTileFallen(tile) {
    for(const p of _players){
      if(p.falling||p.spectating||!p.alive) continue;
      if(p.x>tile.x&&p.x<tile.x+tile.w&&p.y>tile.y&&p.y<tile.y+tile.h){
        p.falling=true; p.fallT=0;
      }
    }
    if(_me.alive&&!_me.spectating&&!_me.falling){
      if(_me.x>tile.x&&_me.x<tile.x+tile.w&&_me.y>tile.y&&_me.y<tile.y+tile.h){
        _me.falling=true; _me.fallT=0;
      }
    }
  }

  // ═══════════════════════════════
  //  HEART LOSS
  // ═══════════════════════════════
  function _loseHeart(id) {
    if(id===_myId){
      if(_me._lostThisRound) return;
      _me._lostThisRound=true;
      _me.hearts=Math.max(0,(_me.hearts||3)-1);
      
      // صوت خسارة قلب (محلي فقط)
      if(window.UnoSound && window.UnoSound.loseHeart) {
        window.UnoSound.loseHeart();
      }
      
      if(_me.hearts<=0){
        _me.alive=false; _me.spectating=true;
        _freeCam.active=true;
        _freeCam.x=_camX; _freeCam.y=_camY;
        UI.showToast('💀 تم إقصاؤك نهائياً!',2500);
      } else {
        _me.spectating=true;
        _freeCam.active=true;
        _freeCam.x=_camX; _freeCam.y=_camY;
        UI.showToast(`💔 خسرت قلباً! (${_me.hearts}/3)`,1500);
      }
      const me=_getMyPlayer();
      if(me){ me.hearts=_me.hearts; me.alive=_me.alive; }
    } else {
      const p=_players.find(x=>x.id===id);
      if(!p||p._lostThisRound) return;
      p._lostThisRound=true;
      p.hearts=Math.max(0,p.hearts-1);
      if(p.hearts<=0){ p.alive=false; p.spectating=true; }
    }
  }

  // ═══════════════════════════════
  //  END ROUND
  // ═══════════════════════════════
  function _endRound() {
    _phase='result'; _lightsOn=true;
    _capsules.forEach(c=>c.occupantsCount=0);

    const allEntities=[..._players];
    if(_me.alive && !_me._lostThisRound){
      allEntities.push({..._me, id:_myId, card:_me.heldCard});
    }

    for(const p of allEntities){
      if(!p.alive || p._lostThisRound || p.hearts<=0) continue;
      const card=p.id===_myId?_me.heldCard:p.card;
      if(!card){ _loseHeart(p.id); continue; }

      const inCap=_capsules.find(c=>
        p.x>c.x&&p.x<c.x+c.w&&p.y>c.y&&p.y<c.y+c.h
      );
      if(inCap){
        const ok=(inCap.type==='color'&&inCap.value===card.color)||
                 (inCap.type==='number'&&inCap.value===card.number);
        if(ok&&inCap.occupantsCount<5){
          inCap.occupantsCount++;
          if(p.id===_myId) UI.showToast('✅ نجوت!',1000);
        } else {
          if(p.id===_myId) UI.showToast('❌ بطاقة خاطئة أو الكبسولة ممتلئة!',1500);
          _loseHeart(p.id);
        }
      } else {
        _loseHeart(p.id);
      }
    }

    const alive=_getAlivePlayers();
    const realAlive=alive.filter(p=>p.hearts>0);

    if(realAlive.length<=1){
      _phase='gameover';
      if(realAlive.length===0){
        UI.showToast('🤝 مباراة نظيفة — لا فائز!',4000);
      } else {
        const winner=realAlive[0];
        const isMe=winner.id===_myId||!winner.id;
        UI.showToast(`🏆 الفائز: ${isMe?'أنت':winner.name}!`,4000);
      }
      setTimeout(exit,5000);
      return;
    }
    setTimeout(_startRound,3000);
  }

  // ═══════════════════════════════
  //  PUSH / STEAL / DODGE (مع انزلاق)
  // ═══════════════════════════════
  function push(dir) {
    if(_me.pushCharge<1||_me.falling||!_me.alive||_me.spectating) return;
    _me.pushCharge=0;
    const off={
      up:{dx:0,dy:-TILE*1.5},down:{dx:0,dy:TILE*1.5},
      left:{dx:-TILE*1.5,dy:0},right:{dx:TILE*1.5,dy:0}
    };
    const o=off[dir]; if(!o) return;
    for(const p of _players){
      if(!p.alive||p.spectating||p.invincible>0||p.falling) continue;
      if(Utils.distance(_me.x,_me.y,p.x,p.y)>TILE*1.2) continue;

      const targetX=Utils.clamp(p.x+o.dx,0,WORLD_W);
      const targetY=Utils.clamp(p.y+o.dy,0,WORLD_H);

      // بدء انزلاق تدريجي
      p.slideFromX = p.x;
      p.slideFromY = p.y;
      p.slideTargetX = targetX;
      p.slideTargetY = targetY;
      p.slideT = 1.0;  // مدة الانزلاق (تتناقص مع الوقت)

      // إرسال الموضع النهائي للشبكة
      Network.sendPush(p.id, targetX, targetY);
      UI.showToast(`💥 دفعت ${p.name}!`,600);
      break;
    }
  }

  function steal() {
    if(_me.pushCharge<1||_me.falling||!_me.alive||_me.spectating) return;
    for(const p of _players){
      if(!p.alive||!p.card||p.invincible>0||_me.invincible>0||p.falling) continue;
      if(Utils.distance(_me.x,_me.y,p.x,p.y)>TILE) continue;
      if(Math.random()<DODGE_CHANCE&&p.isBot&&p.botLevel==='hard'){
        UI.showToast(`${p.name} تفادى السرقة!`,600); return;
      }
      // انزلاق للخلف (بعيداً عن السارق)
      const backDir = {
        x: p.x - _me.x,
        y: p.y - _me.y,
      };
      const mag = Math.sqrt(backDir.x*backDir.x + backDir.y*backDir.y) || 1;
      const targetX = Utils.clamp(p.x + (backDir.x/mag) * TILE, 0, WORLD_W);
      const targetY = Utils.clamp(p.y + (backDir.y/mag) * TILE, 0, WORLD_H);

      p.slideFromX = p.x;
      p.slideFromY = p.y;
      p.slideTargetX = targetX;
      p.slideTargetY = targetY;
      p.slideT = 0.8;

      _me.heldCard = p.card;
      p.card = null;
      UI.showToast(`🃏 سرقت من ${p.name}!`,800);
      return;
    }
  }

  function dodge() {
    if(_me.dodgeCharge<1||_me.falling||!_me.alive||_me.spectating) return;
    _me.dodgeCharge=0;
    if(Math.random()<DODGE_CHANCE){ _me.invincible=0.9; UI.showToast('💨 تفادي ناجح!',600); }
    else { UI.showToast('😵 فشل التفادي!',600); }
  }

  // ═══════════════════════════════
  //  DRAW
  // ═══════════════════════════════
  function draw(ctx) {
    if(!_active) return;
    const cw=window.innerWidth, ch=window.innerHeight;

    ctx.save();
    ctx.translate(-_camX,-_camY);

    _drawFloor(ctx);
    _drawFragiles(ctx);
    _drawBlockers(ctx);
    _drawLaser(ctx);
    _drawCapsules(ctx);
    _drawCards(ctx);
    _drawPlayers(ctx);
    _drawMe(ctx);

    ctx.restore();

    if(!_lightsOn) _drawDarkness(ctx,cw,ch);
    _drawHUD(ctx,cw,ch);
    if(_phase==='countdown'&&_countdownT>0) _drawCountdown(ctx,cw,ch);
    if(_phase==='camSweep') _drawTargetCardBig(ctx,cw,ch);
  }

  function _drawFloor(ctx) {
    for(let r=0;r<GRID_ROWS;r++){
      for(let c=0;c<GRID_COLS;c++){
        const inSafe=c<SAFE_COLS||c>=GRID_END;
        ctx.fillStyle=inSafe
          ?((r+c)%2===0?'#0d0025':'#0a001e')
          :((r+c)%2===0?'#1a0a00':'#150800');
        ctx.fillRect(c*TILE,r*TILE,TILE,TILE);
      }
    }
    ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=0.5;
    for(let x=0;x<=WORLD_W;x+=TILE){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_H);ctx.stroke();}
    for(let y=0;y<=WORLD_H;y+=TILE){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke();}
  }

  function _drawFragiles(ctx) {
    for(const f of _fragiles){
      if(f.state==='fallen'){
        ctx.fillStyle='rgba(0,0,0,0.9)'; ctx.fillRect(f.x,f.y,f.w,f.h);
        ctx.strokeStyle='#222'; ctx.lineWidth=1; ctx.strokeRect(f.x,f.y,f.w,f.h);
        const gr=ctx.createRadialGradient(f.x+f.w/2,f.y+f.h/2,2,f.x+f.w/2,f.y+f.h/2,f.w/2);
        gr.addColorStop(0,'rgba(0,0,0,0.95)'); gr.addColorStop(1,'rgba(20,5,0,0.4)');
        ctx.fillStyle=gr; ctx.fillRect(f.x,f.y,f.w,f.h);
        continue;
      }
      if(f.state==='normal'){
        ctx.fillStyle='rgba(255,140,0,0.12)'; ctx.fillRect(f.x,f.y,f.w,f.h);
        ctx.strokeStyle='rgba(255,140,0,0.35)'; ctx.lineWidth=1;
        ctx.strokeRect(f.x+2,f.y+2,f.w-4,f.h-4);
      } else {
        ctx.fillStyle='rgba(255,50,0,0.4)'; ctx.fillRect(f.x,f.y,f.w,f.h);
        ctx.strokeStyle='rgba(255,0,0,0.9)'; ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(f.x+f.w*.3,f.y); ctx.lineTo(f.x+f.w*.5,f.y+f.h*.5); ctx.lineTo(f.x+f.w*.8,f.y+f.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(f.x,f.y+f.h*.4); ctx.lineTo(f.x+f.w*.5,f.y+f.h*.5); ctx.lineTo(f.x+f.w,f.y+f.h*.7);
        ctx.stroke();
      }
    }
  }

  function _drawBlockers(ctx) {
    for(const b of _blockers){
      if(!b.visible) continue;
      ctx.fillStyle='#3a0a6a'; ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.strokeStyle='#8800ff'; ctx.lineWidth=2; ctx.strokeRect(b.x,b.y,b.w,b.h);
      const gr=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);
      gr.addColorStop(0,'rgba(136,0,255,0.3)'); gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gr; ctx.fillRect(b.x,b.y,b.w,b.h);
    }
  }

  function _drawLaser(ctx) {
    if(!_laserOn) return;
    const lx=_reversed?GRID_END*TILE:SAFE_COLS*TILE;
    const t=Date.now()/1000; const a=0.6+Math.sin(t*8)*0.4;
    ctx.fillStyle=`rgba(255,0,0,${a})`; ctx.fillRect(lx-3,0,6,WORLD_H);
    const gr=ctx.createLinearGradient(lx-20,0,lx+20,0);
    gr.addColorStop(0,'rgba(255,0,0,0)');
    gr.addColorStop(0.5,`rgba(255,0,0,${a*.4})`);
    gr.addColorStop(1,'rgba(255,0,0,0)');
    ctx.fillStyle=gr; ctx.fillRect(lx-20,0,40,WORLD_H);
  }

  function _drawCapsules(ctx) {
    for(const cap of _capsules){
      const cColor=cap.type==='color'?(COLOR_HEX[cap.value]||'#888'):'#4488cc';
      const pulse=0.5+Math.sin(cap.pulseT||0)*0.5;
      const x=cap.x, y=cap.y, w=cap.w, h=cap.h;

      const baseH=h*0.18;
      const baseGr=ctx.createLinearGradient(x,y+h-baseH,x,y+h);
      baseGr.addColorStop(0,'#3a3a4a'); baseGr.addColorStop(1,'#1a1a2a');
      ctx.fillStyle=baseGr; ctx.fillRect(x,y+h-baseH,w,baseH);
      ctx.strokeStyle='#5a5a7a'; ctx.lineWidth=1;
      ctx.strokeRect(x,y+h-baseH,w,baseH);
      ctx.fillStyle='rgba(255,255,255,0.08)';
      ctx.fillRect(x+4,y+h-baseH+2,w-8,2);
      ctx.fillRect(x+4,y+h-baseH+5,w-8,1);

      const cylY=y+h*0.18, cylH=h*0.64;
      const cylGr=ctx.createLinearGradient(x,cylY,x+w,cylY);
      cylGr.addColorStop(0,cColor+'55');
      cylGr.addColorStop(0.5,cColor+'22');
      cylGr.addColorStop(1,cColor+'55');
      ctx.fillStyle=cylGr; ctx.fillRect(x,cylY,w,cylH);

      const glowAlpha=0.4+pulse*0.5;
      ctx.strokeStyle=cColor; ctx.lineWidth=2;
      ctx.shadowColor=cColor; ctx.shadowBlur=8*pulse;
      ctx.strokeRect(x,cylY,w,cylH);
      ctx.shadowBlur=0;

      ctx.fillStyle='rgba(255,255,255,0.06)';
      ctx.fillRect(x+2,cylY+2,w*0.3,cylH-4);
      ctx.fillStyle='rgba(255,255,255,0.03)';
      ctx.fillRect(x+w*0.7,cylY+2,w*0.25,cylH-4);

      ctx.strokeStyle=`rgba(255,255,255,0.06)`; ctx.lineWidth=0.5;
      for(let ly=cylY+8;ly<cylY+cylH;ly+=8){
        ctx.beginPath(); ctx.moveTo(x,ly); ctx.lineTo(x+w,ly); ctx.stroke();
      }

      const screenH=h*0.22;
      const screenGr=ctx.createLinearGradient(x,y,x,y+screenH);
      screenGr.addColorStop(0,'#0a0a1a');
      screenGr.addColorStop(1,'#05051a');
      ctx.fillStyle=screenGr; ctx.fillRect(x,y,w,screenH);
      ctx.strokeStyle=cColor; ctx.lineWidth=1.5;
      ctx.shadowColor=cColor; ctx.shadowBlur=6;
      ctx.strokeRect(x,y,w,screenH);
      ctx.shadowBlur=0;

      ctx.save();
      ctx.textAlign='center'; ctx.textBaseline='middle';
      if(cap.type==='color'){
        ctx.fillStyle=cColor;
        ctx.beginPath(); ctx.arc(x+w/2,y+screenH/2,screenH*0.35,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1;
        ctx.stroke();
        ctx.font=`bold ${Math.floor(w*0.18)}px "Press Start 2P"`;
        ctx.fillStyle='rgba(255,255,255,0.7)';
        ctx.fillText(cap.value.toUpperCase().slice(0,3),x+w/2,y+screenH*0.78);
      } else {
        ctx.font=`bold ${Math.floor(screenH*0.6)}px "Press Start 2P"`;
        ctx.fillStyle=cColor;
        ctx.shadowColor=cColor; ctx.shadowBlur=6*pulse;
        ctx.fillText(cap.value.toString(),x+w/2,y+screenH/2);
        ctx.shadowBlur=0;
      }
      ctx.restore();

      const glowGr=ctx.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,w);
      glowGr.addColorStop(0,cColor+(Math.floor(pulse*40).toString(16).padStart(2,'0')));
      glowGr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glowGr; ctx.fillRect(x-8,y-8,w+16,h+16);

      if(cap.occupantsCount>0){
        ctx.font='7px "Press Start 2P"';
        ctx.fillStyle='rgba(0,255,0,0.9)';
        ctx.textAlign='center';
        ctx.fillText(`${cap.occupantsCount}/5`,x+w/2,y+h-baseH/2);
      }

      if(cap.occupantsCount>=5){
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(x,cylY,w,cylH);
        ctx.font='16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('🔒',x+w/2,y+h/2);
      }
    }
  }

  function _drawCards(ctx) {
    for(const c of _cards){
      if(c.taken) continue;
      _drawUNOCard(ctx,c.x-16,c.y-24,32,46,c.color,c.number,c.real);
    }
  }

  function _drawUNOCard(ctx,x,y,w,h,color,number,real) {
    const bg=COLOR_HEX[color]||color;
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(x+3,y+3,w,h);
    ctx.fillStyle=bg;
    ctx.beginPath(); ctx.roundRect(x,y,w,h,4); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(x+3,y+3,w-6,h-6,3); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.ellipse(x+w/2,y+h/2,w*.35,h*.28,Math.PI/4,0,Math.PI*2); ctx.fill();
    ctx.font=`bold ${Math.floor(h*.36)}px "Press Start 2P"`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#fff';
    ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=3;
    ctx.fillText(number.toString(),x+w/2,y+h/2);
    ctx.shadowBlur=0;
    if(!real){
      ctx.fillStyle='rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.roundRect(x,y,w,h,4); ctx.fill();
    }
  }

  function _drawPlayers(ctx) {
    for(const p of _players){
      if(!p.alive&&!p.spectating&&!p.falling) continue;
      ctx.save();
      if(p.spectating) ctx.globalAlpha=0.35;
      if(p.falling){
        const s=Math.max(0,1-p.fallT);
        ctx.translate(p.x,p.y); ctx.scale(s,s); ctx.translate(-p.x,-p.y);
        ctx.globalAlpha=(ctx.globalAlpha||1)*(1-p.fallT);
      }
      const char=Player.getAllChars()[p.charId];
      if(char) char.draw(ctx,p.x-12,p.y-14,'down',p.frame,p.moving);
      Utils.drawPixelText(ctx,p.name,p.x,p.y-24,
        {font:'5px "Press Start 2P"',color:p.isBot?'#40c0f0':'#f0c040',align:'center'});
      let h=''; for(let i=0;i<p.hearts;i++) h+='❤️';
      ctx.font='8px serif'; ctx.textAlign='center'; ctx.fillText(h,p.x,p.y-34);
      if(p.hearts===1){
        const pulse=0.5+Math.sin(Date.now()/200)*0.5;
        ctx.globalAlpha=pulse; ctx.strokeStyle='#ff0000'; ctx.lineWidth=2;
        ctx.strokeRect(p.x-14,p.y-14,28,36);
      }
      if(p.card) _drawUNOCard(ctx,p.x+10,p.y-22,16,22,p.card.color,p.card.number,true);
      ctx.restore();
    }
  }

  function _drawMe(ctx) {
    if(!_me.alive&&!_me.spectating&&!_me.falling) return;
    ctx.save();
    if(_me.spectating) ctx.globalAlpha=0.35;
    if(_me.invincible>0) ctx.globalAlpha=0.5+Math.sin(Date.now()/80)*0.5;
    if(_me.falling){
      const s=Math.max(0,1-_me.fallT);
      ctx.translate(_me.x,_me.y); ctx.scale(s,s); ctx.translate(-_me.x,-_me.y);
      ctx.globalAlpha=(ctx.globalAlpha||1)*(1-_me.fallT);
    }
    const char=Player.getAllChars()[Player.getCharId()];
    if(char) char.draw(ctx,_me.x-12,_me.y-14,'down',_me.frame,_me.moving);
    if(_me.heldCard) _drawUNOCard(ctx,_me.x+10,_me.y-22,16,22,_me.heldCard.color,_me.heldCard.number,true);
    if(_me.hearts===1){
      const pulse=0.5+Math.sin(Date.now()/200)*0.5;
      ctx.globalAlpha=pulse; ctx.strokeStyle='#ff0000'; ctx.lineWidth=3;
      ctx.strokeRect(_me.x-14,_me.y-14,28,36);
    }
    ctx.restore();
  }

  function _drawDarkness(ctx,cw,ch) {
    const fx=_freeCam.active?cw/2:_me.x-_camX;
    const fy=_freeCam.active?ch/2:_me.y-_camY;
    const gr=ctx.createRadialGradient(fx,fy,TILE*.4,fx,fy,TILE*2.8);
    gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,0.97)');
    ctx.fillStyle=gr; ctx.fillRect(0,0,cw,ch);
  }

  function _drawHUD(ctx,cw,ch) {
    const me=_getMyPlayer();
    if(_targetCard&&_phase!=='camSweep'){
      ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(cw/2-50,8,100,56);
      ctx.strokeStyle='#f0c040'; ctx.lineWidth=2; ctx.strokeRect(cw/2-50,8,100,56);
      Utils.drawPixelText(ctx,'TARGET',cw/2,12,{font:'5px "Press Start 2P"',color:'#aaa',align:'center'});
      _drawUNOCard(ctx,cw/2-14,18,28,40,_targetCard.color,_targetCard.number,true);
    }
    if(_phase==='running'){
      const tc=_roundTimer<6?'#ff0088':'#f0c040';
      const tp=_roundTimer<6?0.6+Math.sin(Date.now()/100)*.4:1;
      ctx.save(); ctx.globalAlpha=tp;
      Utils.drawPixelText(ctx,Math.ceil(_roundTimer)+'s',cw/2,70,{font:'10px "Press Start 2P"',color:tc,align:'center'});
      ctx.restore();
    }
    if(me){
      let h=''; for(let i=0;i<me.hearts;i++) h+='❤️';
      ctx.font='14px serif'; ctx.textAlign='left'; ctx.fillText(h,14,24);
    }
    Utils.drawPixelText(ctx,`R${_roundNum}`,14,ch-56,{font:'6px "Press Start 2P"',color:'#888',align:'left'});
    if(!_me.spectating){
      _drawBar(ctx,14,ch-40,80,12,_me.pushCharge,'#ff4400','👊');
      _drawBar(ctx,14,ch-24,80,12,_me.dodgeCharge,'#00aaff','💨');
    } else {
      Utils.drawPixelText(ctx,'SPECTATOR',14,ch-30,{font:'5px "Press Start 2P"',color:'#00aaff',align:'left'});
    }

    if(_actionCard && _actionDisplayT > 0){
      const alpha = Math.min(1, _actionDisplayT);
      const ac={skip:'⏭ SKIP',reverse:'🔄 REVERSE',plus2:'+2 🃏',wild:'🌑 WILD ×4'};
      const cc={skip:'#ff8800',reverse:'#8800ff',plus2:'#0088ff',wild:'#111111'};

      ctx.save();
      ctx.globalAlpha = alpha;

      const bw=160, bh=60;
      const bx=cw/2-bw/2, by=ch/2-bh/2-40;
      ctx.fillStyle=cc[_actionCard]||'#333';
      ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,8); ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,8); ctx.stroke();

      ctx.shadowColor=cc[_actionCard]; ctx.shadowBlur=20*alpha;
      Utils.drawPixelText(ctx,ac[_actionCard]||_actionCard,cw/2,by+12,
        {font:'7px "Press Start 2P"',color:'#fff',align:'center'});
      ctx.shadowBlur=0;
      ctx.restore();
    }
    else if(_actionCard){
      const ac={skip:'⏭',reverse:'🔄',plus2:'+2',wild:'🌑'};
      const cc={skip:'#ff8800',reverse:'#8800ff',plus2:'#0088ff',wild:'#333'};
      ctx.fillStyle=cc[_actionCard]||'#333'; ctx.fillRect(cw-60,12,50,22);
      ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.strokeRect(cw-60,12,50,22);
      Utils.drawPixelText(ctx,ac[_actionCard]||'?',cw-35,14,
        {font:'5px "Press Start 2P"',color:'#fff',align:'center'});
    }
  }

  function _drawBar(ctx,x,y,w,h,charge,color,icon){
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(x,y,w+20,h);
    ctx.fillStyle=color; ctx.fillRect(x,y,w*charge,h);
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.strokeRect(x,y,w+20,h);
    ctx.font='9px serif'; ctx.textAlign='left'; ctx.fillText(icon,x+w+2,y+h-1);
  }

  function _drawTargetCardBig(ctx,cw,ch){
    if(!_targetCard) return;
    const pulse=0.85+Math.sin(Date.now()/1000*3)*.15;
    ctx.save(); ctx.globalAlpha=pulse;
    _drawUNOCard(ctx,cw/2-40,ch/2-58,80,116,_targetCard.color,_targetCard.number,true);
    Utils.drawPixelText(ctx,'التقطها وادخل كبسولتها!',cw/2,ch/2-58-14,{font:'6px "Press Start 2P"',color:'#f0c040',align:'center'});
    ctx.restore();
  }

  function _drawCountdown(ctx,cw,ch){
    const n=Math.ceil(_countdownT); const scale=1+(_countdownT%1)*.6;
    ctx.save(); ctx.translate(cw/2,ch/2); ctx.scale(scale,scale);
    ctx.font='bold 52px "Press Start 2P"'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(255,0,136,.9)'; ctx.fillText(n===3?'3':n===2?'2':'GO!',2,2);
    ctx.fillStyle='#fff'; ctx.fillText(n===3?'3':n===2?'2':'GO!',0,0);
    ctx.restore();
  }

  // ═══════════════════════════════
  //  BUILD UI BUTTONS
  // ═══════════════════════════════
  function _buildUI() {
    if(document.getElementById('uno-btns')) return;
    const wrap=document.createElement('div'); wrap.id='uno-btns';
    wrap.style.cssText='position:fixed;bottom:24px;right:24px;z-index:50;display:grid;grid-template-columns:48px 48px 48px;grid-template-rows:48px 48px 48px 48px 48px;gap:4px;';
    const s=(bg)=>`background:${bg};border:2px solid rgba(255,255,255,0.4);color:#fff;font-size:16px;cursor:pointer;border-radius:6px;display:flex;align-items:center;justify-content:center;`;
    const btns=[
      {id:'uno-chat',  icon:'💬', dir:'chat', col:2, row:1, bg:'#1E90FF'},
      {id:'uno-up',    icon:'⬆', dir:'up',   col:2, row:2, bg:'#333'},
      {id:'uno-left',  icon:'⬅', dir:'left', col:1, row:3, bg:'#333'},
      {id:'uno-dodge', icon:'💨', dir:'dodge',col:2, row:3, bg:'#005588'},
      {id:'uno-right', icon:'➡', dir:'right',col:3, row:3, bg:'#333'},
      {id:'uno-down',  icon:'⬇', dir:'down', col:2, row:4, bg:'#333'},
      {id:'uno-steal', icon:'🃏', dir:'steal',col:3, row:4, bg:'#550000'},
    ];
    for(const b of btns){
      const btn=document.createElement('button');
      btn.id=b.id; btn.innerHTML=b.icon;
      btn.style.cssText=s(b.bg)+`;grid-column:${b.col};grid-row:${b.row}`;
      btn.addEventListener('touchstart',e=>{
        e.preventDefault();
        if(b.dir==='chat') {
          if(window.Chat && window.Chat.openChat) window.Chat.openChat();
          return;
        }
        b.dir==='dodge'?dodge():b.dir==='steal'?steal():push(b.dir);
      },{passive:false});
      btn.addEventListener('mousedown',()=>{
        if(b.dir==='chat') {
          if(window.Chat && window.Chat.openChat) window.Chat.openChat();
          return;
        }
        b.dir==='dodge'?dodge():b.dir==='steal'?steal():push(b.dir);
      });
      wrap.appendChild(btn);
    }
    document.body.appendChild(wrap);
  }

  function _removeUI(){ const el=document.getElementById('uno-btns'); if(el) el.remove(); }
  
  function _getMyPlayer(){ return _players.find(p=>p.id===_myId)||null; }
  
  function _getAlivePlayers(){
    const list=_players.filter(p=>p.alive && p.hearts>0);
    if(_me.alive && _me.hearts>0) list.push({..._me, id:_myId});
    return list;
  }

  // ═══════════════════════════════
  //  EXIT
  // ═══════════════════════════════
  function exit(){
    _active=false; _removeUI(); _showWorldUI();
    if(typeof EventManager!=='undefined'){
      EventManager.startTransitionOut(()=>{ UI.showToast('عدت إلى العالم 🌍',2000); });
    }
  }

  function isActive(){ return _active; }
  return{enter,exit,update,draw,push,steal,dodge,isActive};
})();
