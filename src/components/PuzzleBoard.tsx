import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { House, Minus, Plus } from 'lucide-react';
import {
  connectedIds, fitImage, makePuzzle, type Edges, type Piece,
} from '../puzzle';
import { formatTime } from '../format';
import { targetCountForGame } from '../constants';
import type { SavedGame } from '../types';

type Camera = { x: number; y: number; scale: number }
type Drag = {
  ids: number[]
  startX: number
  startY: number
  positions: Piece[]
  camera: Camera
  pan: boolean
}
type ContextMenu = { x: number; y: number; id: number }
type PuzzleBoardProps = {
  game: SavedGame
  elapsed: number
  onUpdate: (pieces: Piece[]) => void
  onFinish: () => void
  onHome: () => void
}

function drawPiecePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  edges: Edges,
) {
  const depth = Math.min(width, height) * 0.66;
  ctx.beginPath();
  ctx.moveTo(x, y);

  const drawEdge = (
    offsetX: number,
    offsetY: number,
    length: number,
    tangentX: number,
    tangentY: number,
    normalX: number,
    normalY: number,
    polarity: number,
  ) => {
    const point = (t: number, n: number) => [
      x + offsetX + tangentX * length * t + normalX * depth * n,
      y + offsetY + tangentY * length * t + normalY * depth * n,
    ] as const;
    const [startX, startY] = point(0, 0);
    const [lineX, lineY] = point(0.34, 0);
    const [endX, endY] = point(1, 0);

    ctx.lineTo(startX, startY);
    ctx.lineTo(lineX, lineY);
    if (polarity) {
      ctx.lineTo(...point(0.38, 0));
      ctx.bezierCurveTo(...point(0.42, 0), ...point(0.34, polarity * 0.07), ...point(0.34, polarity * 0.16));
      ctx.bezierCurveTo(
        ...point(0.34, polarity * 0.25),
        ...point(0.42, polarity * 0.31),
        ...point(0.5, polarity * 0.31),
      );
      ctx.bezierCurveTo(
        ...point(0.58, polarity * 0.31),
        ...point(0.66, polarity * 0.25),
        ...point(0.66, polarity * 0.16),
      );
      ctx.bezierCurveTo(...point(0.66, polarity * 0.07), ...point(0.58, 0), ...point(0.62, 0));
    }
    ctx.lineTo(endX, endY);
  };

  drawEdge(0, 0, width, 1, 0, 0, -1, edges.top);
  drawEdge(width, 0, height, 0, 1, 1, 0, edges.right);
  drawEdge(width, height, width, -1, 0, 0, 1, edges.bottom);
  drawEdge(0, height, height, 0, -1, -1, 0, edges.left);
  ctx.closePath();
}

