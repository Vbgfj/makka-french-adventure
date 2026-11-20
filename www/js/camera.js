/* =========================================================
   MAKKA FRENCH ADVENTURE — Smooth Side-Scrolling Camera
   Created for Mr. Alaa Eid — Makka Center
   ========================================================= */

const CameraController = (() => {
  let x = 0;
  let y = 0;
  let worldWidth = 3200;
  let viewportWidth = 800;
  let shakeFrames = 0;
  let shakeIntensity = 0;

  function reset(newWorldWidth, newViewportWidth) {
    worldWidth = Math.max(400, newWorldWidth || 3200);
    viewportWidth = Math.max(240, newViewportWidth || 800);
    x = 0;
    y = 0;
    shakeFrames = 0;
    shakeIntensity = 0;
  }

  function resize(newViewportWidth) {
    viewportWidth = Math.max(240, newViewportWidth || 800);
    const maxScroll = Math.max(0, worldWidth - viewportWidth);
    if (x > maxScroll) {
      x = maxScroll;
    }
  }

  function follow(targetX) {
    // Keep hero positioned around 32% from the left edge so upcoming challenges are visible
    const desiredX = targetX - viewportWidth * 0.32;
    const maxScroll = Math.max(0, worldWidth - viewportWidth);
    const clampedTarget = Math.max(0, Math.min(maxScroll, desiredX));

    // Smooth camera interpolation (lerp)
    x += (clampedTarget - x) * 0.12;
    if (Math.abs(clampedTarget - x) < 0.2) {
      x = clampedTarget;
    }

    // Handle optional micro screen-shake effect
    if (shakeFrames > 0) {
      shakeFrames -= 1;
      y = (Math.random() - 0.5) * 2 * shakeIntensity;
    } else {
      y = 0;
    }
  }

  function triggerShake(intensity = 5, frames = 10) {
    shakeIntensity = intensity;
    shakeFrames = frames;
  }

  function getOffset() {
    return {
      x: Math.round(x),
      y: Math.round(y)
    };
  }

  function isVisible(objX, objW, margin = 120) {
    return objX + objW >= x - margin && objX <= x + viewportWidth + margin;
  }

  return {
    reset,
    resize,
    follow,
    triggerShake,
    getOffset,
    isVisible
  };
})();
