/* =========================================================
   MAKKA FRENCH ADVENTURE — 2D Platformer Physics Engine
   Created for Mr. Alaa Eid — Makka Center
   ========================================================= */

const PhysicsEngine = (() => {
  const GRAVITY = 0.65;
  const MAX_FALL_SPEED = 15;
  const FRICTION = 0.82;

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function applyEntityPhysics(entity, platforms, groundY, worldWidth) {
    const prevBottom = entity.y + entity.h;

    // Apply gravity
    entity.vy += GRAVITY;
    if (entity.vy > MAX_FALL_SPEED) {
      entity.vy = MAX_FALL_SPEED;
    }

    // Move horizontally & apply friction
    entity.x += entity.vx;
    entity.vx *= FRICTION;
    if (Math.abs(entity.vx) < 0.08) {
      entity.vx = 0;
    }

    // Keep inside world boundaries
    if (entity.x < 20) {
      entity.x = 20;
      entity.vx = 0;
    }
    if (entity.x + entity.w > worldWidth - 20) {
      entity.x = worldWidth - 20 - entity.w;
      entity.vx = 0;
    }

    // Move vertically
    entity.y += entity.vy;
    entity.onGround = false;

    // Check elevated platforms (one-way landing from top)
    if (entity.vy >= 0 && Array.isArray(platforms)) {
      for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        const withinX = entity.x + entity.w * 0.78 > p.x && entity.x + entity.w * 0.22 < p.x + p.w;
        const crossedTop = prevBottom <= p.y + 10 && entity.y + entity.h >= p.y;

        if (withinX && crossedTop) {
          entity.y = p.y - entity.h;
          entity.vy = 0;
          entity.onGround = true;
          break;
        }
      }
    }

    // Check main ground floor
    if (entity.y + entity.h >= groundY) {
      entity.y = groundY - entity.h;
      entity.vy = 0;
      entity.onGround = true;
    }
  }

  return {
    GRAVITY,
    MAX_FALL_SPEED,
    FRICTION,
    rectsOverlap,
    applyEntityPhysics
  };
})();
