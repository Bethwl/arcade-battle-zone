import './ArcadeButton.css';

type ArcadeButtonProps = {
  variant?: 'primary' | 'secondary' | 'danger';
  color?: 'cyan' | 'magenta' | 'yellow' | 'green' | 'red';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
};

export function ArcadeButton({
  variant = 'primary',
  color = 'cyan',
  onClick,
  disabled = false,
  loading = false,
  children,
  className = '',
  type = 'button',
}: ArcadeButtonProps) {
  return (
    <button
      type={type}
      className={`arcade-btn arcade-btn-${variant} arcade-btn-${color} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <span className="arcade-btn-content">
          <span className="pixel-spinner"></span>
          <span>LOADING...</span>
        </span>
      ) : (
        <span className="arcade-btn-content">{children}</span>
      )}
    </button>
  );
}
