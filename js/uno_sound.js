'use strict';
const UnoSound = (() => {
  const BASE = '/Song/';
  let _bgm     = null;   // موسيقى الخلفية
  let _bgmVol  = 0.5;    // مستوى الصوت الأصلي
  let _ducking = false;

  const NUM_NAMES = [
    'zero','one','two','three','four',
    'five','six','seven','eight','nine'
  ];

  // ─── تشغيل صوت واحد مع رد نداء عند الانتهاء ───
  function play(name, onEnded) {
    if(!name) return;
    const audio = new Audio(BASE + name + '.mp3');
    audio.volume = 1.0;
    audio.onended = () => {
      _unduck();
      if(onEnded) onEnded();
    };
    audio.onerror = () => {
      _unduck();
      if(onEnded) onEnded();
    };
    _duck();
    audio.play().catch(() => {
      _unduck();
      if(onEnded) onEnded();
    });
    return audio;
  }

  // ─── خفض الموسيقى (Ducking) ───
  function _duck() {
    if(!_bgm || _ducking) return;
    _ducking = true;
    _fadeTo(_bgm, _bgmVol * 0.2, 300);
  }

  function _unduck() {
    if(!_bgm || !_ducking) return;
    _ducking = false;
    _fadeTo(_bgm, _bgmVol, 500);
  }

  function _fadeTo(audio, targetVol, durationMs) {
    const steps   = 20;
    const interval= durationMs / steps;
    const delta   = (targetVol - audio.volume) / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      audio.volume = Math.max(0, Math.min(1, audio.volume + delta));
      if(step >= steps) {
        audio.volume = targetVol;
        clearInterval(timer);
      }
    }, interval);
  }

  // ─── تسلسل صوتي (كل صوت ينتظر انتهاء السابق) ───
  function playSequence(names, onAllDone) {
    if(!names || names.length === 0) {
      if(onAllDone) onAllDone();
      return;
    }
    const [first, ...rest] = names;
    play(first, () => playSequence(rest, onAllDone));
  }

  // ─── إعلان البطاقة: لون ثم رقم ───
  function announceCard(color, number) {
    const numName = NUM_NAMES[number] || 'zero';
    playSequence([color, numName]);
  }

  // ─── العد التنازلي: 3 ثم 2 ثم 1 ثم GO ───
  function announceCountdown(onGoDone) {
    playSequence(['cont_3','cont_2','cont_1','GO'], onGoDone);
  }

  // ─── بطاقة أكشن ───
  function announceAction(action) {
    const map = {
      skip   : 'skip',
      reverse: 'reverse',
      plus2  : 'plus_two',
      wild   : 'wild',
    };
    if(map[action]) play(map[action]);
  }

  // ─── خسارة قلب ───
  function loseHeart() { play('oh_no'); }

  // ─── موسيقى اللوبي ───
  function playLobbyMusic() {
    stopLobbyMusic();
    _bgm = new Audio(BASE + 'uno_dash.mp3');
    _bgm.loop   = true;
    _bgm.volume = _bgmVol;
    _bgm.play().catch(() => {});
  }

  function stopLobbyMusic() {
    if(_bgm){ _bgm.pause(); _bgm.currentTime=0; _bgm=null; }
    _ducking = false;
  }

  return {
    play, playSequence,
    announceCard, announceCountdown, announceAction,
    loseHeart, playLobbyMusic, stopLobbyMusic
  };
})();
