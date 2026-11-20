/* =========================================================
   MAKKA FRENCH ADVENTURE — Educational Question & Grading Engine
   Created for Mr. Alaa Eid — Makka Center
   ========================================================= */

const QuestionEngine = (() => {
  let isLocked = false;
  let currentQuestion = null;
  let onCompleteCallback = null;

  const TYPE_LABELS = {
    mcq: 'اختيار من متعدد • Choix multiple',
    true_false: 'صح أم خطأ • Vrai ou Faux',
    fill_blank: 'أكمل الفراغ • Complète',
    matching: 'توصيل المفردات • Associe',
    fr_to_ar: 'ترجمة للعربية • Traduction',
    ar_to_fr: 'ترجمة للفرنسية • Traduction',
    ordering: 'رتّب الجملة • Remets en ordre',
    conjugation: 'تصريف الأفعال • Conjugaison',
    dialogue: 'أكمل الحوار • Dialogue'
  };

  function normalizeText(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[’‘`]/g, "'")
      .replace(/\s*'\s*/g, "'")
      .replace(/[.!?؟،,;:"«»()[\]]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stripAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function isTextAnswerCorrect(userInput, question) {
    const cleanUser = normalizeText(userInput);
    if (!cleanUser) return false;

    const validList = Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length > 0
      ? question.acceptedAnswers
      : [question.answer];

    return validList.some((expected) => {
      const cleanExpected = normalizeText(expected);
      if (!cleanExpected) return false;
      if (cleanUser === cleanExpected) return true;
      // Forgive missing French accents on mobile keyboards while keeping exact spelling
      return stripAccents(cleanUser) === stripAccents(cleanExpected);
    });
  }

  function finishQuestion(isCorrect, correctDisplayText) {
    if (isLocked) return;
    isLocked = true;

    const feedbackEl = document.getElementById('q-feedback');
    if (feedbackEl) {
      feedbackEl.classList.remove('hidden', 'success', 'error');
      if (isCorrect) {
        feedbackEl.classList.add('success');
        feedbackEl.textContent = '🎉 ممتاز يا بطل! إجابة صحيحة (+10 نقط + 🪙)';
      } else {
        feedbackEl.classList.add('error');
        feedbackEl.textContent = `💡 ولا يهمك! الإجابة الصحيحة هي: ${correctDisplayText}`;
      }
    }

    // Disable all interactive elements inside options container
    const container = document.getElementById('q-options-container');
    if (container) {
      container.querySelectorAll('button, input').forEach((el) => {
        el.disabled = true;
      });
    }

    setTimeout(() => {
      closeModal();
      if (typeof onCompleteCallback === 'function') {
        onCompleteCallback(isCorrect);
      }
    }, isCorrect ? 1150 : 1850);
  }

  function closeModal() {
    const modal = document.getElementById('question-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderChoiceButtons(container, options, correctAnswer) {
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        if (isLocked) return;
        AudioManager.playClick();
        const right = normalizeText(opt) === normalizeText(correctAnswer);
        if (right) {
          btn.classList.add('correct');
        } else {
          btn.classList.add('wrong');
          // Highlight the right option for learning
          container.querySelectorAll('.option-btn').forEach((other) => {
            if (normalizeText(other.textContent) === normalizeText(correctAnswer)) {
              other.classList.add('correct');
            }
          });
        }
        finishQuestion(right, correctAnswer);
      });

      container.appendChild(btn);
    });
  }

  function renderTextInput(container, question) {
    const row = document.createElement('div');
    row.className = 'q-input-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'q-text-input';
    input.placeholder = question.placeholder || 'Écris ta réponse ici...';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'btn btn-success';
    submitBtn.textContent = 'تأكيد ✓';

    const handleSubmit = () => {
      if (isLocked) return;
      if (!input.value.trim()) return;
      AudioManager.playClick();
      const right = isTextAnswerCorrect(input.value, question);
      input.style.borderColor = right ? '#10b981' : '#ef4444';
      finishQuestion(right, question.answer);
    };

    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });

    row.appendChild(input);
    row.appendChild(submitBtn);
    container.appendChild(row);
    setTimeout(() => input.focus(), 120);
  }

  function renderOrdering(container, question) {
    const selectedWords = [];
    const words = Array.isArray(question.words) ? [...question.words] : [];

    const slotsBox = document.createElement('div');
    slotsBox.className = 'q-order-slots';

    const poolBox = document.createElement('div');
    poolBox.className = 'q-order-pool';

    const actionsRow = document.createElement('div');
    actionsRow.className = 'menu-row-2';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn btn-warning btn-sm';
    clearBtn.textContent = '🔄 مسح';

    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'btn btn-success btn-sm';
    checkBtn.textContent = 'تحقق من الترتيب ✓';

    function redraw() {
      slotsBox.innerHTML = '';
      poolBox.innerHTML = '';

      selectedWords.forEach((wordObj, idx) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'word-chip';
        chip.textContent = wordObj.text;
        chip.addEventListener('click', () => {
          if (isLocked) return;
          AudioManager.playClick();
          selectedWords.splice(idx, 1);
          redraw();
        });
        slotsBox.appendChild(chip);
      });

      words.forEach((wordText, originalIndex) => {
        const alreadyUsed = selectedWords.some((item) => item.originalIndex === originalIndex);
        if (alreadyUsed) return;

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'word-chip';
        chip.style.background = '#475569';
        chip.textContent = wordText;
        chip.addEventListener('click', () => {
          if (isLocked) return;
          AudioManager.playClick();
          selectedWords.push({ text: wordText, originalIndex });
          redraw();
        });
        poolBox.appendChild(chip);
      });
    }

    clearBtn.addEventListener('click', () => {
      if (isLocked) return;
      AudioManager.playClick();
      selectedWords.length = 0;
      redraw();
    });

    checkBtn.addEventListener('click', () => {
      if (isLocked || selectedWords.length === 0) return;
      AudioManager.playClick();
      const builtSentence = selectedWords.map((w) => w.text).join(' ');
      const right = isTextAnswerCorrect(builtSentence, question);
      finishQuestion(right, question.answer);
    });

    redraw();
    container.appendChild(slotsBox);
    container.appendChild(poolBox);
    actionsRow.appendChild(clearBtn);
    actionsRow.appendChild(checkBtn);
    container.appendChild(actionsRow);
  }

  function renderMatching(container, question) {
    // Pairs format: [{ fr: "Bonjour", ar: "صباح الخير" }, ...]
    const pairs = Array.isArray(question.pairs) ? question.pairs : [];
    let selectedFr = null;
    let matchedCount = 0;

    const grid = document.createElement('div');
    grid.className = 'menu-row-2';

    const leftCol = document.createElement('div');
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'column';
    leftCol.style.gap = '8px';

    const rightCol = document.createElement('div');
    rightCol.style.display = 'flex';
    rightCol.style.flexDirection = 'column';
    rightCol.style.gap = '8px';

    const shuffledAr = [...pairs].sort(() => Math.random() - 0.5);

    pairs.forEach((pair) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = pair.fr;
      btn.dataset.fr = pair.fr;
      btn.addEventListener('click', () => {
        if (isLocked || btn.dataset.matched === '1') return;
        AudioManager.playClick();
        leftCol.querySelectorAll('.option-btn').forEach((b) => {
          if (b.dataset.matched !== '1') b.style.borderColor = '#cbd5e1';
        });
        btn.style.borderColor = '#f59e0b';
        selectedFr = pair;
      });
      leftCol.appendChild(btn);
    });

    shuffledAr.forEach((pair) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.style.textAlign = 'right';
      btn.textContent = pair.ar;
      btn.addEventListener('click', () => {
        if (isLocked || btn.dataset.matched === '1' || !selectedFr) return;
        AudioManager.playClick();

        if (selectedFr.fr === pair.fr) {
          btn.classList.add('correct');
          btn.dataset.matched = '1';
          const frBtn = leftCol.querySelector(`[data-fr="${CSS.escape(pair.fr)}"]`);
          if (frBtn) {
            frBtn.classList.add('correct');
            frBtn.dataset.matched = '1';
          }
          selectedFr = null;
          matchedCount += 1;
          if (matchedCount === pairs.length) {
            finishQuestion(true, '');
          }
        } else {
          btn.classList.add('wrong');
          const summary = pairs.map((p) => `${p.fr} = ${p.ar}`).join(' | ');
          finishQuestion(false, summary);
        }
      });
      rightCol.appendChild(btn);
    });

    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    container.appendChild(grid);
  }

  function showQuestion(question, checkpointIndex, totalCheckpoints, onComplete) {
    isLocked = false;
    currentQuestion = question;
    onCompleteCallback = onComplete;

    const modal = document.getElementById('question-modal');
    const badge = document.getElementById('q-type-badge');
    const topicEl = document.getElementById('q-topic');
    const promptEl = document.getElementById('q-prompt');
    const hintEl = document.getElementById('q-hint-ar');
    const container = document.getElementById('q-options-container');
    const feedbackEl = document.getElementById('q-feedback');
    const speakBtn = document.getElementById('btn-speak-question');

    if (badge) {
      const typeText = TYPE_LABELS[question.type] || 'تحدي فرنسي';
      badge.textContent = `بوابة ${checkpointIndex + 1}/${totalCheckpoints} • ${typeText}`;
    }
    if (topicEl) topicEl.textContent = question.topic || 'Langue Française';
    if (promptEl) promptEl.textContent = question.prompt || '';
    if (hintEl) hintEl.textContent = question.hintAr || '';
    if (feedbackEl) {
      feedbackEl.classList.add('hidden');
      feedbackEl.textContent = '';
    }

    if (speakBtn) {
      speakBtn.onclick = () => {
        AudioManager.speakFrench(question.speechText || question.prompt);
      };
    }

    if (container) {
      container.innerHTML = '';
      const qType = question.type || 'mcq';

      if (qType === 'true_false') {
        const tfOptions = Array.isArray(question.options) && question.options.length > 0
          ? question.options
          : ['Vrai (صح)', 'Faux (خطأ)'];
        renderChoiceButtons(container, tfOptions, question.answer);
      } else if (qType === 'ordering') {
        renderOrdering(container, question);
      } else if (qType === 'matching') {
        renderMatching(container, question);
      } else if (
        (qType === 'fill_blank' || qType === 'conjugation' || qType === 'ar_to_fr') &&
        (!Array.isArray(question.options) || question.options.length === 0)
      ) {
        renderTextInput(container, question);
      } else {
        renderChoiceButtons(container, question.options || [], question.answer);
      }
    }

    if (modal) modal.classList.remove('hidden');
  }

  return {
    showQuestion,
    closeModal,
    isTextAnswerCorrect
  };
})();
