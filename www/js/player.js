/* =========================================================
   MAKKA FRENCH ADVENTURE — Cartoon Characters & Animator
   Created for Mr. Alaa Eid — Makka Center
   ========================================================= */

const PlayerController = (() => {
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

  function createPlayer(charId = 'boy', startX = 90, startY = 260) {
    return {
      charId: CHAR_PALETTES[charId] ? charId : 'boy',
      x: startX,
      y: startY,
      w: 44,
      h: 58,
      vx: 0,
      vy: 0,
      speed: 4.6,
      jumpForce: -13.2,
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
    player.celebrateTimer = 42;
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
      player.animTimer += 1;
      if (player.animTimer >= 5) {
        player.animTimer = 0;
        player.animPhase = (player.animPhase + 1) % 4;
      }
    } else {
      player.state = 'idle';
      player.animTimer += 1;
      if (player.animTimer >= 18) {
        player.animTimer = 0;
        player.animPhase = (player.animPhase + 1) % 2;
      }
    }
  }

  function drawCharacterFigure(ctx, charId, w, h, state, animPhase) {
    const legSwing = state === 'run' ? Math.sin((animPhase / 4) * Math.PI * 2) * 6 : 0;
    const bobY = state === 'idle' ? (animPhase === 1 ? -2 : 0) : (state === 'run' ? -Math.abs(legSwing) * 0.3 : 0);

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 - 2, w * 0.38, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, bobY);

    if (charId === 'boy' || charId === 'girl') {
      const p = CHAR_PALETTES[charId];

      // Legs
      ctx.fillStyle = p.pants;
      ctx.fillRect(-10, 8 + legSwing * 0.4, 7, 14);
      ctx.fillRect(3, 8 - legSwing * 0.4, 7, 14);

      // Shoes
      ctx.fillStyle = p.shoes;
      ctx.beginPath();
      ctx.roundRect(-12, 20 + legSwing * 0.4, 10, 6, 3);
      ctx.roundRect(2, 20 - legSwing * 0.4, 10, 6, 3);
      ctx.fill();

      // Torso / Adventure Jacket
      ctx.fillStyle = p.outfit;
      ctx.beginPath();
      ctx.roundRect(-13, -10, 26, 20, 6);
      ctx.fill();

      // Golden Explorer Scarf
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.roundRect(-12, -11, 24, 5, 3);
      ctx.fill();

      // Head
      ctx.fillStyle = p.skin;
      ctx.beginPath();
      ctx.arc(0, -21, 13, 0, Math.PI * 2);
      ctx.fill();

      // Hair / Explorer Cap
      ctx.fillStyle = p.hair;
      ctx.beginPath();
      ctx.arc(0, -24, 13.5, Math.PI, Math.PI * 2);
      ctx.fill();

      if (charId === 'girl') {
        // Ponytail
        ctx.beginPath();
        ctx.arc(-13, -22, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Cap visor
        ctx.fillStyle = p.accent;
        ctx.fillRect(2, -26, 13, 4);
      }

      // Eyes & Smile
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(5, -21, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(4, -17, 4, 0.1 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();

    } else if (charId === 'fox') {
      const p = CHAR_PALETTES.fox;

      // Fluffy Tail
      ctx.fillStyle = p.fur;
      ctx.beginPath();
      ctx.ellipse(-16, 10, 11, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.belly;
      ctx.beginPath();
      ctx.arc(-23, 7, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = p.fur;
      ctx.fillRect(-9, 9 + legSwing * 0.4, 6, 14);
      ctx.fillRect(3, 9 - legSwing * 0.4, 6, 14);

      // Body
      ctx.fillStyle = p.fur;
      ctx.beginPath();
      ctx.roundRect(-12, -9, 24, 20, 8);
      ctx.fill();

      // White Belly Patch
      ctx.fillStyle = p.belly;
      ctx.beginPath();
      ctx.ellipse(3, 1, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Emerald Scarf
      ctx.fillStyle = p.scarf;
      ctx.fillRect(-11, -10, 22, 5);

      // Fox Head
      ctx.fillStyle = p.fur;
      ctx.beginPath();
      ctx.arc(1, -20, 12.5, 0, Math.PI * 2);
      ctx.fill();

      // Pointy Ears
      ctx.beginPath();
      ctx.moveTo(-8, -28);
      ctx.lineTo(-11, -40);
      ctx.lineTo(-1, -31);
      ctx.moveTo(4, -31);
      ctx.lineTo(10, -40);
      ctx.lineTo(11, -28);
      ctx.fill();

      // Muzzle & Eye
      ctx.fillStyle = p.belly;
      ctx.beginPath();
      ctx.ellipse(8, -17, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.earTip;
      ctx.beginPath();
      ctx.arc(14, -18, 2.3, 0, Math.PI * 2);
      ctx.arc(5, -22, 2.2, 0, Math.PI * 2);
      ctx.fill();

    } else if (charId === 'robot') {
      const p = CHAR_PALETTES.robot;

      // Hover Thruster / Wheels
      ctx.fillStyle = p.wheels;
      ctx.beginPath();
      ctx.roundRect(-11, 13, 22, 10, 5);
      ctx.fill();

      // Flame glow when moving/jumping
      if (state === 'run' || state === 'jump' || state === 'celebrate') {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 25, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Metallic Body
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.roundRect(-14, -8, 28, 22, 6);
      ctx.fill();

      // Chest Emblem
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.roundRect(-8, -3, 16, 10, 3);
      ctx.fill();

      // Robot Head
      ctx.fillStyle = p.head;
      ctx.beginPath();
      ctx.roundRect(-14, -32, 28, 21, 7);
      ctx.fill();

      // Antenna
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(0, -40);
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, -41, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Digital Visor & Glowing Eyes
      ctx.fillStyle = p.visor;
      ctx.beginPath();
      ctx.roundRect(-10, -27, 22, 11, 4);
      ctx.fill();

      ctx.fillStyle = p.eye;
      ctx.beginPath();
      ctx.arc(-2, -21.5, 2.5, 0, Math.PI * 2);
      ctx.arc(7, -21.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Celebration stars around character
    if (state === 'celebrate') {
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('✨', -22, -32);
      ctx.fillText('⭐', 14, -34);
    }

    ctx.restore();
  }

  function draw(ctx, player, cameraOffset) {
    const drawX = player.x - cameraOffset.x + player.w / 2;
    const drawY = player.y - cameraOffset.y + player.h / 2;

    ctx.save();
    ctx.translate(drawX, drawY);

    if (player.state === 'tumble') {
      ctx.rotate((player.tumbleTimer * 0.35));
    } else {
      ctx.scale(player.facing, 1);
    }

    drawCharacterFigure(ctx, player.charId, player.w, player.h, player.state, player.animPhase);
    ctx.restore();
  }

  function renderPreview(canvas, charId) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle radial backdrop
    const grad = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      8,
      canvas.width / 2,
      canvas.height / 2,
      52
    );
    grad.addColorStop(0, 'rgba(253, 224, 71, 0.25)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 12);
    ctx.scale(1.35, 1.35);
    drawCharacterFigure(ctx, charId, 44, 58, 'idle', 0);
    ctx.restore();
  }

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
