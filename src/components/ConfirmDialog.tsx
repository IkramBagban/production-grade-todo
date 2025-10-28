import clsx from 'clsx'
import { type ReactNode, useId } from 'react'
import { Modal } from './Modal'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  confirmTone?: 'primary' | 'danger'
  isProcessing?: boolean
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmTone = 'danger',
  isProcessing = false,
}: ConfirmDialogProps) => {
  const descriptionId = useId()

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      dismissLabel="Close confirmation dialog"
      descriptionId={descriptionId}
      footer={
        <div className="dialog-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={isProcessing}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={clsx('btn', confirmTone === 'danger' ? 'btn--danger' : 'btn--primary')}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Working…' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="confirm-dialog__body" id={descriptionId}>
        {typeof description === 'string' ? <p>{description}</p> : description}
      </div>
    </Modal>
  )
}
