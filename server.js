'use strict';
require('dotenv').config();
const express=require('express'), http=require('http'), {Server}=require('socket.io'), cors=require('cors');
const path = require('path'); // إضافة مكتبة إدارة المسارات
const app=express(), server=http.createServer(app);
const PORT=process.env.PORT||3000;
const MAX=50;

app.use(cors({origin:'*', methods:['GET','POST']}));
app.use(express.json());

// ==========================================
// التعديل الجوهري: إخبار الخادم بتقديم ملفات الواجهة
// نستخدم '../' للرجوع مجلد واحد للخلف (لأن هذا الملف داخل مجلد server)
// لكي يتمكن من رؤية index.html ومجلدات js و css
// ==========================================
app.use(express.static(path.join(__dirname, '../')));

const io=new Server(server,{
  cors: { origin: '*', methods:['GET','POST'] },
  transports:['websocket'],
  pingInterval:25000, pingTimeout:60000
});

const players=new Map();

io.on('connection',sock=>{
  if(players.size>=MAX){
    sock.emit('error:full',{message:'الصالة ممتلئة'});
    sock.disconnect(true);return;
  }
  console.log(`[+] ${sock.id} | المجموع: ${players.size+1}`);

  sock.on('player:join',data=>{
    const p={
      id:sock.id,
      x:_clamp(data.x||2400,60,2500),
      y:_clamp(data.y||960,60,1860),
      dir:_dir(data.dir),
      charId:_clamp(data.charId||0,0,10),
      name:_clean(data.name||'لاعب'),
      joinedAt:Date.now()
    };
    players.set(sock.id,p);
    const curr={};players.forEach((v,k)=>{if(k!==sock.id)curr[k]=v;});
    sock.emit('players:list',curr);
    sock.broadcast.emit('player:joined',{id:sock.id,data:p});
    _log();
  });

  sock.on('player:move',data=>{
    const p=players.get(sock.id);if(!p)return;
    const nx=_clamp(data.x||p.x,60,2500),ny=_clamp(data.y||p.y,60,1860);
    if(Math.hypot(nx-p.x,ny-p.y)<90){
      p.x=nx;p.y=ny;p.dir=_dir(data.dir);p.joinedAt=Date.now();
      sock.broadcast.emit('player:moved',{id:sock.id,x:p.x,y:p.y,dir:p.dir});
    }
  });

  sock.on('disconnect',reason=>{
    players.delete(sock.id);
    io.emit('player:left',sock.id);
    console.log(`[-] ${sock.id} (${reason}) | المجموع: ${players.size}`);
    _log();
  });

  sock.on('error',err=>console.error(`[Err] ${sock.id}:`,err.message));
});

/* ====== Routes ====== */
app.get('/ping',(req,res)=>res.json({
  status:'alive',players:players.size,max:MAX,
  uptime:Math.floor(process.uptime())+'s',
  memory:Math.round(process.memoryUsage().heapUsed/1024/1024)+'MB',
  time:new Date().toISOString()
}));

// تم تغيير هذا المسار من '/' إلى '/status' لكي لا يمنع عرض اللعبة!
app.get('/status',(req,res)=>res.json({
  game:'NCore MMO Server v2',players:`${players.size}/${MAX}`,status:'running'
}));

// مسار الدخول الرئيسي: يقوم بإرسال ملف اللعبة index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

/* ====== تنظيف اللاعبين غير النشطين (كل 5 دقائق) ====== */
setInterval(()=>{
  const now=Date.now(),timeout=10*60*1000;
  players.forEach((p,id)=>{
    if(now-p.joinedAt>timeout){
      const s=io.sockets.sockets.get(id);
      if(s)s.disconnect(true);
      players.delete(id);
      console.log(`[Cleanup] ${id}`);
    }
  });
},5*60*1000);

/* ====== Helpers ====== */
function _clamp(v,mn,mx){return Math.max(mn,Math.min(mx,Number(v)||0));}
function _clean(s){return String(s).replace(/[<>"'&]/g,'').trim().slice(0,16)||'لاعب';}
function _dir(d){return['up','down','left','right','idle'].includes(d)?d:'idle';}
function _log(){console.log(`[Stats] ${players.size}/${MAX} | ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`);}

process.on('uncaughtException',err=>console.error('[FATAL]',err.message));
process.on('unhandledRejection',r=>console.error('[FATAL Promise]',r));

server.listen(PORT,()=>{
  console.log('================================');
  console.log(`🎮 NCore MMO Server v2`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`👥 Max: ${MAX}`);
  console.log('================================');
});
