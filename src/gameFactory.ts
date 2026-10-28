import { makePuzzle } from './puzzle';
import { targetCountForDifficulty, type Difficulty } from './constants';
import type { SavedGame } from './types';

type Slot = { x: number; y: number }

export function createGame(image: string, difficulty: Difficulty, aspect: number): SavedGame {
  const targetCount = targetCountForDifficulty(difficulty);
  const { cols, rows, positions } = makePuzzle(targetCount, aspect, 7);
  const count = positions.length;
  const cellSize = Math.min(72, 880 / cols);
  const puzzleWidth = cols * cellSize;
  const puzzleHeight = rows * cellSize;
  const margin = Math.max(600, Math.sqrt(count) * cellSize * 0.9);
  const worldWidth = puzzleWidth + margin * 2;
  const worldHeight = puzzleHeight + margin * 2;
  const step = cellSize * 1.42;
  const clearance = cellSize * 2;
  const slots: Slot[] = [];

  for (let y = 0; y + cellSize <= worldHeight; y += step) {
    for (let x = 0; x + cellSize <= worldWidth; x += step) {
      const outsideTarget = (
        x + cellSize < margin - clearance
        || x > margin + puzzleWidth + clearance
        || y + cellSize < margin - clearance
        || y > margin + puzzleHeight + clearance
      );

      if (outsideTarget) slots.push({ x, y });
    }
  }

  if (slots.length < count) {
    throw new Error('Could not arrange pieces. Try fewer pieces or a different image.');
  }

  for (let index = slots.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const slot = slots[index];
    slots[index] = slots[randomIndex];
    slots[randomIndex] = slot;
  }

  return {
    image,
    aspect,
    count,
    targetCount,
    difficulty,
    geometryVersion: 7,
    pieces: positions.map(({ id, row, col }) => ({
      id,
      row,
      col,
      x: slots[id].x + Math.random() * (step - cellSize),
      y: slots[id].y + Math.random() * (step - cellSize),
    })),
    startedAt: Date.now(),
  };
}
