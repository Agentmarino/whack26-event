// 116: a soft 8-bit blip per letter while a line types. Off by default (Settings, "Letter sound"),
// never while read aloud is on. WebAudio, made on demand: iOS only lets a page make sound after a tap,
// so the Settings toggle primes it.
let ctx: AudioContext | null = null
let last = 0

function audio(): AudioContext | null {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC()
  } catch {
    ctx = null
  }
  return ctx
}

/** Call inside a tap (the Settings toggle) so later blips may play. */
export function primeBlip() {
  const a = audio()
  if (a && a.state === 'suspended') void a.resume()
}

/** One short square-wave tick for a printed letter. Spaces and punctuation stay quiet; at most one every 45 ms. */
export function blip(ch: string) {
  if (!/[a-z0-9£%]/i.test(ch)) return
  const a = audio()
  if (!a || a.state !== 'running') return
  const now = a.currentTime
  if (now - last < 0.045) return
  last = now
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = 'square'
  osc.frequency.value = 620 + ((ch.charCodeAt(0) * 37) % 5) * 40
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
  osc.connect(gain).connect(a.destination)
  osc.start(now)
  osc.stop(now + 0.06)
}
