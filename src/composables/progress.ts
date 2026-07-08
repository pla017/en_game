import { reactive } from 'vue';
import type { GameProgress } from '@/types/game';

const STORAGE_KEY = 'en-game-progress';

type ProgressState = Record<string, GameProgress>;

function readProgress(): ProgressState {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressState) : {};
  } catch {
    return {};
  }
}

const progressState = reactive<ProgressState>(readProgress());

function persist() {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(progressState));
}

function getDefaultProgress(): GameProgress {
  return {
    bestScore: 0,
    playCount: 0,
    completed: false,
    updatedAt: Date.now()
  };
}

export function useGameProgress(gameId: string) {
  if (!progressState[gameId]) {
    progressState[gameId] = getDefaultProgress();
  }

  function updateProgress(score: number, completed = false) {
    const current = progressState[gameId] || getDefaultProgress();

    progressState[gameId] = {
      bestScore: Math.max(current.bestScore, score),
      playCount: current.playCount + 1,
      completed: current.completed || completed,
      updatedAt: Date.now()
    };

    persist();
  }

  function resetProgress() {
    progressState[gameId] = getDefaultProgress();
    persist();
  }

  return {
    progress: progressState[gameId],
    updateProgress,
    resetProgress
  };
}
