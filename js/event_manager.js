'use strict';
const EventManager = (() => {
  // ═══════════════════════════════
  //  STATE
  // ═══════════════════════════════
  let _nearEventDoor = false;
  let _menuOpen      = false;
  let _transitioning = false;
  let _transitionT   = 0;
  let _transitionDir = 'in'; // 'in' | 'out'
  let _onTransitionDone = null;
  let _promptA = 0, _promptT = 0;

  const EVENTS = [
    {
      id        : 'cursed_uno',
      nameLines : ['CURSED', 'UNO GRID'],
      desc      : 'سباق البقاء داخل شبكة الأونو الملعونة',
      cost      : 1,
      color1    : '#8800ff',
      color2    : '#00ff88',
      color3    : '#ff0088',
      available : true,
    },
    // مستقبلاً تُضاف فعاليات هنا
  ];

  // ═══════════════════════════════
  //  INIT
  // ═══════════════════════════════
  function init() {
    _buildMenuDOM();
  }

  // ═══════════════════════════════
  //  BUILD MENU DOM
  // ═══════════════════════════════
  function _buildMenuDOM() {
    if (document.getElementById('event-menu')) return;

    const overlay = document.createElement('div');
    overlay.id = 'event-menu';
    overlay.style.cssText = [
      'display:none','position:fixed','inset:0',
      'background:rgba(0,0,0,0.88)',
      'z-index:200','align-items:center','justify-content:center',
      'flex-direction:column','gap:16px',
    ].join(';');

    overlay.innerHTML = `
      <div id="event-menu-box" style="
        background:#0a0015;
        border:3px solid #8800ff;
        padding:24px 20px;
        min-width:300px;max-width:90vw;
        font-family:'Press Start 2P',monospace;
        box-shadow:0 0 40px rgba(136,0,255,0.5),0 0 80px rgba(0,255,136,0.15);
        display:flex;flex-direction:column;gap:16px;
        clip-path:polygon(0 8px,8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px));
      ">
        <div style="text-align:center;color:#00ff88;font-size:8px;letter-spacing:3px;margin-bottom:4px;">
          ⚡ EVENTS PORTAL ⚡
        </div>
        <div id="event-list" style="display:flex;flex-direction:column;gap:12px;"></div>
        <button id="event-close-btn" style="
          background:#1a0030;border:2px solid #ff0088;color:#ff0088;
          font-family:'Press Start 2P',monospace;font-size:8px;
          padding:10px;cursor:pointer;margin-top:4px;
        ">✖ إغلاق</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('event-close-btn').onclick = closeMenu;

    _renderEventList();
  }

  function _renderEventList() {
    const list = document.getElementById('event-list');
    if (!list) return;
    list.innerHTML = '';

    for (const ev of EVENTS) {
      const card = document.createElement('div');
      card.style.cssText = [
        'background:#0d0020','border:2px solid ' + ev.color1,
        'padding:14px 12px','cursor:pointer',
        'transition:box-shadow 0.2s',
        'display:flex','flex-direction:column','gap:8px',
      ].join(';');

      // اسم Glitch
      const nameDiv = document.createElement('canvas');
      nameDiv.width  = 260;
      nameDiv.height = 52;
      nameDiv.style.cssText = 'width:100%;image-rendering:pixelated;';
      card.appendChild(nameDiv);
      _drawGlitchTitle(nameDiv, ev);

      // وصف
      const descEl = document.createElement('div');
      descEl.style.cssText = 'color:#aaa;font-size:6px;line-height:1.8;direction:rtl;';
      descEl.textContent = ev.desc;
      card.appendChild(descEl);

      // زر الدخول
      const enterBtn = document.createElement('button');
      enterBtn.style.cssText = [
        'background:' + ev.color1,'color:#fff',
        'border:none','font-family:\'Press Start 2P\',monospace',
        'font-size:7px','padding:10px','cursor:pointer',
        'box-shadow:0 0 12px ' + ev.color1,
      ].join(';');
      enterBtn.textContent = ev.available ? `▶ ادخل (${ev.cost} 🪙)` : '🔒 قريباً';
      enterBtn.disabled = !ev.available;
      enterBtn.onclick = () => _confirmEnter(ev);
      card.appendChild(enterBtn);

      list.appendChild(card);
    }
  }

  // ═══════════════════════════════
  //  GLITCH TITLE DRAW
  // ═══════════════════════════════
  function _drawGlitchTitle(canvas, ev) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const t = Date.now() / 1000;

    ctx.clearRect(0, 0, w, h);

    const lines = ev.nameLines;
    const fontSize = lines.length === 1 ? 14 : 11;
    ctx.font = `bold ${fontSize}px "Press Start 2P"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineH = h / (lines.length + 1);

    for (let li = 0; li < lines.length; li++) {
      const ly = lineH * (li + 1);
      const text = lines[li];
      const gx = Math.sin(t * 20 + li) * (Math.random() > 0.9 ? 4 : 0);

      // طبقة حمراء
      ctx.fillStyle = ev.color3;
      ctx.globalAlpha = 0.7;
      ctx.fillText(text, w/2 + gx + 2, ly + 1);

      // طبقة زرقاء
      ctx.fillStyle = ev.color1;
      ctx.globalAlpha = 0.7;
      ctx.fillText(text, w/2 - gx - 2, ly - 1);

      // طبقة رئيسية
      ctx.fillStyle = ev.color2;
      ctx.globalAlpha = 1;
      ctx.fillText(text, w/2, ly);
    }
    ctx.globalAlpha = 1;
  }

  // ═══════════════════════════════
  //  CONFIRM DIALOG
  // ═══════════════════════════════
  function _confirmEnter(ev) {
    const coins = Network.getCoins();
    if (coins < ev.cost) {
      UI.showToast('لا يوجد عملات كافية! 🪙', 2000);
      return;
    }

    const existing = document.getElementById('event-confirm');
    if (existing) existing.remove();

    const dlg = document.createElement('div');
    dlg.id = 'event-confirm';
    dlg.style.cssText = [
      'position:fixed','inset:0','background:rgba(0,0,0,0.92)',
      'z-index:300','display:flex','align-items:center','justify-content:center',
    ].join(';');

    dlg.innerHTML = `
      <div style="
        background:#0a0015;border:3px solid ${ev.color2};
        padding:24px;font-family:'Press Start 2P',monospace;
        text-align:center;max-width:280px;
        box-shadow:0 0 30px ${ev.color1};
        display:flex;flex-direction:column;gap:14px;
      ">
        <div style="color:${ev.color2};font-size:9px;">تأكيد الدخول</div>
        <div style="color:#fff;font-size:7px;line-height:2;direction:rtl;">
          سيتم خصم<br>
          <span style="color:${ev.color3};font-size:11px;">${ev.cost} 🪙</span><br>
          للدخول إلى<br>
          <span style="color:${ev.color2};">${ev.nameLines.join(' ')}</span>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="ev-confirm-yes" style="
            background:${ev.color1};color:#fff;border:none;
            font-family:'Press Start 2P',monospace;font-size:7px;
            padding:10px 16px;cursor:pointer;
            box-shadow:0 0 10px ${ev.color1};
          ">✔ ادخل</button>
          <button id="ev-confirm-no" style="
            background:#1a0030;color:#ff0088;
            border:2px solid #ff0088;
            font-family:'Press Start 2P',monospace;font-size:7px;
            padding:10px 16px;cursor:pointer;
          ">✖ إلغاء</button>
        </div>
      </div>
    `;

    document.body.appendChild(dlg);
    document.getElementById('ev-confirm-yes').onclick = () => {
      dlg.remove();
      _enterEvent(ev);
    };
    document.getElementById('ev-confirm-no').onclick = () => dlg.remove();
  }

  // ═══════════════════════════════
  //  ENTER EVENT
  // ═══════════════════════════════
  function _enterEvent(ev) {
    closeMenu();
    Network.spendCoins(ev.cost);
    _startTransition('in', () => {
      if (ev.id === 'cursed_uno') {
        EventLobby.enter('cursed_uno');
      }
    });
  }

  // ═══════════════════════════════
  //  TRANSITION ANIMATION (الداخلية)
  // ═══════════════════════════════
  function _startTransition(dir, onDone) {
    _transitioning    = true;
    _transitionDir    = dir;
    _transitionT      = 0;
    _onTransitionDone = onDone;
  }

  function _updateTransition(delta) {
    if (!_transitioning) return;
    _transitionT += delta;

    if (_transitionT >= 0.8) {
      _transitioning = false;
      _transitionT   = 0;
      if (_onTransitionDone) { _onTransitionDone(); _onTransitionDone = null; }
    }
  }

  // الواجهة العامة للتحديث (تستدعي الدالة الداخلية)
  function updateTransition(delta) {
    _updateTransition(delta);
  }

  function drawTransition(ctx, cw, ch) {
    if (!_transitioning) return;
    const prog = Math.min(_transitionT / 0.8, 1);
    const alpha = _transitionDir === 'in' ? prog : 1 - prog;

    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, cw, ch);

    if (alpha > 0.3) {
      const lines = Math.floor(alpha * 12);
      for (let i = 0; i < lines; i++) {
        const ly  = Math.random() * ch;
        const lh  = Math.random() * 4 + 1;
        const lw  = Math.random() * cw * 0.4;
        const lx  = Math.random() * cw;
        const gc  = ['#8800ff','#00ff88','#ff0088'][i % 3];
        ctx.fillStyle = `rgba(${gc === '#8800ff' ? '136,0,255' : gc === '#00ff88' ? '0,255,136' : '255,0,136'},${alpha * 0.6})`;
        ctx.fillRect(lx, ly, lw, lh);
      }
    }

    if (alpha > 0.5) {
      ctx.save();
      ctx.font = '10px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const gx = (Math.random() - 0.5) * 6 * alpha;
      ctx.fillStyle = '#00ff88';
      ctx.fillText('ENTERING EVENT...', cw/2 + gx, ch/2);
      ctx.fillStyle = '#8800ff';
      ctx.fillText('ENTERING EVENT...', cw/2 - gx, ch/2);
      ctx.fillStyle = '#fff';
      ctx.fillText('ENTERING EVENT...', cw/2, ch/2);
      ctx.restore();
    }
  }

  // ═══════════════════════════════
  //  UPDATE
  // ═══════════════════════════════
  function update(delta) {
    _updateTransition(delta); // استدعاء الدالة الداخلية

    const pr   = Player.getRect();
    const door = GameMap.getEventDoorRect();
    const dist = Utils.distance(
      pr.x + pr.w/2, pr.y + pr.h/2,
      door.x + door.w/2, door.y + door.h/2
    );
    _nearEventDoor = dist < 72 && !_menuOpen;

    _promptT += delta * 3;
    _promptA = _nearEventDoor ? 0.6 + Math.sin(_promptT) * 0.4 : 0;
  }

  // ═══════════════════════════════
  //  DRAW PROMPT
  // ═══════════════════════════════
  function drawPrompt(ctx) {
    if (_promptA <= 0) return;
    const door = GameMap.getEventDoorRect();
    const cx   = door.x + door.w/2;
    const cy   = door.y - 16;

    ctx.save();
    ctx.globalAlpha = _promptA;
    Utils.drawPixelRect(ctx, cx-28, cy-11, 56, 20, 3,
      'rgba(136,0,255,0.92)', '#8800ff', 2);
    Utils.drawPixelText(ctx, '▶ TAP', cx, cy-7,
      { font:'6px "Press Start 2P"', color:'#00ff88', align:'center' });
    ctx.restore();
  }

  // ═══════════════════════════════
  //  MENU
  // ═══════════════════════════════
  function tryOpenMenu() {
    if (!_nearEventDoor || _menuOpen) return;
    openMenu();
  }

  function openMenu() {
    _menuOpen = true;
    const el  = document.getElementById('event-menu');
    if (el) el.style.display = 'flex';
    _startGlitchLoop();
  }

  function closeMenu() {
    _menuOpen = false;
    const el  = document.getElementById('event-menu');
    if (el) el.style.display = 'none';
  }

  let _glitchRaf = null;
  function _startGlitchLoop() {
    if (_glitchRaf) cancelAnimationFrame(_glitchRaf);
    function loop() {
      if (!_menuOpen) { _glitchRaf = null; return; }
      document.querySelectorAll('#event-list canvas').forEach((cvs, i) => {
        if (EVENTS[i]) _drawGlitchTitle(cvs, EVENTS[i]);
      });
      _glitchRaf = requestAnimationFrame(loop);
    }
    _glitchRaf = requestAnimationFrame(loop);
  }

  function isNearDoor()    { return _nearEventDoor; }
  function isTransitioning(){ return _transitioning; }
  function startTransitionOut(onDone) { _startTransition('out', onDone); }

  return {
    init, update, drawPrompt, drawTransition, updateTransition,
    tryOpenMenu, closeMenu, isNearDoor, isTransitioning, startTransitionOut
  };
})();