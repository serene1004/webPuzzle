import { useEffect, useState } from 'react';
import {
  Navigate, Route, Routes, useLocation, useNavigate,
} from 'react-router-dom';
import LeaveGameDialog from './components/LeaveGameDialog';
import LandingScreen from './components/LandingScreen';
import PuzzleBoard from './components/PuzzleBoard';
import ResultScreen from './components/ResultScreen';
import {
  DRAFT_STORAGE_KEY, GAME_STORAGE_KEY, difficultyForCount,
  type Difficulty,
} from './constants';
import { createGame } from './gameFactory';
import { readDraft, readGame, isGameComplete } from './gameStorage';
import { resizeImage } from './image';
import type { SavedGame } from './types';
import type { Piece } from './puzzle';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [initial] = useState(() => {
    const game = readGame();
    return { game, draft: readDraft(game) };
  });
  const [saved, setSaved] = useState<SavedGame | null>(initial.game);
  const [selectedDifficulty, setSelectedDifficulty] = useState(
    initial.draft?.difficulty
      ?? initial.game?.difficulty
      ?? difficultyForCount(initial.game?.count ?? 250),
  );
  const [photo, setPhoto] = useState(initial.draft?.image ?? initial.game?.image ?? '');
  const [elapsed, setElapsed] = useState(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (!saved || !['/game', '/result'].includes(location.pathname)) return undefined;

    const updateTimer = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - saved.startedAt) / 1000)));
    };

    updateTimer();
    const timerId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timerId);
  }, [location.pathname, saved]);

  async function handleImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please choose an image file.');
      return;
    }

    try {
      const image = await resizeImage(file);
      setPhoto(image);
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ image, difficulty: selectedDifficulty }));
      } catch {
        window.alert('This image is too large to save. Please choose a smaller image.');
      }
    } catch {
      window.alert('Could not load this image. Please choose another one.');
    }
  }

  function chooseDifficulty(difficulty: Difficulty) {
    setSelectedDifficulty(difficulty);
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ image: photo || undefined, difficulty }));
    } catch {
      // Keep the selected difficulty available in memory if session storage is full.
    }
  }

  function startGame() {
    if (!photo) return;

    const image = new Image();
    image.onerror = () => window.alert('Could not load this image. Please choose another one.');
    image.onload = () => {
      try {
        const game = createGame(photo, selectedDifficulty, image.naturalWidth / image.naturalHeight);
        const draft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        try {
          sessionStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(game));
        } catch {
          if (draft) {
            try {
              sessionStorage.setItem(DRAFT_STORAGE_KEY, draft);
            } catch {
              // The selected image remains available in memory.
            }
          }
          window.alert('This image is too large to save. Please choose a smaller image.');
          return;
        }

        setSaved(game);
        setElapsed(0);
        navigate('/game');
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Could not create the puzzle.');
      }
    };
    image.src = photo;
  }

  function updatePieces(pieces: Piece[]) {
    if (!saved) return;
    const nextGame = { ...saved, pieces };
    setSaved(nextGame);
    try {
      sessionStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(nextGame));
    } catch {
      // The current puzzle remains playable in memory.
    }
  }

  function returnHome() {
    if (saved) {
      setPhoto(saved.image);
      const difficulty = saved.difficulty ?? difficultyForCount(saved.count);
      setSelectedDifficulty(difficulty);
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ difficulty }));
      } catch {
        // The setup screen remains available in memory.
      }
    }
    navigate('/');
  }

  function clearGame() {
    try {
      sessionStorage.removeItem(GAME_STORAGE_KEY);
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Clear the in-memory game even when browser storage is unavailable.
    }
    setShowLeaveConfirm(false);
    setSaved(null);
    setPhoto('');
    setSelectedDifficulty('normal');
    navigate('/');
  }

  function leaveGame() {
    setShowLeaveConfirm(true);
  }

  let gameElement = <Navigate to="/" replace />;
  if (saved) {
    if (isGameComplete(saved)) {
      gameElement = <Navigate to="/result" replace />;
    } else {
      gameElement = (
        <section className="game-view">
          <PuzzleBoard
            key={`${saved.count}-${saved.startedAt}`}
            game={saved}
            elapsed={elapsed}
            onUpdate={updatePieces}
            onFinish={() => navigate('/result')}
            onHome={leaveGame}
          />
        </section>
      );
    }
  }

  let resultElement = <Navigate to="/" replace />;
  if (saved) {
    resultElement = isGameComplete(saved)
      ? <ResultScreen game={saved} elapsed={elapsed} onHome={clearGame} onRestart={returnHome} />
      : <Navigate to="/game" replace />;
  }

  return (
    <main className="app-shell">
      <Routes>
        <Route
          path="/"
          element={(
            <LandingScreen
              image={photo}
              difficulty={selectedDifficulty}
              onImage={handleImage}
              onDifficulty={chooseDifficulty}
              onStart={startGame}
            />
          )}
        />
        <Route path="/game" element={gameElement} />
        <Route path="/result" element={resultElement} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showLeaveConfirm && (
        <LeaveGameDialog
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={clearGame}
        />
      )}
    </main>
  );
}
