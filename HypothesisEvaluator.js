export class HypothesisEvaluator {
  static SLOT_LABELS = ['ENTRY', 'ACCESS', 'ESCAPE'];

  static DEFAULT_FUNNY_LINES = [
    "The thief used... {card}? Bold. Wrong, but bold.",
    "A {card}. Really. Write that down — it's going in the report.",
    "Sure. The {card}. And I suppose the getaway was a unicycle.",
    "Detective, the {card} has an alibi. And a lawyer.",
    "The {card}. That's not evidence, that's a cry for help."
  ];

  static prepareCards(reconstruction, sceneId = null, cityId = null) {
    const allCards = Array.isArray(reconstruction?.allCards) ? reconstruction.allCards : [];

    let sourceCards = allCards
      .filter(card => !sceneId || card.scene === sceneId)
      .filter(card => !cityId || card.cityId === cityId);

    if (sourceCards.length === 0) sourceCards = allCards;

    const uniqueCards = [];
    const seen = new Set();

    sourceCards.forEach((card, index) => {
      const key = `${card.id || card.item || index}_${card.scene || ''}_${card.cityId || ''}`;
      if (seen.has(key)) return;
      seen.add(key);

      uniqueCards.push({
        id: card.id || `card_${index}`,
        item: card.item || `Clue ${index + 1}`,
        text: card.text || card.item || `Clue ${index + 1}`,
        skills: Array.isArray(card.skills) ? [...card.skills] : [],
        scene: card.scene || sceneId,
        cityId: card.cityId || cityId,
        correctOrder: Number.isInteger(card.correctOrder) ? card.correctOrder : -1,
        isCorrect: !!card.isCorrect,
        clueType: card.clueType || 'soft_clue',
        heistExplanation: card.heistExplanation || '',
        trueExplanation: card.trueExplanation || '',
        isRedHerring: !!card.isRedHerring,
        funnyLines: Array.isArray(card.funnyLines) ? [...card.funnyLines] : []
      });
    });

    const correctCards = uniqueCards
      .filter(card => card.isCorrect)
      .sort((a, b) => a.correctOrder - b.correctOrder)
      .slice(0, 3);

    const distractorCards = uniqueCards
      .filter(card => !card.isCorrect)
      .slice(0, 3);

    let availableCards = this.shuffleArray([
      ...correctCards.slice(0, 3),
      ...distractorCards.slice(0, 3)
    ]);

    while (availableCards.length < 6) {
      const missing = uniqueCards.find(card => !availableCards.some(existing => existing.id === card.id));
      if (!missing) break;
      availableCards.push({ ...missing });
    }

    availableCards = this.shuffleArray(availableCards.slice(0, 6));

    return { correctCards, distractorCards, availableCards };
  }

  static evaluateGuess(orderedCards, activeSlotCount = 3) {
    const result = new Array(activeSlotCount).fill('red');
    const solutionUsed = new Array(activeSlotCount).fill(false);
    const guessUsed = new Array(activeSlotCount).fill(false);

    for (let i = 0; i < activeSlotCount; i += 1) {
      const card = orderedCards[i];
      if (card?.isCorrect && card.correctOrder === i) {
        result[i] = 'green';
        solutionUsed[i] = true;
        guessUsed[i] = true;
      }
    }

    for (let i = 0; i < activeSlotCount; i += 1) {
      if (guessUsed[i]) continue;
      const card = orderedCards[i];
      if (!card?.isCorrect) continue;

      for (let j = 0; j < activeSlotCount; j += 1) {
        if (solutionUsed[j]) continue;
        if (card.correctOrder === j) {
          result[i] = 'yellow';
          solutionUsed[j] = true;
          guessUsed[i] = true;
          break;
        }
      }
    }

    return result;
  }

  static collectUniqueSkills(cards = []) {
    const uniqueSkills = [];

    cards.forEach(card => {
      const skills = Array.isArray(card?.skills) ? card.skills : [];
      skills.forEach(skill => {
        const normalized = String(skill).trim();
        if (!normalized) return;
        const exists = uniqueSkills.some(existing => existing.toLowerCase() === normalized.toLowerCase());
        if (!exists) uniqueSkills.push(normalized);
      });
    });

    return uniqueSkills;
  }

  static determineResult(feedback, attemptsLeft) {
    const allGreen = feedback.every(v => v === 'green');

    if (allGreen) {
      return {
        resultLabel: 'exact',
        score: 60,
        message: 'Excellent reconstruction. You nailed the sequence.',
        color: '#7CFC00',
        isFinal: true
      };
    }

    if (attemptsLeft > 0) {
      return {
        resultLabel: 'continue',
        score: 0,
        message: 'Not quite. Adjust the timeline and try again.',
        color: '#ffd966',
        isFinal: false
      };
    }

    const greenCount = feedback.filter(v => v === 'green').length;
    const yellowCount = feedback.filter(v => v === 'yellow').length;

    if (greenCount + yellowCount >= 2) {
      return {
        resultLabel: 'partial',
        score: 25,
        message: 'Promising lead. Part of the sequence fits.',
        color: '#ffcf66',
        isFinal: true
      };
    }

    return {
      resultLabel: 'weak',
      score: 10,
      message: 'Theory recorded, but the sequence still needs work.',
      color: '#ff9f80',
      isFinal: true
    };
  }

  static buildNarrative(orderedCards) {
    return orderedCards
      .filter(card => card?.isCorrect && card.heistExplanation)
      .map(card => card.heistExplanation);
  }

  static getFunnyLine(card) {
    const lines = Array.isArray(card?.funnyLines) && card.funnyLines.length > 0
      ? card.funnyLines
      : this.DEFAULT_FUNNY_LINES;
    const line = lines[Math.floor(Math.random() * lines.length)];
    return line.replace('{card}', (card?.item || 'that').toLowerCase());
  }

  static shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}