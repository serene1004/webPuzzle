import { Check, Clock3, RotateCcw } from 'lucide-react';
import { formatTime } from '../format';
import type { SavedGame } from '../types';

type ResultScreenProps = {
  game: SavedGame
  elapsed: number
  onHome: () => void
  onRestart: () => void
}

export default function ResultScreen({
  game, elapsed, onHome, onRestart,
}: ResultScreenProps) {
  return (
    <section className="result-view">
      <div className="result-photo" style={{ aspectRatio: game.aspect }}>
        <img src={game.image} alt="Completed puzzle" />
        <span className="complete-stamp">
          <Check size={15} />
          {' '}
          Complete
        </span>
      </div>
      <h1>Puzzle complete</h1>
      <div className="result-time">
        <Clock3 size={18} />
        <span>Time</span>
        <strong>{formatTime(elapsed)}</strong>
      </div>
      <div className="result-actions">
        <button className="secondary-button" onClick={onHome}>Home</button>
        <button className="primary-button" onClick={onRestart}>
          <RotateCcw size={16} />
          {' '}
          Play again
        </button>
      </div>
    </section>
  );
}
