'use strict';
const MiniMap = (() => {
  let _visible = true;
  let _canvas  = null;
  let _ctx     = null;
  let _toggleBtn = null;

  function _size() {
    return Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.22);
  }

  function init() {
    _canvas = document.createElement('canvas');
    _canvas.id = 'minimap-canvas';
    _canvas.style.cssText = [
      'position:fixed',
      'bottom:160px',
      'left:16px',
      'border-radius:6px',
      'border:2px solid rgba(240,192,64,0.6)',
      'opacity:0.72',
      'z-index:25',
      'pointer-events:none',
      'image-rendering:pixelated',
    ].join(';');
    document.body.appendChild(_canvas);

    _toggleBtn = document.createElement('button');
    _toggleBtn.id = 'minimap-toggle';
    _toggleBtn.textContent = '👁';
    _toggleBtn.style.cssText = [
      'position:fixed',
      'bottom:148px',
      'left:16px',
      'width:28px',
      'height:18px',
      'background:rgba(10,10,20,0.8)',
      'border:1px solid rgba(240,192,64,0.5)',
      'color:#f0c040',
      'font-size:10px',
      'cursor:pointer',
      'z-index:26',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'border-radius:0 0 4px 4px',
      'padding:0',
    ].join(';');
    _toggleBtn.addEventListener('click', toggle);
    _toggleBtn.addEventListener('touchend', e => { e.preventDefault(); toggle(); });
    document.body.appendChild(_toggleBtn);

    _ctx = _canvas.getContext('2d');
  }

  function toggle() {
    _visible = !_visible;
    _canvas.style.display  = _visible ? 'block' : 'none';
    _toggleBtn.style.opacity = _visible ? '1' : '0.4';
  }

  function show() {
    if (_toggleBtn) _toggleBtn.style.display = 'flex';
    if (_canvas) _canvas.style.display = _visible ? 'block' : 'none';
  }

  function hide() {
    if (_toggleBtn) _toggleBtn.style.display = 'none';
    if (_canvas) _canvas.style.display = 'none';
  }

  function draw(playerX, playerY, playerAngle, otherPlayers) {
    if (!_visible || !_ctx) return;
    const sz  = _size();
    _canvas.width  = sz;
    _canvas.height = sz;
    const canvasBottom = parseInt(_canvas.style.bottom) || 160;
    _toggleBtn.style.bottom = (canvasBottom - 20) + 'px';
    _toggleBtn.style.width  = sz + 'px';
    const ctx    = _ctx;
    const obs    = typeof Collision !== 'undefined' ? Collision.getObstacles() : [];
    const world  = typeof GameMap   !== 'undefined' ? GameMap.getWorldSize()   : { w: 2560, h: 1920 };
    const scaleX = sz / world.w;
    const scaleY = sz / world.h;
    ctx.clearRect(0, 0, sz, sz);
    ctx.fillStyle = 'rgba(5,5,20,0.78)';
    ctx.fillRect(0, 0, sz, sz);
    for (const o of obs) {
      if (o.type !== 'wall') continue;
      ctx.fillStyle = 'rgba(100,50,180,0.85)';
      ctx.fillRect(
        o.x * scaleX,
        o.y * scaleY,
        Math.max(1, o.w * scaleX),
        Math.max(1, o.h * scaleY)
      );
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 0.5;
    const step = 64;
    for (let x = 0; x < world.w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x * scaleX, 0);
      ctx.lineTo(x * scaleX, sz);
      ctx.stroke();
    }
    for (let y = 0; y < world.h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0,  y * scaleY);
      ctx.lineTo(sz, y * scaleY);
      ctx.stroke();
    }
    if (typeof GameMap !== 'undefined') {
      for (const dev of GameMap.getDevices()) {
        _drawIcon(ctx, dev.x + dev.w/2, dev.y + dev.h/2, scaleX, scaleY, '🖥', 7);
      }
    }
    if (typeof GameMap !== 'undefined') {
      const chairs = GameMap.getChairs();
      ctx.fillStyle = 'rgba(40,160,40,0.8)';
      for (const ch of chairs) {
        ctx.beginPath();
        ctx.arc(ch.x * scaleX, ch.y * scaleY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (typeof GameMap !== 'undefined') {
      const door = GameMap.getDoorRect();
      ctx.fillStyle = 'rgba(240,192,64,0.9)';
      ctx.fillRect(
        door.x * scaleX,
        door.y * scaleY,
        Math.max(2, door.w * scaleX),
        Math.max(4, door.h * scaleY)
      );
    }
    if (otherPlayers) {
      for (const p of otherPlayers.values()) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(p.x * scaleX, p.y * scaleY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const px = playerX * scaleX;
    const py = playerY * scaleY;
    const arrowSize = Math.max(4, sz * 0.045);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(playerAngle);
    ctx.fillStyle   = '#ff2020';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(0,           -arrowSize * 1.4);
    ctx.lineTo( arrowSize * 0.7,  arrowSize * 0.8);
    ctx.lineTo(0,            arrowSize * 0.3);
    ctx.lineTo(-arrowSize * 0.7,  arrowSize * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(240,192,64,0.5)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(0, 0, sz, sz);
  }

  function _drawIcon(ctx, wx, wy, sx, sy, icon, size) {
    ctx.font      = size + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, wx * sx, wy * sy);
  }

  return { init, draw, toggle, show, hide };
})();
