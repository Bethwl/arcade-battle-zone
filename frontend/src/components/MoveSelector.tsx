import './MoveSelector.css';

type MoveSelectorProps = {
  selectedMove: number | null;
  onSelectMove: (move: number) => void;
  disabled?: boolean;
};

const MOVES = [
  { value: 1, label: 'ROCK', emoji: '✊' },
  { value: 2, label: 'PAPER', emoji: '✋' },
  { value: 3, label: 'SCISSORS', emoji: '✌' },
];

export function MoveSelector({
  selectedMove,
  onSelectMove,
  disabled = false,
}: MoveSelectorProps) {
  return (
    <div className="move-selector-arcade">
      {MOVES.map((move) => (
        <button
          key={move.value}
          className={`move-btn-retro move-${move.label.toLowerCase()} ${
            selectedMove === move.value ? 'selected' : ''
          }`}
          onClick={() => onSelectMove(move.value)}
          disabled={disabled}
        >
          <span className="move-icon">{move.emoji}</span>
          <span className="move-label">{move.label}</span>
        </button>
      ))}
    </div>
  );
}
