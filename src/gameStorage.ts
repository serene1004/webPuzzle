import {
  DRAFT_STORAGE_KEY, GAME_STORAGE_KEY, difficultyForCount, isDifficulty,
  targetCountForGame,
} from './constants';
import { connectedIds, gridFor } from './puzzle';
import type { Draft, SavedGame } from './types';

export function readGame(): SavedGame | null {
  try {
    const value = sessionStorage.getItem(GAME_STORAGE_KEY);
    if (!value) return null;

    const game = JSON.parse(value) as SavedGame;
    if (
      typeof game.image !== 'string'
      || !Number.isInteger(game.count)
      || game.count < 1
      || game.count > 1500
      || (game.targetCount !== undefined
        && (!Number.isInteger(game.targetCount) || game.targetCount < game.count || game.targetCount > 1500))
      || (game.difficulty !== undefined && !isDifficulty(game.difficulty))
      || !Number.isFinite(game.aspect)
      || game.aspect <= 0
      || !Number.isFinite(game.startedAt)
      || (game.completedAt !== undefined
        && (!Number.isFinite(game.completedAt) || game.completedAt < game.startedAt))
      || !Array.isArray(game.pieces)
      || game.pieces.length !== game.count
    ) return null;

    const geometryVersion = game.geometryVersion ?? 3;
    const targetCount = targetCountForGame(
      game.count,
      game.difficulty,
      geometryVersion,
      game.targetCount,
    );
    const grid = gridFor(targetCount, game.aspect, geometryVersion);
    if (grid.positions.length !== game.count) return null;
    const validPieces = grid.positions.every(({ id, row, col }) => {
      const piece = game.pieces[id];
      return piece?.id === id
      && piece.row === row
      && piece.col === col
      && Number.isFinite(piece.x)
      && Number.isFinite(piece.y);
    });
    if (!validPieces) return null;

    if (![3, 4, 5, 6, 7].includes(game.geometryVersion ?? 0)) {
      const oldWidth = Math.min(72, 880 / grid.cols);
      const oldHeight = oldWidth * grid.cols / (grid.rows * game.aspect);

      game.pieces.forEach((piece) => {
        const group = connectedIds(piece.id, game.pieces, oldWidth, oldHeight);
        if (group.size < 2) return;

        const anchor = game.pieces[piece.id];
        group.forEach((id) => {
          const item = game.pieces[id];
          item.x = anchor.x + (item.col - anchor.col) * oldWidth;
          item.y = anchor.y + (item.row - anchor.row) * oldWidth;
        });
      });

      game.geometryVersion = 3;
      try {
        sessionStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(game));
      } catch {
        // Keep the migrated game playable if storage is full.
      }
    }

    if (game.geometryVersion === 3 && !game.difficulty) {
      const cellSize = Math.min(72, 880 / grid.cols);
      const hasJoinedPieces = game.pieces.some((piece) => (
        connectedIds(piece.id, game.pieces, cellSize, cellSize).size > 1
      ));

      if (!hasJoinedPieces) {
        const nextGrid = gridFor(game.count, game.aspect, 4);
        nextGrid.positions.forEach(({ id, row, col }) => {
          game.pieces[id].row = row;
          game.pieces[id].col = col;
        });
        game.geometryVersion = 4;
        try {
          sessionStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(game));
        } catch {
          // Keep the migrated game playable if storage is full.
        }
      }
    }

    return game;
  } catch {
    return null;
  }
}

export function readDraft(game: SavedGame | null): Draft | null {
  try {
    const value = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!value) return null;

    const draft = JSON.parse(value) as Draft & { count?: number };
    if (
      !(isDifficulty(draft.difficulty)
        || (Number.isInteger(draft.count) && (draft.count ?? 0) > 0))
      || (draft.image !== undefined && typeof draft.image !== 'string')
    ) return null;

    return {
      image: draft.image ?? game?.image ?? '',
      difficulty: isDifficulty(draft.difficulty)
        ? draft.difficulty
        : difficultyForCount(draft.count!),
    };
  } catch {
    return null;
  }
}

export function isGameComplete(game: SavedGame) {
  const geometryVersion = game.geometryVersion ?? 3;
  const targetCount = targetCountForGame(
    game.count,
    game.difficulty,
    geometryVersion,
    game.targetCount,
  );
  const { cols } = gridFor(targetCount, game.aspect, geometryVersion);
  const cellSize = Math.min(72, 880 / cols);

  return connectedIds(0, game.pieces, cellSize, cellSize).size === game.count;
}
