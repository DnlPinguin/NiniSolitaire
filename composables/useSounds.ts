export type SoundName =
  | 'deal' | 'draw' | 'recycle' | 'place' | 'flip'
  | 'foundation' | 'invalid' | 'undo' | 'hint' | 'nohint' | 'win'
  | 'punch' | 'bark' | 'swipe'

const MUTE_KEY = 'nini-sound-muted'

/**
 * Alle Klänge werden per Web Audio erzeugt - keine Audiodateien, offline nutzbar.
 *
 * Karten bestehen aus gefiltertem Rauschen (das Papier) plus einem kurzen
 * tiefen Anteil (der Aufschlag). Schläge sind ein schnell fallender Sinus mit
 * Rauschanteil. Das Bellen baut auf einem Sägezahn mit steilem Tonhöhenabfall
 * durch ein enges Bandpassfilter - das ahmt den Rachenraum nach.
 */
export function useSounds() {
  const muted = useState('sound-muted', () => false)
  let ctx: AudioContext | null = null
  let bus: GainNode | null = null

  onMounted(() => {
    try { muted.value = localStorage.getItem(MUTE_KEY) === '1' } catch { /* egal */ }
  })

  function context(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()

      const master = ctx.createGain()
      master.gain.value = 0.8

      // nimmt die Schärfe raus, ohne alles dumpf zu machen
      const warm = ctx.createBiquadFilter()
      warm.type = 'lowpass'
      warm.frequency.value = 5200
      warm.Q.value = 0.3

      const delay = ctx.createDelay()
      delay.delayTime.value = 0.11
      const feedback = ctx.createGain()
      feedback.gain.value = 0.14
      const wet = ctx.createGain()
      wet.gain.value = 0.08

      master.connect(warm).connect(ctx.destination)
      warm.connect(delay)
      delay.connect(feedback).connect(delay)
      delay.connect(wet).connect(ctx.destination)

      bus = master
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  function toggleMute() {
    muted.value = !muted.value
    try { localStorage.setItem(MUTE_KEY, muted.value ? '1' : '0') } catch { /* egal */ }
    if (!muted.value) play('flip')
  }

  /** Rauschen durch ein Filter - der Papieranteil der Karten. */
  function noise(o: {
    start?: number; dur?: number; gain?: number
    type?: BiquadFilterType; freq?: number; freqTo?: number; q?: number
    attack?: number
  }) {
    const ac = context()
    if (!ac || !bus) return
    const { start = 0, dur = 0.1, gain = 0.08, type = 'bandpass',
            freq = 2000, freqTo, q = 1, attack = 0.004 } = o
    const t = ac.currentTime + start

    const frames = Math.max(1, Math.floor(ac.sampleRate * dur))
    const buffer = ac.createBuffer(1, frames, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1

    const src = ac.createBufferSource()
    src.buffer = buffer

    const filter = ac.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(freq, t)
    if (freqTo) filter.frequency.exponentialRampToValueAtTime(freqTo, t + dur)
    filter.Q.value = q

    const vol = ac.createGain()
    vol.gain.setValueAtTime(0.0001, t)
    vol.gain.linearRampToValueAtTime(gain, t + attack)
    vol.gain.exponentialRampToValueAtTime(0.0001, t + dur)

    src.connect(filter).connect(vol).connect(bus)
    src.start(t)
  }

  /** Ton mit Tonhöhenverlauf - Aufschlag, Glocke oder Bellen. */
  function tone(o: {
    freq: number; to?: number; start?: number; dur?: number; gain?: number
    type?: OscillatorType; attack?: number
    filter?: { type: BiquadFilterType; freq: number; q?: number }
    detune?: number
  }) {
    const ac = context()
    if (!ac || !bus) return
    const { freq, to, start = 0, dur = 0.2, gain = 0.1,
            type = 'sine', attack = 0.006, filter, detune = 0 } = o
    const t = ac.currentTime + start

    const osc = ac.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur)
    osc.detune.value = detune

    const vol = ac.createGain()
    vol.gain.setValueAtTime(0.0001, t)
    vol.gain.linearRampToValueAtTime(gain, t + attack)
    vol.gain.exponentialRampToValueAtTime(0.0001, t + dur)

    let node: AudioNode = osc
    if (filter) {
      const f = ac.createBiquadFilter()
      f.type = filter.type
      f.frequency.value = filter.freq
      f.Q.value = filter.q ?? 1
      osc.connect(f)
      node = f
    }
    node.connect(vol).connect(bus)
    osc.start(t)
    osc.stop(t + dur + 0.03)
  }

  /* ---------------- Bausteine ---------------- */

  /** Eine Karte wird geschnippt - kurz, papieren, mit Anschlag. */
  function kartenSchnipp(start = 0, gain = 1) {
    noise({ start, dur: 0.07, gain: 0.075 * gain, freq: 2400, q: 1.1 })
    noise({ start, dur: 0.03, gain: 0.03 * gain, type: 'highpass', freq: 4200 })
  }

  /** Eine Karte landet auf einem Stapel. */
  function kartenAufschlag(start = 0, gain = 1) {
    noise({ start, dur: 0.085, gain: 0.07 * gain, type: 'lowpass', freq: 1500 })
    tone({ freq: 135, to: 72, start, dur: 0.085, gain: 0.075 * gain, type: 'sine' })
  }

  /** Ein Bellen: Sägezahn mit steilem Abfall durch einen engen Bandpass. */
  function wuff(start: number, hoehe = 1, gain = 1) {
    tone({
      freq: 420 * hoehe, to: 165 * hoehe, start, dur: 0.11,
      gain: 0.13 * gain, type: 'sawtooth', attack: 0.005,
      filter: { type: 'bandpass', freq: 1150 * hoehe, q: 3.4 }
    })
    tone({
      freq: 210 * hoehe, to: 95 * hoehe, start, dur: 0.13,
      gain: 0.06 * gain, type: 'square', attack: 0.004,
      filter: { type: 'lowpass', freq: 1700 }
    })
    noise({ start, dur: 0.06, gain: 0.045 * gain, freq: 1900, q: 0.9 })
  }

  function play(name: SoundName) {
    if (muted.value) return
    context()
    switch (name) {
      /* ---- Kartenspiel ---- */
      case 'deal':
        for (let i = 0; i < 6; i++) kartenSchnipp(i * 0.075, 0.9)
        break
      case 'draw':
        // Karte zieht sich vom Stapel: Filter wandert nach oben
        noise({ dur: 0.14, gain: 0.075, freq: 700, freqTo: 3000, q: 1.2 })
        kartenSchnipp(0.05, 0.7)
        break
      case 'recycle':
        for (let i = 0; i < 11; i++) kartenSchnipp(i * 0.035, 0.42)
        break
      case 'flip':
        kartenSchnipp(0, 0.85)
        break
      case 'place':
        kartenAufschlag()
        break
      case 'foundation':
        kartenAufschlag(0, 0.8)
        tone({ freq: 784, start: 0.02, dur: 0.16, gain: 0.075 })
        tone({ freq: 1175, start: 0.09, dur: 0.2, gain: 0.055 })
        break
      case 'invalid':
        noise({ dur: 0.09, gain: 0.05, type: 'lowpass', freq: 500 })
        tone({ freq: 150, to: 96, dur: 0.13, gain: 0.06, type: 'triangle' })
        break
      case 'undo':
        noise({ dur: 0.12, gain: 0.05, freq: 2600, freqTo: 900, q: 1 })
        tone({ freq: 520, to: 300, dur: 0.15, gain: 0.055, type: 'triangle' })
        break
      case 'hint':
        tone({ freq: 1046, dur: 0.12, gain: 0.06 })
        tone({ freq: 1318, start: 0.08, dur: 0.16, gain: 0.05 })
        break
      case 'nohint':
        tone({ freq: 400, to: 300, dur: 0.13, gain: 0.05, type: 'triangle' })
        break
      case 'win': {
        const melodie = [523.25, 659.25, 783.99, 1046.5, 1318.5]
        melodie.forEach((f, i) => {
          tone({ freq: f, start: i * 0.13, dur: 0.5, gain: 0.085 })
          tone({ freq: f, start: i * 0.13, dur: 0.5, gain: 0.05, detune: 6 })
        })
        tone({ freq: 1568, start: 0.72, dur: 0.8, gain: 0.06 })
        break
      }

      /* ---- Geburtstagskarte ---- */
      case 'punch': {
        // Treffer: tiefer Einschlag, Rauschanteil, kleiner Klick obendrauf
        const v = 0.9 + Math.random() * 0.25
        tone({ freq: 150 * v, to: 42, dur: 0.13, gain: 0.15, type: 'sine', attack: 0.002 })
        noise({ dur: 0.075, gain: 0.11, type: 'bandpass', freq: 420 * v, q: 0.8, attack: 0.002 })
        noise({ dur: 0.02, gain: 0.045, type: 'highpass', freq: 3200 })
        break
      }
      case 'bark':
        // freudiges Doppelbellen, leicht ansteigend, mit kurzem Nachwuff
        wuff(0, 1)
        wuff(0.17, 1.12)
        wuff(0.38, 0.9, 0.75)
        break
      case 'swipe':
        // Seite wird umgeblättert
        noise({ dur: 0.26, gain: 0.055, type: 'lowpass', freq: 3200, freqTo: 700, attack: 0.05 })
        break
    }
  }

  return { play, muted, toggleMute }
}
