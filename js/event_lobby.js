'use strict';
const EventLobby = (() => {
  const SERVER = 'https://ncore-mmo-server.onrender.com';
  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 50;
  const BASE_TIMER  = 30;
  const ADD_PER_PLAYER = 10;

  let _active      = false;
  let _eventId     = null;
  let _players     = [];
  let _timer       = 0;
  let _timerActive = false;
  let _pollInterval= null;

  // خريطة اللوبي
  const LOBBY_W = 800, LOBBY_H = 600;
  let _camX = 0, _camY = 0;
  let _px = LOBBY_W/2, _py = LOBBY_H/2;

  // ═══════════════════════════════
  //  PUBLIC
  // ═══════════════════════════════
  function enter(eventId) {
    _active  = true;
    _eventId = eventId;
    _players = [];
    _timer   = 0;
    _timerActive = false;
    _px = LOBBY_W/2;
    _py = LOBBY_H/2;

    fetch(`${SERVER}/api/event/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        playerId: Network.getMyId(),
        playerName: Network.getUsername()
      })
    }).catch(() => {});

    _pollInterval = setInterval(_pollLobby, 2000);
    UI.showToast('🎮 دخلت لوبي الفعالية!', 2000);
  }

  function exit() {
    if (!_active) return;
    clearInterval(_pollInterval);
    _active = false;

    Network.spendCoins(-1); // استرداد العملة
    fetch(`${SERVER}/api/event/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: _eventId, playerId: Network.getMyId() })
    }).catch(() => {});

    if (typeof EventManager !== 'undefined') {
      EventManager.startTransitionOut(() => {
        UI.showToast('خرجت من اللوبي — استُرجعت عملتك 🪙', 2500);
      });
    } else {
      UI.showToast('خرجت من اللوبي', 1500);
    }
  }

  // ═══════════════════════════════
  //  INTERNAL
  // ═══════════════════════════════
  async function _pollLobby() {
    try {
      const res  = await fetch(`${SERVER}/api/event/lobby?eventId=${_eventId}`);
      const data = await res.json();
      if (!_active) return;
      _players     = data.players || [];
      _timer       = data.timer   || 0;
      _timerActive = data.timerActive || false;

      if (data.started) {
        clearInterval(_pollInterval);
        _startGame();
      }
    } catch (e) {}
  }

  function _startGame() {
    _active = false;
    if (_eventId === 'cursed_uno') {
      if (typeof EventManager !== 'undefined') {
        EventManager.startTransitionOut(() => {
          // بدء لعبة الـ Uno الفعلية
          if (typeof EventUno !== 'undefined') {
            EventUno.enter(_players);
          } else {
            UI.showToast('حدث خطأ: لم يتم تحميل لعبة Uno', 2000);
          }
        });
      } else {
        UI.showToast('🎴 تبدأ اللعبة!', 2000);
      }
    }
  }

  function update(delta) {
    if (!_active) return;

    const jx = Joystick.getDx(), jy = Joystick.getDy();
    const mag = Math.sqrt(jx*jx+jy*jy);
    if (mag > 0.05) {
      _px = Utils.clamp(_px + jx*120*delta, 20, LOBBY_W-20);
      _py = Utils.clamp(_py + jy*120*delta, 20, LOBBY_H-20);
    }

    _camX = Utils.clamp(_px - window.innerWidth/2,  0, Math.max(0, LOBBY_W - window.innerWidth));
    _camY = Utils.clamp(_py - window.innerHeight/2, 0, Math.max(0, LOBBY_H - window.innerHeight));
  }

  function draw(ctx) {
    if (!_active) return;
    const cw = window.innerWidth, ch = window.innerHeight;

    // لا نرسم لو كانت نافذة الدردشة مفتوحة
    const chatModal = document.getElementById('chat-modal');
    if (chatModal && chatModal.style.display === 'flex') return;

    ctx.fillStyle = '#05000f';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(-_camX, -_camY);

    // أرضية
    for (let r=0; r<Math.ceil(LOBBY_H/32); r++) {
      for (let c=0; c<Math.ceil(LOBBY_W/32); c++) {
        ctx.fillStyle = (r+c)%2===0 ? '#0d0025' : '#0a001e';
        ctx.fillRect(c*32, r*32, 32, 32);
      }
    }
    // شبكة خفيفة
    ctx.strokeStyle = 'rgba(136,0,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let x=0; x<=LOBBY_W; x+=32) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,LOBBY_H); ctx.stroke();
    }
    for (let y=0; y<=LOBBY_H; y+=32) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(LOBBY_W,y); ctx.stroke();
    }

    // جدران
    ctx.fillStyle = '#160830';
    ctx.fillRect(0, 0, LOBBY_W, 32);
    ctx.fillRect(0, LOBBY_H-32, LOBBY_W, 32);
    ctx.fillRect(0, 32, 32, LOBBY_H-64);
    ctx.fillRect(LOBBY_W-32, 32, 32, LOBBY_H-64);

    const t = Date.now()/1000;
    const gc = ['#8800ff','#00ff88','#ff0088'][Math.floor(t*2)%3];
    ctx.strokeStyle = gc;
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, LOBBY_W-4, LOBBY_H-4);

    _drawCenteredGlitchTitle(ctx);

    // رسم اللاعبين الآخرين
    for (const p of _players) {
      if (p.id === Network.getMyId()) continue;
      ctx.fillStyle = 'rgba(0,255,136,0.8)';
      ctx.beginPath();
      ctx.arc(p.lobbyX||LOBBY_W/2, p.lobbyY||LOBBY_H/2, 8, 0, Math.PI*2);
      ctx.fill();
      Utils.drawPixelText(ctx, p.name||'لاعب', p.lobbyX||LOBBY_W/2, (p.lobbyY||LOBBY_H/2)-16,
        { font:'5px "Press Start 2P"', color:'#00ff88', align:'center' });
    }

    // رسم اللاعب الحالي
    if (window.Player && Player.getAllChars) {
      const char = Player.getAllChars()[Player.getCharId()];
      if (char) char.draw(ctx, _px-12, _py-14, 'down', 0, false);
    } else {
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(_px-8, _py-12, 16, 24);
    }

    ctx.restore();

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(cw/2-90, 12, 180, 30);
    ctx.strokeStyle = '#8800ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cw/2-90, 12, 180, 30);
    Utils.drawPixelText(ctx,
      `👥 ${_players.length}/${MAX_PLAYERS}`,
      cw/2, 18,
      { font:'7px "Press Start 2P"', color:'#00ff88', align:'center' }
    );

    if (_timerActive && _timer > 0) {
      const pulse = 0.7+Math.sin(t*(_timer<5?8:3))*0.3;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(cw/2-50, 50, 100, 36);
      ctx.strokeStyle = _timer<5?'#ff0088':'#00ff88';
      ctx.lineWidth=2;
      ctx.strokeRect(cw/2-50, 50, 100, 36);
      Utils.drawPixelText(ctx,
        `${Math.ceil(_timer)}s`,
        cw/2, 56,
        { font:'12px "Press Start 2P"', color:_timer<5?'#ff0088':'#f0c040', align:'center' }
      );
      ctx.restore();
    }

    if (!_timerActive) {
      const waitAlpha = 0.5+Math.sin(t*2)*0.5;
      ctx.save();
      ctx.globalAlpha = waitAlpha;
      Utils.drawPixelText(ctx,
        _players.length < MIN_PLAYERS
          ? `في انتظار ${MIN_PLAYERS - _players.length} لاعبين...`
          : 'سيبدأ قريباً...',
        cw/2, ch-50,
        { font:'7px "Press Start 2P"', color:'#aaa', align:'center' }
      );
      ctx.restore();
    }

    ctx.fillStyle='rgba(10,0,30,0.9)';
    ctx.fillRect(cw-110, ch-44, 100, 32);
    ctx.strokeStyle='#ff0088';
    ctx.lineWidth=2;
    ctx.strokeRect(cw-110, ch-44, 100, 32);
    Utils.drawPixelText(ctx,'✖ خروج', cw-60, ch-36,
      { font:'6px "Press Start 2P"', color:'#ff0088', align:'center' }
    );
  }

  function _drawCenteredGlitchTitle(ctx) {
    const cx = LOBBY_W/2, cy = LOBBY_H * 0.22;
    const t  = Date.now()/1000;

    ctx.save();
    ctx.font = 'bold 14px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = ['CURSED', 'UNO GRID'];
    lines.forEach((line, i) => {
      const ly  = cy + i*22 - 11;
      const gx  = Math.sin(t*18+i*3) * (Math.random()>0.92?5:0);
      const gy  = Math.cos(t*12+i)   * (Math.random()>0.95?2:0);

      ctx.fillStyle='rgba(255,0,136,0.6)';
      ctx.fillText(line, cx+gx+2, ly+1+gy);
      ctx.fillStyle='rgba(136,0,255,0.6)';
      ctx.fillText(line, cx-gx-2, ly-1+gy);
      ctx.fillStyle = i===0 ? '#00ff88' : '#ff0088';
      ctx.fillText(line, cx, ly);
    });

    ctx.strokeStyle = 'rgba(0,255,136,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx-80, cy+24);
    ctx.lineTo(cx+80, cy+24);
    ctx.stroke();
    ctx.restore();
  }

  function handleTap(x, y) {
    if (!_active) return false;
    const cw = window.innerWidth, ch = window.innerHeight;
    if (x > cw-110 && x < cw-10 && y > ch-44 && y < ch-12) {
      exit();
      return true;
    }
    return false;
  }

  function isActive() { return _active; }

  return { enter, exit, update, draw, handleTap, isActive };
})();