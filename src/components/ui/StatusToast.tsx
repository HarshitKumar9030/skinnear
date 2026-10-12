import { CircleAlert, Info, LoaderCircle, X } from "lucide-react";

interface Props {
  message: string;
  error: boolean;
  scanning: boolean;
  onCancel: () => void;
  onDismiss: () => void;
}

export function StatusToast({ message, error, scanning, onCancel, onDismiss }: Props) {
  if (!message) return null;

  const Icon = error ? CircleAlert : scanning ? LoaderCircle : Info;
  return (
    <aside
      className={`status-toast ${error ? "is-error" : ""}`}
      aria-label="Scan and routine updates"
    >
      <Icon className={scanning ? "status-toast-spinner" : ""} size={22} aria-hidden />
      <div className="status-toast-content">
        <p role={error ? "alert" : "status"} aria-atomic="true">
          {message}
        </p>
        {scanning ? (
          <button type="button" onClick={onCancel}>
            Stop waiting
          </button>
        ) : null}
      </div>
      {!scanning ? (
        <button
          type="button"
          className="status-toast-dismiss"
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          <X size={18} aria-hidden />
        </button>
      ) : null}
    </aside>
  );
}
