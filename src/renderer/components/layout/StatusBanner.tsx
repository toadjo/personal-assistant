type Props = {
  status: string;
  error: string;
};

export function StatusBanner({ status, error }: Props): JSX.Element {
  return (
    <>
      {status ? (
        <p className="status statusAssistant" role="status" aria-live="polite" aria-atomic="true">
          <span className="statusBadge" aria-hidden="true">
            Assistant
          </span>
          <span className="statusMessage">{status}</span>
        </p>
      ) : null}
      {error ? (
        <p className="error errorAssistant" role="alert" aria-live="assertive" aria-atomic="true">
          <span className="errorBadge" aria-hidden="true">
            Heads up
          </span>
          <span className="errorMessage">{error}</span>
        </p>
      ) : null}
    </>
  );
}
