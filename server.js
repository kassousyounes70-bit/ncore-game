'use strict';
require('dotenv').config();
const express  = require('express');
const http     = require('http');
const https    = require('https');
const { Server } = require('socket.io');
const cors     = require('cors');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT   || 3000;
const CLIENT = process.env.CLIENT_URL || 'https://ncore-game.vercel.app';
const MAX    = 50;

/* ==============================
   CORS
   ============================== */
app.use(cors({
  origin: [CLIENT, 'http://localhost:3000', 'http://127.0.0.1:5500',
           'https://appassets.androidplatform.net'],
  methods: ['GET','POST']
}));
app.use(express.json());

/* ==============================
   🎮 بروكسي الألعاب
   يحقن script الاستماع تلقائياً في كل HTML
   ============================== */

// السكريبت الذي يُحقن داخل اللعبة ليستقبل ضغطات الأزرار
const INJECT_SCRIPT = `
<script>
(function(){
  // استقبال postMessage من الصالة وتحويله لأحداث لوحة مفاتيح
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    if (e.data.type !== 'keydown' && e.data.type !== 'keyup') return;
    var opts = {
      key: e.data.key, code: e.data.code,
      keyCode: e.data.keyCode, which: e.data.keyCode,
      bubbles: true, cancelable: true
    };
    // إرسال للعناصر الرئيسية
    [window, document, document.body].forEach(function(t){
      if(t) try { t.dispatchEvent(new KeyboardEvent(e.data.type, opts)); } catch(x){}
    });
    // إرسال لكل الـ canvas
    document.querySelectorAll('canvas').forEach(function(c){
      try { c.focus(); c.dispatchEvent(new KeyboardEvent(e.data.type, opts)); } catch(x){}
    });
    // إذا لم يكن هناك عنصر مُفعَّل، فعّل أول canvas
    if (e.data.type === 'keydown') {
      var active = document.activeElement;
      if (!active || active === document.body) {
        var canvas = document.querySelector('canvas');
        if (canvas) { canvas.focus(); canvas.click(); }
      }
    }
  });
  console.log('[NCore] 🎮 Game input bridge ready!');
})();
</script>`;

// دالة مساعدة لطلب URL خارجي
function fetchUrl(url, callback) {
  const mod = url.startsWith('https') ? https : http;
  const req = mod.get(url, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      'Accept':          'text/html,application/xhtml+xml,*/*',
      'Accept-Language': 'ar,en;q=0.9',
      'Referer':         'https://kdata1.com/'
    },
    timeout: 12000
  }, callback);
  req.on('error', (e) => callback(null, e));
  return req;
}

// مسار البروكسي — يخدم أي محتوى من kdata1.com
app.get('/game-proxy/*', (req, res) => {
  // استخراج المسار من URL
  const gamePath = req.params[0] || '';
  const query    = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const target   = `https://kdata1.com/${gamePath}${query}`;

  console.log(`[Proxy] ← ${target}`);

  fetchUrl(target, (proxyRes) => {
    if (!proxyRes) {
      return res.status(502).send('Proxy connection failed');
    }

    // إعادة التوجيه
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      const loc = proxyRes.headers.location;
      // تحويل الرابط ليمر عبر بروكسينا
      const newLoc = loc.startsWith('http')
        ? loc.replace('https://kdata1.com', '/game-proxy').replace('http://kdata1.com', '/game-proxy')
        : `/game-proxy/${loc.replace(/^\//, '')}`;
      return res.redirect(newLoc);
    }

    const contentType = proxyRes.headers['content-type'] || 'application/octet-stream';

    // إزالة قيود الـ iframe والـ CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=1800');

    // إذا كان HTML → احقن السكريبت
    if (contentType.includes('text/html')) {
      let html = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', chunk => { html += chunk; });
      proxyRes.on('end', () => {
        // إصلاح الروابط النسبية لتمر عبر البروكسي
        html = html
          .replace(/(href|src|action)="(\/[^"]*?)"/g, (_, attr, path) =>
            `${attr}="/game-proxy${path}"`)
          .replace(/url\(["']?\/((?!\/)[^"')]*?)["']?\)/g,
            `url('/game-proxy/$1')`);

        // حقن السكريبت
        const modified = html.includes('</head>')
          ? html.replace('</head>', INJECT_SCRIPT + '</head>')
          : html.includes('<body')
            ? html.replace('<body', INJECT_SCRIPT + '<body')
            : INJECT_SCRIPT + html;

        res.send(modified);
        console.log(`[Proxy] ✅ HTML injected (${modified.length} bytes)`);
      });
    } else {
      // ملفات أخرى (JS, CSS, صور) → بث مباشر
      proxyRes.pipe(res);
    }
  });
});

