/* =========================================================
   MAKKA FRENCH ADVENTURE — 3D-Style 2D Adventure Engine
   Created for Mr. Alaa Eid — Makka Center
   ========================================================= */

const GameEngine = (() => {
  let canvas = null;
  let ctx = null;
  let animFrameId = null;

  // Strict State Machine: IDLE | PLAYING | QUESTION_ACTIVE | ANIMATING_RESULT | PAUSED | VICTORY
  let gameState = 'IDLE';

  let currentLesson = null;
  let selectedCharacter = 'boy';
  let onVictoryDone = null;

  // World dimensions & layout
  let viewWidth = 800;
  let viewHeight = 450;
  let groundY = 360;
  let worldWidth = 3400;

  // Entities & world objects
  let player = null;
  let platforms = [];
  let riverZones = [];
  let coins = [];
  let checkpoints = [];
  let clouds = [];
  let floatingGlyphs = [];
  let particles = [];
  let treasureChest = null;

  // Scoring & stats
  let score = 0;
  let coinsCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let answeredCount = 0;
  let worldTime = 0;

  // Active controls state
  const inputState = {
    left: false,
    right: false,
    jump: false
  };

  function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return false;
    ctx = canvas.getContext('2d');
    handleResize();
    return true;
  }

  function handleResize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    viewWidth = Math.max(320, rect.width || window.innerWidth);
    viewHeight = Math.max(240, rect.height || window.innerHeight);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewWidth * dpr);
    canvas.height = Math.floor(viewHeight * dpr);
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const oldGroundY = groundY;
    groundY = Math.max(215, viewHeight - 92);
    const deltaY = groundY - oldGroundY;

    if (player) {
      player.y += deltaY;
    }
    platforms.forEach((p) => {
      p.y += deltaY;
    });
    coins.forEach((c) => {
      c.y += deltaY;
      c.baseY += deltaY;
    });
    checkpoints.forEach((cp) => {
      cp.y = groundY - cp.h;
    });
    if (treasureChest) {
      treasureChest.y = groundY - treasureChest.h;
    }

    CameraController.resize(viewWidth);
  }

  function buildWorldForLesson(lesson) {
    const questions = Array.isArray(lesson.questions) ? lesson.questions : [];
    const totalQ = Math.max(1, questions.length);
    const spacing = 560;
    worldWidth = 540 + totalQ * spacing + 440;

    groundY = Math.max(215, viewHeight - 92);
    player = PlayerController.createPlayer(selectedCharacter, 85, groundY - 68);

    platforms = [];
    riverZones = [];
    coins = [];
    checkpoints = [];
    particles = [];

    // Generate lush layered clouds
    clouds = [];
    for (let i = 0; i < 15; i++) {
      clouds.push({
        x: i * 280 + 50,
        y: 48 + (i % 3) * 32,
        scale: 0.78 + (i % 3) * 0.22,
        speed: 0.16 + (i % 2) * 0.09
      });
    }

    // Ambient glowing French letters floating in the sky (matching app icon)
    const glyphs = ['A', 'É', 'Ç', 'À', 'Ê', '★'];
    floatingGlyphs = [];
    for (let i = 0; i < 16; i++) {
      floatingGlyphs.push({
        char: glyphs[i % glyphs.length],
        x: 180 + i * 250,
        baseY: 72 + (i % 4) * 36,
        phase: i * 1.1,
        color: i % 2 === 0 ? '#fde047' : '#38bdf8'
      });
    }

    // Build 3D beveled platforms, glowing rivers, bonus coins, and royal checkpoints
    for (let i = 0; i < totalQ; i++) {
      const sectionStart = 330 + i * spacing;
      const cpX = sectionStart + 345;

      // Elevated 3D stepping platforms
      platforms.push({
        x: sectionStart + 38,
        y: groundY - 82,
        w: 122,
        h: 24,
        style: 'grass'
      });

      platforms.push({
        x: sectionStart + 188,
        y: groundY - 134,
        w: 114,
        h: 24,
        style: 'gold'
      });

      // Glowing emerald river & arched wooden bridge in alternating segments
      if (i % 2 === 0) {
        riverZones.push({
          x: sectionStart + 68,
          w: 180
        });
      }

      // Bonus floating 3D coins along the path
      coins.push({
        x: sectionStart + 98,
        y: groundY - 122,
        baseY: groundY - 122,
        r: 14,
        collected: false,
        phase: i * 0.9
      });
      coins.push({
        x: sectionStart + 244,
        y: groundY - 174,
        baseY: groundY - 174,
        r: 14,
        collected: false,
        phase: i * 0.9 + 1.4
      });

      // Ornate Parisian Checkpoint Archway
      checkpoints.push({
        index: i,
        x: cpX,
        y: groundY - 114,
        w: 64,
        h: 114,
        question: questions[i],
        cleared: false,
        barrierOpen: false,
        safeX: sectionStart + 225
      });
    }

    // Final Royal Golden Treasure Chest
    const lastCpX = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].x : 620;
    treasureChest = {
      x: lastCpX + 270,
      y: groundY - 64,
      w: 76,
      h: 64,
      opened: false
    };

    CameraController.reset(worldWidth, viewWidth);
  }

  function updateHud() {
    const totalQ = checkpoints.length || 1;
    const lessonNameEl = document.getElementById('hud-lesson-name');
    const barEl = document.getElementById('hud-progress-bar');
    const textEl = document.getElementById('hud-progress-text');
    const coinsEl = document.getElementById('hud-coins');
    const scoreEl = document.getElementById('hud-score');

    if (lessonNameEl && currentLesson) {
      lessonNameEl.textContent = currentLesson.shortTitle || currentLesson.title;
    }
    if (barEl) {
      const pct = Math.min(100, Math.round((answeredCount / totalQ) * 100));
      barEl.style.width = `${pct}%`;
    }
    if (textEl) {
      textEl.textContent = `${answeredCount} / ${totalQ}`;
    }
    if (coinsEl) coinsEl.textContent = String(coinsCount);
    if (scoreEl) scoreEl.textContent = String(score);
  }

  function setBannerMessage(msg) {
    const el = document.getElementById('game-banner-msg');
    if (el) el.textContent = msg;
  }

  function spawnParticles(x, y, color, count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 2.2 + Math.random() * 4.8;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.2,
        life: 34 + Math.floor(Math.random() * 14),
        maxLife: 48,
        color,
        size: 4 + Math.random() * 4.5
      });
    }
  }

  function triggerCheckpoint(cp) {
    if (gameState !== 'PLAYING' || cp.cleared) return;

    gameState = 'QUESTION_ACTIVE';
    player.locked = true;
    player.vx = 0;
    inputState.left = false;
    inputState.right = false;
    inputState.jump = false;

    setBannerMessage(`🚩 بوابة التحدي رقم ${cp.index + 1} — أجب لتعبر!`);

    QuestionEngine.showQuestion(
      cp.question,
      cp.index,
      checkpoints.length,
      (isCorrect) => {
        cp.cleared = true;
        cp.barrierOpen = true;
        answeredCount += 1;
        gameState = 'ANIMATING_RESULT';

        if (isCorrect) {
          score += 10;
          coinsCount += 1;
          correctCount += 1;
          AudioManager.playCorrect();
          setTimeout(() => AudioManager.playCoin(), 220);
          spawnParticles(cp.x + cp.w / 2, cp.y + 36, '#fde047', 26);
          PlayerController.triggerForwardLeap(player);
          setBannerMessage('🎉 برافو! +10 نقط وعملة ذهبية!');
        } else {
          incorrectCount += 1;
          AudioManager.playWrong();
          CameraController.triggerShake(5, 10);
          spawnParticles(player.x + 24, player.y + 30, '#fb923c', 14);
          PlayerController.triggerCartoonTumble(player, cp.safeX);
          setBannerMessage('💪 ولا يهمك! كمّل المغامرة للسؤال الجاي!');
        }

        updateHud();

        setTimeout(() => {
          if (gameState === 'ANIMATING_RESULT') {
            player.locked = false;
            gameState = 'PLAYING';
            if (answeredCount >= checkpoints.length) {
              setBannerMessage('🏆 وصلت لنهاية المرحلة! افتح صندوق الكنز!');
            } else {
              setBannerMessage('🏃‍♂️ استمر لقدام نحو البوابة التالية!');
            }
          }
        }, 720);
      }
    );
  }

  function completeAdventure() {
    if (gameState === 'VICTORY') return;
    gameState = 'VICTORY';
    player.locked = true;
    if (treasureChest) treasureChest.opened = true;

    AudioManager.playVictory();
    spawnParticles(treasureChest.x + treasureChest.w / 2, treasureChest.y + 15, '#fde047', 38);

    const totalQ = Math.max(1, checkpoints.length);
    const accuracy = Math.round((correctCount / totalQ) * 100);
    let stars = 1;
    if (accuracy >= 85) stars = 3;
    else if (accuracy >= 50) stars = 2;

    if (currentLesson && currentLesson.id) {
      StorageManager.recordLessonResult(currentLesson.id, {
        score,
        coins: coinsCount,
        stars,
        accuracy
      });
    }

    setTimeout(() => {
      stopLoop();
      if (typeof onVictoryDone === 'function') {
        onVictoryDone({
          lesson: currentLesson,
          score,
          coins: coinsCount,
          correct: correctCount,
          incorrect: incorrectCount,
          accuracy,
          stars
        });
      }
    }, 980);
  }

  function updateWorld() {
    worldTime += 1;

    clouds.forEach((c) => {
      c.x -= c.speed;
      if (c.x < -180) {
        c.x = worldWidth + 140;
      }
    });

    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.18;
      pt.life -= 1;
      if (pt.life <= 0) {
        particles.splice(i, 1);
      }
    }

    if (gameState !== 'PLAYING' && gameState !== 'ANIMATING_RESULT') {
      return;
    }

    PlayerController.update(player, platforms, groundY, worldWidth, inputState);
    CameraController.follow(player.x);

    // Prevent walking past a closed checkpoint barrier
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      if (!cp.barrierOpen) {
        const triggerLine = cp.x - 14;
        if (player.x + player.w >= triggerLine) {
          player.x = triggerLine - player.w;
          player.vx = 0;
          if (gameState === 'PLAYING') {
            triggerCheckpoint(cp);
          }
          break;
        }
      }
    }

    // Collect floating 3D golden coins
    const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
    coins.for 
