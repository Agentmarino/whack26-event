// Every setting behind one button (109 lesson: the speed row ate the dialogue box).
import type { ReactNode } from 'react'
import { speechAvailable } from '../chat/useSpeech'
import type { Speed } from '../npc'
import { useSettings, type ColourMode, type TextSize, type VoiceRate } from '../settings'
import { Sheet } from '../ui/Sheet'

function Choice<T extends string | number>(props: {
  legend: string
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (v: T) => void
  name: string
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="slip__tag mb-2">{props.legend}</legend>
      <div className="flex flex-wrap gap-2">
        {props.options.map((o) => (
          <label
            key={String(o.value)}
            className="flex min-h-11 cursor-pointer items-center gap-2 border-[0.1875rem] border-ink px-3 py-1.5 has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-[0.1875rem] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
          >
            <input
              type="radio"
              name={props.name}
              className="sr-only"
              checked={props.value === o.value}
              onChange={() => props.onChange(o.value)}
            />
            <span className="text-[1rem] font-bold">{o.label}</span>
            {o.hint && <span className="text-sm opacity-80">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Toggle(props: { label: string; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        data-testid={props.testId}
      />
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-7 w-12 flex-none items-center border-[0.1875rem] border-ink bg-paper-shade px-0.5 peer-checked:justify-end peer-checked:bg-ink peer-focus-visible:outline-[0.1875rem] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
      >
        <span className="block h-4 w-4 bg-ink peer-checked:bg-paper [input:checked+span>&]:bg-paper" />
      </span>
      <span className="flex flex-col">
        <span className="text-[1.0625rem] font-bold leading-snug">{props.label}</span>
        {props.hint && <span className="text-sm leading-snug text-ink-muted">{props.hint}</span>}
      </span>
    </label>
  )
}

export function SettingsSheet(props: { open: boolean; onClose: () => void; onRestart: () => void; apiMode: 'mock' | 'live' }) {
  const { settings, set } = useSettings()
  return (
    <Sheet open={props.open} onClose={props.onClose} tag="Make it work for you" title="Settings" testId="settings-sheet">
      <div className="flex flex-col gap-5">
        <Choice<Speed>
          legend="Text speed"
          name="speed"
          value={settings.speed}
          onChange={(v) => set('speed', v)}
          options={[
            { value: '1x', label: '1x' },
            { value: '2x', label: '2x' },
            { value: 'instant', label: 'Instant' },
          ]}
        />
        <Choice<TextSize>
          legend="Text size"
          name="size"
          value={settings.textSize}
          onChange={(v) => set('textSize', v)}
          options={[
            { value: 100, label: '100%' },
            { value: 125, label: '125%' },
            { value: 150, label: '150%' },
          ]}
        />
        <Choice<ColourMode>
          legend="Colours"
          name="colour"
          value={settings.colour}
          onChange={(v) => set('colour', v)}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'okabe', label: 'Red-green safe' },
            { value: 'contrast', label: 'High contrast' },
          ]}
        />
        <div className="flex flex-col gap-3">
          <Toggle
            label="Plain English"
            hint="Shorter words, and every credit term explained."
            checked={settings.plainEnglish}
            onChange={(v) => set('plainEnglish', v)}
            testId="toggle-plain"
          />
          <Toggle
            label="Read replies aloud"
            hint={speechAvailable() ? 'Uses your device’s British English voice.' : 'Not available in this browser.'}
            checked={settings.readAloud}
            onChange={(v) => set('readAloud', v)}
            testId="toggle-voice"
          />
          {settings.readAloud && (
            <Choice<VoiceRate>
              legend="Voice speed"
              name="rate"
              value={settings.voiceRate}
              onChange={(v) => set('voiceRate', v)}
              options={[
                { value: 0.85, label: 'Slower' },
                { value: 1, label: 'Normal' },
                { value: 1.2, label: 'Faster' },
              ]}
            />
          )}
          <Toggle
            label="Demo mode"
            hint="Instant text, samples picked for you, and the agent moves on by himself when nothing is needed."
            checked={settings.demo}
            onChange={(v) => set('demo', v)}
            testId="toggle-demo"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t-2 border-dashed border-paper-line pt-4">
          <button type="button" className="btn btn--ink-quiet" onClick={props.onRestart} data-action="restart">
            Start again
          </button>
          <p className="text-sm text-ink-muted">{props.apiMode === 'mock' ? 'Running on the offline demo data.' : 'Connected to the desk.'}</p>
        </div>
      </div>
    </Sheet>
  )
}
