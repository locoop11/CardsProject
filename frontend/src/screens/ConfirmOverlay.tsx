type Props = {
  title: string
  hint?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  confirmDisabled?: boolean
  busy?: boolean
}

export function ConfirmOverlay({
  title,
  hint,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmDisabled = false,
  busy = false,
}: Props) {
  return (
    <div className="table-overlay" role="dialog" aria-modal="true">
      <div className="table-overlay-panel">
        <p className="table-overlay-title">{title}</p>
        {hint && <p className="table-overlay-hint">{hint}</p>}
        <div
          className={
            onCancel
              ? 'table-overlay-actions'
              : 'table-overlay-actions single'
          }
        >
          {onCancel && (
            <button
              type="button"
              className="btn ghost"
              disabled={busy}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className="btn primary"
            disabled={confirmDisabled || busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
