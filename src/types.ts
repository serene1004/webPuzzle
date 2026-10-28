import type { Piece } from './puzzle';
import type { Difficulty } from './constants';

export type SavedGame = {
  image: string
  aspect: number
  count: number
  targetCount?: number
  difficulty?: Difficulty
  pieces: Piece[]
  startedAt: number
  completedAt?: number
  geometryVersion?: number
}

export type Draft = {
  image?: string
  difficulty: Difficulty
}
