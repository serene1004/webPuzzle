import { useRef, type ChangeEvent } from 'react';
import { ArrowRight, ImagePlus, Upload } from 'lucide-react';
import { DIFFICULTIES, type Difficulty } from '../constants';

type LandingScreenProps = {
  image: string
  difficulty: Difficulty
  onImage: (file?: File) => void
  onDifficulty: (difficulty: Difficulty) => void
  onStart: () => void
}

export default function LandingScreen({
  image, difficulty, onImage, onDifficulty, onStart,
}: LandingScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    onImage(file);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  return (
    <section className="home-view">
      <h1>Choose an image for your puzzle.</h1>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      <div className="landing-panel">
        <div className="photo-column">
          {image ? (
            <>
              <div className="photo-preview">
                <img src={image} alt="Selected puzzle preview" />
              </div>
              <button className="change-photo" onClick={openFilePicker}>
                <ImagePlus size={15} />
                {' '}
                Change image
              </button>
            </>
          ) : (
            <button className="upload-zone" onClick={openFilePicker}>
              <span className="upload-icon"><Upload size={22} /></span>
              <strong>Choose image</strong>
            </button>
          )}
        </div>
        <div className="difficulty-column">
          <div className="count-grid">
            {DIFFICULTIES.map((option) => (
              <button
                key={option.id}
                className={`count-choice${difficulty === option.id ? ' selected' : ''}`}
                aria-pressed={difficulty === option.id}
                aria-label={`${option.label}, ${option.estimate}`}
                onClick={() => onDifficulty(option.id)}
              >
                <strong>{option.label}</strong>
                <small>{option.estimate}</small>
              </button>
            ))}
          </div>
          {image && (
            <button className="primary-button start-button" onClick={onStart}>
              Start puzzle
              <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
