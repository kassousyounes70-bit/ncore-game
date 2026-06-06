'use strict';
require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const fs = require('fs');

let serviceAccount = null;
const secretFilename = 'n-core-nostagames-firebase-adminsdk-fbsvc-ca3de8c2ce.json';
const possiblePaths = [
  `/etc/secrets/${secretFilename}`,
  path.join('/opt/render/project/src', secretFilename),
  path.join(__dirname, secretFilename)
];

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    try {
      const rawData = fs.readFileSync(p, 'utf8');
      serviceAccount = JSON.parse(rawData);
      if (serviceAccount && serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      break;
    } catch (error) {}
  }
}

if (serviceAccount) {
  try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (initErr) {}
}

const db = admin.firestore();
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const CLIENT = process.env.CLIENT_URL || 'https://ncore-mmo-server.onrender.com';
const MAX = 50;

const io = new Server(server, {
  cors: {
    origin: [CLIENT, 'http://localhost:3000', 'http://127.0.0.1:5500', 'https://appassets.androidplatform.net'],
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: [CLIENT, 'http://localhost:3000', 'http://127.0.0.1:5500', 'https://appassets.androidplatform.net'],
  methods: ['GET', 'POST']
}));
app.use(express.json());

const staticDirs = ['updates', 'js', 'assets', 'Avatar', 'Song', 'css', 'styles', 'fonts'];
staticDirs.forEach(dir => app.use(`/${dir}`, express.static(path.join(__dirname, dir))));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/status', (req, res) => res.json({ game: 'NCore Monolith', players: `${players.size}/${MAX}`, status: 'running' }));

