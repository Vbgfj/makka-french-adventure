/* =========================================================
   MAKKA FRENCH ADVENTURE — 2D Side-Scrolling Game Engine
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
    groundY = Math.max(210, viewHeight - 92);
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
    const spacing = 540;
    worldWidth = 520 + totalQ * spacing + 420;

    groundY = Math.max(210, viewHeight - 92);
    player = PlayerController.createPlayer(selectedCharacter, 85, groundY - 58);

    platforms = [];
    riverZones = [];
    coins = [];
    checkpoints = [];
    particles = [];

    // Generate drifting clouds
    clouds = [];
    for (let i = 0; i < 14; i++) {
      clouds.push({
        x: i * 290 + 60,
        y: 55 + (i % 3) * 34,
        scale: 0.75 + (i % 3) * 0.22,
        speed: 0.18 + (i % 2) * 0.1
      });
    }

    // Build platforms, rivers, bonus coins, and educational checkpoints
    for (let i = 0; i < totalQ; i++) {
      const sectionStart = 320 + i * spacing;
      const cpX = sectionStart + 330;

      // Elevated stepping platforms before each checkpoint
      platforms.push({
        x: sectionStart + 40,
        y: groundY - 76,
        w: 115,
        h: 18,
        style: 'grass'
      });

      platforms.push({
        x: sectionStart + 185,
        y: groundY - 125,
        w: 105,
        h: 18,
        style: 'gold'
      });

      // Decorative river & bridge in alternating segments
      if (i % 2 === 0) {
        riverZones.push({
          x: sectionStart + 70,
          w: 170
        });
      }

      // Bonus floating coins along the path
      coins.push({
        x: sectionStart + 88,
        y: groundY - 115,
        baseY: groundY - 115,
        r: 12,
        collected: false,
        phase: i * 0.8
      });
      coins.push({
        x: sectionStart + 228,
        y: groundY - 165,
        baseY: groundY - 165,
        r: 12,
        collected: false,
        phase: i * 0.8 + 1.2
      });

      // Educational Checkpoint Gate
      checkpoints.push({
        index: i,
        x: cpX,
        y: groundY - 96,
        w: 46,
        h: 96,
        question: questions[i],
        cleared: false,
        barrierOpen: false,
        safeX: sectionStart + 220
      });
    }

    // Final Golden Treasure Chest at the end of the world
    const lastCpX = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].x : 600;
    treasureChest = {
      x: lastCpX + 260,
      y: groundY - 54,
      w: 64,
      h: 54,
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

  function spawnParticles(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 2 + Math.random() * 4.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 32 + Math.floor(Math.random() * 14),
        maxLife: 46,
        color,
        size: 4 + Math.random() * 4
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
          spawnParticles(cp.x + 20, cp.y + 30, '#fde047', 22);
          PlayerController.triggerForwardLeap(player);
          setBannerMessage('🎉 برافو! +10 نقط وعملة ذهبية!');
        } else {
          incorrectCount += 1;
          AudioManager.playWrong();
          CameraController.triggerShake(5, 10);
          spawnParticles(player.x + 22, player.y + 25, '#fb923c', 12);
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
    spawnParticles(treasureChest.x + 32, treasureChest.y + 15, '#fde047', 32);

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
    }, 950);
  }

  function updateWorld() {
    worldTime += 1;

    // Drift clouds gently
    clouds.forEach((c) => {
      c.x -= c.speed;
      if (c.x < -160) {
        c.x = worldWidth + 120;
      }
    });

    // Update particles
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
        const triggerLine = cp.x - 18;
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

    // Collect floating golden coins
    const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
    coins.forEach((c) => {
      if (c.collected) return;
      c.y = c.baseY + Math.sin(worldTime * 0.08 + c.phase) * 5;
      const coinBox = { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
      if (PhysicsEngine.rectsOverlap(playerBox, coinBox)) {
        c.collected = true;
        coinsCount += 1;
        score += 2;
        AudioManager.playCoin();
        spawnParticles(c.x, c.y, '#fde047', 10);
        updateHud();
      }
    });

    // Check reaching the final Treasure Chest
    if (
      treasureChest &&
      answeredCount >= checkpoints.length &&
      PhysicsEngine.rectsOverlap(playerBox, treasureChest)
    ) {
      completeAdventure();
    }
  }

  function drawBackground(camX) {
    // Rich Royal & Sky Blue Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, '#1e3a8a');
    skyGrad.addColorStop(0.55, '#0ea5e9');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Glowing Sun
    ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
    ctx.beginPath();
    ctx.arc(viewWidth - 95, 82, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(viewWidth - 95, 82, 28, 0, Math.PI * 2);
    ctx.fill();

    // Parallax Layer 1: Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    clouds.forEach((c) => {
      const screenX = c.x - camX * 0.25;
      if (screenX < -140 || screenX > viewWidth + 140) return;
      ctx.beginPath();
      ctx.arc(screenX, c.y, 20 * c.scale, 0, Math.PI * 2);
      ctx.arc(screenX + 18 * c.scale, c.y - 6 * c.scale, 24 * c.scale, 0, Math.PI * 2);
      ctx.arc(screenX + 38 * c.scale, c.y, 18 * c.scale, 0, Math.PI * 2);
      ctx.fill();
    });

    // Parallax Layer 2: Distant Purple Hills & Stylized Eiffel Tower
    ctx.fillStyle = '#4c1d95';
    for (let hx = -200; hx < viewWidth + 400; hx += 340) {
      const hillX = hx - ((camX * 0.35) % 340);
      ctx.beginPath();
      ctx.moveTo(hillX, groundY);
      ctx.quadraticCurveTo(hillX + 170, groundY - 135, hillX + 340, groundY);
      ctx.fill();
    }

    // Stylized Eiffel Tower Landmark in Background
    const towerX = 480 - camX * 0.35;
    if (towerX > -120 && towerX < viewWidth + 120) {
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(towerX - 36, groundY);
      ctx.quadraticCurveTo(towerX - 10, groundY - 95, towerX, groundY - 175);
      ctx.quadraticCurveTo(towerX + 10, groundY - 95, towerX + 36, groundY);
      ctx.moveTo(towerX - 22, groundY - 55);
      ctx.lineTo(towerX + 22, groundY - 55);
      ctx.moveTo(towerX - 12, groundY - 105);
      ctx.lineTo(towerX + 12, groundY - 105);
      ctx.stroke();
    }

    // Parallax Layer 3: Midground Emerald Hills & Trees
    ctx.fillStyle = '#059669';
    for (let tx = -150; tx < viewWidth + 350; tx += 260) {
      const mX = tx - ((camX * 0.55) % 260);
      ctx.beginPath();
      ctx.moveTo(mX, groundY);
      ctx.quadraticCurveTo(mX + 130, groundY - 75, mX + 260, groundY);
      ctx.fill();
    }
  }

  function drawGroundAndRivers(camX) {
    // Main Soil Base
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, groundY, viewWidth, viewHeight - groundY);

    // Emerald Grass Top Strip
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, groundY, viewWidth, 16);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(0, groundY, viewWidth, 5);

    // Rivers with Wooden Adventure Bridges
    riverZones.forEach((rz) => {
      if (!CameraController.isVisible(rz.x, rz.w)) return;
      const sx = rz.x - camX;

      // Sparkling Blue Water
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(sx, groundY + 4, rz.w, viewHeight - groundY);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx, groundY + 4, rz.w, 8);

      // Wooden Bridge Planks over the river
      ctx.fillStyle = '#b45309';
      ctx.fillRect(sx - 6, groundY - 4, rz.w + 12, 10);
      ctx.fillStyle = '#f59e0b';
      for (let px = sx; px < sx + rz.w; px += 18) {
        ctx.fillRect(px, groundY - 4, 12, 4);
      }
    });
  }

  function drawPlatforms(camX) {
    platforms.forEach((p) => {
      if (!CameraController.isVisible(p.x, p.w)) return;
      const sx = p.x - camX;

      ctx.fillStyle = p.style === 'gold' ? '#d97706' : '#047857';
      ctx.beginPath();
      ctx.roundRect(sx, p.y, p.w, p.h, 8);
      ctx.fill();

      ctx.fillStyle = p.style === 'gold' ? '#fde047' : '#34d399';
      ctx.beginPath();
      ctx.roundRect(sx + 2, p.y, p.w - 4, 6, 5);
      ctx.fill();
    });
  }

  function drawCoins(camX) {
    coins.forEach((c) => {
      if (c.collected || !CameraController.isVisible(c.x - c.r, c.r * 2)) return;
      const sx = c.x - camX;

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(sx, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(sx - 2, c.y - 2, c.r * 0.72, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', sx, c.y + 4);
    });
  }

  function drawCheckpoints(camX) {
    checkpoints.forEach((cp) => {
      if (!CameraController.isVisible(cp.x, cp.w)) return;
      const sx = cp.x - camX;

      // Checkpoint Pole
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(sx + 8, cp.y, 6, cp.h);

      // Flag Banner (Purple when locked, Emerald Green when cleared)
      ctx.fillStyle = cp.cleared ? '#10b981' : '#7c3aed';
      ctx.beginPath();
      ctx.moveTo(sx + 14, cp.y + 6);
      ctx.lineTo(sx + 54, cp.y + 22);
      ctx.lineTo(sx + 14, cp.y + 38);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cp.cleared ? '✓' : `Q${cp.index + 1}`, sx + 28, cp.y + 26);

      // Magical Energy Barrier when not yet answered
      if (!cp.barrierOpen) {
        const pulse = 0.45 + Math.sin(worldTime * 0.12) * 0.2;
        ctx.fillStyle = `rgba(245, 158, 11, ${pulse})`;
        ctx.fillRect(sx - 4, cp.y - 10, 8, cp.h + 10);
      }
    });
  }

  function drawTreasureChest(camX) {
    if (!treasureChest || !CameraController.isVisible(treasureChest.x, treasureChest.w)) return;
    const sx = treasureChest.x - camX;
    const sy = treasureChest.y;

    // Chest Body
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.roundRect(sx, sy + 18, treasureChest.w, 36, 6);
    ctx.fill();

    // Gold Trim
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx + 2, sy + 20, treasureChest.w - 4, 32);

    // Chest Lid
    ctx.fillStyle = '#d97706';
    const lidOffset = treasureChest.opened ? -14 : 0;
    ctx.beginPath();
    ctx.roundRect(sx - 2, sy + 6 + lidOffset, treasureChest.w + 4, 15, 6);
    ctx.fill();

    // Lock / Glow
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(sx + treasureChest.w / 2, sy + 24, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRÉSOR', sx + treasureChest.w / 2, sy - 6);
  }

  function drawParticles(camX) {
    particles.forEach((pt) => {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x - camX, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function renderFrame() {
    if (!ctx) return;
    const cam = CameraController.getOffset();

    ctx.save();
    ctx.translate(0, cam.y);

    drawBackground(cam.x);
    drawGroundAndRivers(cam.x);
    drawPlatforms(cam.x);
    drawCoins(cam.x);
    drawCheckpoints(cam.x);
    drawTreasureChest(cam.x);
    PlayerController.draw(ctx, player, cam);
    drawParticles(cam.x);

    ctx.restore();
  }

  function gameLoop() {
    updateWorld();
    renderFrame();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  function stopLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function startLesson(lessonObj, charId, victoryCallback) {
    stopLoop();
    currentLesson = lessonObj;
    selectedCharacter = charId || 'boy';
    onVictoryDone = victoryCallback;

    score = 0;
    coinsCount = 0;
    correctCount = 0;
    incorrectCount = 0;
    answeredCount = 0;
    worldTime = 0;
    inputState.left = false;
    inputState.right = false;
    inputState.jump = false;

    if (!initCanvas()) return;
    buildWorldForLesson(lessonObj);
    updateHud();
    setBannerMessage('امشِ لقدام لحد بوابة التحدي! 🚩');

    gameState = 'PLAYING';
    animFrameId = requestAnimationFrame(gameLoop);
  }

  function pause() {
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
    }
  }

  function resume() {
    if (gameState === 'PAUSED') {
      gameState = 'PLAYING';
    }
  }

  function restart() {
    if (currentLesson) {
      QuestionEngine.closeModal();
      startLesson(currentLesson, selectedCharacter, onVictoryDone);
    }
  }

  function stop() {
    stopLoop();
    QuestionEngine.closeModal();
    gameState = 'IDLE';
  }

  function setInput(direction, isActive) {
    if (direction in inputState) {
      inputState[direction] = Boolean(isActive);
    }
  }

  window.addEventListener('resize', () => {
    if (gameState !== 'IDLE') {
      handleResize();
    }
  });

  return {
    startLesson,
    pause,
    resume,
    restart,
    stop,
    setInput
  };
})();
