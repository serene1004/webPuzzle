# WebPuzzle

A browser-based jigsaw puzzle. Choose an image, select a difficulty, and arrange the pieces on a full-screen canvas.

## Requirements

- Node.js 22 or later
- pnpm 11

## Getting started

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. To check the project:

```sh
pnpm test
pnpm lint
pnpm build
pnpm preview
```

## How to play

1. Choose an image and a difficulty on the home screen.
2. Drag pieces to connect matching edges. The number of pieces is approximate because the grid follows the image's aspect ratio.
3. Drag empty canvas space to pan. Use the zoom controls or mouse wheel to zoom.
4. Right-click a connected group and choose **Separate puzzle group** to detach the clicked piece.
5. Finish the full puzzle to see the elapsed time.

| Difficulty | Target pieces |
| --- | ---: |
| Easy | ~150 pieces |
| Normal | ~300 pieces |
| Hard | ~500 pieces |

## Project structure

```text
src/
  components/       Landing, puzzle board, result, and leave confirmation screens
  App.tsx           Routes and application/session state
  gameFactory.ts    Difficulty-based puzzle and starting piece layout
  gameStorage.ts    Session restore, validation, and legacy migration
  image.ts          Local image resizing
  puzzle.ts         Grid, jigsaw edges, image fitting, and group detection
  style.css         Dark wood theme and responsive styles
tests/
  game.test.mjs     Puzzle creation and session-storage tests
```

## Notes

- Images are resized in the browser and kept in `sessionStorage`; they are not uploaded to a server. Progress survives a page refresh in the same tab, but closing the tab ends that session.
- The Inter font is loaded from Google Fonts. A system sans-serif font is used if it is unavailable.
- The app uses client-side routes (`/`, `/game`, and `/result`). Production hosting must serve `index.html` as the fallback for those paths.
