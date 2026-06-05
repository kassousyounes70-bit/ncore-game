'use strict';
const EventUno = (() => {
  const TILE        = 64;
  const GRID_COLS   = 20;
  const GRID_ROWS   = 14;
  const ROUND_TIME  = 10;
  const PUSH_CHARGE = 2.85;
  const DODGE_CHARGE= 3.5;
  const COLORS = ['red','blue','green','yellow'];
  const NUMBERS = [0,1,2,3,4,5,6,7,8,9];
  const ACTION_CARDS = ['reverse','skip','plus2','wild'];
  const SAFE_ZONE_COLS  = 5;
  const GRID_START_COL  = 5;
  const GRID_END_COL    = 15;
  const CARD_ZONE_COLS  = 5;
  const WORLD_W = GRID_COLS * TILE;
  const WORLD_H = GRID_ROWS * TILE;
  let _active       = false;
  let _players      = [];
  let _myId         = '';
  let _roundTimer   = 0;
  let _roundActive  = false;
  let _roundNum     = 0;
  let _phase        = 'waiting';
  let _countdownT   = 3;
  let _targetCard   = null;
  let _actionCard   = null;
  let _cards        = [];
  let _capsules     = [];
  let _fragiles     = [];
  let _blockers     = [];
  let _laserOn      = true;
  let _lightsOn     = true;
  let _reversed     = false;
  let _skipTriggered= false;
  let _camX=0, _camY=0;
  const _me = {
    x: 2.5*TILE, y: 7*TILE,
    pushCharge: 0, dodgeCharge: 0,
    pushing: false, dodging: false,
    pushDir: null,
    invincible: 0,
    heldCard: null,
    heldCard2: null,
    frame: 0, ft: 0, moving: false,
    dx: 0, dy: 0,
  };

  function enter(players) {
    _active    = true;
    _roundNum  = 0;
    _phase     = 'waiting';
    _myId      = Network.getMyId();
    _reversed  = false;
    _players = players.map((p, i) => ({
      id       : p.id,
      name     : p.name || 'لاعب',
      x        : 2.5 * TILE,
      y        : (1 + i % (GRID_ROWS-2)) * TILE,
      hearts   : 3,
      card     : null,
      card2    : null,
      alive    : true,
      spectating: false,
      charId   : p.charId || 0,
      frame    : 0, ft: 0, moving: false,
    }));
    _me.x = 2.5*TILE;
    _me.y = 7*TILE;
    _me.heldCard = null;
    _me.heldCard2= null;
    _me.pushCharge = 0;
    _me.dodgeCharge= 0;
    
    if (typeof UI !== 'undefined' && UI.toggleWorldHUD) {
      UI.toggleWorldHUD(false);
    }
    
    _buildUI();
    _startRound();
  }

  function _startRound() {
    _roundNum++;
    _phase       = 'countdown';
    _countdownT  = 3;
    _roundTimer  = ROUND_TIME;
    _roundActive = false;
    _laserOn     = true;
    _lightsOn    = true;
    _skipTriggered = false;
    _me.heldCard = null;
    _me.heldCard2= null;
    _targetCard = {
      color : COLORS[Math.floor(Math.random()*COLORS.length)],
      number: NUMBERS[Math.floor(Math.random()*NUMBERS.length)],
    };
    _actionCard = _roundNum > 1 && Math.random() < 0.55
      ? ACTION_CARDS[Math.floor(Math.random()*ACTION_CARDS.length)]
      : null;
    if (_actionCard === 'reverse') _reversed = !_reversed;
    _buildCards();
    _buildCapsules();
    _buildFragiles();
    _buildBlockers();
    _resetPositions();
  }

  function _buildCards() {
    _cards = [];
    const alivePlayers = _players.filter(p => p.alive).length + 1;
    const cardZoneX    = _reversed ? SAFE_ZONE_COLS * TILE : (GRID_END_COL) * TILE;
    const correctCount = Math.max(1, Math.floor(alivePlayers * 0.9));
    for (let i = 0; i < correctCount; i++) {
      _cards.push({
        color  : _targetCard.color,
        number : _targetCard.number,
        x      : cardZoneX + Utils.randInt(30, CARD_ZONE_COLS*TILE-30),
        y      : Utils.randInt(TILE, WORLD_H - TILE),
        taken  : false,
        real   : true,
      });
    }
    const bluffCount = Utils.randInt(5, 10);
    for (let i = 0; i < bluffCount; i++) {
      const isColorBluff  = Math.random() < 0.5;
      const bluffColor    = isColorBluff
        ? _getSimilarColor(_targetCard.color)
        : COLORS[Math.floor(Math.random()*COLORS.length)];
      const bluffNumber   = !isColorBluff
        ? _getSimilarNumber(_targetCard.number)
        : NUMBERS[Math.floor(Math.random()*NUMBERS.length)];
      _cards.push({
        color  : bluffColor,
        number : bluffNumber,
        x      : cardZoneX + Utils.randInt(30, CARD_ZONE_COLS*TILE-30),
        y      : Utils.randInt(TILE, WORLD_H - TILE),
        taken  : false,
        real   : false,
      });
    }
    if (_actionCard === 'plus2') {
      for (let i = 0; i < correctCount; i++) {
        _cards.push({
          color  : COLORS[Math.floor(Math.random()*COLORS.length)],
          number : NUMBERS[Math.floor(Math.random()*NUMBERS.length)],
          x      : cardZoneX + Utils.randInt(30, CARD_ZONE_COLS*TILE-30),
          y      : Utils.randInt(TILE, WORLD_H - TILE),
          taken  : false,
          real   : true,
          isSecond: true,
        });
      }
    }
  }

  function _getSimilarColor(color) {
    const similar = { red:'#ff6600', blue:'#0066ff', green:'#00aa44', yellow:'#ffcc00' };
    return similar[color] || color;
  }

  function _getSimilarNumber(num) {
    if (num === 1) return 7;
    if (num === 7) return 1;
    if (num === 6) return 9;
    if (num === 9) return 6;
    return (num + 1) % 10;
  }

  function _buildCapsules() {
    _capsules = [];
    const capsX = _reversed ? GRID_END_COL*TILE : 0;
    COLORS.forEach((color, i) => {
      _capsules.push({
        color,
        x    : capsX + Utils.randInt(4, SAFE_ZONE_COLS*TILE - TILE - 4),
        y    : (i * 3 + 1) * TILE,
        w    : TILE * 1.2,
        h    : TILE * 1.2,
        open : true,
        occupants: [],
      });
    });
  }

  function _buildFragiles() {
    _fragiles = [];
    const count = Utils.randInt(15, 30);
    for (let i = 0; i < count; i++) {
      const col = Utils.randInt(GRID_START_COL, GRID_END_COL - 1);
      const row = Utils.randInt(1, GRID_ROWS - 2);
      _fragiles.push({
        x      : col * TILE,
        y      : row * TILE,
        w      : TILE,
        h      : TILE,
        state  : 'normal',
        steppedBy: []
      });
    }
  }

  function _buildBlockers() {
    _blockers = [];
    const count = Utils.randInt(6, 12);
    for (let i = 0; i < count; i++) {
      const col = Utils.randInt(GRID_START_COL, GRID_END_COL - 1);
      const row = Utils.randInt(0, GRID_ROWS - 1);
      _blockers.push({
        x      : col * TILE,
        y      : row * TILE,
        w      : TILE,
        h      : TILE / 4,
        visible: Math.random() < 0.5,
        timer  : Utils.randFloat(1.5, 3.5),
        period : Utils.randFloat(1.5, 3.5),
      });
    }
  }

  function _resetPositions() {
    const startX = _reversed ? WORLD_W - 2.5*TILE : 2.5*TILE;
    _me.x = startX;
    _me.y = 7 * TILE;
    _me.heldCard  = null;
    _me.heldCard2 = null;
    _players.forEach((p, i) => {
      p.x = startX;
      p.y = (1 + i % (GRID_ROWS-2)) * TILE;
      p.card  = null;
      p.card2 = null;
    });
  }

  function update(delta) {
    if (!_active) return;
    switch (_phase) {
      case 'countdown': _updateCountdown(delta); break;
      case 'running'  : _updateRunning(delta);   break;
      case 'result'   : _updateResult(delta);    break;
    }
    _camX = Utils.clamp(_me.x - window.innerWidth/2,  0, Math.max(0, WORLD_W - window.innerWidth));
    _camY = Utils.clamp(_me.y - window.innerHeight/2, 0, Math.max(0, WORLD_H - window.innerHeight));
  }

  function _updateCountdown(delta) {
    _countdownT -= delta;
    if (_countdownT <= 0) {
      _phase       = 'running';
      _roundActive = true;
      _laserOn     = false;
    }
  }

  function _updateRunning(delta) {
    _roundTimer -= delta;
    if (_actionCard === 'skip' && !_skipTriggered && _roundTimer <= 5) {
      _skipTriggered = true;
      _capsules.forEach((c, i) => { if (i % 2 === 0) c.open = false; });
      UI.showToast('⚠️ نصف الكبسولات أُغلقت!', 1500);
    }
    if (_actionCard === 'wild') _lightsOn = false;
    for (const b of _blockers) {
      b.timer -= delta;
      if (b.timer <= 0) {
        b.visible = !b.visible;
        b.timer   = b.period;
      }
    }
    _updateMe(delta);
    if (_me.pushCharge  < 1) _me.pushCharge  += delta / PUSH_CHARGE;
    if (_me.dodgeCharge < 1) _me.dodgeCharge += delta / DODGE_CHARGE;
    _me.pushCharge  = Math.min(1, _me.pushCharge);
    _me.dodgeCharge = Math.min(1, _me.dodgeCharge);
    if (_roundTimer <= 0) _endRound();
  }

  function _updateMe(delta) {
    const mePlayer = _getMyPlayer();
    if (mePlayer && (mePlayer.spectating || !mePlayer.alive)) return;
    const jx  = Joystick.getDx();
    const jy  = Joystick.getDy();
    const mag = Math.sqrt(jx*jx+jy*jy);
    _me.moving = mag > 0.05;
    if (_me.moving) {
      const spd = 160 * delta;
      const nx  = _me.x + jx * spd;
      const ny  = _me.y + jy * spd;
      if (_canMove(nx, _me.y)) _me.x = Utils.clamp(nx, 0, WORLD_W);
      if (_canMove(_me.x, ny)) _me.y = Utils.clamp(ny, 0, WORLD_H);
      _me.ft += delta;
      if (_me.ft >= 0.13) { _me.ft=0; _me.frame=(_me.frame+1)%3; }
    } else {
      _me.frame=0; _me.ft=0;
    }
    if (_me.invincible > 0) _me.invincible -= delta;
    if (_laserOn) return;
    if (!_me.heldCard) _checkPickupCard();
    _checkCapsuleEntry();
    _checkFragile(_me);
  }

  function _canMove(nx, ny) {
    if (nx < 0 || nx > WORLD_W || ny < 0 || ny > WORLD_H) return false;
    const laserX = _reversed ? GRID_END_COL*TILE : SAFE_ZONE_COLS*TILE;
    if (_laserOn) {
      if (!_reversed && nx > laserX - 10) return false;
      if ( _reversed && nx < laserX + 10) return false;
    }
    for (const b of _blockers) {
      if (!b.visible) continue;
      if (nx > b.x && nx < b.x+b.w && ny > b.y && ny < b.y+b.h) return false;
    }
    return true;
  }

  function _checkPickupCard() {
    for (const c of _cards) {
      if (c.taken) continue;
      const dist = Utils.distance(_me.x, _me.y, c.x, c.y);
      if (dist < 28) {
        if (_actionCard === 'plus2' && _me.heldCard && !_me.heldCard2 && c.isSecond) {
          c.taken       = true;
          _me.heldCard2 = c;
          UI.showToast('🃏 التقطت البطاقة الثانية!', 1000);
        } else if (!_me.heldCard) {
          c.taken      = true;
          _me.heldCard = c;
        }
        break;
      }
    }
  }

  function _checkCapsuleEntry() {
    if (!_me.heldCard) return;
    if (_actionCard === 'plus2' && !_me.heldCard2) return;
    for (const cap of _capsules) {
      if (!cap.open) continue;
      const dist = Utils.distance(_me.x, _me.y, cap.x + cap.w/2, cap.y + cap.h/2);
      if (dist > 36) continue;
      const colorMatch  = _me.heldCard.color  === cap.color;
      const numberMatch = _me.heldCard.number === _targetCard.number;
      if (colorMatch || numberMatch) {
        cap.occupants.push(_myId);
        UI.showToast('✅ نجوت!', 1000);
      } else {
        UI.showToast('❌ بطاقة خاطئة!', 1000);
        _me.heldCard = null;
      }
      break;
    }
  }

  function _checkFragile(entity) {
    if (entity.spectating || !entity.alive) return;
    const entityId = entity.id || 'me';
    for (const f of _fragiles) {
      if (f.state === 'fallen') {
        const onFallen = entity.x > f.x && entity.x < f.x+f.w && entity.y > f.y && entity.y < f.y+f.h;
        if (onFallen && entity === _me && !f.steppedBy.includes(entityId)) {
          f.steppedBy.push(entityId);
          _loseHeart();
        }
        continue;
      }
      const onTile = entity.x > f.x && entity.x < f.x+f.w &&
                     entity.y > f.y && entity.y < f.y+f.h;
      const wasOnTile = f.steppedBy.includes(entityId);
      if (onTile && !wasOnTile) {
        f.steppedBy.push(entityId);
        if (f.state === 'normal') {
          f.state = 'cracked';
        } else if (f.state === 'cracked') {
          f.state = 'fallen';
          if (entity === _me) _loseHeart();
        }
      } else if (!onTile && wasOnTile) {
        f.steppedBy = f.steppedBy.filter(id => id !== entityId);
      }
    }
  }

  function _loseHeart() {
    const me = _getMyPlayer();
    if (!me) return;
    me.hearts--;
    if (me.hearts <= 0) {
      me.alive = false;
      UI.showToast('💀 خرجت من الفعالية!', 2500);
    } else {
      me.spectating = true;
      _me.x = _reversed ? WORLD_W - TILE : TILE/2;
      _me.y = WORLD_H/2;
      UI.showToast(`💔 خسرت قلباً! (${me.hearts}/3)`, 2000);
    }
  }

  function _endRound() {
    _roundActive = false;
    _phase       = 'result';
    _lightsOn    = true;
    const me = _getMyPlayer();
    if (me && me.alive && !me.spectating) {
      const inCapsule = _capsules.some(c => c.occupants.includes(_myId));
      if (!inCapsule) _loseHeart();
    }
    _players.forEach(p => { p.spectating = false; });
    if (me && me.alive) me.spectating = false;
    const alive = _getAlivePlayers();
    if (alive.length <= 1) {
      _phase = 'gameover';
      const winner = alive[0];
      UI.showToast(winner ? `🏆 الفائز: ${winner.name}!` : '🤝 تعادل!', 4000);
      setTimeout(exit, 5000);
      return;
    }
    setTimeout(_startRound, 3000);
  }

  function _updateResult(delta) {}

  function push(dir) {
    const mePlayer = _getMyPlayer();
    if (!mePlayer || mePlayer.spectating || !mePlayer.alive) return;
    if (_me.pushCharge < 1) return;
    _me.pushCharge = 0;
    const pushDist = TILE;
    const offsets  = {
      up   : { dx:  0, dy: -pushDist },
      down : { dx:  0, dy:  pushDist },
      left : { dx: -pushDist, dy: 0  },
      right: { dx:  pushDist, dy: 0  },
    };
    const off = offsets[dir];
    if (!off) return;
    for (const p of _players) {
      if (!p.alive || p.spectating) continue;
      const dist = Utils.distance(_me.x, _me.y, p.x, p.y);
      if (dist > TILE * 1.2) continue;
      const nx = p.x + off.dx;
      const ny = p.y + off.dy;
      p.x = Utils.clamp(nx, 0, WORLD_W);
      p.y = Utils.clamp(ny, 0, WORLD_H);
      _checkFragile(p);
      Network.sendPush(p.id, p.x, p.y);
      UI.showToast(`💥 دفعت ${p.name}!`, 800);
      break;
    }
  }

  function dodge() {
    const mePlayer = _getMyPlayer();
    if (!mePlayer || mePlayer.spectating || !mePlayer.alive) return;
    if (_me.dodgeCharge < 1) return;
    _me.dodgeCharge = 0;
    const success = Math.random() < 0.6;
    if (success) {
      _me.invincible = 0.8;
      UI.showToast('💨 تفاديت!', 700);
    } else {
      UI.showToast('😵 فشل التفادي!', 700);
    }
  }

  function draw(ctx) {
    if (!_active) return;
    const cw = window.innerWidth, ch = window.innerHeight;
    ctx.save();
    ctx.translate(-_camX, -_camY);
    _drawFloor(ctx);
    _drawFragiles(ctx);
    _drawBlockers(ctx);
    _drawLaser(ctx);
    _drawCapsules(ctx);
    _drawCards(ctx);
    _drawPlayers(ctx);
    _drawMe(ctx);
    ctx.restore();
    if (!_lightsOn) _drawDarkness(ctx, cw, ch);
    _drawHUD(ctx, cw, ch);
    _drawActionCard(ctx, cw, ch);
  }

  function _drawFloor(ctx) {
    ctx.fillStyle = '#020008';
    ctx.fillRect(0,0,WORLD_W,WORLD_H);
    const t = Date.now()/1000;
    ctx.fillStyle = '#fff';
    for(let i=0; i<150; i++){
        const sx = (Math.sin(i*123) * 5000 + t * (i%3+1)*20) % WORLD_W;
        const sy = Math.cos(i*321) * WORLD_H;
        const sz = Math.abs(Math.sin(t*2 + i));
        ctx.globalAlpha = sz;
        ctx.fillRect(Math.abs(sx), Math.abs(sy), i%2+1, i%2+1);
    }
    ctx.globalAlpha = 1;
    for (let r=0; r<GRID_ROWS; r++) {
      for (let c=0; c<GRID_COLS; c++) {
        let color;
        const isSafe = (c < SAFE_ZONE_COLS || c >= GRID_END_COL);
        if (isSafe) {
          color = (r+c)%2===0 ? '#150535' : '#100028';
        } else {
          color = (r+c)%2===0 ? '#220800' : '#180500';
        }
        const fill = _reversed ? (c >= GRID_COLS-SAFE_ZONE_COLS ? ((r+c)%2===0 ? '#150535' : '#100028') : color) : color;
        ctx.fillStyle = fill;
        ctx.fillRect(c*TILE, r*TILE, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(c*TILE + 1, r*TILE + 1, TILE - 2, TILE - 2);
        ctx.strokeStyle = isSafe ? 'rgba(136,0,255,0.2)' : 'rgba(255,60,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c*TILE + 2, r*TILE + 2, TILE - 4, TILE - 4);
      }
    }
  }

  function _drawFragiles(ctx) {
    for (const f of _fragiles) {
      if (f.state === 'fallen') {
        ctx.fillStyle = '#010003';
        ctx.fillRect(f.x, f.y, f.w, f.h);
        ctx.strokeStyle = '#220800';
        ctx.lineWidth = 2;
        ctx.strokeRect(f.x+2, f.y+2, f.w-4, f.h-4);
        continue;
      }
      if (f.state === 'normal') {
        ctx.fillStyle = 'rgba(255,140,0,0.18)';
        ctx.fillRect(f.x, f.y, f.w, f.h);
        ctx.strokeStyle = 'rgba(255,140,0,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(f.x+2, f.y+2, f.w-4, f.h-4);
      } else if (f.state === 'cracked') {
        ctx.fillStyle = 'rgba(255,60,0,0.4)';
        ctx.fillRect(f.x, f.y, f.w, f.h);
        ctx.strokeStyle = 'rgba(255,60,0,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(f.x+f.w*0.3, f.y);
        ctx.lineTo(f.x+f.w*0.5, f.y+f.h*0.5);
        ctx.lineTo(f.x+f.w*0.8, f.y+f.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(f.x, f.y+f.h*0.4);
        ctx.lineTo(f.x+f.w*0.5, f.y+f.h*0.5);
        ctx.lineTo(f.x+f.w, f.y+f.h*0.7);
        ctx.stroke();
      }
    }
  }

  function _drawBlockers(ctx) {
    for (const b of _blockers) {
      if (!b.visible) continue;
      ctx.fillStyle = '#3a0a6a';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#8800ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }

  function _drawLaser(ctx) {
    if (!_laserOn) return;
    const lx = _reversed
      ? (GRID_END_COL) * TILE
      : SAFE_ZONE_COLS * TILE;
    const t  = Date.now()/1000;
    const alpha = 0.6 + Math.sin(t*8)*0.4;
    ctx.fillStyle = `rgba(255,0,0,${alpha})`;
    ctx.fillRect(lx-3, 0, 6, WORLD_H);
    const gr = ctx.createLinearGradient(lx-20, 0, lx+20, 0);
    gr.addColorStop(0,'rgba(255,0,0,0)');
    gr.addColorStop(0.5,`rgba(255,0,0,${alpha*0.4})`);
    gr.addColorStop(1,'rgba(255,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(lx-20, 0, 40, WORLD_H);
  }

  function _drawCapsules(ctx) {
    for (const cap of _capsules) {
      const colorMap = {
        red:'#cc1111', blue:'#1144cc',
        green:'#118811', yellow:'#ccaa00'
      };
      const c = colorMap[cap.color] || '#444';
      if (!cap.open) {
        ctx.fillStyle = 'rgba(80,80,80,0.6)';
        ctx.fillRect(cap.x, cap.y, cap.w, cap.h);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.strokeRect(cap.x, cap.y, cap.w, cap.h);
        Utils.drawPixelText(ctx,'🔒', cap.x+cap.w/2, cap.y+cap.h/2,
          {font:'14px serif', align:'center'});
        continue;
      }
      const t = Date.now()/1000;
      const pulse = 0.6+Math.sin(t*3)*0.4;
      ctx.fillStyle = c + '33';
      ctx.fillRect(cap.x, cap.y, cap.w, cap.h);
      ctx.strokeStyle = c;
      ctx.lineWidth = 3;
      ctx.strokeRect(cap.x, cap.y, cap.w, cap.h);
      const gr = ctx.createRadialGradient(
        cap.x+cap.w/2, cap.y+cap.h/2, 0,
        cap.x+cap.w/2, cap.y+cap.h/2, cap.w
      );
      gr.addColorStop(0, c + Math.floor(pulse*80).toString(16).padStart(2,'0'));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(cap.x-10, cap.y-10, cap.w+20, cap.h+20);
      ctx.font = '9px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(cap.color.toUpperCase(), cap.x+cap.w/2, cap.y+14);
    }
  }

  function _drawCards(ctx) {
    for (const c of _cards) {
      if (c.taken) continue;
      const colorMap = {
        red:'#cc1111', blue:'#1144cc',
        green:'#118811', yellow:'#ccaa00',
      };
      const bg = colorMap[c.color] || '#555';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      Utils.drawPixelRect(ctx, c.x-14+2, c.y-20+2, 28, 40, 3);
      Utils.drawPixelRect(ctx, c.x-14, c.y-20, 28, 40, 3, '#fff', '#111', 1);
      Utils.drawPixelRect(ctx, c.x-11, c.y-17, 22, 34, 4, bg);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = bg;
      ctx.font = 'bold 12px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.number.toString(), c.x, c.y+1);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 6px "Press Start 2P"';
      ctx.fillText(c.number.toString(), c.x-7, c.y-12);
      ctx.fillText(c.number.toString(), c.x+7, c.y+13);
    }
  }

  function _drawPlayers(ctx) {
    for (const p of _players) {
      if (!p.alive && !p.spectating) continue;
      const char = Player.getAllChars()[p.charId];
      if (!char) continue;
      ctx.save();
      if (p.spectating) ctx.globalAlpha = 0.4;
      char.draw(ctx, p.x-12, p.y-14, 'down', p.frame, p.moving);
      Utils.drawPixelText(ctx, p.name, p.x, p.y-22,
        { font:'5px "Press Start 2P"', color:'#f0c040', align:'center' });
      let heartsStr = '';
      for (let i=0; i<p.hearts; i++) heartsStr += '❤️';
      ctx.font = '8px serif';
      ctx.textAlign = 'center';
      ctx.fillText(heartsStr, p.x, p.y-32);
      if (p.hearts === 1) {
        const pulse = 0.5+Math.sin(Date.now()/200)*0.5;
        ctx.globalAlpha = pulse * (p.spectating ? 0.4 : 1);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x-14, p.y-14, 28, 36);
      }
      if (p.card) {
        const colorMap = {red:'#cc1111',blue:'#1144cc',green:'#118811',yellow:'#ccaa00'};
        ctx.fillStyle = colorMap[p.card.color]||'#555';
        ctx.fillRect(p.x+10, p.y-20, 14, 18);
        ctx.fillStyle='#fff';
        ctx.font='bold 7px monospace';
        ctx.textAlign='center';
        ctx.fillText(p.card.number.toString(), p.x+17, p.y-10);
      }
      ctx.restore();
    }
  }

  function _drawMe(ctx) {
    const me = _getMyPlayer();
    if (!me || (!me.alive && !me.spectating)) return;
    ctx.save();
    if (me.spectating) ctx.globalAlpha = 0.4;
    if (_me.invincible > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now()/80)*0.5;
    }
    const char = Player.getAllChars()[Player.getCharId()];
    if (char) char.draw(ctx, _me.x-12, _me.y-14, 'down', _me.frame, _me.moving);
    if (me.hearts === 1) {
      const pulse = 0.5+Math.sin(Date.now()/200)*0.5;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(_me.x-14, _me.y-14, 28, 36);
    }
    ctx.restore();
  }

  function _drawDarkness(ctx, cw, ch) {
    const gr = ctx.createRadialGradient(
      _me.x-_camX, _me.y-_camY, TILE*0.5,
      _me.x-_camX, _me.y-_camY, TILE*3
    );
    gr.addColorStop(0,'rgba(0,0,0,0)');
    gr.addColorStop(1,'rgba(0,0,0,0.96)');
    ctx.fillStyle = gr;
    ctx.fillRect(0,0,cw,ch);
  }

  function _drawHUD(ctx, cw, ch) {
    const me = _getMyPlayer();
    const tx = cw/2, ty = 14;
    ctx.fillStyle='rgba(0,0,0,0.85)';
    ctx.fillRect(tx-60, ty, 40, 40);
    ctx.strokeStyle='#f0c040';
    ctx.lineWidth=2;
    ctx.strokeRect(tx-60, ty, 40, 40);
    if (_targetCard) {
      const colorMap={red:'#cc1111',blue:'#1144cc',green:'#118811',yellow:'#ccaa00'};
      const bg = colorMap[_targetCard.color]||'#fff';
      Utils.drawPixelRect(ctx, tx-51, ty+6, 22, 28, 3, '#fff', '#111', 1);
      Utils.drawPixelRect(ctx, tx-49, ty+8, 18, 24, 2, bg);
      ctx.save();
      ctx.translate(tx-40, ty+20);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle='#fff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle=bg;
      ctx.font='bold 11px "Press Start 2P"';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(_targetCard.number.toString(), tx-40, ty+21);
    }
    const timerColor = _roundTimer<4 ? '#ff0088' : '#f0c040';
    const timerPulse = _roundTimer<4 ? 0.7+Math.sin(Date.now()/100)*0.3 : 1;
    ctx.save();
    ctx.globalAlpha = timerPulse;
    Utils.drawPixelText(ctx, Math.ceil(_roundTimer)+'s', cw/2, 58,
      {font:'10px "Press Start 2P"',color:timerColor,align:'center'});
    ctx.restore();
    if (me) {
      let h='';
      for(let i=0;i<me.hearts;i++) h+='❤️';
      ctx.font='14px serif';
      ctx.textAlign='left';
      ctx.fillText(h, 14, 24);
    }
    if (_phase==='countdown' && _countdownT>0) {
      const n = Math.ceil(_countdownT);
      ctx.save();
      const scale = 1+(_countdownT%1)*0.5;
      ctx.translate(cw/2, ch/2);
      ctx.scale(scale,scale);
      ctx.font='bold 48px "Press Start 2P"';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillStyle='rgba(255,0,136,0.9)';
      ctx.fillText(n===3?'3':n===2?'2':'GO!', 2, 2);
      ctx.fillStyle='#fff';
      ctx.fillText(n===3?'3':n===2?'2':'GO!', 0, 0);
      ctx.restore();
    }
    _drawChargeBar(ctx, 14, ch-44, 80, 12, _me.pushCharge, '#ff4400', '👊');
    _drawChargeBar(ctx, 14, ch-26, 80, 12, _me.dodgeCharge,'#00aaff', '💨');
    if (_phase==='result') {
      Utils.drawPixelText(ctx,'نهاية الجولة...', cw/2, ch/2-20,
        {font:'8px "Press Start 2P"',color:'#f0c040',align:'center'});
    }
    Utils.drawPixelText(ctx,`R${_roundNum}`, 14, ch-60,
      {font:'6px "Press Start 2P"',color:'#888',align:'left'});
  }

  function _drawChargeBar(ctx, x, y, w, h, charge, color, icon) {
    ctx.fillStyle='rgba(0,0,0,0.7)';
    ctx.fillRect(x, y, w+20, h);
    ctx.fillStyle=color;
    ctx.fillRect(x, y, (w)*charge, h);
    ctx.strokeStyle='rgba(255,255,255,0.3)';
    ctx.lineWidth=1;
    ctx.strokeRect(x, y, w+20, h);
    ctx.font='9px serif';
    ctx.textAlign='left';
    ctx.fillText(icon, x+w+2, y+h-1);
  }

  function _drawActionCard(ctx, cw, ch) {
    if (!_actionCard) return;
    const labels={
      reverse:'🔄 REVERSE', skip:'⏭ SKIP',
      plus2:'+2 🃏', wild:'🌑 WILD'
    };
    const colors={
      reverse:'#8800ff',skip:'#ff8800',
      plus2:'#0088ff',wild:'#111'
    };
    ctx.fillStyle=colors[_actionCard]||'#333';
    ctx.fillRect(cw-80, 14, 70, 28);
    ctx.strokeStyle='#fff';
    ctx.lineWidth=1;
    ctx.strokeRect(cw-80, 14, 70, 28);
    Utils.drawPixelText(ctx, labels[_actionCard]||_actionCard,
      cw-45, 18,
      {font:'5px "Press Start 2P"',color:'#fff',align:'center'});
  }

  function _buildUI() {
    if (document.getElementById('uno-btns')) return;
    const wrap = document.createElement('div');
    wrap.id = 'uno-btns';
    wrap.style.cssText=[
      'position:fixed','bottom:24px','right:24px',
      'z-index:50','display:grid',
      'grid-template-columns:44px 44px 44px',
      'grid-template-rows:44px 44px 44px',
      'gap:4px','pointer-events:auto',
    ].join(';');
    const btnStyle=(bg)=>[
      `background:${bg}`,'border:2px solid rgba(255,255,255,0.4)',
      'color:#fff','font-size:16px','cursor:pointer',
      'border-radius:6px','display:flex',
      'align-items:center','justify-content:center',
    ].join(';');
    const btns=[
      {id:'uno-up',   icon:'⬆', dir:'up',    col:2, row:1, bg:'#333'},
      {id:'uno-left', icon:'⬅', dir:'left',  col:1, row:2, bg:'#333'},
      {id:'uno-dodge',icon:'💨', dir:'dodge', col:2, row:2, bg:'#004488'},
      {id:'uno-right',icon:'➡', dir:'right', col:3, row:2, bg:'#333'},
      {id:'uno-down', icon:'⬇', dir:'down',  col:2, row:3, bg:'#333'},
    ];
    for (const b of btns) {
      const btn=document.createElement('button');
      btn.id=b.id;
      btn.innerHTML=b.icon;
      btn.style.cssText=btnStyle(b.bg)+
        `;grid-column:${b.col};grid-row:${b.row}`;
      btn.addEventListener('touchstart',e=>{
        e.preventDefault();
        if(b.dir==='dodge') dodge();
        else push(b.dir);
      },{passive:false});
      btn.addEventListener('mousedown',()=>{
        if(b.dir==='dodge') dodge();
        else push(b.dir);
      });
      wrap.appendChild(btn);
    }
    document.body.appendChild(wrap);
  }

  function _removeUI() {
    const el=document.getElementById('uno-btns');
    if(el) el.remove();
  }

  function _getMyPlayer() {
    return _players.find(p=>p.id===_myId) || null;
  }

  function _getAlivePlayers() {
    const list = _players.filter(p=>p.alive);
    const me   = _getMyPlayer();
    if (me && me.alive) list.push(me);
    return list;
  }

  function exit() {
    _active = false;
    _removeUI();
    if (typeof UI !== 'undefined' && UI.toggleWorldHUD) {
      UI.toggleWorldHUD(true);
    }
    if (typeof EventManager !== 'undefined') {
      EventManager.startTransitionOut(() => {
        UI.showToast('عدت إلى العالم 🌍', 2000);
      });
    }
  }

  function isActive() { return _active; }

  return { enter, exit, update, draw, push, dodge, isActive };
})();