export default function PuzzleBoard({
  game,
  elapsed,
  onUpdate,
  onFinish,
  onHome,
}: PuzzleBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const dragRef = useRef<Drag | null>(null);
  const piecesRef = useRef(game.pieces);
  const [size, setSize] = useState({ width: 1280, height: 800 });
  const [pieces, setPieces] = useState(game.pieces);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const geometryVersion = game.geometryVersion ?? 3;
  const targetCount = targetCountForGame(
    game.count,
    game.difficulty,
    geometryVersion,
    game.targetCount,
  );
  const { cols, rows, edges } = useMemo(
    () => makePuzzle(targetCount, game.aspect, geometryVersion),
    [geometryVersion, game.aspect, targetCount],
  );
  const cellSize = Math.min(72, 880 / cols);
  const puzzleWidth = cols * cellSize;
  const puzzleHeight = rows * cellSize;
  const margin = (game.geometryVersion ?? 3) >= 6
    ? Math.max(600, Math.sqrt(game.count) * cellSize * 0.9)
    : Math.max(440, Math.sqrt(game.count) * cellSize * 0.65);
  const worldWidth = puzzleWidth + margin * 2;
  const pieceAreaHeight = puzzleHeight + margin * 2;
  const referenceBounds = fitImage(game.aspect, 1, puzzleWidth, puzzleHeight);
  const referenceX = (worldWidth - referenceBounds.width) / 2;
  const referenceY = pieceAreaHeight + cellSize * 2;
  const worldHeight = referenceY + referenceBounds.height + margin * 0.25;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    const observer = new ResizeObserver(() => {
      const nextSize = { width: wrapper.clientWidth, height: wrapper.clientHeight };
      setSize(nextSize);
      setCamera((current) => {
        if (current.scale !== 1 || current.x !== 0 || current.y !== 0) return current;

        const scale = Math.max(0.2, Math.min(1, nextSize.width / worldWidth, nextSize.height / worldHeight));
        return {
          scale,
          x: (nextSize.width - worldWidth * scale) / 2,
          y: (nextSize.height - worldHeight * scale) / 2,
        };
      });
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [worldHeight, worldWidth]);

  function fitCanvas() {
    const scale = Math.max(0.2, Math.min(1, size.width / worldWidth, size.height / worldHeight));
    setCamera({
      scale,
      x: (size.width - worldWidth * scale) / 2,
      y: (size.height - worldHeight * scale) / 2,
    });
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const imageBounds = fitImage(image.naturalWidth, image.naturalHeight, puzzleWidth, puzzleHeight);
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    if (!ctx || !rect.width || !rect.height) return;
    const theme = getComputedStyle(document.documentElement);

    if (canvas.width !== Math.round(rect.width * pixelRatio)
      || canvas.height !== Math.round(rect.height * pixelRatio)) {
      canvas.width = Math.round(rect.width * pixelRatio);
      canvas.height = Math.round(rect.height * pixelRatio);
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.setTransform(
      pixelRatio * camera.scale,
      0,
      0,
      pixelRatio * camera.scale,
      pixelRatio * camera.x,
      pixelRatio * camera.y,
    );

    const frame = 14;
    ctx.save();
    ctx.shadowColor = 'rgba(9, 8, 6, 0.55)';
    ctx.shadowBlur = 20 / camera.scale;
    ctx.shadowOffsetY = 8 / camera.scale;
    ctx.fillStyle = theme.getPropertyValue('--color-wood').trim();
    ctx.fillRect(
      margin - frame,
      margin - frame,
      puzzleWidth + frame * 2,
      puzzleHeight + frame * 2,
    );
    ctx.restore();
    ctx.fillStyle = theme.getPropertyValue('--color-board').trim();
    ctx.fillRect(margin, margin, puzzleWidth, puzzleHeight);
    ctx.strokeStyle = theme.getPropertyValue('--color-wood-light').trim();
    ctx.lineWidth = 2;
    ctx.strokeRect(
      margin - frame + 1,
      margin - frame + 1,
      puzzleWidth + (frame - 1) * 2,
      puzzleHeight + (frame - 1) * 2,
    );
    ctx.strokeStyle = theme.getPropertyValue('--color-wood-dark').trim();
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, puzzleWidth, puzzleHeight);

    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      referenceX,
      referenceY,
      referenceBounds.width,
      referenceBounds.height,
    );
    pieces.forEach((piece) => {
      drawPiecePath(ctx, piece.x, piece.y, cellSize, cellSize, edges[piece.id]);
      ctx.save();
      ctx.clip();
      ctx.fillStyle = theme.getPropertyValue('--color-board').trim();
      ctx.fillRect(
        piece.x - cellSize,
        piece.y - cellSize,
        cellSize * 3,
        cellSize * 3,
      );
      ctx.shadowColor = 'rgba(9, 8, 6, 0.42)';
      ctx.shadowBlur = 5 / camera.scale;
      ctx.shadowOffsetY = 2 / camera.scale;
      ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        piece.x - piece.col * cellSize + imageBounds.x,
        piece.y - piece.row * cellSize + imageBounds.y,
        imageBounds.width,
        imageBounds.height,
      );
      ctx.restore();
      drawPiecePath(ctx, piece.x, piece.y, cellSize, cellSize, edges[piece.id]);
      ctx.strokeStyle = theme.getPropertyValue('--color-piece-outline').trim();
      ctx.lineWidth = 0.9 / camera.scale;
      ctx.stroke();
    });
  }, [
    camera, cellSize, edges, margin, pieces, puzzleHeight, puzzleWidth,
    referenceBounds.height, referenceBounds.width, referenceX, referenceY,
  ]);
  drawRef.current = draw;

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      drawRef.current();
    };
    image.src = game.image;
  }, [game.image]);

  useEffect(() => {
    draw();
  }, [draw, size]);

  function point(event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    setContextMenu(null);

    const { x, y } = point(event);
    const worldX = (x - camera.x) / camera.scale;
    const worldY = (y - camera.y) / camera.scale;
    const hit = [...pieces].reverse().find((piece) => (
      worldX >= piece.x - cellSize * 0.24
      && worldX <= piece.x + cellSize * 1.24
      && worldY >= piece.y - cellSize * 0.24
      && worldY <= piece.y + cellSize * 1.24
    ));
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hit) {
      dragRef.current = {
        ids: [], startX: x, startY: y, positions: [], camera, pan: true,
      };
    } else {
      const ids = [...connectedIds(hit.id, piecesRef.current, cellSize, cellSize)];
      const idSet = new Set(ids);
      const lifted = [
        ...piecesRef.current.filter((piece) => !idSet.has(piece.id)),
        ...piecesRef.current.filter((piece) => idSet.has(piece.id)),
      ];
      piecesRef.current = lifted;
      setPieces(lifted);
      dragRef.current = {
        ids,
        startX: x,
        startY: y,
        positions: lifted.filter((piece) => idSet.has(piece.id)),
        camera,
        pan: false,
      };
    }

    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const { x, y } = point(event);
    const dx = x - drag.startX;
    const dy = y - drag.startY;
    if (drag.pan) {
      setCamera({ ...drag.camera, x: drag.camera.x + dx, y: drag.camera.y + dy });
      return;
    }

    const moving = new Set(drag.ids);
    const moved = new Map(drag.positions.map((piece) => [piece.id, {
      x: piece.x + dx / drag.camera.scale,
      y: piece.y + dy / drag.camera.scale,
    }]));
    const next = piecesRef.current.map((piece) => (
      moving.has(piece.id) ? { ...piece, ...moved.get(piece.id) } : piece
    ));
    piecesRef.current = next;
    setPieces(next);
  }

  function pointerUp() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (drag.pan) return;

    const byId = new Map(piecesRef.current.map((piece) => [piece.id, piece]));
    const byPosition = new Map(piecesRef.current.map((piece) => [
      `${piece.row}:${piece.col}`,
      piece.id,
    ]));
    const moving = new Set(drag.ids);
    let best: { distance: number; dx: number; dy: number } | null = null;

    drag.positions.forEach((piece) => {
      const moved = byId.get(piece.id);
      if (!moved) return;

      const neighbors = [
        byPosition.get(`${piece.row}:${piece.col - 1}`),
        byPosition.get(`${piece.row}:${piece.col + 1}`),
        byPosition.get(`${piece.row - 1}:${piece.col}`),
        byPosition.get(`${piece.row + 1}:${piece.col}`),
      ].filter((id): id is number => id !== undefined);
      neighbors.forEach((id) => {
        if (moving.has(id)) return;
        const neighbor = byId.get(id);
        if (!neighbor) return;

        const dx = (piece.col - neighbor.col) * cellSize;
        const dy = (piece.row - neighbor.row) * cellSize;
        const targetX = neighbor.x + dx;
        const targetY = neighbor.y + dy;
        const distance = Math.hypot(moved.x - targetX, moved.y - targetY);
        if (distance < cellSize * 0.58 && (!best || distance < best.distance)) {
          best = { distance, dx: targetX - moved.x, dy: targetY - moved.y };
        }
      });
    });

    const next = piecesRef.current.map((piece) => (
      moving.has(piece.id) && best
        ? { ...piece, x: piece.x + best.dx, y: piece.y + best.dy }
        : piece
    ));
    piecesRef.current = next;
    setPieces(next);
    onUpdate(next);
    if (connectedIds(0, next, cellSize, cellSize).size === game.count) onFinish();
  }

  function openContextMenu(event: React.MouseEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const { x, y } = point(event);
    const worldX = (x - camera.x) / camera.scale;
    const worldY = (y - camera.y) / camera.scale;
    const hit = [...pieces].reverse().find((piece) => (
      worldX >= piece.x - cellSize * 0.24
      && worldX <= piece.x + cellSize * 1.24
      && worldY >= piece.y - cellSize * 0.24
      && worldY <= piece.y + cellSize * 1.24
    ));

    setContextMenu(hit ? { x: event.clientX, y: event.clientY, id: hit.id } : null);
  }

  function separatePiece() {
    if (!contextMenu) return;
    const group = connectedIds(contextMenu.id, piecesRef.current, cellSize, cellSize);
    if (group.size < 2) {
      setContextMenu(null);
      return;
    }

    const next = piecesRef.current.map((piece) => (
      piece.id === contextMenu.id
        ? { ...piece, x: piece.x + cellSize * 1.35, y: piece.y + cellSize * 1.35 }
        : piece
    ));
    piecesRef.current = next;
    setPieces(next);
    onUpdate(next);
    setContextMenu(null);
  }

  function zoomAt(scale: number, x = size.width / 2, y = size.height / 2) {
    setCamera((current) => {
      const nextScale = Math.max(0.25, Math.min(3, scale));
      return {
        scale: nextScale,
        x: x - ((x - current.x) * nextScale) / current.scale,
        y: y - ((y - current.y) * nextScale) / current.scale,
      };
    });
  }

  function wheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    zoomAt(camera.scale * Math.exp(-event.deltaY * 0.001), event.clientX - rect.left, event.clientY - rect.top);
  }

  return (
    <div
      className="board-wrap"
      ref={wrapperRef}
      onWheel={wheel}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) setContextMenu(null);
      }}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Jigsaw workspace. Drag pieces to fit or drag empty space to pan."
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onContextMenu={openContextMenu}
      />
      {contextMenu && connectedIds(contextMenu.id, pieces, cellSize, cellSize).size > 1 && (
        <button
          className="piece-context-menu"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 170),
            top: Math.min(contextMenu.y, window.innerHeight - 58),
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={separatePiece}
        >
          Separate puzzle group
        </button>
      )}
      <div className="canvas-controls">
        <button aria-label="Go to home" onClick={onHome}><House size={18} /></button>
        <div className="canvas-control-group">
          <span className="canvas-timer">{formatTime(elapsed)}</span>
          <span className="control-separator" />
          <div className="zoom-control">
            <button aria-label="Zoom out" onClick={() => zoomAt(camera.scale / 1.2)}><Minus size={16} /></button>
            <button className="zoom-value" aria-label="Fit to screen" onClick={fitCanvas}>
              {Math.round(camera.scale * 100)}
              %
            </button>
            <button aria-label="Zoom in" onClick={() => zoomAt(camera.scale * 1.2)}><Plus size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
