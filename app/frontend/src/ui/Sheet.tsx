// A sheet on the native <dialog>: focus moves in and is trapped, Escape closes, focus returns on close.
import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Sheet(props: {
  open: boolean
  onClose: () => void
  title: string
  /** Pixel tag above the title. */
  tag?: string
  dark?: boolean
  children: ReactNode
  footer?: ReactNode
  testId?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (props.open && !d.open) d.showModal()
    if (!props.open && d.open) d.close()
  }, [props.open])

  return (
    <dialog
      ref={ref}
      className={props.dark ? 'sheet sheet--dark' : 'sheet'}
      aria-labelledby={titleId}
      data-testid={props.testId}
      onClose={props.onClose}
      onCancel={(e) => {
        e.preventDefault()
        props.onClose()
      }}
      onClick={(e) => {
        // a tap on the backdrop closes
        if (e.target === ref.current) props.onClose()
      }}
    >
      {props.open && (
        <div className="flex flex-col gap-4 bg-[inherit] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {props.tag && <p className={props.dark ? 'slip__tag !text-muted' : 'slip__tag'}>{props.tag}</p>}
              <h2 id={titleId} className={props.dark ? 'slip__title !text-text mt-1' : 'slip__title mt-1'}>
                {props.title}
              </h2>
            </div>
            <button
              type="button"
              className={props.dark ? 'btn btn--quiet' : 'btn btn--ink-quiet'}
              onClick={props.onClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </header>
          {props.children}
          {props.footer && <div className="sticky bottom-0 -mx-4 -mb-4 bg-[inherit] px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">{props.footer}</div>}
        </div>
      )}
    </dialog>
  )
}

export function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
      <path d="M0 0h1v1H0zM1 1h1v1H1zM2 2h3v3H2zM5 1h1v1H5zM6 0h1v1H6zM1 5h1v1H1zM0 6h1v1H0zM5 5h1v1H5zM6 6h1v1H6z" />
    </svg>
  )
}