/* ==============================
   Socket.io — Multiplayer
   ============================== */
const io = new Server(server, {
  cors: {
    origin: [CLIENT, 'http://localhost:3000', 'http://127.0.0.1:5500',
             'https://appassets.androidplatform.net'],
    methods: ['GET','POST']
  },
  transports:    ['websocket'],
  pingInterval:  25000,
  pingTimeout:   60000
});

const players = new Map();

io.on('connection', sock => {
  if (players.size >= MAX) {
    sock.emit('error:full', { message: 'الصالة ممتلئة' });
    sock.disconnect(true); return;
  }
  console.log(`[+] ${sock.id} | المجموع: ${players.size + 1}`);

  sock.on('player:join', data => {
    const p = {
      id:       sock.id,
      x:        _clamp(data.x   || 2400, 60, 2500),
      y:        _clamp(data.y   || 960,  60, 1860),
      dir:      _dir(data.dir),
      charId:   _clamp(data.charId || 0, 0, 10),
      name:     _clean(data.name || 'لاعب'),
      joinedAt: Date.now()
    };
    players.set(sock.id, p);
    const curr = {};
    players.forEach((v, k) => { if (k !== sock.id) curr[k] = v; });
    sock.emit('players:list', curr);
    sock.broadcast.emit('player:joined', { id: sock.id, data: p });
    _log();
  });

  sock.on('player:move', data => {
    const p = players.get(sock.id); if (!p) return;
    const nx = _clamp(data.x || p.x, 60, 2500);
    const ny = _clamp(data.y || p.y, 60, 1860);
    if (Math.hypot(nx - p.x, ny - p.y) < 90) {
      p.x = nx; p.y = ny; p.dir = _dir(data.dir); p.joinedAt = Date.now();
      sock.broadcast.emit('player:moved', { id: sock.id, x: p.x, y: p.y, dir: p.dir });
    }
  });

  sock.on('chat:message', text => {
    const clean = String(text).substring(0, 100);
    if (clean.trim()) {
      sock.broadcast.emit('chat:message', { id: sock.id, text: clean });
    }
  });

  sock.on('disconnect', reason => {
    players.delete(sock.id);
    io.emit('player:left', sock.id);
    console.log(`[-] ${sock.id} (${reason}) | المجموع: ${players.size}`);
    _log();
  });

  sock.on('error', err => console.error(`[Err] ${sock.id}:`, err.message));
});

/* ==============================
   HTTP Routes
   ============================== */
app.get('/ping', (req, res) => res.json({
  status:  'alive',
  players: players.size,
  max:     MAX,
  uptime:  Math.floor(process.uptime()) + 's',
  memory:  Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  time:    new Date().toISOString()
}));

app.get('/', (req, res) => res.json({
  game:    'NCore MMO Server v2',
  players: `${players.size}/${MAX}`,
  status:  'running'
}));

/* ==============================
   Cleanup
   ============================== */
setInterval(() => {
  const now = Date.now(), timeout = 10 * 60 * 1000;
  players.forEach((p, id) => {
    if (now - p.joinedAt > timeout) {
      const s = io.sockets.sockets.get(id);
      if (s) s.disconnect(true);
      players.delete(id);
      console.log(`[Cleanup] ${id}`);
    }
  });
}, 5 * 60 * 1000);

/* ==============================
   Helpers
   ============================== */
function _clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, Number(v) || 0)); }
function _clean(s) { return String(s).replace(/[<>"'&]/g, '').trim().slice(0, 16) || 'لاعب'; }
function _dir(d) { return ['up','down','left','right','idle'].includes(d) ? d : 'idle'; }
function _log() { console.log(`[Stats] ${players.size}/${MAX} | ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`); }

process.on('uncaughtException',    err => console.error('[FATAL]', err.message));
process.on('unhandledRejection',   r   => console.error('[FATAL Promise]', r));

server.listen(PORT, () => {
  console.log('================================');
  console.log(`🎮 NCore MMO Server v2`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🌐 Client: ${CLIENT}`);
  console.log(`👥 Max: ${MAX}`);
  console.log(`🎯 Proxy: /game-proxy/*`);
  console.log('================================');
});