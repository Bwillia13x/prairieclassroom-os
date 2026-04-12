interface Props {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onRetry, onDismiss }: Props) {
  return (
    <div className="error-banner error-banner--actionable" role="alert">
      <span className="error-banner__message">{message}</span>
      <div className="error-banner__actions">
        {onRetry && (
          <button className="error-banner__btn" onClick={onRetry} type="button">
            Retry
          </button>
        )}
        {onDismiss && (
          <button className="error-banner__btn error-banner__btn--dismiss" onClick={onDismiss} type="button" aria-label="Dismiss error">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
