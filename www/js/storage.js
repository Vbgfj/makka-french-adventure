/* =========================================================
   MAKKA FRENCH ADVENTURE — Offline Storage Manager
   Created for Mr. Alaa Eid — Makka Center
   ========================================================= */

const StorageManager = (() => {
  const STORAGE_KEY = 'makka_french_adventure_save_v1';

  const defaultState = {
    selectedCharacter: 'boy',
    lastLessonId: null,
    totalScore: 0,
    totalCoins: 0,
    lessons: {},
    settings: {
      sfx: true,
      tts: true
    }
  };

  function cloneDefault() {
    return JSON.parse(JSON.stringify(defaultState));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return cloneDefault();
      const parsed = JSON.parse(raw);
      return {
        ...cloneDefault(),
        ...parsed,
        lessons: parsed.lessons || {},
        settings: {
          ...defaultState.settings,
          ...(parsed.settings || {})
        }
      };
    } catch (e) {
      return cloneDefault();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore storage quota errors gracefully
    }
  }

  function getCharacter() {
    return load().selectedCharacter || 'boy';
  }

  function setCharacter(charId) {
    const state = load();
    state.selectedCharacter = charId;
    save(state);
  }

  function getSettings() {
    return load().settings;
  }

  function updateSettings(partial) {
    const state = load();
    state.settings = { ...state.settings, ...partial };
    save(state);
    return state.settings;
  }

  function getLastLesson() {
    return load().lastLessonId;
  }

  function setLastLesson(lessonId) {
    const state = load();
    state.lastLessonId = lessonId;
    save(state);
  }

  function getLessonProgress(lessonId) {
    const state = load();
    return state.lessons[lessonId] || {
      completed: false,
      stars: 0,
      bestScore: 0,
      accuracy: 0
    };
  }

  function recordLessonResult(lessonId, { score, coins, stars, accuracy }) {
    const state = load();
    const prev = state.lessons[lessonId] || {
      completed: false,
      stars: 0,
      bestScore: 0,
      accuracy: 0
    };

    state.totalScore += Math.max(0, score || 0);
    state.totalCoins += Math.max(0, coins || 0);
    state.lastLessonId = lessonId;

    state.lessons[lessonId] = {
      completed: true,
      stars: Math.max(prev.stars, stars || 0),
      bestScore: Math.max(prev.bestScore, score || 0),
      accuracy: Math.max(prev.accuracy, accuracy || 0)
    };

    save(state);
    return state;
  }

  function getTotals() {
    const state = load();
    let totalStars = 0;
    Object.values(state.lessons).forEach((item) => {
      totalStars += item.stars || 0;
    });
    return {
      coins: state.totalCoins || 0,
      stars: totalStars,
      score: state.totalScore || 0
    };
  }

  function reset() {
    const fresh = cloneDefault();
    save(fresh);
    return fresh;
  }

  return {
    load,
    save,
    getCharacter,
    setCharacter,
    getSettings,
    updateSettings,
    getLastLesson,
    setLastLesson,
    getLessonProgress,
    recordLessonResult,
    getTotals,
    reset
  };
})();
