/* ==============================
   NCORE GAME — server.js (Monolithic)
   سيرفر اللعبة المتعددة اللاعبين + واجهة الويب
   Node.js + Socket.io + Express
   ============================== */

'use strict';

require('dotenv').config();

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
// هذه الأسطر تجعل الخادم يعرض مجلد public الذي يحتوي على اللعبة
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

/* ==============================
   Socket.io
   ============================== */
// بما أن الواجهة والسيرفر في نفس المكان، لم نعد بحاجة لتعقيدات الـ CORS
const io = new Server(server, {
  pingInterval: 25000,
  pingTimeout:  60000
});

/* ==============================
   بيانات اللاعبين في الذاكرة
   key: socketId → PlayerData
   ============================== */
const players = new Map();

/* ==============================
   أحداث Socket.io
   ============================== */
io.on('connection', (socket) => {

  /* ---- تحقق من الحد الأقصى ---- */
  if (players.size >= MAX_PLAYERS) {
    console.log(`[Server] رُفض اتصال ${socket.id} — الصالة ممتلئة`);
    socket.emit('error:full', { message: 'الصالة ممتلئة، حاول لاحقاً' });
    socket.disconnect(true);
    return;
  }

  console.log(`[+] لاعب متصل: ${socket.id} | المجموع: ${players.size + 1}`);

  /* ---- انضمام اللاعب ---- */
  socket.on('player:join', (data) => {
    const player = {
      id:     socket.id,
      x:      _clamp(data.x || 1800, 50, 1870),
      y:      _clamp(data.y || 720,  50, 1390),
      dir:    data.dir    || 'down',
      charId: _clamp(data.charId || 0, 0, 9),
      name:   _sanitize(data.name || 'لاعب'),
      joinedAt: Date.now()
    };

    players.set(socket.id, player);

    // أرسل له قائمة اللاعبين الحاليين
    const currentPlayers = {};
    players.forEach((p, id) => {
      if (id !== socket.id) currentPlayers[id] = p;
    });
    socket.emit('players:list', currentPlayers);

    // أخبر الآخرين بدخوله
    socket.broadcast.emit('player:joined', {
      id:   socket.id,
      data: player
    });

    _logStats();
  });

  /* ---- تحديث الموضع ---- */
  socket.on('player:move', (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    // تحقق من صحة البيانات ومنع القفز الغير طبيعي
    const newX = _clamp(data.x || player.x, 50, 1870);
    const newY = _clamp(data.y || player.y, 50, 1390);
    const dist = Math.hypot(newX - player.x, newY - player.y);

    // إذا كانت الحركة منطقية (أقل من 80 بكسل/تحديث)
    if (dist < 80) {
      player.x   = newX;
      player.y   = newY;
      player.dir = _validDir(data.dir);

      // بث للآخرين فقط
      socket.broadcast.emit('player:moved', {
        id:  socket.id,
        x:   player.x,
        y:   player.y,
        dir: player.dir
      });
    }
  });

  /* ---- قطع الاتصال ---- */
  socket.on('disconnect', (reason) => {
    players.delete(socket.id);
    io.emit('player:left', socket.id);
    console.log(`[-] غادر: ${socket.id} (${reason}) | المجموع: ${players.size}`);
    _logStats();
  });

  /* ---- معالجة الأخطاء ---- */
  socket.on('error', (err) => {
    console.error(`[Error] ${socket.id}:`, err.message);
  });

});

/* ==============================
   HTTP Routes إضافية
   ============================== */

/* صحة السيرفر — للـ KeepAlive والمراقبة */
app.get('/ping', (req, res) => {
  res.json({
    status:  'alive',
    players: players.size,
    max:     MAX_PLAYERS,
    uptime:  Math.floor(process.uptime()) + 's',
    memory:  _getMemoryUsage(),
    time:    new Date().toISOString()
  });
});

/* ==============================
   دوال مساعدة
   ============================== */
function _clamp(val, min, max) {
  return Math.max(min, Math.min(max, Number(val) || 0));
}

function _sanitize(str) {
  return String(str).replace(/[<>"'&]/g, '').trim().slice(0, 16) || 'لاعب';
}

function _validDir(dir) {
  return ['up','down','left','right','idle'].includes(dir) ? dir : 'idle';
}

function _getMemoryUsage() {
  const mem = process.memoryUsage();
  return Math.round(mem.heapUsed / 1024 / 1024) + 'MB';
}

function _logStats() {
  console.log(
    `[Stats] لاعبون: ${players.size}/${MAX_PLAYERS}` +
    ` | ذاكرة: ${_getMemoryUsage()}` +
    ` | وقت التشغيل: ${Math.floor(process.uptime())}s`
  );
}

/* ==============================
   تنظيف اللاعبين غير النشطين
   ============================== */
setInterval(() => {
  const now     = Date.now();
  const timeout = 10 * 60 * 1000;

  players.forEach((player, id) => {
    if (now - player.joinedAt > timeout) {
      const sock = io.sockets.sockets.get(id);
      if (sock) sock.disconnect(true);
      players.delete(id);
      console.log(`[Cleanup] أُزيل لاعب غير نشط: ${id}`);
    }
  });
}, 5 * 60 * 1000);

/* ==============================
   معالجة الأخطاء العامة
   ============================== */
process.on('uncaughtException', (err) => {
  console.error('[FATAL] خطأ غير متوقع:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Promise مرفوض:', reason);
});

/* ==============================
   تشغيل السيرفر
   ============================== */
server.listen(PORT, () => {
  console.log('================================');
  console.log(`🎮 NCore Game Server (Monolithic)`);
  console.log(`🚀 يعمل على البورت: ${PORT}`);
  console.log(`👥 أقصى لاعبين: ${MAX_PLAYERS}`);
  console.log('================================');
});
