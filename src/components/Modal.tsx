import FocusTrap from 'focus-trap-react'
import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import clsx from 'clsx'

type ModalSize = 'sm' | 'md' | 'lg'

type ModalProps = {
  open: boolean
  title: string
  descriptionId?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  dismissLabel?: string
}

const sizeClassMap: Record<ModalSize, string> = {
  sm: 'modal__panel--sm',
  md: 'modal__panel--md',
  lg: 'modal__panel--lg',
}

export const Modal = ({
  open,
  title,
  descriptionId,
  onClose,
  children,
  footer,
  size = 'md',
  dismissLabel = 'Close dialog',
}: ModalProps) => {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose()
    }
  }

  return (
    <div className="modal">
      <div className="modal__backdrop" aria-hidden="true" />
      <FocusTrap
        focusTrapOptions={{
          fallbackFocus: () => closeButtonRef.current ?? undefined,
          escapeDeactivates: false,
        }}
      >
        <div
          ref={overlayRef}
          className="modal__container"
          role="presentation"
          onMouseDown={handleOverlayClick}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className={clsx('modal__panel', sizeClassMap[size])}
          >
            <header className="modal__header">
              <h2 id={titleId} className="modal__title">
                {title}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label={dismissLabel}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className="modal__body">{children}</div>
            {footer ? <footer className="modal__footer">{footer}</footer> : null}
          </section>
        </div>
      </FocusTrap>
    </div>
  )
}
