import assert from 'node:assert/strict';
import {
  after, afterEach, before, test,
} from 'node:test';
import { createServer } from 'vite';

let server;
let createGame;
let readDraft;
let readGame;
let makePuzzle;
let originalStorage;

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
  });
  ({ createGame } = await server.ssrLoadModule('/src/gameFactory.ts'));
  ({ readDraft, readGame } = await server.ssrLoadModule('/src/gameStorage.ts'));
  ({ makePuzzle } = await server.ssrLoadModule('/src/puzzle.ts'));
});

after(async () => {
  await server?.close();
});

before(() => {
  originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
});

afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(globalThis, 'sessionStorage', originalStorage);
  } else {
    delete globalThis.sessionStorage;
  }
});

function useMemoryStorage() {
  const values = new Map();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
  return globalThis.sessionStorage;
}

test('creates aspect-aware puzzles within each difficulty range', () => {
  const ranges = {
    easy: [1, 150],
    normal: [151, 300],
    hard: [301, 500],
  };

  ['easy', 'normal', 'hard'].forEach((difficulty) => {
    [16 / 9, 3 / 4].forEach((aspect) => {
      const game = createGame('data:image/jpeg;base64,AA==', difficulty, aspect);
      const [minimum, maximum] = ranges[difficulty];
      assert.ok(game.count >= minimum && game.count <= maximum);
      assert.equal(game.pieces.length, game.count);
      assert.equal(new Set(game.pieces.map(({ x, y }) => `${x}:${y}`)).size, game.count);
      assert.equal(game.difficulty, difficulty);
    });
  });
});

test('restores a saved game from session storage', () => {
  const storage = useMemoryStorage();
  const game = createGame('data:image/jpeg;base64,AA==', 'normal', 16 / 9);
  storage.setItem('puzzle-moment-game-v2', JSON.stringify(game));

  assert.deepEqual(readGame(), game);
});

test('keeps legacy difficulty geometry when restoring an older game', () => {
  const storage = useMemoryStorage();
  const { positions } = makePuzzle(100, 16 / 9, 6);
  const game = {
    image: 'data:image/jpeg;base64,AA==',
    aspect: 16 / 9,
    count: positions.length,
    difficulty: 'easy',
    geometryVersion: 6,
    pieces: positions.map(({ id, row, col }) => ({ id, row, col, x: id * 10, y: id * 7 })),
    startedAt: Date.now(),
  };
  storage.setItem('puzzle-moment-game-v2', JSON.stringify(game));

  assert.deepEqual(readGame(), game);
});

test('migrates an unjoined legacy game to the current grid geometry', () => {
  const storage = useMemoryStorage();
  const game = createGame('data:image/jpeg;base64,AA==', 'easy', 16 / 9);
  delete game.difficulty;
  delete game.targetCount;
  game.geometryVersion = 3;
  storage.setItem('puzzle-moment-game-v2', JSON.stringify(game));

  assert.equal(readGame()?.geometryVersion, 4);
});

test('rejects saved games whose piece count does not match their grid', () => {
  const storage = useMemoryStorage();
  const game = createGame('data:image/jpeg;base64,AA==', 'easy', 4 / 3);
  storage.setItem('puzzle-moment-game-v2', JSON.stringify({ ...game, count: game.count + 1 }));

  assert.equal(readGame(), null);
});

test('restores new and legacy setup drafts', () => {
  const storage = useMemoryStorage();
  storage.setItem('puzzle-moment-setup-v1', JSON.stringify({ image: 'preview', difficulty: 'hard' }));
  assert.deepEqual(readDraft(null), { image: 'preview', difficulty: 'hard' });

  storage.setItem('puzzle-moment-setup-v1', JSON.stringify({ count: 200 }));
  assert.deepEqual(readDraft(null), { image: '', difficulty: 'normal' });
});
