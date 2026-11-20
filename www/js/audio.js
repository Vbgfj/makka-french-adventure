/* =========================================================
   MAKKA FRENCH ADVENTURE — Offline Audio & French TTS Engine
   Created for Mr. Alaa Eid — Makka Center
   ========================================================= */

const AudioManager = (() => {
  let audioCtx = null;

  function getContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function isSfxEnabled() {
    try {
      return StorageManager.getSettings().sfx !== false;
    } catch (e) {
      return true;
    }
  }

  function isTtsEnabled() {
    try {
      return StorageManager.getSettings().tts !== false;
    } catch (e) {
      return true;
    }
  }

  function playTone({ freq = 440, endFreq = null, duration = 0.15, type = 'sine', gainVal = 0.18, delay = 0 }) {
    if (!isSfxEnabled()) return;
    const ctx = getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) {
      // Ignore audio hardware restrictions gracefully
    }
  }

  function playClick() {
    playTone({ freq: 520, endFreq: 680, duration: 0.06, type: 'triangle', gainVal: 0.12 });
  }

  function playJump() {
    playTone({ freq: 240, endFreq: 560, duration: 0.18, type: 'sine', gainVal: 0.16 });
  }

  function playCoin() {
    playTone({ freq: 988, duration: 0.08, type: 'sine', gainVal: 0.16, delay: 0 });
    playTone({ freq: 1319, duration: 0.22, type: 'sine', gainVal: 0.16, delay: 0.07 });
  }

  function playCorrect() {
    playTone({ freq: 523.25, duration: 0.12, type: 'triangle', gainVal: 0.18, delay: 0 });
    playTone({ freq: 659.25, duration: 0.12, type: 'triangle', gainVal: 0.18, delay: 0.1 });
    playTone({ freq: 783.99, duration: 0.14, type: 'triangle', gainVal: 0.18, delay: 0.2 });
    playTone({ freq: 1046.5, duration: 0.28, type: 'triangle', gainVal: 0.2, delay: 0.3 });
  }

  function playWrong() {
    playTone({ freq: 310, endFreq: 190, duration: 0.22, type: 'sawtooth', gainVal: 0.11, delay: 0 });
    playTone({ freq: 210, endFreq: 140, duration: 0.26, type: 'sawtooth', gainVal: 0.11, delay: 0.18 });
  }

  function playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const delays = [0, 0.11, 0.22, 0.33, 0.48, 0.6];
    const durations = [0.1, 0.1, 0.1, 0.14, 0.11, 0.38];
    notes.forEach((n, i) => {
      playTone({
        freq: n,
        duration: durations[i],
        type: 'triangle',
        gainVal: 0.2,
        delay: delays[i]
      });
    });
  }

  function cleanFrenchForSpeech(rawText) {
    if (!rawText) return '';
    return String(rawText)
      .replace(/\.{2,}|_{2,}/g, ' ')
      .replace(/[()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function speakFrench(text) {
    if (!isTtsEnabled()) return false;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    const cleaned = cleanFrenchForSpeech(text);
    if (!cleaned) return false;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.92;
      utterance.pitch = 1.02;

      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      const frenchVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
      if (frenchVoice) {
        utterance.voice = frenchVoice;
      }

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    playClick,
    playJump,
    playCoin,
    playCorrect,
    playWrong,
    playVictory,
    speakFrench
  };
})();
