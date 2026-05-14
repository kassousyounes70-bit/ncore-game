'use strict';
const GamepadUI = (() => {
  let zone, editBtn, saveBtn, resetBtn;
  let isEditMode = false;
  let activeGameId = null;
  
  let joyBase, joyThumb;
  let isJoyActive = false;
  let joyConfigKeys = { up: '', down: '', left: '', right: '' };
  let currentJoyPressed = { up: false, down: false, left: false, right: false };
  
  let dragTarget = null;
  let startX, startY, initialLeft, initialTop;
  let pressedKeys = new Set();

  function init() {
    zone     = Utils.$('gamepad-zone');
    editBtn  = Utils.$('edit-layout-btn');
    saveBtn  = Utils.$('save-layout-btn');
    resetBtn = Utils.$('reset-layout-btn');
    joyBase  = Utils.$('gamepad-joystick-base');
    joyThumb = Utils.$('gamepad-joystick-thumb');
    if (!zone) return;

    editBtn.addEventListener('click', toggleEditMode);
    saveBtn.addEventListener('click', saveLayout);
    resetBtn.addEventListener('click', resetLayout);

    document.querySelectorAll('.virtual-btn').forEach(btn => {
      btn.addEventListener('touchstart', e => { if(!isEditMode){ e.preventDefault(); pressKey(btn,'keydown'); }});
      btn.addEventListener('touchend',   e => { if(!isEditMode){ e.preventDefault(); pressKey(btn,'keyup');   }});
      btn.addEventListener('mousedown',  e => { if(!isEditMode){ e.preventDefault(); pressKey(btn,'keydown'); }});
      btn.addEventListener('touchstart', dragStart, {passive:false});
      btn.addEventListener('mousedown',  dragStart);
    });

    if (joyBase) {
      joyBase.addEventListener('touchstart',  handleJoyStart, {passive:false});
      joyBase.addEventListener('touchmove',   handleJoyMove,  {passive:false});
      joyBase.addEventListener('touchend',    handleJoyEnd);
      joyBase.addEventListener('touchcancel', handleJoyEnd);
      joyBase.addEventListener('mousedown',   handleJoyStart);
      joyBase.addEventListener('touchstart',  dragStart, {passive:false});
      joyBase.addEventListener('mousedown',   dragStart);
    }

    window.addEventListener('mouseup',    () => { if(!isEditMode){ releaseAllKeys(); handleJoyEnd(); }});
    window.addEventListener('touchend',   () => { if(!isEditMode){ releaseAllKeys(); handleJoyEnd(); }});
    window.addEventListener('touchmove',  dragMove, {passive:false});
    window.addEventListener('mousemove',  dragMove);
    window.addEventListener('touchend',   dragEnd);
    window.addEventListener('mouseup',    dragEnd);
  }

  /* ====== عصا التحكم ====== */
  function handleJoyStart(e) {
    if(isEditMode) return;
    e.preventDefault(); isJoyActive = true; updateJoyDirection(e);
  }
  function handleJoyMove(e) {
    if(!isJoyActive||isEditMode) return;
    e.preventDefault(); updateJoyDirection(e);
  }
  function handleJoyEnd() {
    if(isEditMode||!isJoyActive) return;
    isJoyActive = false;
    if(joyThumb) joyThumb.style.transform = 'translate(-50%,-50%)';
    applyJoyKeys(0, 0, true);
  }

  function updateJoyDirection(e) {
    if(!joyBase||!joyThumb) return;
    const rect   = joyBase.getBoundingClientRect();
    const radius = rect.width / 2;
    const cx = rect.left + radius, cy = rect.top + radius;
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    const dx = clientX - cx, dy = clientY - cy;
    const dist  = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    const rd    = Math.min(dist, radius);
    joyThumb.style.transform = `translate(calc(-50% + ${Math.cos(angle)*rd}px), calc(-50% + ${Math.sin(angle)*rd}px))`;
    applyJoyKeys(dx, dy, dist < radius * 0.3);
  }

  function applyJoyKeys(dx, dy, releaseAll) {
    const ns = { up:false, down:false, left:false, right:false };
    if (!releaseAll) {
      if(dy < -20) ns.up    = true;
      if(dy >  20) ns.down  = true;
      if(dx < -20) ns.left  = true;
      if(dx >  20) ns.right = true;
    }
    ['up','down','left','right'].forEach(dir => {
      if(ns[dir] !== currentJoyPressed[dir]) {
        const key = joyConfigKeys[dir];
        triggerEvent(key, ns[dir] ? 'keydown' : 'keyup');
        currentJoyPressed[dir] = ns[dir];
      }
    });
  }

  /* ====== إظهار / إخفاء ====== */
  function showForGame(devId) {
    activeGameId = devId;
    if(typeof GameControls === 'undefined' || !GameControls[devId]) return;
    const config = GameControls[devId];
    document.querySelectorAll('.virtual-btn').forEach(b => b.classList.add('hidden'));
    if(joyBase) joyBase.classList.add('hidden');
    const vis = [];

    if(config.joystick && joyBase) {
      joyBase.classList.remove('hidden'); vis.push(joyBase);
      joyConfigKeys = config.joystick === 'wasd'
        ? { up:'w', down:'s', left:'a', right:'d' }
        : { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' };
    }
    if(config.buttons) {
      config.buttons.forEach(key => {
        const btn = document.querySelector(`.virtual-btn[data-key="${key}"]`);
        if(btn){ btn.classList.remove('hidden'); vis.push(btn); }
      });
    }
    if(vis.length > 0){ Utils.show(zone); loadLayout(vis); }
  }

  function hide() {
    Utils.hide(zone);
    if(isEditMode) toggleEditMode();
    activeGameId = null;
    releaseAllKeys(); handleJoyEnd();
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;
    if(isEditMode){
      zone.classList.add('edit-mode');
      Utils.hide(editBtn); Utils.show(saveBtn); Utils.show(resetBtn);
    } else {
      zone.classList.remove('edit-mode');
      Utils.show(editBtn); Utils.hide(saveBtn); Utils.hide(resetBtn);
    }
  }

  /* ====== Drag & Drop ====== */
  function dragStart(e) {
    if(!isEditMode) return;
    const target = e.target.closest('.virtual-btn') || e.target.closest('.gamepad-joystick-draggable');
    if(!target) return;
    e.preventDefault();
    dragTarget = target; dragTarget.classList.add('dragging');
    const cx = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const cy = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    startX = cx; startY = cy;
    if(dragTarget.style.position !== 'absolute') dragTarget.style.position = 'absolute';
    initialLeft = dragTarget.offsetLeft; initialTop = dragTarget.offsetTop;
  }
  function dragMove(e) {
    if(!isEditMode||!dragTarget) return;
    e.preventDefault();
    const cx = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const cy = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    dragTarget.style.left = `${initialLeft + cx - startX}px`;
    dragTarget.style.top  = `${initialTop  + cy - startY}px`;
  }
  function dragEnd() { if(dragTarget){ dragTarget.classList.remove('dragging'); dragTarget = null; } }

  /* ====== حفظ / تحميل التخطيط ====== */
  function saveLayout() {
    if(!activeGameId) return;
    const layout = {};
    document.querySelectorAll('.virtual-btn:not(.hidden)').forEach(btn => {
      layout[btn.dataset.key] = { left: btn.style.left, top: btn.style.top };
    });
    if(joyBase && !joyBase.classList.contains('hidden'))
      layout['joystick'] = { left: joyBase.style.left, top: joyBase.style.top };
    localStorage.setItem(`gamepad_layout_${activeGameId}`, JSON.stringify(layout));
    toggleEditMode();
  }
  function loadLayout(vis) {
    const saved = localStorage.getItem(`gamepad_layout_${activeGameId}`);
    if(saved) {
      const layout = JSON.parse(saved);
      vis.forEach(el => {
        const key = el.dataset.key || (el.id === 'gamepad-joystick-base' ? 'joystick' : null);
        if(key && layout[key]){ el.style.position='absolute'; el.style.left=layout[key].left; el.style.top=layout[key].top; }
      });
    } else { applySmartLayout(vis); }
  }
  function resetLayout() {
    if(!activeGameId) return;
    localStorage.removeItem(`gamepad_layout_${activeGameId}`);
    const vis = [];
    document.querySelectorAll('.virtual-btn:not(.hidden)').forEach(e => vis.push(e));
    if(joyBase && !joyBase.classList.contains('hidden')) vis.push(joyBase);
    applySmartLayout(vis);
  }
  function applySmartLayout(elements) {
    const w = window.innerWidth, h = window.innerHeight;
    let ai = 0;
    elements.forEach(el => {
      el.style.position = 'absolute';
      if(el.id === 'gamepad-joystick-base'){
        el.style.left = '80px'; el.style.top = (h-140)+'px';
      } else {
        el.style.left = (w - 80 - ai * 65)+'px';
        el.style.top  = (h - 80 - (ai%2!==0?35:0))+'px';
        ai++;
      }
    });
  }

  /* ====== ضغط الأزرار ====== */
  function pressKey(btn, type) {
    btn.classList.toggle('active-press', type === 'keydown');
    if(type === 'keydown') pressedKeys.add(btn);
    else pressedKeys.delete(btn);
    triggerEvent(btn.dataset.key, type);
  }
  function releaseAllKeys() {
    pressedKeys.forEach(btn => {
      btn.classList.remove('active-press');
      triggerEvent(btn.dataset.key, 'keyup');
    });
    pressedKeys.clear();
  }

  /* ====== إرسال المفاتيح للـ iframe ====== */
  function triggerEvent(key, type) {
    if(!key) return;
    const kc   = _keyCode(key);
    const data = { key, code: key, keyCode: kc, bubbles: true, cancelable: true };
    const iframe = Utils.$('device-iframe');

    /* ---- محاولة 1: حقن مباشر (يعمل فقط على نفس الـ origin) ---- */
    if(iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.dispatchEvent(new KeyboardEvent(type, data));
        iframe.contentWindow.document.dispatchEvent(new KeyboardEvent(type, data));
      } catch(e) { /* cross-origin — نتجاهل */ }

      /* ---- محاولة 2: postMessage (إذا كانت اللعبة تدعمه) ---- */
      try {
        iframe.contentWindow.postMessage({ type, key, code: key, keyCode: kc }, '*');
      } catch(e) {}
    }

    /* ---- محاولة 3: Android WebView Bridge ---- */
    /* الأقوى — يعمل عبر evaluateJavascript في Kotlin */
    if(window.AndroidApp) {
      if(typeof window.AndroidApp.injectKeyToIframe === 'function') {
        try { window.AndroidApp.injectKeyToIframe(key, type, kc); } catch(e) {}
      }
      // بديل قديم إذا كانت النسخة لا تدعم injectKeyToIframe
      else if(typeof window.AndroidApp.onButtonPress === 'function') {
        try { window.AndroidApp.onButtonPress(key, type); } catch(e) {}
      }
    }
  }

  function _keyCode(key) {
    const map = {
      'ArrowUp':38,'ArrowDown':40,'ArrowLeft':37,'ArrowRight':39,
      'Enter':13,' ':32,'Escape':27,'Shift':16,'Tab':9,'Backspace':8,
      'w':87,'a':65,'s':83,'d':68,
      'z':90,'x':88,'r':82,'p':80,'q':81
    };
    return map[key] || (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
  }

  window.addEventListener('DOMContentLoaded', init);
  return { showForGame, hide };
})();