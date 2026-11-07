// The input area, pinned at the bottom and always on screen. What it shows follows the conversation:
// Next while the agent is talking, then the inputs his last message `expects`.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Expects, FileKind } from 'shared'
import { ChipIcon } from './chipIcons'
import { MicButton } from './Mic'

export type DockMode =
  | { kind: 'busy'; label: string }
  | { kind: 'error'; canGoOffline: boolean; sessionGone: boolean }
  | { kind: 'next'; typing: boolean; more: number }
  | { kind: 'continue' }
  | { kind: 'input'; expects: Expects }
  | { kind: 'idle' }

const ACCEPT: Record<FileKind, string> = {
  credit_report: '.pdf,.json,image/*',
  bank: '.csv,.pdf,image/*',
  letter: '.pdf,.txt,image/*',
}

// Last input modality: set on any key, cleared on any pointer. Decides whether the dock may move focus.
let usingKeyboard = false
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', () => (usingKeyboard = true), true)
  window.addEventListener('pointerdown', () => (usingKeyboard = false), true)
}

export function Dock(props: {
  mode: DockMode
  onNext: () => void
  onShowAll: () => void
  onContinue: () => void
  onChip: (value: string, how: 'choice' | 'text') => void
  onText: (value: string) => void
  onFile: (file: File, kind: FileKind) => void
  onSample: (kind: FileKind) => void
  onSkip: () => void
  onRetry: () => void
  onRestart: () => void
  onOffline: () => void
  /** Coach mode: opens the what-if sliders, shown first in the quick replies. */
  onSliders?: () => void
  /** 115: big friendly chips with an icon each: one per row ('list', the opening) or a grid ('grid', goals). */
  big?: 'list' | 'grid'
}) {
  const { mode, big } = props
  const chipClass = big ? 'chip chip--big' : 'chip'
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [pin, setPin] = useState<{ top: number; h: number } | null>(null)

  // Keyboard users: when the dock's contents change under the focus, or focus was lost (a sheet closed
  // and the button that opened it is gone), move focus to the dock's first control. Only after a key
  // press, so touch users never get a surprise focus (or keyboard).
  const modeKey = mode.kind === 'input' ? `input:${(mode.expects.chips ?? []).join('|')}:${mode.expects.kind}` : mode.kind
  const hadFocus = useRef(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !usingKeyboard) return
    const active = document.activeElement
    const lost = !active || active === document.body
    if ((hadFocus.current || lost) && !el.contains(active) && !document.querySelector('dialog[open]')) {
      el.querySelector<HTMLElement>('button:not([disabled]), input:not([type=file]):not([tabindex="-1"])')?.focus()
    }
  }, [modeKey])
  // Phone: while the text box has focus, pin the dock just above the on-screen keyboard.
  const pinned = pin !== null
  useEffect(() => {
    const vv = window.visualViewport
    if (!pinned || !vv) return
    const on = () => setPin((p) => p && { ...p, top: vv.offsetTop + vv.height - p.h })
    on()
    vv.addEventListener('resize', on)
    vv.addEventListener('scroll', on)
    return () => {
      vv.removeEventListener('resize', on)
      vv.removeEventListener('scroll', on)
    }
  }, [pinned])

  const fileKind: FileKind = mode.kind === 'input' ? (mode.expects.fileKinds?.[0] ?? 'credit_report') : 'credit_report'

  return (
    <div style={pin ? { minHeight: pin.h } : undefined} className="flex-none">
      <div
        ref={ref}
        className="border-t-[0.25rem] border-panel-deep bg-page px-3 pt-2.5 pb-2"
        style={pin ? { position: 'fixed', left: 0, right: 0, top: pin.top, zIndex: 20 } : undefined}
        data-testid="dock"
        data-mode={mode.kind}
        role="group"
        aria-label="Your reply"
      >
        {mode.kind === 'busy' && (
          <p className="flex min-h-11 items-center font-pixel text-[0.625rem] leading-relaxed text-muted" aria-hidden="true">
            {mode.label}…
          </p>
        )}

        {mode.kind === 'error' && (
          <div className="flex flex-wrap gap-2">
            {mode.sessionGone ? (
              <button type="button" className="btn btn--primary flex-1" onClick={props.onRestart} data-action="restart-chat">
                Start again
              </button>
            ) : (
              <button type="button" className="btn btn--primary flex-1" onClick={props.onRetry} data-action="retry">
                Try again
              </button>
            )}
            {mode.canGoOffline && (
              <button type="button" className="btn btn--quiet" onClick={props.onOffline} data-action="offline">
                Use the offline demo
              </button>
            )}
          </div>
        )}

        {mode.kind === 'next' && (
          <div className="flex gap-2">
            <button type="button" className="btn btn--primary min-w-0 flex-[2]" onClick={props.onNext} data-action="next">
              <span>{mode.typing ? 'Show all of it' : mode.more > 0 ? `Next (${mode.more} more)` : 'Next'}</span>
              <span className="next-arrow flex-none -rotate-90" aria-hidden="true" />
            </button>
            {mode.more > 1 && (
              <button type="button" className="btn btn--quiet min-w-0 flex-1" onClick={props.onShowAll} data-action="show-all">
                Skip to end
              </button>
            )}
          </div>
        )}

        {mode.kind === 'continue' && (
          <button type="button" className="btn btn--primary w-full" onClick={props.onContinue} data-action="continue">
            Continue <span className="next-arrow -rotate-90" aria-hidden="true" />
          </button>
        )}

        {mode.kind === 'input' && mode.expects.kind === 'choice' && (
          <div
            className={big === 'list' ? 'chips--list' : big === 'grid' ? 'chips--grid' : 'flex flex-wrap gap-2'}
            role="group"
            aria-label="Choose an answer"
            data-chips={big ?? 'normal'}
          >
            {(mode.expects.chips ?? []).map((c) => (
              <button key={c} type="button" className={chipClass} onClick={() => props.onChip(c, 'choice')} data-chip={c}>
                {big && <ChipIcon chip={c} />}
                {big ? <span>{c}</span> : c}
              </button>
            ))}
            {mode.expects.optional && (
              <button type="button" className="btn btn--quiet" onClick={props.onSkip} data-action="skip">
                Skip
              </button>
            )}
          </div>
        )}

        {mode.kind === 'input' && mode.expects.kind === 'text' && (
          <div className="flex flex-col gap-2">
            {((mode.expects.chips && mode.expects.chips.length > 0) || props.onSliders) && (
              <div
                className={big ? 'chips--grid' : 'hscroll -mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5'}
                role="group"
                aria-label="Quick replies"
                data-chips={big ?? 'normal'}
              >
                {props.onSliders && (
                  <button type="button" className="btn flex-none" onClick={props.onSliders} data-action="whatif-sheet">
                    <svg width="14" height="14" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
                      <path d="M0 1h9v1H0zM1 0h3v3H1zM0 4h9v1H0zM5 3h3v3H5zM0 7h9v1H0zM2 6h3v3H2z" />
                    </svg>
                    Sliders
                  </button>
                )}
                {(mode.expects.chips ?? []).map((c) => (
                  <button key={c} type="button" className={chipClass} onClick={() => props.onChip(c, 'choice')} data-chip={c}>
                    {big && <ChipIcon chip={c} />}
                    {big ? <span>{c}</span> : c}
                  </button>
                ))}
              </div>
            )}
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const v = draft.trim()
                if (!v) return
                props.onText(v)
                setDraft('')
              }}
            >
              <label className="sr-only" htmlFor="reply-box">
                Your reply
              </label>
              <input
                id="reply-box"
                className="field min-w-0 flex-1 basis-0"
                value={draft}
                placeholder={mode.expects.placeholder ?? 'Type your answer'}
                autoComplete="off"
                enterKeyHint="send"
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => {
                  const vv = window.visualViewport
                  if (vv && window.matchMedia('(pointer: coarse)').matches) {
                    const h = ref.current?.offsetHeight ?? 0
                    setPin({ top: vv.offsetTop + vv.height - h, h })
                  }
                }}
                onBlur={() => setPin(null)}
              />
              {mode.expects.allowVoice !== false && <MicButton onText={(t) => setDraft((d) => (d ? `${d} ${t}` : t))} />}
              <button
                type="submit"
                className="btn btn--primary"
                onPointerDown={(e) => pinned && e.preventDefault()}
                data-action="send"
              >
                Send
              </button>
            </form>
            {mode.expects.optional && (
              <button type="button" className="btn btn--quiet self-start" onClick={props.onSkip} data-action="skip">
                Skip
              </button>
            )}
          </div>
        )}

        {mode.kind === 'input' && mode.expects.kind === 'file' && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn--primary flex-1" onClick={() => fileRef.current?.click()} data-action="upload">
              Upload
            </button>
            <button type="button" className="btn flex-1" onClick={() => props.onSample(fileKind)} data-action="sample">
              Use a sample
            </button>
            {mode.expects.optional && (
              <button type="button" className="btn btn--quiet" onClick={props.onSkip} data-action="skip">
                Skip
              </button>
            )}
            {/* Visually hidden, not display:none, so iOS Safari opens the picker from the tap. */}
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT[fileKind]}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              data-testid="dock-file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) props.onFile(f, fileKind)
                e.target.value = ''
              }}
            />
          </div>
        )}

        {mode.kind === 'input' && mode.expects.kind === 'none' && (
          <button type="button" className="btn btn--primary w-full" onClick={props.onContinue} data-action="continue">
            Continue
          </button>
        )}
      </div>
    </div>
  )
}
