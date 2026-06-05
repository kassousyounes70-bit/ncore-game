'use strict';
const PoliceSystem = (() => {
  // ═══════════════════════════════
  //  STATE
  // ═══════════════════════════════
  const SPAWN = { x: 2400, y: 960 }; // نقطة التولد
  const SPEED = 90;
  const STAR_INTERVAL = 10; // ثواني لكل نجمة
  const MAX_STARS = 5;
  const INTEL_INTERVAL = 10; // ثوانٍ لكل زيادة ذكاء عند 5 نجوم
  const NPC_W = 20, NPC_H = 26;

  let _targets   = new Map(); // targetId -> { stars, timer, officers:[] }
  let _flashT    = 0;
  let _flashOn   = false;
  let _active    = false;
  let _intelLevel = 0;      // مستوى الذكاء (يزيد عند 5 نجوم)
  let _intelTimer = 0;
  const MAX_INTEL = 5;      // أقصى مستوى ذكاء

  // شرطي الدورية الدائم
  const _patrol = {
    x: SPAWN.x, y: SPAWN.y,
    dir: 'right', frame: 0, ft: 0,
    patrolT: 0, waitT: 0, waiting: false,
    tx: SPAWN.x + 100, ty: SPAWN.y
  };

  // ═══════════════════════════════
  //  ACTIVATE
  // ═══════════════════════════════
  function activate(targetId) {
    if (_targets.has(targetId)) return;
    _targets.set(targetId, {
      stars: 1,
      starTimer: 0,
      officers: [],
      blockerWarnings: new Map() // officerId -> {count, timer}
    });
    _active = true;
    // تولد أول ضابط
    _spawnOfficer(targetId);
    UI.showToast('🚨 تم استدعاء الشرطة!', 2500);
  }

  function updateStars(targetId, stars) {
    const t = _targets.get(targetId);
    if (t) t.stars = stars;
  }

  // ═══════════════════════════════
  //  SPAWN OFFICER
  // ═══════════════════════════════
  function _spawnOfficer(targetId) {
    const t = _targets.get(targetId);
    if (!t) return;
    t.officers.push({
      x: SPAWN.x + Utils.randInt(-30, 30),
      y: SPAWN.y + Utils.randInt(-30, 30),
      dir: 'left', frame: 0, ft: 0,
      state: 'chase', // chase | surround | carry
      assignedSide: t.officers.length % 4, // 0=أمام 1=خلف 2=يسار 3=يمين (سيتم ضبطه ديناميكياً لاحقاً)
      blockerTarget: null,
      blockerWarnCount: 0,
      blockerWarnTimer: 0,
      carryTimer: 0,
      id: Date.now() + Math.random()
    });
  }

  // ═══════════════════════════════
  //  UPDATE
  // ═══════════════════════════════
  function update(delta) {
    // وميض الخريطة
    if (_active) {
      _flashT += delta;
      if (_flashT >= 0.4) { _flashT = 0; _flashOn = !_flashOn; }
    }

    // تحديث الدورية
    _updatePatrol(delta);

    // تحديث كل هدف
    for (const [targetId, t] of _targets.entries()) {
      // عداد النجوم وزيادة الذكاء عند 5 نجوم
      if (t.stars < MAX_STARS) {
        t.starTimer += delta;
        if (t.starTimer >= STAR_INTERVAL) {
          t.starTimer = 0;
          t.stars++;
          _spawnOfficer(targetId);
        }
      } else {
        // عند 5 نجوم — زيادة الذكاء كل 10 ثوانٍ
        _intelTimer += delta;
        if (_intelTimer >= INTEL_INTERVAL && _intelLevel < MAX_INTEL) {
          _intelTimer = 0;
          _intelLevel++;
          UI.showToast(`🧠 الشرطة أصبحت أكثر ذكاءً! (مستوى ${_intelLevel})`, 2000);
        }
      }

      // الحصول على موضع الهدف (وسرعته لتوقع المسار)
      const targetPos = _getTargetPos(targetId);
      if (!targetPos) continue;

      for (const off of t.officers) {
        if (off.state === 'carry') {
          _updateCarry(off, delta);
        } else if (off.blockerTarget) {
          _updateBlockerChase(off, t, delta);
        } else {
          _updateChase(off, t, targetPos, delta);
        }
      }
    }
  }

  function _getTargetPos(targetId) {
    let pos = null;
    let vx = 0, vy = 0;
    if (targetId === Network.getMyId()) {
      // اللاعب الحالي
      pos = { x: Player.getCenterX(), y: Player.getCenterY() };
      // يمكن حساب السرعة من حركة اللاعب (نفترض وجود متغيرات سرعة في Player)
      if (typeof Player.getVelocity === 'function') {
        const vel = Player.getVelocity();
        vx = vel.x;
        vy = vel.y;
      }
    } else {
      const p = Network.getPlayers().get(targetId);
      if (p) {
        pos = { x: p.x, y: p.y };
        // إذا كان لدينا سرعة مخزنة سابقاً (من تحديثات الشبكة)
        if (p.vx !== undefined && p.vy !== undefined) {
          vx = p.vx;
          vy = p.vy;
        }
      }
    }
    if (!pos) return null;
    return { x: pos.x, y: pos.y, vx: vx, vy: vy };
  }

  // ═══════════════════════════════
  //  PATROL (شرطي الدورية الدائم)
  // ═══════════════════════════════
  function _updatePatrol(delta) {
    if (_active) return; // يتوقف عند بدء المطاردة
    const p = _patrol;
    if (p.waiting) {
      p.waitT -= delta;
      if (p.waitT <= 0) { p.waiting = false; _pickPatrolTarget(); }
      return;
    }
    _moveToward(p, p.tx, p.ty, SPEED * 0.6, delta);
    const dist = Utils.distance(p.x, p.y, p.tx, p.ty);
    if (dist < 8) {
      p.waiting = true;
      p.waitT = Utils.randFloat(1.5, 3.5);
    }
    _animateOfficer(p, delta);
  }

  function _pickPatrolTarget() {
    const world = GameMap.getWorldSize();
    _patrol.tx = Utils.randInt(100, world.w - 100);
    _patrol.ty = Utils.randInt(100, world.h - 100);
  }

  // ═══════════════════════════════
  //  CHASE & SURROUND
  // ═══════════════════════════════
  function _updateChase(off, t, targetPos, delta) {
    const stars = t.stars;

    let destX = targetPos.x;
    let destY = targetPos.y;

    // نصف قطر الإحاطة يتقلص مع الذكاء
    const surroundRadius = Math.max(10, 80 - _intelLevel * 14);

    if (stars >= 3 && t.officers.length > 1) {
      let offsets = [
        { dx: 0,              dy: -surroundRadius },
        { dx: 0,              dy:  surroundRadius },
        { dx: -surroundRadius,dy:  0 },
        { dx:  surroundRadius,dy:  0 },
      ];
      // عند مستوى ذكاء 3+ نضيف زوايا قطرية
      if (_intelLevel >= 3) {
        offsets = offsets.concat([
          { dx: -surroundRadius * 0.7, dy: -surroundRadius * 0.7 },
          { dx:  surroundRadius * 0.7, dy: -surroundRadius * 0.7 },
          { dx: -surroundRadius * 0.7, dy:  surroundRadius * 0.7 },
          { dx:  surroundRadius * 0.7, dy:  surroundRadius * 0.7 }
        ]);
      }
      // تأكد أن assignedSide ضمن النطاق الجديد
      const side = off.assignedSide % offsets.length;
      destX = targetPos.x + offsets[side].dx;
      destY = targetPos.y + offsets[side].dy;
    }

    // توقع مسار اللاعب عند مستوى ذكاء 4+
    if (_intelLevel >= 4 && (targetPos.vx !== undefined && targetPos.vy !== undefined)) {
      const predict = 40 + _intelLevel * 10;
      destX += (targetPos.vx || 0) * predict;
      destY += (targetPos.vy || 0) * predict;
    }

    // فقدان الهدف المؤقت عند نجمة 1-2
    if (stars <= 2 && Math.random() < 0.001) {
      off.state = 'lost';
      setTimeout(() => { off.state = 'chase'; }, 2000);
      return;
    }

    // التحقق من وجود لاعب يعيق الطريق
    const blocker = _findBlocker(off, targetPos);
    if (blocker) {
      off.blockerTarget   = blocker.id;
      off.blockerWarnCount = 0;
      off.blockerWarnTimer = 0;
      return;
    }

    // سرعة الشرطة تزداد مع النجوم والذكاء
    const spd = SPEED * (1 + stars * 0.08 + _intelLevel * 0.06) * delta;
    _moveToward(off, destX, destY, spd / delta, delta);
    _animateOfficer(off, delta);

    // التحقق من الإمساك
    const dist = Utils.distance(off.x, off.y, targetPos.x, targetPos.y);
    if (dist < 20) {
      _catchTarget(off, t);
    }
  }

  // ═══════════════════════════════
  //  BLOCKER HANDLING
  // ═══════════════════════════════
  function _findBlocker(off, targetPos) {
    const players = Network.getPlayers();
    for (const [id, p] of players.entries()) {
      const distToOff    = Utils.distance(p.x, p.y, off.x, off.y);
      const distToTarget = Utils.distance(p.x, p.y, targetPos.x, targetPos.y);
      if (distToOff < 40 && distToTarget < 60) {
        return { id, x: p.x, y: p.y };
      }
    }
    return null;
  }

  function _updateBlockerChase(off, t, delta) {
    const players = Network.getPlayers();
    const blocker = players.get(off.blockerTarget);
    if (!blocker) { off.blockerTarget = null; return; }
    const dist = Utils.distance(off.x, off.y, blocker.x, blocker.y);

    off.blockerWarnTimer -= delta;
    if (off.blockerWarnTimer <= 0 && off.blockerWarnCount < 3) {
      off.blockerWarnTimer = 4;
      off.blockerWarnCount++;
      const warnPool = [
        ['أنت تعيق العدالة، ابتعد! 🚔', 'لا تتدخل في شؤون الشرطة! 🚔', 'هذا ليس شأنك، تنحَّ جانباً! 🚔'],
        ['آخر تحذير.. لا تجبرنا على اعتقالك! ⚠️', 'أنت تعرقل مهمة رسمية، ابتعد فوراً! ⚠️', 'تحذير أخير، وإلا ستُعتقل معه! ⚠️'],
        ['لقد اخترت الطريق الخطأ! 😡', 'قررت أن تكون في الجانب الخاطئ! 😡', 'أنت أيضاً متورط الآن! 😡'],
      ];
      const poolIndex = Math.min(off.blockerWarnCount - 1, warnPool.length - 1);
      const pool = warnPool[poolIndex];
      const msg = pool[Math.floor(Math.random() * pool.length)];
      if (window.Chat) Chat.addBubble('police_' + off.id, msg);
    }

    if (off.blockerWarnCount >= 4 && dist < 22) {
      off.state = 'carry';
      off.carryTimer = 0;
      off.carryTarget = off.blockerTarget;
      off.blockerTarget = null;
      UI.showToast('🚔 الشرطة أمسكت بلاعب يعيق العدالة!', 2500);
      return;
    }
    _moveToward(off, blocker.x, blocker.y, SPEED, delta);
    _animateOfficer(off, delta);
  }

  // ═══════════════════════════════
  //  CATCH TARGET
  // ═══════════════════════════════
  function _catchTarget(off, t) {
    off.state = 'carry';
    off.carryTimer = 0;
    for (const [id, target] of _targets.entries()) {
      if (target === t) {
        _targets.delete(id);
        if (typeof Network !== 'undefined' && Network.getMyId && id === Network.getMyId()) {
          if (typeof Player !== 'undefined' && Player.startDragToSpawn) {
            Player.startDragToSpawn();
          }
        }
        if (window.AndroidApp && typeof window.AndroidApp.onPlayerBanned === 'function') {
          try { window.AndroidApp.onPlayerBanned(id); } catch (e) {}
        }
        fetch('https://ncore-mmo-server.onrender.com/api/report/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: id })
        }).catch(() => {});
        break;
      }
    }
    if (_targets.size === 0) _active = false;
  }

  // ═══════════════════════════════
  //  CARRY TO SPAWN
  // ═══════════════════════════════
  function _updateCarry(off, delta) {
    off.carryTimer += delta;
    _moveToward(off, SPAWN.x, SPAWN.y, SPEED * 1.2, delta);
    _animateOfficer(off, delta);
    const dist = Utils.distance(off.x, off.y, SPAWN.x, SPAWN.y);
    if (dist < 16) {
      off.state = 'chase';
      UI.showToast('🚔 تم إلقاء اللاعب عند المدخل!', 2000);
    }
  }

  // ═══════════════════════════════
  //  MOVEMENT WITH COLLISION
  // ═══════════════════════════════
  function _moveToward(obj, tx, ty, speed, delta) {
    const dx = tx - obj.x, dy = ty - obj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) return;
    const nx = dx / dist, ny = dy / dist;
    const spd = speed * delta;
    const r = { x: obj.x, y: obj.y, w: NPC_W, h: NPC_H };
    const res = Collision.resolveMovement(r, nx * spd, ny * spd);
    const cl = Collision.clampToWorld({ x: res.x, y: res.y, w: NPC_W, h: NPC_H }, GameMap.getWorldSize());
    obj.x = cl.x; obj.y = cl.y;
    obj.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  function _animateOfficer(off, delta) {
    off.ft += delta;
    if (off.ft >= 0.16) { off.ft = 0; off.frame = (off.frame + 1) % 3; }
    off.moving = true;
  }

  // ═══════════════════════════════
  //  DRAW
  // ═══════════════════════════════
  function draw(ctx) {
    if (!_active) _drawOfficer(ctx, _patrol);
    for (const [, t] of _targets.entries()) {
      for (const off of t.officers) {
        _drawOfficer(ctx, off);
        if (off.blockerWarnCount > 0 && window.Chat) {
          Chat.drawBubbles(ctx,
            { x: off.x + NPC_W/2, y: off.y + NPC_H/2 },
            new Map([['police_' + off.id, { x: off.x, y: off.y }]])
          );
        }
      }
    }
  }

  function _drawOfficer(ctx, off) {
    if (!Camera.isVisible({ x: off.x - 12, y: off.y - 12, w: NPC_W + 24, h: NPC_H + 24 })) return;
    const x = off.x, y = off.y;
    const sw = off.moving ? (off.frame === 1 ? 3 : off.frame === 2 ? -3 : 0) : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(x + NPC_W/2, y + NPC_H + 2, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111a2a';
    ctx.fillRect(x + 4, y + 18, 5, 6 + sw);
    ctx.fillRect(x + 11, y + 18, 5, 6 - sw);
    ctx.fillStyle = '#0a1020';
    ctx.fillRect(x + 3, y + 23 + sw, 7, 3);
    ctx.fillRect(x + 10, y + 23 - sw, 7, 3);
    ctx.fillStyle = '#1a3a6a';
    ctx.fillRect(x + 3, y + 10, 14, 10);
    ctx.fillRect(x, y + 11, 4, 8);
    ctx.fillRect(x + 16, y + 11, 4, 8);
    ctx.fillStyle = '#f0c090';
    ctx.fillRect(x, y + 18, 4, 3);
    ctx.fillRect(x + 16, y + 18, 4, 3);
    ctx.fillStyle = '#f0d020';
    ctx.fillRect(x + 7, y + 13, 4, 3);
    ctx.fillStyle = '#f0c090';
    ctx.fillRect(x + 4, y + 1, 12, 11);
    ctx.fillStyle = '#1a3a6a';
    ctx.fillRect(x + 3, y, 14, 5);
    ctx.fillRect(x + 2, y + 3, 16, 2);
    ctx.fillStyle = '#f0d020';
    ctx.fillRect(x + 7, y + 1, 6, 3);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 6, y + 5, 3, 2);
    ctx.fillRect(x + 11, y + 5, 3, 2);
  }

  function drawFlash(ctx, cw, ch) {
    if (!_active || !_flashOn) return;
    const isRed = Math.floor(Date.now() / 400) % 2 === 0;
    ctx.fillStyle = isRed ? 'rgba(255,0,0,0.07)' : 'rgba(0,80,255,0.07)';
    ctx.fillRect(0, 0, cw, ch);
  }

  function drawStars(ctx) {
    if (!_active || _targets.size === 0) return;
    const maxStars = Math.max(...[..._targets.values()].map(t => t.stars));
    if (maxStars <= 0) return;
    const x = 16, y = 16;
    ctx.font = '16px serif';
    ctx.textBaseline = 'top';
    let str = '';
    for (let i = 0; i < maxStars; i++) str += '⭐';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 4, y - 4, maxStars * 20 + 8, 28);
    ctx.fillText(str, x, y);
  }

  function isActive() { return _active; }
  function getTargets() { return _targets; }

  return { activate, updateStars, update, draw, drawFlash, drawStars, isActive };
})();