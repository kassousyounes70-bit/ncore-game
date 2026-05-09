/* ==============================
   NCORE GAME — ui.js
   واجهة المستخدم: تحميل، اختيار شخصية، HUD
   ============================== */

'use strict';

const UI = (() => {

  /* ==============================
     الحالة
     ============================== */
  let _selectedChar  = 0;
  let _onStartCb     = null;   // callback عند الضغط على "ادخل"
  let _previewCanvases = [];   // canvas مصغّر لكل شخصية
  let _animFrame     = 0;
  let _animTimer     = 0;
  let _previewTimer  = 0;

  /* ==============================
     شاشة التحميل
     ============================== */
  function showLoading(onDone) {
    Utils.show('loading-screen');
    Utils.hide('character-select-screen');
    Utils.hide('game-container');

    const bar     = Utils.$('loading-bar');
    const percent = Utils.$('loading-percent');
    let   prog    = 0;

    // محاكاة تحميل تدريجي
    const steps = [
      { target: 15, delay: 120,  label: 'تحميل الأصوات...' },
      { target: 35, delay: 200,  label: 'بناء الخريطة...' },
      { target: 60, delay: 300,  label: 'رسم الشخصيات...' },
      { target: 80, delay: 200,  label: 'إعداد الأجهزة...' },
      { target: 95, delay: 150,  label: 'تهيئة العالم...' },
      { target: 100, delay: 100, label: 'جاهز!' }
    ];

    let si = 0;
    function nextStep() {
      if (si >= steps.length) {
        setTimeout(() => {
          Utils.hide('loading-screen');
          onDone && onDone();
        }, 400);
        return;
      }
      const step = steps[si++];
      const sub  = Utils.$('loading-screen').querySelector('.pixel-subtitle');
      if (sub) sub.textContent = step.label;

      const diff   = step.target - prog;
      const inc    = diff / 10;
      let   ticks  = 0;

      const iv = setInterval(() => {
        prog += inc;
        ticks++;
        bar.style.width    = Math.min(prog, 100) + '%';
        percent.textContent = Math.floor(Math.min(prog, 100)) + '%';
        if (ticks >= 10) {
          clearInterval(iv);
          setTimeout(nextStep, step.delay);
        }
      }, 30);
    }
    nextStep();
  }

  /* ==============================
     شاشة اختيار الشخصية
     ============================== */
  function showCharacterSelect(onStart) {
    _onStartCb = onStart;
    Utils.show('character-select-screen');
    Utils.hide('loading-screen');
    Utils.hide('game-container');

    _buildGrid();
    _startPreviewAnimation();
  }

  /* ---- بناء شبكة الشخصيات ---- */
  function _buildGrid() {
    const grid  = Utils.$('character-grid');
    grid.innerHTML = '';
    _previewCanvases = [];

    const chars = Player.getAllChars();

    chars.forEach((char, i) => {
      const card = document.createElement('div');
      card.className = 'char-card';
      card.dataset.id = i;

      // Canvas مصغّر للعرض
      const cvs = document.createElement('canvas');
      cvs.width  = 48;
      cvs.height = 56;
      cvs.style.width  = '48px';
      cvs.style.height = '56px';
      _previewCanvases.push(cvs);

      // اسم الشخصية
      const lbl = document.createElement('div');
      lbl.className   = 'char-name';
      lbl.textContent = char.name;

      card.appendChild(cvs);
      card.appendChild(lbl);
      grid.appendChild(card);

      // تمت إزالة حدث touchend الذي كان يعيق تمرير الشاشة
      // متصفحات الهواتف تستجيب لـ click فورياً عند تفعيل user-scalable=no
      card.addEventListener('click', () => _selectChar(i));
    });

    // اختيار أول شخصية افتراضياً
    _selectChar(0);
  }

  function _selectChar(id) {
    _selectedChar = id;

    // تحديث الـ CSS
    document.querySelectorAll('.char-card').forEach((c, i) => {
      c.classList.toggle('selected', i === id);
    });

    // إظهار زر البدء
    Utils.show('start-btn');
    const btn = Utils.$('start-btn');
    
    // إزالة أحداث اللمس المتضاربة والاعتماد على click
    btn.onclick = () => _onStartCb && _onStartCb(_selectedChar);
  }

  /* ---- Animation معاينة الشخصيات ---- */
  function _startPreviewAnimation() {
    if (_animFrame) cancelAnimationFrame(_animFrame);
    _previewTimer = 0;
    let last = performance.now();

    function loop(now) {
      const delta = (now - last) / 1000;
      last = now;
      _previewTimer += delta;

      const frame = Math.floor(_previewTimer * 6) % 3;

      _previewCanvases.forEach((cvs, i) => {
        const ctx = cvs.getContext('2d');
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.imageSmoothingEnabled = false;

        // خلفية البطاقة
        ctx.fillStyle = '#0e0e1e';
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // ظل
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cvs.width / 2, cvs.height - 4, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // رسم الشخصية (مصغّرة ومتمركزة)
        ctx.save();
        ctx.translate(cvs.width / 2 - 12, cvs.height / 2 - 18);
        Player.getAllChars()[i].draw(
          ctx, 0, 0,
          'down',
          frame,
          true
        );
        ctx.restore();

        // إطار مضيء للمختارة
        if (i === _selectedChar) {
          ctx.strokeStyle = 'rgba(64,240,128,0.8)';
          ctx.lineWidth   = 2;
          ctx.strokeRect(1, 1, cvs.width - 2, cvs.height - 2);
        }
      });

      _animFrame = requestAnimationFrame(loop);
    }
    _animFrame = requestAnimationFrame(loop);
  }

  function stopPreviewAnimation() {
    if (_animFrame) {
      cancelAnimationFrame(_animFrame);
      _animFrame = 0;
    }
  }

  /* ==============================
     HUD داخل اللعبة
     ============================== */
  function showHUD(charName) {
    Utils.show('hud');
    const el = Utils.$('hud-character-name');
    if (el) el.textContent = '⚡ ' + charName;
  }

  function hideHUD() {
    Utils.hide('hud');
  }

  /* ==============================
     رسالة إشعار مؤقتة
     تظهر في وسط الشاشة ثم تختفي
     ============================== */
  let _toastEl    = null;
  let _toastTimer = null;

  function showToast(msg, duration = 2500) {
    if (!_toastEl) {
      _toastEl = document.createElement('div');
      _toastEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(10,10,20,0.92);
        border: 2px solid #f0c040;
        padding: 12px 20px;
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        color: #f0c040;
        z-index: 999;
        text-align: center;
        pointer-events: none;
        line-height: 1.6;
      `;
      document.body.appendChild(_toastEl);
    }
    _toastEl.textContent = msg;
    _toastEl.style.display = 'block';
    _toastEl.style.opacity  = '1';

    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      _toastEl.style.opacity = '0';
      setTimeout(() => { _toastEl.style.display = 'none'; }, 400);
    }, duration);
  }

  /* ==============================
     شاشة اللعبة الرئيسية
     ============================== */
  function showGame() {
    Utils.hide('loading-screen');
    Utils.hide('character-select-screen');
    Utils.show('game-container');
  }

  /* ==============================
     Getters
     ============================== */
  function getSelectedChar() { return _selectedChar; }

  /* ==============================
     تصدير
     ============================== */
  return {
    showLoading,
    showCharacterSelect,
    stopPreviewAnimation,
    showHUD,
    hideHUD,
    showToast,
    showGame,
    getSelectedChar
  };

})();
