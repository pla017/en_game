import type { WordChoiceRound, WordItem } from './types';

const OPTION_COUNT = 4;

function normalizeMeaning(meaning: string) {
  return meaning.split(/[；;]/).filter(Boolean).join('；');
}

function takeDistractors(words: WordItem[], currentIndex: number) {
  const candidates = words
    .filter((_, index) => index !== currentIndex)
    .map((item) => item.word)
    .filter(Boolean);

  const start = currentIndex % Math.max(candidates.length, 1);
  const rotated = [...candidates.slice(start), ...candidates.slice(0, start)];

  return Array.from(new Set(rotated)).slice(0, OPTION_COUNT - 1);
}

function placeAnswer(options: string[], answer: string, index: number) {
  const uniqueOptions = Array.from(new Set([answer, ...options])).slice(0, OPTION_COUNT);
  const answerIndex = uniqueOptions.indexOf(answer);
  const targetIndex = index % uniqueOptions.length;

  if (answerIndex !== targetIndex) {
    [uniqueOptions[answerIndex], uniqueOptions[targetIndex]] = [uniqueOptions[targetIndex], uniqueOptions[answerIndex]];
  }

  return uniqueOptions;
}

export function toWordChoiceRounds(words: WordItem[]): WordChoiceRound[] {
  return words.map((word, index) => {
    const distractors = takeDistractors(words, index);

    return {
      id: word.id,
      prompt: normalizeMeaning(word.meaningCn),
      answer: word.word,
      options: placeAnswer(distractors, word.word, index),
      word
    };
  });
}
