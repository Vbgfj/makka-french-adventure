/* =========================================================
   MAKKA FRENCH ADVENTURE — 3D-Style Sprites & Animator
   Created for Mr. Alaa Eid — Makka Center
   ========================================================= */

const PlayerController = (() => {
  const SPRITE_PATHS = {
    boy: 'assets/images/hero_boy.png',
    girl: 'assets/images/hero_girl.png',
    fox: 'assets/images/hero_fox.png',
    robot: 'assets/images/hero_robot.png'
  };

  const CHAR_PALETTES = {
    boy: {
      skin: '#fed7aa',
      hair: '#1e293b',
      outfit: '#1d4ed8',
      accent: '#f59e0b',
      pants: '#0f172a',
      shoes: '#ef4444'
    },
    girl: {
      skin: '#fde68a',
      hair: '#7c2d12',
      outfit: '#7c3aed',
      accent: '#fde047',
      pants: '#1e3a8a',
      shoes: '#ec4899'
    },
    fox: {
      fur: '#f97316',
      belly: '#fff7ed',
      earTip: '#1e293b',
      scarf: '#10b981',
      shoes: '#f59e0b'
    },
    robot: {
      body: '#38bdf8',
      head: '#e2e8f0',
      visor: '#0f172a',
      eye: '#fde047',
      accent: '#7c3aed',
      wheels: '#334155'
    }
  };

  // Processed transparent sprite canvases & pending preview canvases
  const processedSprites = {};
  const pendingPreviews = {};

  /**
   * Removes exterior solid white studio background using edge-connected BFS flood-fill
   * while preserving white details inside the character (eyes, teeth, fur, helmet),
   * smooths outer edges, and tightly crops transparent margins.
   */
  function processCharacterSprite(img) {
    const maxDim = 384;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(img, 0, 0, w, h);

    const imgData = tempCtx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const total = w * h;
    const visited = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    function isNearWhiteBg(idx) {
      const p = idx * 4;
      const a = data[p + 3];
      if (a < 25) return true;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const minC = Math.min(r, g, b);
      const maxC = Math.max(r, g, b);
      return minC >= 224 && (maxC - minC) <= 26;
    }

    function tryEnqueue(x, y) {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const idx = y * w + x;
      if (visited[idx]) return;
      if (isNearWhiteBg(idx)) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
    }

    // Seed flood-fill from all 4 outer edges
    for (let x = 0; x < w; x++) {
      tryEnqueue(x, 0);
      tryEnqueue(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      tryEnqueue(0, y);
      tryEnqueue(w - 1, y);
    }

    while (head < tail) {
      const curr = queue[head++];
      data[curr * 4 + 3] = 0;

      const cx = curr % w;
      const cy = (curr - cx) / w;
      if (cx > 0) tryEnqueue(cx - 1, cy);
      if (cx + 1 < w) tryEnqueue(cx + 1, cy);
      if (cy > 0) tryEnqueue(cx, cy - 1);
      if (cy + 1 < h) tryEnqueue(cx, cy + 1);
    }

    // Soften 1px anti-aliased fringe along outer outline so there is no white halo
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (visited[idx]) continue;

        const hasTransparentNeighbor =
          visited[idx - 1] ||
          visited[idx + 1] ||
          visited[idx - w] ||
          visited[idx + w];

        if (hasTransparentNeighbor) {
          const p = idx * 4;
          const lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
          if (lum > 185) {
            const factor = Math.max(0.12, Math.min(1, (252 - lum) / 67));
            data[p + 3] = Math.round(data[p + 3] * factor);
          }
        }
      }
    }

    tempCtx.putImageData(imgData, 0, 0);

    // Compute tight non-transparent bounding box
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let foundAny = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 18) {
          foundAny = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!foundAny) {
      return tempCanvas;
    }

    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);
    const cleanCanvas = document.createElement('canvas');
    cleanCanvas.width = cropW;
    cleanCanvas.height = cropH;
    const cleanCtx = cleanCanvas.getContext('2d');
    cleanCtx.drawImage(tempCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    return cleanCanvas;
  }

  function preloadAllSprites() {
    Object.keys(SPRITE_PATHS).forEach((charId) => {
      const img = new Image();
      img.onload = () => {
        try {
          processedSprites[charId] = processCharacterSprite(img);
        } catch (err) {
          processedSprites[charId] = img;
        }
        if (pendingPreviews[charId]) {
          renderPreview(pendingPreviews[charId], charId);
        }
      };
      img.src = SPRITE_PATHS[charId];
    });
  }

  function createPlayer(charId = 'boy', startX = 90, startY = 260) {
    return {
      charId: CHAR_PALETTES[charId] ? charId : 'boy',
      x: startX,
      y: startY,
      w: 48,
      h: 68,
      vx: 0,
      vy: 0,
      speed: 4.8,
      jumpForce: -13.4,
      onGround: false,
      facing: 1,
      animTimer: 0,
      animPhase: 0,
      state: 'idle', // idle | run | jump | celebrate | tumble
      tumbleTimer: 0,
      celebrateTimer: 0,
      locked: false
    };
  }

  function moveLeft(player) {
    if (player.locked) return;
    player.vx = -player.speed;
    player.facing = -1;
  }

  function moveRight(player) {
    if (player.locked) return;
    player.vx = player.speed;
    player.facing = 1;
  }

  function jump(player) {
    if (player.locked) return;
    if (player.onGround) {
      player.vy = player.jumpForce;
      player.onGround = false;
      player.state = 'jump';
      AudioManager.playJump();
    }
  }

  // Triggered when student answers a French question correctly
  function triggerForwardLeap(player) {
    player.facing = 1;
    player.vy = -13.5;
    player.vx = 9.5;
    player.onGround = false;
    player.state = 'celebrate';
    player.celebrateTimer = 44;
    AudioManager.playJump();
  }

  // Triggered when student answers incorrectly (harmless cartoon fall & safe recovery)
  function triggerCartoonTumble(player, safePlatformX) {
    player.vy = -8.5;
    player.vx = -3.5;
    player.onGround = false;
    player.state = 'tumble';
    player.tumbleTimer = 45;
    if (typeof safePlatformX === 'number') {
      player.safeRecoveryX = Math.max(40, safePlatformX);
    }
  }

  function update(player, platforms, groundY, worldWidth, input) {
    if (!player.locked && input) {
      if (input.left) moveLeft(player);
      if (input.right) moveRight(player);
      if (input.jump) jump(player);
    }

    PhysicsEngine.applyEntityPhysics(player, platforms, groundY, worldWidth);
    player.animTimer += 1;

    // Handle special animation timers
    if (player.tumbleTimer > 0) {
      player.tumbleTimer -= 1;
      player.state = 'tumble';
      if (player.tumbleTimer === 0) {
        if (typeof player.safeRecoveryX === 'number') {
          player.x = player.safeRecoveryX;
        }
        player.vx = 0;
        player.vy = 0;
        player.state = 'idle';
      }
      return;
    }

    if (player.celebrateTimer > 0) {
      player.celebrateTimer -= 1;
      player.state = 'celebrate';
      if (player.celebrateTimer === 0) {
        player.state = 'idle';
      }
      return;
    }

    // Standard movement animation states
    if (!player.onGround) {
      player.state = 'jump';
    } else if (Math.abs(player.vx) > 0.4) {
      player.state = 'run';
      if (player.animTimer % 5 === 0) {
        player.animPhase = (player.animPhase + 1) % 4;
      }
    } else {
      player.state = 'idle';
      if (player.animTimer % 18 === 0) {
        player.animPhase = (player.animPhase + 1) % 2;
      }
    }
  }

  // Graceful vector fallback only if sprite image is still loading
  function drawFallbackVector(ctx, charId, w, h, state, animPhase) {
    const legSwing = state === 'run' ? Math.sin((animPhase / 4) * Math.PI * 2) * 6 : 0;
    const p = CHAR_PALETTES[charId] || CHAR_PALETTES.boy;

    ctx.fillStyle = p.outfit || p.fur || p.body || '#1d4ed8';
    ctx.beginPath();
    ctx.roundRect(-14, -12, 28, 24, 8);
    ctx.fill();

    ctx.fillStyle = p.skin || p.fur || p.head || '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -24, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10, 10 + legSwing * 0.3, 7, 14);
    ctx.fillRect(3, 10 - legSwing * 0.3, 7, 14);
  }

  function draw(ctx, player, cameraOffset) {
    const footX = player.x - cameraOffset.x + player.w / 2;
    const footY = player.y - cameraOffset.y + player.h;

    // Ground contact shadow
    ctx.save();
    const shadowAlpha = player.onGround ? 0.32 : 0.16;
    const shadowScale = player.onGround ? 1 : 0.72;
    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(footX, footY - 2, 26 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const sprite = processedSprites[player.charId];

    // Calculate lively procedural squash, stretch, bounce & tilt
    let scaleX = 1;
    let scaleY = 1;
    let bounceY = 0;
    let tilt = 0;

    if (player.state === 'run') {
      const cycle = player.animTimer * 0.34;
      bounceY = -Math.abs(Math.sin(cycle)) * 6.5;
      scaleX = 1 + Math.cos(cycle * 2) * 0.05;
      scaleY = 1 - Math.cos(cycle * 2) * 0.05;
      tilt = 0.08;
    } else if (player.state === 'jump') {
      if (player.vy < 0) {
        scaleX = 0.91;
        scaleY = 1.09;
      } else {
        scaleX = 1.05;
        scaleY = 0.95;
      }
      tilt = -0.05;
    } else if (player.state === 'celebrate') {
      const pulse = Math.sin(player.animTimer * 0.45);
      bounceY = -Math.abs(pulse) * 8;
      scaleX = 1.04 + pulse * 0.05;
      scaleY = 1.04 - pulse * 0.05;
    } else if (player.state === 'idle') {
      const breath = Math.sin(player.animTimer * 0.08);
      scaleX = 1 - breath * 0.018;
      scaleY = 1 + breath * 0.024;
    }

    ctx.save();
    ctx.translate(footX, footY + bounceY);

    if (player.state === 'tumble') {
      ctx.translate(0, -player.h / 2);
      ctx.rotate(player.tumbleTimer * 0.36);
      ctx.translate(0, player.h / 2);
    } else {
      ctx.scale(player.facing, 1);
      ctx.rotate(tilt);
      ctx.scale(scaleX, scaleY);
    }

    // Golden celebration aura when answering correctly
    if (player.state === 'celebrate') {
      const glow = ctx.createRadialGradient(0, -44, 6, 0, -44, 54);
      glow.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
      glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -44, 54, 0, Math.PI * 2);
      ctx.fill();
    }

    if (sprite) {
      const targetH = 88;
      const ratio = sprite.width / Math.max(1, sprite.height);
      const targetW = Math.round(targetH * ratio);
      ctx.drawImage(sprite, -targetW / 2, -targetH + 3, targetW, targetH);
    } else {
      ctx.translate(0, -player.h / 2);
      drawFallbackVector(ctx, player.charId, player.w, player.h, player.state, player.animPhase);
    }

    if (player.state === 'celebrate') {
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('✨', -32, -74);
      ctx.fillText('⭐', 20, -78);
    }

    ctx.restore();
  }

  function renderPreview(canvas, charId) {
    if (!canvas) return;
    pendingPreviews[charId] = canvas;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rich golden & royal radial glow behind 3D hero
    const grad = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2 + 4,
      8,
      canvas.width / 2,
      canvas.height / 2 + 4,
      56
    );
    grad.addColorStop(0, 'rgba(253, 224, 71, 0.35)');
    grad.addColorStop(0.65, 'rgba(124, 58, 237, 0.16)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sprite = processedSprites[charId];
    if (sprite) {
      const maxH = canvas.height - 14;
      const maxW = canvas.width - 14;
      const scale = Math.min(maxW / Math.max(1, sprite.width), maxH / Math.max(1, sprite.height));
      const drawW = Math.round(sprite.width * scale);
      const drawH = Math.round(sprite.height * scale);
      const drawX = Math.round((canvas.width - drawW) / 2);
      const drawY = Math.round((canvas.height - drawH) / 2) + 2;

      // Soft drop shadow beneath hero in selection card
      ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, drawY + drawH - 3, drawW * 0.32, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
    } else {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2 + 12);
      ctx.scale(1.3, 1.3);
      drawFallbackVector(ctx, charId, 48, 68, 'idle', 0);
      ctx.restore();
    }
  }

  // Start preloading & removing white backgrounds immediately
  preloadAllSprites();

  return {
    createPlayer,
    moveLeft,
    moveRight,
    jump,
    triggerForwardLeap,
    triggerCartoonTumble,
    update,
    draw,
    renderPreview
  };
})(); 
