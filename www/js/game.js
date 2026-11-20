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
    coins.forEach((c) => {
      if (c.collected) return;
      c.y = c.baseY + Math.sin(worldTime * 0.08 + c.phase) * 5.5;
      const coinBox = { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
      if (PhysicsEngine.rectsOverlap(playerBox, coinBox)) {
        c.collected = true;
        coinsCount += 1;
        score += 2;
        AudioManager.playCoin();
        spawnParticles(c.x, c.y, '#fde047', 12);
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

  function drawStylizedTree(x, baseY, scale, isPurple) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(scale, scale);

    // Trunk
    ctx.fillStyle = '#5c2d16';
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-7, -34, 14, 36, 4);
    ctx.fill();
    ctx.stroke();

    // 3D Shaded Foliage Puffs
    const mainColor = isPurple ? '#7e22ce' : '#059669';
    const lightColor = isPurple ? '#c084fc' : '#34d399';
    const darkColor = isPurple ? '#4c1d95' : '#065f46';

    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(-16, -40, 18, 0, Math.PI * 2);
    ctx.arc(16, -40, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(0, -54, 24, 0, Math.PI * 2);
    ctx.arc(-14, -42, 16, 0, Math.PI * 2);
    ctx.arc(14, -42, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Top Specular Highlight
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(-6, -61, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawEiffelTowerLandmark(towerX, baseY) {
    if (towerX < -160 || towerX > viewWidth + 160) return;

    ctx.save();
    ctx.translate(towerX, baseY);

    // Soft golden magical aura behind Eiffel Tower
    const aura = ctx.createRadialGradient(0, -110, 10, 0, -110, 130);
    aura.addColorStop(0, 'rgba(253, 224, 71, 0.35)');
    aura.addColorStop(0.6, 'rgba(192, 132, 252, 0.16)');
    aura.addColorStop(1, 'rgba(30, 27, 75, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -110, 130, 0, Math.PI * 2);
    ctx.fill();

    const towerGrad = ctx.createLinearGradient(0, -210, 0, 0);
    towerGrad.addColorStop(0, '#818cf8');
    towerGrad.addColorStop(0.5, '#6366f1');
    towerGrad.addColorStop(1, '#312e81');

    ctx.strokeStyle = towerGrad;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';

    // Outer curved silhouette legs
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.quadraticCurveTo(-20, -90, -6, -195);
    ctx.moveTo(52, 0);
    ctx.quadraticCurveTo(20, -90, 6, -195);
    ctx.stroke();

    // Inner legs & bottom arch
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.quadraticCurveTo(-14, -85, -3, -195);
    ctx.moveTo(34, 0);
    ctx.quadraticCurveTo(14, -85, 3, -195);
    ctx.moveTo(-34, -28);
    ctx.quadraticCurveTo(0, -54, 34, -28);
    ctx.stroke();

    // Observation Decks & Spire
    ctx.fillStyle = '#a5b4fc';
    ctx.fillRect(-38, -56, 76, 6);
    ctx.fillRect(-22, -112, 44, 5);
    ctx.fillRect(-10, -168, 20, 4);

    // Spire & Top Beacon
    ctx.beginPath();
    ctx.moveTo(0, -195);
    ctx.lineTo(0, -218);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, -220, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBackground(camX) {
    // Rich Twilight Royal Blue to Lavender-Pink Horizon Gradient (matching app icon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, '#1e1b4b');
    skyGrad.addColorStop(0.38, '#2563eb');
    skyGrad.addColorStop(0.75, '#7dd3fc');
    skyGrad.addColorStop(1, '#f5d0fe');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Radiant Sun with Warm Concentric Halos
    const sunX = viewWidth - 95;
    const sunY = 78;
    const sunHalo = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 72);
    sunHalo.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    sunHalo.addColorStop(0.4, 'rgba(253, 224, 71, 0.35)');
    sunHalo.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = sunHalo;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 72, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
    ctx.fill();

    // Floating Magical French Letters in the Sky
    ctx.save();
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    floatingGlyphs.forEach((g) => {
      const gx = g.x - camX * 0.22;
      if (gx < -40 || gx > viewWidth + 40) return;
      const gy = g.baseY + Math.sin(worldTime * 0.045 + g.phase) * 8;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = g.color;
      ctx.fillText(g.char, gx, gy);
    });
    ctx.restore();

    // Parallax Layer 1: 3D-Shaded Fluffy Clouds
    clouds.forEach((c) => {
      const sx = c.x - camX * 0.25;
      if (sx < -150 || sx > viewWidth + 150) return;
      ctx.save();
      ctx.translate(sx, c.y);
      ctx.scale(c.scale, c.scale);

      // Warm lavender cloud base shadow
      ctx.fillStyle = 'rgba(216, 180, 254, 0.65)';
      ctx.beginPath();
      ctx.arc(0, 4, 21, 0, Math.PI * 2);
      ctx.arc(20, 2, 25, 0, Math.PI * 2);
      ctx.arc(42, 4, 19, 0, Math.PI * 2);
      ctx.fill();

      // Bright white cloud top
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.arc(20, -6, 24, 0, Math.PI * 2);
      ctx.arc(40, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Parallax Layer 2: Snow-Capped Violet Mountains
    for (let mx = -240; mx < viewWidth + 480; mx += 420) {
      const peakX = mx - ((camX * 0.3) % 420) + 210;
      const peakY = groundY - 165;

      const mGrad = ctx.createLinearGradient(0, peakY, 0, groundY);
      mGrad.addColorStop(0, '#6d28d9');
      mGrad.addColorStop(1, '#311042');
      ctx.fillStyle = mGrad;

      ctx.beginPath();
      ctx.moveTo(peakX - 210, groundY);
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(peakX + 210, groundY);
      ctx.closePath();
      ctx.fill();

      // Snow cap
      ctx.fillStyle = '#e0e7ff';
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(peakX - 54, peakY + 44);
      ctx.lineTo(peakX - 20, peakY + 34);
      ctx.lineTo(peakX, peakY + 48);
      ctx.lineTo(peakX + 22, peakY + 33);
      ctx.lineTo(peakX + 54, peakY + 44);
      ctx.closePath();
      ctx.fill();
    }

    // Parallax Layer 3: Detailed Eiffel Tower Landmark
    drawEiffelTowerLandmark(510 - camX * 0.35, groundY - 12);

    // Parallax Layer 4: Rolling Emerald & Purple Hills + Stylized Trees
    const hillSpan = 320;
    for (let hx = -320; hx < viewWidth + 640; hx += hillSpan) {
      const mX = hx - ((camX * 0.52) % hillSpan);
      const hillGrad = ctx.createLinearGradient(0, groundY - 90, 0, groundY);
      hillGrad.addColorStop(0, '#10b981');
      hillGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = hillGrad;

      ctx.beginPath();
      ctx.moveTo(mX, groundY);
      ctx.quadraticCurveTo(mX + hillSpan / 2, groundY - 92, mX + hillSpan, groundY);
      ctx.fill();

      // Decorative trees perched along hills
      const treeIndex = Math.round((hx + camX * 0.52) / hillSpan);
      drawStylizedTree(mX + hillSpan * 0.32, groundY - 36, 0.85, Math.abs(treeIndex) % 2 === 0);
      drawStylizedTree(mX + hillSpan * 0.72, groundY - 30, 0.72, Math.abs(treeIndex) % 2 !== 0);
    }
  }

  function drawGroundAndRivers(camX) {
    // Rich 3D Layered Soil Base
    const soilGrad = ctx.createLinearGradient(0, groundY, 0, viewHeight);
    soilGrad.addColorStop(0, '#78350f');
    soilGrad.addColorStop(0.35, '#5c2d16');
    soilGrad.addColorStop(1, '#29150b');
    ctx.fillStyle = soilGrad;
    ctx.fillRect(0, groundY, viewWidth, viewHeight - groundY);

    // Decorative underground pebbles for depth
    ctx.fillStyle = 'rgba(251, 191, 36, 0.14)';
    for (let px = -(camX % 90); px < viewWidth + 90; px += 90) {
      ctx.beginPath();
      ctx.ellipse(px + 24, groundY + 34, 14, 7, 0.2, 0, Math.PI * 2);
      ctx.ellipse(px + 65, groundY + 56, 10, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3D Beveled Emerald Turf Strip
    ctx.fillStyle = '#047857';
    ctx.fillRect(0, groundY, viewWidth, 20);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, groundY, viewWidth, 13);
    ctx.fillStyle = '#6ee7b7';
    ctx.fillRect(0, groundY, viewWidth, 4);

    // Dark crisp ground outline
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(viewWidth, groundY);
    ctx.stroke();

    // Glowing Magical Emerald-Cyan Rivers & Arched Wooden Bridges
    riverZones.forEach((rz) => {
      if (!CameraController.isVisible(rz.x, rz.w)) return;
      const sx = rz.x - camX;

      const riverGrad = ctx.createLinearGradient(0, groundY, 0, viewHeight);
      riverGrad.addColorStop(0, '#34d399');
      riverGrad.addColorStop(0.25, '#059669');
      riverGrad.addColorStop(1, '#022c22');
      ctx.fillStyle = riverGrad;
      ctx.fillRect(sx, groundY + 2, rz.w, viewHeight - groundY);

      // Animated Glowing Shimmer Waves on Water
      const shimmerShift = Math.sin(worldTime * 0.08) * 8;
      ctx.fillStyle = 'rgba(167, 243, 208, 0.75)';
      ctx.fillRect(sx + 14 + shimmerShift, groundY + 7, rz.w * 0.35, 4);
      ctx.fillRect(sx + rz.w * 0.55 - shimmerShift, groundY + 13, rz.w * 0.3, 3);

      // 3D Wooden & Gold Adventure Bridge over the River
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(sx - 10, groundY - 7, rz.w + 20, 14, 6);
      ctx.fill();
      ctx.stroke();

      // Bridge Deck Planks & Golden Rivets
      ctx.fillStyle = '#d97706';
      for (let bx = sx - 4; bx < sx + rz.w; bx += 22) {
        ctx.fillRect(bx, groundY - 5, 16, 7);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(bx + 6, groundY - 3, 4, 3);
        ctx.fillStyle = '#d97706';
      }
    });
  }

  function drawPlatforms(camX) {
    platforms.forEach((p) => {
      if (!CameraController.isVisible(p.x, p.w)) return;
      const sx = p.x - camX;
      const isGold = p.style === 'gold';

      // Soft Drop Shadow under Platform
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.roundRect(sx + 4, p.y + 6, p.w, p.h, 10);
      ctx.fill();

      // 3D Extruded Body
      const bodyGrad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
      if (isGold) {
        bodyGrad.addColorStop(0, '#f59e0b');
        bodyGrad.addColorStop(1, '#92400e');
      } else {
        bodyGrad.addColorStop(0, '#78350f');
        bodyGrad.addColorStop(1, '#451a03');
      }

      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(sx, p.y, p.w, p.h, 9);
      ctx.fill();
      ctx.stroke();

      // 3D Top Cap (Emerald Turf or Radiant Gold Rim)
      ctx.fillStyle = isGold ? '#fde047' : '#10b981';
      ctx.beginPath();
      ctx.roundRect(sx + 2, p.y + 1, p.w - 4, 9, 7);
      ctx.fill();

      // Specular Top Highlight Line
      ctx.fillStyle = isGold ? '#fef9c3' : '#6ee7b7';
      ctx.fillRect(sx + 10, p.y + 2, p.w - 20, 2.5);
    });
  }

  function drawCoins(camX) {
    coins.forEach((c) => {
      if (c.collected || !CameraController.isVisible(c.x - c.r, c.r * 2)) return;
      const sx = c.x - camX;

      // Apparent 3D Horizontal Spin Factor
      const spin = Math.cos(worldTime * 0.08 + c.phase);
      const rx = Math.max(4, Math.abs(spin) * c.r);

      ctx.save();
      ctx.translate(sx, c.y);

      // Soft Golden Glow
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, c.r + 8);
      glow.addColorStop(0, 'rgba(253, 224, 71, 0.5)');
      glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, c.r + 8, 0, Math.PI * 2);
      ctx.fill();

      // 3D Coin Rim Thickness
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(spin >= 0 ? 2.5 : -2.5, 0, rx, c.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Coin Front Face
      const coinGrad = ctx.createLinearGradient(-rx, -c.r, rx, c.r);
      coinGrad.addColorStop(0, '#fef08a');
      coinGrad.addColorStop(0.5, '#f59e0b');
      coinGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, c.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Embossed Star when facing front
      if (rx > 8) {
        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', 0, 4);
      }

      ctx.restore();
    });
  }

  function drawCheckpoints(camX) {
    checkpoints.forEach((cp) => {
      if (!CameraController.isVisible(cp.x - 16, cp.w + 32)) return;
      const sx = cp.x - camX;
      const sy = cp.y;

      ctx.save();

      // Stone & Gold Parisian Archway Pillars
      const pillarGrad = ctx.createLinearGradient(sx, sy, sx + cp.w, sy + cp.h);
      pillarGrad.addColorStop(0, cp.cleared ? '#34d399' : '#a855f7');
      pillarGrad.addColorStop(1, cp.cleared ? '#065f46' : '#3b0764');

      ctx.fillStyle = pillarGrad;
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2.5;

      // Left & Right Pillars
      ctx.beginPath();
      ctx.roundRect(sx, sy + 24, 14, cp.h - 24, 4);
      ctx.roundRect(sx + cp.w - 14, sy + 24, 14, cp.h - 24, 4);
      ctx.fill();
      ctx.stroke();

      // Golden Arch Top Pediment
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(sx - 6, sy + 14, cp.w + 12, 16, 8);
      ctx.fill();
      ctx.stroke();

      // Floating Crown Emblem Badge (Q1, Q2... or ✓)
      const hoverY = sy - 8 + Math.sin(worldTime * 0.08 + cp.index) * 3;
      ctx.fillStyle = cp.cleared ? '#10b981' : '#7c3aed';
      ctx.beginPath();
      ctx.arc(sx + cp.w / 2, hoverY, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#fde047';
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cp.cleared ? '✓' : `Q${cp.index + 1}`, sx + cp.w / 2, hoverY + 4.5);

      // Shimmering Magical Barrier Curtain inside Arch when active
      if (!cp.barrierOpen) {
        const pulse = 0.32 + Math.sin(worldTime * 0.12) * 0.16;
        const barrierGrad = ctx.createLinearGradient(sx + 14, sy + 30, sx + cp.w - 14, sy + cp.h);
        barrierGrad.addColorStop(0, `rgba(253, 224, 71, ${pulse + 0.15})`);
        barrierGrad.addColorStop(0.5, `rgba(168, 85, 247, ${pulse})`);
        barrierGrad.addColorStop(1, `rgba(56, 189, 248, ${pulse + 0.1})`);

        ctx.fillStyle = barrierGrad;
        ctx.fillRect(sx + 14, sy + 30, cp.w - 28, cp.h - 30);
      }

      ctx.restore();
    });
  }

  function drawTreasureChest(camX) {
    if (!treasureChest || !CameraController.isVisible(treasureChest.x - 20, treasureChest.w + 40)) return;
    const sx = treasureChest.x - camX;
    const sy = treasureChest.y;
    const cx = sx + treasureChest.w / 2;

    ctx.save();

    // Radiant Golden Beacon Halo when all gates are cleared
    if (answeredCount >= checkpoints.length) {
      const halo = ctx.createRadialGradient(cx, sy + 28, 8, cx, sy + 28, 74);
      halo.addColorStop(0, 'rgba(253, 224, 71, 0.75)');
      halo.addColorStop(0.6, 'rgba(245, 158, 11, 0.25)');
      halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, sy + 28, 74, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, sy + treasureChest.h - 1, treasureChest.w * 0.54, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Chest Base
    const baseGrad = ctx.createLinearGradient(sx, sy + 22, sx, sy + treasureChest.h);
    baseGrad.addColorStop(0, '#d97706');
    baseGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = baseGrad;
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(sx, sy + 22, treasureChest.w, 40, 8);
    ctx.fill();
    ctx.stroke();

    // Vertical Gold Straps
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(sx + 10, sy + 23, 8, 38);
    ctx.fillRect(sx + treasureChest.w - 18, sy + 23, 8, 38);

    // 3D Curved Chest Lid
    const lidOffset = treasureChest.opened ? -18 : 0;
    const lidGrad = ctx.createLinearGradient(sx, sy + 6 + lidOffset, sx, sy + 24 + lidOffset);
    lidGrad.addColorStop(0, '#fbbf24');
    lidGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = lidGrad;
    ctx.beginPath();
    ctx.roundRect(sx - 3, sy + 6 + lidOffset, treasureChest.w + 6, 18, 8);
    ctx.fill();
    ctx.stroke();

    // Ornate Royal Lock Medallion
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx, sy + 26, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Floating TRÉSOR Label
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 TRÉSOR', cx, sy - 8);

    ctx.restore();
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
