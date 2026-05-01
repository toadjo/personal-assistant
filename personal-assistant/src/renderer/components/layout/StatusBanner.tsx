type Props = {
  status: string;
  error: string;
};

export function StatusBanner({ status, error }: Props): JSX.Element {
  return (
    <>
      {status ? (
        <p className="status" role="status" aria-live="polite">
          Success: {status}
        </p>
      ) : null}
      {error ? (
        <p className="error" role="alert" aria-live="assertive">
          Error: {error}
        </p>
      ) : null}
    </>
  );
}
