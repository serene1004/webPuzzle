export type Piece = { id: number; row: number; col: number; x: number; y: number }
export type Edges = { top: number; right: number; bottom: number; left: number }
export type PiecePosition = { id: number; row: number; col: number }

export function gridFor(count: number, aspect: number, geometryVersion = 5) {
  let cols: number;
  let rows: number;
  if (geometryVersion >= 7) {
    rows = Math.max(1, Math.round(Math.sqrt(count / aspect)));
    cols = Math.max(1, Math.round(count / rows));
    if (cols * rows > count) {
      const reduceColumnError = cols > 1
        ? Math.abs(Math.log((cols - 1) / rows / aspect))
        : Infinity;
      const reduceRowError = rows > 1
        ? Math.abs(Math.log(cols / (rows - 1) / aspect))
        : Infinity;
      if (reduceColumnError < reduceRowError) cols -= 1;
      else rows -= 1;
    }
  } else if (geometryVersion >= 5) {
    rows = Math.max(1, Math.round(Math.sqrt(count / aspect)));
    cols = Math.max(1, Math.round(count / rows));
  } else {
    let best = { cols: 1, rows: count, error: Infinity };
    for (let candidateRows = 1; candidateRows <= count; candidateRows += 1) {
      if (count % candidateRows) continue;
      const candidateCols = count / candidateRows;
      const error = Math.abs(Math.log(candidateCols / candidateRows / aspect));
      if (error < best.error) best = { cols: candidateCols, rows: candidateRows, error };
    }
    ({ cols, rows } = best);
  }
  return {
    cols,
    rows,
    positions: Array.from({ length: cols * rows }, (_, id) => ({
      id,
      row: Math.floor(id / cols),
      col: id % cols,
    })),
  };
}

