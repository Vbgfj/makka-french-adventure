/* =========================================================
   MAKKA FRENCH ADVENTURE — Main Application Controller
   Created for Mr. Alaa Eid — Makka Center
   ========================================================= */

const AppController = (() => {
  let curriculumData = [];
  let currentLessonIndex = 0;

  // Built-in emergency fallback for Lesson 1 so the game is 100% playable even before curriculum.json loads
  const FALLBACK_CURRICULUM = [
    {
      id: 'u1-l1',
      unit: 'Unité 1 : Le Club de ma classe',
      shortTitle: 'Unité 1 • Leçon 1',
      title: 'Leçon 1 : Se présenter (تقديم النفس والتحيات)',
      difficulty: 'Facile • سهل',
      pages: 'ص 16 – 20',
      questions: [
        {
          type: 'mcq',
          topic: 'Les saluts • التحيات',
          prompt: 'Tu rencontres un ami le matin, tu dis : ............',
          hintAr: 'تقابل صديقك في الصباح، تقول له:',
          speechText: 'Tu rencontres un ami le matin, tu dis',
          options: ['Bonjour !', 'Bonsoir !', 'Bonne nuit !'],
          answer: 'Bonjour !'
        },
        {
          type: 'mcq',
          topic: 'Demander le nom • السؤال عن الاسم',
          prompt: "Pour demander le nom d'un ami, tu dis : ............",
          hintAr: 'لكي تسأل صديقك عن اسمه، تقول له:',
          speechText: "Pour demander le nom d'un ami, tu dis",
          options: ["Comment t'appelles-tu ?", 'Quel âge as-tu ?', 'Où habites-tu ?'],
          answer: "Comment t'appelles-tu ?"
        },
        {
          type: 'conjugation',
          topic: "Verbe s'appeler • تصريف الأفعال",
          prompt: 'Je ............ Ezz El Din.',
          hintAr: "اختر التصريف الصحيح لفعل (s'appeler) مع الضمير (Je):",
          speechText: "Je m'appelle Ezz El Din",
          options: ["m'appelle", "t'appelles", "s'appelle"],
          answer: "m'appelle"
        },
        {
          type: 'fill_blank',
          topic: 'Les articles indéfinis • أدوات النكرة',
          prompt: 'Voici Camille, ............ amie du collège.',
          hintAr: 'اختر أداة النكرة المناسبة لكلمة (amie) المفرد المؤنث:',
          speechText: 'Voici Camille, une amie du collège',
          options: ['un', 'une', 'des'],
          answer: 'une'
        },
        {
          type: 'mcq',
          topic: 'Prendre congé • الاستئذان والوداع',
          prompt: 'Pour quitter un ami, tu dis : ............',
          hintAr: 'عندما تودّع صديقك وتنصرف، تقول له:',
          speechText: 'Pour quitter un ami, tu dis',
          options: ['Au revoir !', 'Bienvenue !', 'Bonjour !'],
          answer: 'Au revoir !'
        }
      ]
    }
  ];

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach((sec) => {
      sec.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
    }

    if (screenId === 'screen-menu') {
      refreshMenuStats();
    } else if (screenId === 'screen-characters') {
      renderCharacterPreviews();
    } else if (screenId === 'screen-lessons') {
      renderLessonsList();
    }
  }

  function refreshMenuStats() {
    const totals = StorageManager.getTotals();
    const coinsEl = document.getElementById('menu-total-coins');
    const starsEl = document.getElementById('menu-total-stars');
    const scoreEl = document.getElementById('menu-total-score');
    const continueBtn = document.getElementById('btn-continue-game');

    if (coinsEl) coinsEl.textContent = String(totals.coins);
    if (starsEl) starsEl.textContent = String(totals.stars);
    if (scoreEl) scoreEl.textContent = String(totals.score);

    const lastId = StorageManager.getLastLesson();
    if (continueBtn) {
      continueBtn.disabled = !lastId;
    }
  }

  async function loadCurriculum() {
    try {
      const response = await fetch('data/curriculum.json', { cache: 'no-store' });
      if (response.ok) {
        const json = await response.json();
        if (Array.isArray(json.lessons) && json.lessons.length > 0) {
          curriculumData = json.lessons;
          return;
        }
      }
    } catch (e) {
      // Fallback gracefully to bundled lesson data
    }
    curriculumData = FALLBACK_CURRICULUM;
  }

  function runSplashSequence() {
    const bar = document.getElementById('splash-progress');
    let progress = 0;

    const timer = setInterval(() => {
      progress += 20;
      if (bar) bar.style.width = `${Math.min(100, progress)}%`;

      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          showScreen('screen-menu');
        }, 300);
      }
    }, 240);
  }

  function renderCharacterPreviews() {
    const savedChar = StorageManager.getCharacter();
    ['boy', 'girl', 'fox', 'robot'].forEach((charId) => {
      const canvas = document.getElementById(`preview-${charId}`);
      PlayerController.renderPreview(canvas, charId);
    });

    document.querySelectorAll('.character-card').forEach((card) => {
      card.classList.toggle('selected', card.dataset.char === savedChar);
    });
  }

  function bindCharacterSelection() {
    document.querySelectorAll('.character-card').forEach((card) => {
      card.addEventListener('click', () => {
        AudioManager.playClick();
        const chosen = card.dataset.char || 'boy';
        StorageManager.setCharacter(chosen);
        document.querySelectorAll('.character-card').forEach((c) => {
          c.classList.remove('selected');
        });
        card.classList.add('selected');
      });
    });

    const confirmBtn = document.getElementById('btn-confirm-character');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        AudioManager.playClick();
        showScreen('screen-lessons');
      });
    }
  }

  function renderLessonsList() {
    const container = document.getElementById('lessons-list');
    if (!container) return;
    container.innerHTML = '';

    curriculumData.forEach((lesson, idx) => {
      const prog = StorageManager.getLessonProgress(lesson.id);
      const qCount = Array.isArray(lesson.questions) ? lesson.questions.length : 0;

      const card = document.createElement('div');
      card.className = `lesson-card ${prog.completed ? 'completed' : ''}`;

      const starsDisplay = prog.completed
        ? '⭐'.repeat(prog.stars) + '☆'.repeat(Math.max(0, 3 - prog.stars))
        : '☆☆☆';

      const pct = prog.completed ? 100 : 0;

      card.innerHTML = `
        <div class="lesson-header">
          <span class="lesson-badge">${lesson.unit}</span>
          <span class="lesson-stars">${starsDisplay}</span>
        </div>
        <h3>${lesson.title}</h3>
        <p>${lesson.difficulty} • ${qCount} تحديات (${lesson.pages || ''})</p>
        <div class="lesson-meta">
          <span>${prog.completed ? `✅ مكتمل • أفضل نتيجة: ${prog.bestScore} نقطة` : '🆕 جاهز للمغامرة'}</span>
          <span>ابدأ اللعب ◀</span>
        </div>
        <div class="lesson-progress-bar">
          <div class="lesson-progress-fill" style="width: ${pct}%"></div>
        </div>
      `;

      card.addEventListener('click', () => {
        AudioManager.playClick();
        launchLesson(idx);
      });

      container.appendChild(card);
    });
  }

  function launchLesson(index) {
    if (!curriculumData[index]) index = 0;
    currentLessonIndex = index;
    const lesson = curriculumData[index];
    const charId = StorageManager.getCharacter();

    StorageManager.setLastLesson(lesson.id);
    showScreen('screen-game');

    GameEngine.startLesson(lesson, charId, (result) => {
      showVictoryScreen(result);
    });
  }

  function showVictoryScreen(result) {
    const starsEl = document.getElementById('victory-stars');
    const scoreEl = document.getElementById('v-score');
    const correctEl = document.getElementById('v-correct');
    const incorrectEl = document.getElementById('v-incorrect');
    const accuracyEl = document.getElementById('v-accuracy');
    const nextBtn = document.getElementById('btn-next-lesson');

    if (starsEl) {
      starsEl.textContent = '⭐'.repeat(result.stars) + '☆'.repeat(Math.max(0, 3 - result.stars));
    }
    if (scoreEl) scoreEl.textContent = String(result.score);
    if (correctEl) correctEl.textContent = String(result.correct);
    if (incorrectEl) incorrectEl.textContent = String(result.incorrect);
    if (accuracyEl) accuracyEl.textContent = `${result.accuracy}%`;

    if (nextBtn) {
      const hasNext = currentLessonIndex + 1 < curriculumData.length;
      nextBtn.style.display = hasNext ? 'inline-flex' : 'none';
    }

    showScreen('screen-victory');
  }

  function bindTouchAndKeyboardControls() {
    const bindHoldButton = (btnId, direction) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;

      const startHandler = (e) => {
        e.preventDefault();
        GameEngine.setInput(direction, true);
      };
      const endHandler = (e) => {
        e.preventDefault();
        GameEngine.setInput(direction, false);
      };

      btn.addEventListener('touchstart', startHandler, { passive: false });
      btn.addEventListener('touchend', endHandler, { passive: false });
      btn.addEventListener('touchcancel', endHandler, { passive: false });
      btn.addEventListener('mousedown', startHandler);
      btn.addEventListener('mouseup', endHandler);
      btn.addEventListener('mouseleave', endHandler);
    };

    bindHoldButton('ctrl-left', 'left');
    bindHoldButton('ctrl-right', 'right');
    bindHoldButton('ctrl-jump', 'jump');

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        GameEngine.setInput('left', true);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        GameEngine.setInput('right', true);
      } else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') {
        GameEngine.setInput('jump', true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        GameEngine.setInput('left', false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        GameEngine.setInput('right', false);
      } else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') {
        GameEngine.setInput('jump', false);
      }
    });
  }

  function exitAndroidApp() {
    AudioManager.playClick();
    // Use Capacitor App plugin when running as Android APK
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.exitApp();
      return;
    }
    // Graceful fallback if tested in a standard web browser
    if (window.history.length > 1) {
      window.history.back();
    } else {
      showScreen('screen-splash');
    }
  }

  function bindNavigationAndModals() {
    // Main Menu buttons
    const btnStart = document.getElementById('btn-start-adventure');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        AudioManager.playClick();
        showScreen('screen-characters');
      });
    }

    const btnContinue = document.getElementById('btn-continue-game');
    if (btnContinue) {
      btnContinue.addEventListener('click', () => {
        AudioManager.playClick();
        const lastId = StorageManager.getLastLesson();
        const foundIdx = curriculumData.findIndex((l) => l.id === lastId);
        launchLesson(foundIdx >= 0 ? foundIdx : 0);
      });
    }

    const btnSelectLesson = document.getElementById('btn-select-lesson');
    if (btnSelectLesson) {
      btnSelectLesson.addEventListener('click', () => {
        AudioManager.playClick();
        showScreen('screen-lessons');
      });
    }

    const btnHowTo = document.getElementById('btn-how-to-play');
    if (btnHowTo) {
      btnHowTo.addEventListener('click', () => {
        AudioManager.playClick();
        document.getElementById('howto-modal')?.classList.remove('hidden');
      });
    }

    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        AudioManager.playClick();
        const s = StorageManager.getSettings();
        const sfxEl = document.getElementById('toggle-sfx');
        const ttsEl = document.getElementById('toggle-tts');
        if (sfxEl) sfxEl.checked = s.sfx !== false;
        if (ttsEl) ttsEl.checked = s.tts !== false;
        document.getElementById('settings-modal')?.classList.remove('hidden');
      });
    }

    const btnExit = document.getElementById('btn-exit');
    if (btnExit) {
      btnExit.addEventListener('click', exitAndroidApp);
    }

    // Back buttons
    document.querySelectorAll('.btn-back').forEach((btn) => {
      btn.addEventListener('click', () => {
        AudioManager.playClick();
        const target = btn.dataset.target || 'screen-menu';
        showScreen(target);
      });
    });

    // Close modal buttons
    document.querySelectorAll('.close-modal-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        AudioManager.playClick();
        const modalId = btn.dataset.modal;
        if (modalId) document.getElementById(modalId)?.classList.add('hidden');
      });
    });

    // Settings toggles
    const sfxToggle = document.getElementById('toggle-sfx');
    if (sfxToggle) {
      sfxToggle.addEventListener('change', (e) => {
        StorageManager.updateSettings({ sfx: e.target.checked });
        if (e.target.checked) AudioManager.playClick();
      });
    }

    const ttsToggle = document.getElementById('toggle-tts');
    if (ttsToggle) {
      ttsToggle.addEventListener('change', (e) => {
        StorageManager.updateSettings({ tts: e.target.checked });
      });
    }

    const resetBtn = document.getElementById('btn-reset-progress');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        StorageManager.reset();
        refreshMenuStats();
        AudioManager.playClick();
        document.getElementById('settings-modal')?.classList.add('hidden');
      });
    }

    // Pause controls
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        AudioManager.playClick();
        GameEngine.pause();
        document.getElementById('pause-modal')?.classList.remove('hidden');
      });
    }

    const resumeBtn = document.getElementById('btn-resume');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        AudioManager.playClick();
        document.getElementById('pause-modal')?.classList.add('hidden');
        GameEngine.resume();
      });
    }

    const restartBtn = document.getElementById('btn-restart-level');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        AudioManager.playClick();
        document.getElementById('pause-modal')?.classList.add('hidden');
        GameEngine.restart();
      });
    }

    const quitBtn = document.getElementById('btn-quit-to-menu');
    if (quitBtn) {
      quitBtn.addEventListener('click', () => {
        AudioManager.playClick();
        document.getElementById('pause-modal')?.classList.add('hidden');
        GameEngine.stop();
        showScreen('screen-menu');
      });
    }

    // Victory screen buttons
    const nextLessonBtn = document.getElementById('btn-next-lesson');
    if (nextLessonBtn) {
      nextLessonBtn.addEventListener('click', () => {
        AudioManager.playClick();
        launchLesson(currentLessonIndex + 1);
      });
    }

    const playAgainBtn = document.getElementById('btn-play-again');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        AudioManager.playClick();
        launchLesson(currentLessonIndex);
      });
    }

    const victoryMenuBtn = document.getElementById('btn-victory-menu');
    if (victoryMenuBtn) {
      victoryMenuBtn.addEventListener('click', () => {
        AudioManager.playClick();
        showScreen('screen-menu');
      });
    }
  }

  async function init() {
    await loadCurriculum();
    bindNavigationAndModals();
    bindCharacterSelection();
    bindTouchAndKeyboardControls();
    runSplashSequence();
  }

  return {
    init,
    showScreen
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  AppController.init();
});
