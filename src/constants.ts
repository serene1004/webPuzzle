export const DIFFICULTIES = [
  {
    id: 'easy', label: 'Easy', targetCount: 150, estimate: '~150 pieces',
  },
  {
    id: 'normal', label: 'Normal', targetCount: 300, estimate: '~300 pieces',
  },
  {
    id: 'hard', label: 'Hard', targetCount: 500, estimate: '~500 pieces',
  },
] as const;

export type Difficulty = (typeof DIFFICULTIES)[number]['id'];

export function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.some((difficulty) => difficulty.id === value);
}

export function targetCountForDifficulty(difficulty: Difficulty) {
  return DIFFICULTIES.find((option) => option.id === difficulty)!.targetCount;
}

export function targetCountForGame(
  count: number,
  difficulty?: Difficulty,
  geometryVersion?: number,
  savedTargetCount?: number,
) {
  if (savedTargetCount !== undefined) return savedTargetCount;
  if (!difficulty) return count;
  if (geometryVersion === 5 || geometryVersion === 6) {
    return { easy: 100, normal: 250, hard: 500 }[difficulty];
  }
  return targetCountForDifficulty(difficulty);
}

export function difficultyForCount(count: number): Difficulty {
  if (count <= 150) return 'easy';
  if (count <= 300) return 'normal';
  return 'hard';
}

export const GAME_STORAGE_KEY = 'puzzle-moment-game-v2';
export const DRAFT_STORAGE_KEY = 'puzzle-moment-setup-v1';
