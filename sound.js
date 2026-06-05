'use strict';
const Sound = (() => {
  let _bgm = null;
  let _currentTrack = 1;
  const _maxTracks = 4; // 🎵 تم ضبطها على 4 مسارات بناءً على ملف البنية version.json لديك

  function init() {
    if (_bgm) return;
    _bgm = new Audio();
    _bgm.volume = 0.35; // مستوى الصوت المريح (35%)
  }

  function playNext() {
    init();
    
    // تنسيق الرقم ليصبح بصيغة خانتين دائماً مثل: title_01.mp3
    const trackNumber = String(_currentTrack).padStart(2, '0');
    _bgm.src = `/Song/title_${trackNumber}.mp3`;
    
    // محاولة التشغيل مع معالجة حماية المتصفحات
    _bgm.play().catch(err => {
      console.warn('[SoundManager] تم حجب التشغيل التلقائي من المتصفح:', err.message);
    });
    
    // الانتقال التلقائي والدوري للمقطع التالي فور انتهاء الأغنية الحالية
    _bgm.onended = () => {
      _currentTrack++;
      if (_currentTrack > _maxTracks) _currentTrack = 1;
      playNext();
    };
  }

  function pause() {
    if (_bgm && !_bgm.paused) {
      _bgm.pause();
    }
  }

  function resume() {
    if (_bgm && _bgm.paused && _bgm.src) {
      _bgm.play().catch(() => {});
    }
  }

  return {
    playNext,
    pause,
    resume
  };
})();
      
