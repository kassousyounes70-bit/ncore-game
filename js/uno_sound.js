'use strict';
const UnoSound = (() => {
  const BASE = '/Song/';
  let _current = null;

  const NUMBER_NAMES = [
    'zero','one','two','three','four',
    'five','six','seven','eight','nine'
  ];

  function play(name) {
    if(!name) return;
    const audio = new Audio(BASE + name + '.wav');
    audio.volume = 0.85;
    audio.play().catch(()=>{});
  }

  // تشغيل اللون ثم الرقم بتأخير بسيط
  function announceCard(color, number) {
    play(color);
    setTimeout(()=>{ play(NUMBER_NAMES[number] || 'zero'); }, 900);
  }

  // عد تنازلي
  function announceCountdown(n) {
    if(n===3) play('cont_3');
    else if(n===2) play('cont_2');
    else if(n===1) play('cont_1');
    else if(n===0) play('GO');
  }

  // بطاقة أكشن
  function announceAction(action) {
    const map = {
      skip    : 'skip',
      reverse : 'reverse',
      plus2   : 'plus_two',
      wild    : 'wild',
    };
    if(map[action]) play(map[action]);
  }

  // خسارة قلب — محلية فقط
  function loseHeart() { play('oh_no'); }

  // موسيقى اللوبي
  function playLobbyMusic() {
    if(_current) { _current.pause(); _current=null; }
    _current = new Audio(BASE + 'uno_dash.mp3');
    _current.loop   = true;
    _current.volume = 0.5;
    _current.play().catch(()=>{});
  }

  function stopLobbyMusic() {
    if(_current){ _current.pause(); _current=null; }
  }

  return { play, announceCard, announceCountdown, announceAction, loseHeart, playLobbyMusic, stopLobbyMusic };
})();