app.get('/api/check-username', async (req, res) => {
    try {
        if (!req.query.user) return res.status(400).json({ error: "Missing username" });
        const userDoc = await db.collection('users').doc(req.query.user).get();
        res.json({ available: !userDoc.exists });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.get('/api/profile', async (req, res) => {
    try {
        if (!req.query.user) return res.status(400).json({ error: "Missing username" });
        const userDoc = await db.collection('users').doc(req.query.user).get();
        if (!userDoc.exists) return res.status(404).json({ error: "Player not found" });
        res.status(200).json(userDoc.data());
    } catch (error) {
        res.status(500).json({ error: "Data pull error" });
    }
});

app.post('/sync', async (req, res) => {
    try {
        if (!req.body.username) return res.status(400).json({ error: "Missing username" });
        await db.collection('users').doc(req.body.username).set(req.body, { merge: true });
        res.status(200).json({ message: "Sync successful" });
    } catch (error) {
        res.status(500).json({ error: "Sync error" });
    }
});

app.post('/api/referral', async (req, res) => {
    try {
        const { deviceId, referralCode, newPlayerUsername } = req.body;
        if (!deviceId || !referralCode || !newPlayerUsername) return res.status(400).json({ error: "Incomplete data" });

        const deviceRef = db.collection('used_referrals').doc(deviceId);
        if ((await deviceRef.get()).exists) return res.status(400).json({ error: "Device already used a code." });

        const inviterQuery = await db.collection('users').where('referralCode', '==', referralCode).limit(1).get();
        if (inviterQuery.empty) return res.status(400).json({ error: "Invalid code." });

        const inviterDoc = inviterQuery.docs[0];
        if (inviterDoc.id === newPlayerUsername) return res.status(400).json({ error: "Cannot use own code." });

        const batch = db.batch();
        batch.set(deviceRef, { usedAt: admin.firestore.FieldValue.serverTimestamp(), referredBy: referralCode, newUser: newPlayerUsername });
        batch.update(inviterDoc.ref, { coins: admin.firestore.FieldValue.increment(25) });
        batch.set(db.collection('users').doc(newPlayerUsername), { coins: admin.firestore.FieldValue.increment(10) }, { merge: true });
        
        await batch.commit();
        res.status(200).json({ message: "Code applied! +10 coins 🎁" });
    } catch (error) {
        res.status(500).json({ error: "Referral processing error." });
    }
});

const INJECT_SCRIPT = `
<script>
(function(){
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type || (e.data.type !== 'keydown' && e.data.type !== 'keyup')) return;
    var opts = { key: e.data.key, code: e.data.code, keyCode: e.data.keyCode, which: e.data.keyCode, bubbles: true, cancelable: true };
    [window, document, document.body].forEach(t => { if(t) try { t.dispatchEvent(new KeyboardEvent(e.data.type, opts)); } catch(x){} });
    document.querySelectorAll('canvas').forEach(c => { try { c.focus(); c.dispatchEvent(new KeyboardEvent(e.data.type, opts)); } catch(x){} });
    if (e.data.type === 'keydown') {
      var active = document.activeElement;
      if (!active || active === document.body) {
        var canvas = document.querySelector('canvas');
        if (canvas) { canvas.focus(); canvas.click(); }
      }
    }
  });
})();
</script>`;

function fetchUrl(url, callback) {
  const mod = url.startsWith('https') ? https : http;
  const req = mod.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', 'Accept': '*/*', 'Referer': 'https://kdata1.com/' },
    timeout: 12000
  }, callback);
  req.on('error', (e) => callback(null, e));
  return req;
}

app.get('/game-proxy/*', (req, res) => {
  const target = `https://kdata1.com/${req.params[0] || ''}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;
  fetchUrl(target, (proxyRes) => {
    if (!proxyRes) return res.status(502).send('Proxy connection failed');
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      const loc = proxyRes.headers.location;
      return res.redirect(loc.startsWith('http') ? loc.replace(/https?:\/\/kdata1\.com/, '/game-proxy') : `/game-proxy/${loc.replace(/^\//, '')}`);
    }
    const contentType = proxyRes.headers['content-type'] || 'application/octet-stream';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    if (contentType.includes('text/html')) {
      let html = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', chunk => { html += chunk; });
      proxyRes.on('end', () => {
        html = html.replace(/(href|src|action)="(\/[^"]*?)"/g, (_, attr, path) => `${attr}="/game-proxy${path}"`).replace(/url\(["']?\/((?!\/)[^"')]*?)["']?\)/g, `url('/game-proxy/$1')`);
        res.send(html.includes('</head>') ? html.replace('</head>', INJECT_SCRIPT + '</head>') : INJECT_SCRIPT + html);
      });
    } else {
      proxyRes.pipe(res);
    }
  });
});

const players = new Map();

io.on('connection', sock => {
  if (players.size >= MAX) {
    sock.emit('error:full', { message: 'الصالة ممتلئة' });
    return sock.disconnect(true);
  }
  
  sock.on('player:join', data => {
    const p = {
      id: sock.id,
      x: _clamp(data.x || 2400, 60, 2500), y: _clamp(data.y || 960, 60, 1860),
      dir: _dir(data.dir),
      charId: _clamp(data.charId || 0, 0, 1000),
      isBoy: data.isBoy !== undefined ? data.isBoy : true,
      name: _clean(data.name || 'لاعب'),
      joinedAt: Date.now()
    };
    players.set(sock.id, p);
    
    const curr = {};
    players.forEach((v, k) => { if (k !== sock.id) curr[k] = v; });
    sock.emit('players:list', curr);
    sock.broadcast.emit('player:joined', { id: sock.id, data: p });
    sock.emit('chat:message', { id: 'SYSTEM', name: 'النظام 🛡️', text: 'مرحباً بك في عالم N-CORE الافتراضي!' });
  });

  sock.on('player:move', data => {
    const p = players.get(sock.id); if (!p) return;
    const nx = _clamp(data.x || p.x, 60, 2500), ny = _clamp(data.y || p.y, 60, 1860);
    if (Math.hypot(nx - p.x, ny - p.y) < 90) {
      p.x = nx; p.y = ny; p.dir = _dir(data.dir); p.joinedAt = Date.now();
      sock.broadcast.emit('player:moved', { id: sock.id, x: p.x, y: p.y, dir: p.dir });
    }
  });

  sock.on('chat:message', text => {
    const clean = String(text).substring(0, 100).trim();
    if (clean) sock.broadcast.emit('chat:message', { id: sock.id, text: clean });
  });

  // ========== حدث الدفع (لـ Uno) ==========
  sock.on('event:push', ({ targetId, x, y }) => {
    sock.broadcast.emit('event:pushed', { targetId, x, y });
  });

  sock.on('disconnect', () => {
    if (players.has(sock.id)) {
      players.delete(sock.id);
      io.emit('player:left', sock.id);
    }
  });
});

app.get('/ping', (req, res) => res.json({ status: 'alive', players: players.size, max: MAX, uptime: Math.floor(process.uptime()) + 's' }));

// ========== نظام التبليغات ==========
const reports = new Map(); // targetId -> [{reporterId, sessionId}]

app.post('/api/report', async (req, res) => {
    try {
        const { reporterId, targetId, sessionId } = req.body;
        if (!reporterId || !targetId || !sessionId)
            return res.status(400).json({ error: 'Missing data' });
        if (reporterId === targetId)
            return res.status(400).json({ error: 'Cannot report yourself' });

        if (!reports.has(targetId)) reports.set(targetId, []);
        const list = reports.get(targetId);

        // تحقق: نفس اللاعب في نفس الجلسة لا تُحسب
        const alreadyInSession = list.find(
            r => r.reporterId === reporterId && r.sessionId === sessionId
        );
        if (alreadyInSession)
            return res.status(200).json({ message: 'Already reported in this session' });

        list.push({ reporterId, sessionId });

        // حساب عدد المبلّغين المختلفين
        const uniqueReporters = new Set(list.map(r => r.reporterId)).size;

        if (uniqueReporters >= 3) {
            // تفعيل الشرطة على جميع اللاعبين
            io.emit('police:alert', { targetId });
        }

        res.status(200).json({ reports: uniqueReporters });
    } catch (e) {
        res.status(500).json({ error: 'Report error' });
    }
});

app.post('/api/report/clear', (req, res) => {
    const { targetId } = req.body;
    if (targetId) reports.delete(targetId);
    res.status(200).json({ message: 'Cleared' });
});

// ========== نهاية نظام التبليغات ==========

// ========== نظام البان ==========
app.post('/api/ban/create', async (req, res) => {
    try {
        const { deviceId, key, targetId, banTimestamp } = req.body;
        if (!deviceId || !key) return res.status(400).json({ error: 'Missing data' });
        await db.collection('bans').doc(deviceId).set({
            key,
            targetId,
            isBanned: true,
            banTimestamp,
            adsWatched: 0
        });
        res.status(200).json({ message: 'Ban created' });
    } catch (e) {
        res.status(500).json({ error: 'Ban create error' });
    }
});

app.get('/api/ban/key', async (req, res) => {
    try {
        const { deviceId } = req.query;
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        const doc = await db.collection('bans').doc(deviceId).get();
        if (!doc.exists) return res.status(404).json({ error: 'Not found' });
        res.status(200).json({ key: doc.data().key });
    } catch (e) {
        res.status(500).json({ error: 'Key fetch error' });
    }
});

app.post('/api/ban/clear', async (req, res) => {
    try {
        const { deviceId } = req.body;
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        await db.collection('bans').doc(deviceId).update({ isBanned: false });
        res.status(200).json({ message: 'Ban cleared' });
    } catch (e) {
        res.status(500).json({ error: 'Clear ban error' });
    }
});
// ========== نهاية نظام البان ==========

// ========== نظام الفعاليات (EVENT SYSTEM) ==========
const eventLobbies = new Map(); // eventId -> { players:[], timer, timerActive, started }

app.post('/api/event/join', (req, res) => {
  const { eventId, playerId, playerName, charId, isBot, botLevel } = req.body;
  if (!eventId || !playerId) return res.status(400).json({ error: 'Missing data' });

  if (!eventLobbies.has(eventId)) {
    eventLobbies.set(eventId, {
      players: [], timer: 0, timerActive: false, started: false
    });
  }
  const lobby = eventLobbies.get(eventId);
  if (lobby.started) return res.status(400).json({ error: 'Already started' });
  if (lobby.players.length >= 50) return res.status(400).json({ error: 'Full' });

  const exists = lobby.players.find(p => p.id === playerId);
  if (!exists) {
    lobby.players.push({
      id: playerId,
      name: playerName || 'لاعب',
      charId: charId || 0,
      isBot: isBot || false,
      botLevel: botLevel || 'medium',
      lobbyX: 200 + Math.random() * 400,
      lobbyY: 200 + Math.random() * 200
    });
  }

  // بدء العد أو إضافة وقت (العداد يديره السيرفر فقط)
  if (lobby.players.length >= 3) {
    if (!lobby.timerActive && !lobby.started) {
      lobby.timerActive = true;
      lobby.timer = 30;
      _startLobbyTimer(eventId);
    } else if (lobby.timerActive) {
      lobby.timer = Math.min(lobby.timer + 10, 60);
    }
  }

  io.emit(`event:lobby:${eventId}`, lobby);
  res.status(200).json({ message: 'Joined' });
});

app.post('/api/event/leave', (req, res) => {
  const { eventId, playerId } = req.body;
  if (!eventId || !playerId) return res.status(400).json({ error: 'Missing data' });
  const lobby = eventLobbies.get(eventId);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  lobby.players = lobby.players.filter(p => p.id !== playerId);
  if (lobby.players.length < 3) {
    lobby.timerActive = false;
  }
  io.emit(`event:lobby:${eventId}`, lobby);
  res.status(200).json({ message: 'Left' });
});

app.get('/api/event/lobby', (req, res) => {
  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: 'Missing eventId' });
  const lobby = eventLobbies.get(eventId);
  if (!lobby) return res.status(200).json({ players: [], timer: 0, timerActive: false, started: false });
  res.status(200).json(lobby);
});

function _startLobbyTimer(eventId) {
  const iv = setInterval(() => {
    const lobby = eventLobbies.get(eventId);
    if (!lobby || !lobby.timerActive || lobby.started) {
      clearInterval(iv);
      return;
    }
    lobby.timer -= 1;
    io.emit(`event:lobby:${eventId}`, lobby);
    if (lobby.timer <= 0) {
      clearInterval(iv);
      if (lobby.players.length >= 3) {
        lobby.started = true;
        io.emit(`event:start:${eventId}`, { players: lobby.players });
      } else {
        lobby.timerActive = false;
      }
    }
  }, 1000);
}
// ========== نهاية نظام الفعاليات ==========

// ========== نقطة نهاية مزامنة الخروج ==========
app.post('/api/sync-exit', async (req, res) => {
    try {
        const { username, coins } = req.body;
        if (!username) return res.status(400).json({ error: 'Missing username' });
        await db.collection('users').doc(username).set({ coins }, { merge: true });
        res.status(200).json({ message: 'Exit sync successful' });
    } catch (error) {
        res.status(500).json({ error: 'Sync error' });
    }
});

setInterval(() => {
  const now = Date.now();
  players.forEach((p, id) => {
    if (now - p.joinedAt > 600000) {
      const s = io.sockets.sockets.get(id);
      if (s) s.disconnect(true);
      players.delete(id);
    }
  });
}, 300000);

function _clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, Number(v) || 0)); }
function _clean(s) { return String(s).replace(/[<>"'&]/g, '').trim().slice(0, 16) || 'لاعب'; }
function _dir(d) { return ['up','down','left','right','idle'].includes(d) ? d : 'idle'; }

server.listen(PORT, () => {});