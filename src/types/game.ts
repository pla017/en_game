export type GameStatus = 'todo' | 'ready';

export interface GameMeta {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard';
  status: GameStatus;
}

export interface GameProgress {
  bestScore: number;
  playCount: number;
  completed: boolean;
  updatedAt: number;
}