export function fitImage(width: number, height: number, targetWidth: number, targetHeight: number) {
  const scale = Math.min(targetWidth / width, targetHeight / height);
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;

  return {
    x: (targetWidth - fittedWidth) / 2,
    y: (targetHeight - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight,
  };
}

export function makePuzzle(count: number, aspect: number, geometryVersion = 4) {
  const grid = gridFor(count, aspect, geometryVersion);
  let seed = (count * 9301 + Math.round(aspect * 10000) * 49297) % 233280;
  const edgeRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const randomEdge = () => (edgeRandom() < 0.5 ? -1 : 1);
  const edges: Edges[] = Array(grid.positions.length);

  if (geometryVersion < 4) {
    const vertical = Array.from({ length: grid.rows }, () => (
      Array.from({ length: grid.cols - 1 }, () => (edgeRandom() < 0.5 ? -1 : 1))
    ));
    const horizontal = Array.from({ length: grid.rows - 1 }, () => (
      Array.from({ length: grid.cols }, () => (edgeRandom() < 0.5 ? -1 : 1))
    ));

    grid.positions.forEach(({ id, row, col }) => {
      edges[id] = {
        top: row ? -horizontal[row - 1][col] : 0,
        right: col < grid.cols - 1 ? vertical[row][col] : 0,
        bottom: row < grid.rows - 1 ? horizontal[row][col] : 0,
        left: col ? -vertical[row][col - 1] : 0,
      };
    });
    return { ...grid, edges };
  }

  const idsByPosition = new Map(grid.positions.map(({ id, row, col }) => [`${row}:${col}`, id]));
  grid.positions.forEach(({ id, row, col }) => {
    const topId = idsByPosition.get(`${row - 1}:${col}`);
    const leftId = idsByPosition.get(`${row}:${col - 1}`);
    const hasRight = idsByPosition.has(`${row}:${col + 1}`);
    const hasBottom = idsByPosition.has(`${row + 1}:${col}`);
    edges[id] = {
      top: topId === undefined ? 0 : -edges[topId].bottom,
      right: hasRight ? randomEdge() : 0,
      bottom: hasBottom ? randomEdge() : 0,
      left: leftId === undefined ? 0 : -edges[leftId].right,
    };
  });

  return { ...grid, edges };
}

export function connectedIds(seedId: number, pieces: Piece[], cellW: number, cellH: number) {
  const byId = new Map(pieces.map((piece) => [piece.id, piece]));
  const byPosition = new Map(pieces.map((piece) => [`${piece.row}:${piece.col}`, piece]));
  const found = new Set([seedId]);
  const queue = [seedId];
  while (queue.length) {
    const piece = byId.get(queue.shift()!)!;
    const neighbors = [
      byPosition.get(`${piece.row}:${piece.col - 1}`),
      byPosition.get(`${piece.row}:${piece.col + 1}`),
      byPosition.get(`${piece.row - 1}:${piece.col}`),
      byPosition.get(`${piece.row + 1}:${piece.col}`),
    ];
    neighbors.forEach((neighbor) => {
      if (!neighbor || found.has(neighbor.id)) return;

      const dx = (neighbor.col - piece.col) * cellW;
      const dy = (neighbor.row - piece.row) * cellH;
      if (Math.abs(neighbor.x - piece.x - dx) < 1.5
        && Math.abs(neighbor.y - piece.y - dy) < 1.5) {
        found.add(neighbor.id);
        queue.push(neighbor.id);
      }
    });
  }
  return found;
}

export function assertPuzzleGeometry() {
  for (const count of [100, 200, 300, 400, 500]) {
    const puzzle = makePuzzle(count, 1.6, 7);
    const idsByPosition = new Map(puzzle.positions.map(({ id, row, col }) => [`${row}:${col}`, id]));
    if (puzzle.edges.length !== puzzle.positions.length
      || puzzle.positions.length > count
      || puzzle.positions.length < count * 0.9) {
      throw new Error(`Invalid ${count}-piece puzzle`);
    }
    puzzle.positions.forEach(({ id, row, col }) => {
      const edge = puzzle.edges[id];
      const topId = idsByPosition.get(`${row - 1}:${col}`);
      const rightId = idsByPosition.get(`${row}:${col + 1}`);
      const bottomId = idsByPosition.get(`${row + 1}:${col}`);
      const leftId = idsByPosition.get(`${row}:${col - 1}`);
      if ((topId === undefined && edge.top) || (rightId === undefined && edge.right)
        || (bottomId === undefined && edge.bottom) || (leftId === undefined && edge.left)) {
        throw new Error('Puzzle boundary must remain flat');
      }
      if (rightId !== undefined && edge.right !== -puzzle.edges[rightId].left) {
        throw new Error('Horizontal neighbors do not interlock');
      }
      if (bottomId !== undefined && edge.bottom !== -puzzle.edges[bottomId].top) {
        throw new Error('Vertical neighbors do not interlock');
      }
    });
  }

  const line = Array.from({ length: 3 }, (_, id) => ({
    id, row: 0, col: id, x: 20 + id * 100, y: 30,
  }));
  const separatedLine = line.map((piece) => (
    piece.id === 2 ? { ...piece, x: 400 } : piece
  ));
  if (connectedIds(0, line, 100, 100).size !== 3
    || connectedIds(0, separatedLine, 100, 100).size !== 2) {
    throw new Error('Joined piece groups are not detected correctly');
  }

  for (const [width, height, targetWidth, targetHeight] of [
    [1600, 900, 1000, 1000],
    [900, 1600, 1200, 700],
  ]) {
    const fitted = fitImage(width, height, targetWidth, targetHeight);
    if (fitted.x < 0 || fitted.y < 0
      || fitted.x + fitted.width > targetWidth + 0.001
      || fitted.y + fitted.height > targetHeight + 0.001
      || Math.abs(fitted.width / fitted.height - width / height) > 0.001) {
      throw new Error('Image fit must preserve the full source aspect ratio');
    }
  }
}

if (import.meta.env.DEV) assertPuzzleGeometry();
