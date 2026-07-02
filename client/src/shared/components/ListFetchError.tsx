type ListFetchErrorProps = {
  message: string;
  onRetry?: () => void;
};

/** Shown when a list/detail fetch fails — distinct from an empty database. */
export function ListFetchError({ message, onRetry }: ListFetchErrorProps) {
  return (
    <div
      className="mt-12 rounded-xl border border-terminal-red/40 bg-terminal-red/10 p-8 text-center"
      role="alert"
    >
      <p className="font-mono text-sm font-semibold uppercase tracking-wide text-red-200">
        Could not reach the API
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-red-100/90">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-5 text-sm">
          Try again
        </button>
      )}
    </div>
  );
}
