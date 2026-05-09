/* ==============================
   NCORE GAME — server.js (Monolithic)
   مستودع واحد للواجهة والسيرفر معاً
   ============================== */

'use strict';

const express   = require('express');
const http      = require('http');
const path      = require('path');
const { Server }= require('socket.io');

/* ==============================
   الإعداد
   ============================== */
const app    = express();
const server = http.createServer(app);

const PORT        = process.env.PORT || 3000;
const MAX_PLAYERS = 50;

/* ==============================
   تسليم ملفات الواجهة (Frontend)
   ============================== */
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.json());

/* ==============================
   Socket.io
   ============================== */
const io = new Server(server, {
  pingInterval: 25000,
  pingTimeout:  60000
});

/* ==============================
   بيانات اللاعبين
   ============================== */
const players = new Map();

/* ==============================
   أحداث Socket.io
   ============================== */
io.on('connection', (socket) => {

  if (players.size >= MAX_PLAYERS) {
    console.log(`[Server] رُفض اتصال ${socket.id} — الصالة ممتلئة`);
    socket.emit('error:full', { message: 'الصالة ممتلئة، حاول لاحقاً' });
    socket.disconnect(true);
    return;
  }

  console.log(`[+] لاعب متصل: ${socket.id} | المجموع: ${players.size + 1}`);

  socket.on('player:join', (data) => {
    const player = {
      id:     socket.id,
      x:      _clamp(data.x || 1800, 50, 1870),
      y:      _clamp(data.y || 720,  50, 1390),
      dir:    data.dir    || 'down',
      charId: _clamp(data.charId || 0, 0, 9),
      name:   _sanitize(data.name || 'لاعب', 16),
      joinedAt: Date.now()
    };

    players.set(socket.id, player);

    const currentPlayers = {};
    players.forEach((p, id) => {
      if (id !== socket.id) currentPlayers[id] = p;
    });
    socket.emit('players:list', currentPlayers);

    socket.broadcast.emit('player:joined', {
      id:   socket.id,
      data: player
    });

    _logStats();
  });

  /* ---- استقبال وبث رسائل الدردشة ---- */
  socket.on('player:chat', (text) => {
    if (!players.has(socket.id)) return;
    
    // تنظيف الرسالة وتحديد الطول بـ 50 حرفاً
    const sanitizedText = _sanitize(text, 50);
    if (!sanitizedText) return;

    // بث الرسالة لجميع اللاعبين الآخرين
    socket.broadcast.emit('player:chat', {
      id: socket.id,
      text: sanitizedText
    });
  });

  socket.on('player:move', (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    const newX = _clamp(data.x || player.x, 50, 1870);
    const newY = _clamp(data.y || player.y, 50, 1390);
    const dist = Math.hypot(newX - player.x, newY - player.y);

    if (dist < 80) {
      player.x   = newX;
      player.y   = newY;
      player.dir = _validDir(data.dir);

      socket.broadcast.emit('player:moved', {
        id:  socket.id,
        x:   player.x,
        y:   player.y,
        dir: player.dir
      });
    }
  });

  socket.on('disconnect', (reason) => {
    players.delete(socket.id);
    io.emit('player:left', socket.id);
    console.log(`[-] غادر: ${socket.id} (${reason}) | المجموع: ${players.size}`);
    _logStats();
  });

  socket.on('error', (err) => {
    console.error(`[Error] ${socket.id}:`, err.message);
  });
});

/* ==============================
   HTTP Routes
   ============================== */
app.get('/ping', (req, res) => {
  res.json({
    status:  'alive',
    players: players.size,
    time:    new Date().toISOString()
  });
});

/* ==============================
   دوال مساعدة
   ============================== */
function _clamp(val, min, max) {
  return Math.max(min, Math.min(max, Number(val) || 0));
}

function _sanitize(str, maxLength = 16) {
  return String(str).replace(/[<>"'&]/g, '').trim().slice(0, maxLength);
}

function _validDir(dir) {
  return ['up','down','left','right','idle'].includes(dir) ? dir : 'idle';
}

function _logStats() {
  const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  console.log(`[Stats] لاعبون: ${players.size}/${MAX_PLAYERS} | ذاكرة: ${mem}MB`);
}

setInterval(() => {
  const now     = Date.now();
  const timeout = 10 * 60 * 1000;
  players.forEach((player, id) => {
    if (now - player.joinedAt > timeout) {
      const sock = io.sockets.sockets.get(id);
      if (sock) sock.disconnect(true);
      players.delete(id);
    }
  });
}, 5 * 60 * 1000);

/* ==============================
   تشغيل السيرفر
   ============================== */
server.listen(PORT, () => {
  console.log('================================');
  console.log(`🎮 NCore Game (Monolithic)`);
  console.log(`🚀 يعمل على البورت: ${PORT}`);
  console.log('================================');
});
     
