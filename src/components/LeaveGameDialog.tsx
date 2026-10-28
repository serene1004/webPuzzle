import { useEffect, useRef } from 'react';

type LeaveGameDialogProps = {
  onCancel: () => void
  onConfirm: () => void
}

export default function LeaveGameDialog({ onCancel, onConfirm }: LeaveGameDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="leave-game-title"
      aria-describedby="leave-game-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="leave-game-title">Leave this puzzle?</h2>
      <p id="leave-game-description">Your progress will be deleted if you return home.</p>
      <div className="confirm-dialog-actions">
        <button className="secondary-button" onClick={onCancel}>Stay</button>
        <button className="primary-button" onClick={onConfirm}>Go home</button>
      </div>
    </dialog>
  );
}
