export type SoundName =
  | 'deal' | 'draw' | 'recycle' | 'place' | 'flip'
  | 'foundation' | 'invalid' | 'undo' | 'hint' | 'nohint' | 'win'

const MUTE_KEY = 'nini-sound-muted'

/**
 * Gentle, music-box style sounds synthesised with the Web Audio API — no audio
 * files, works offline. Everything runs through a soft low-pass and a little
 * reverb tail, and the melodic sounds stay on one pentatonic scale so no two
 * sounds can ever clash.
 */

// F major pentatonic — warm and consonant in every combination.
const F4 = 349.23, G4 = 392.00, A4 = 440.00, C5 = 523.25, D5 = 587.33
const F5 = 698.46, G5 = 783.99, A5 = 880.00, C6 = 1046.50

export function useSounds() {
  const muted = useState('sound-muted', () => false)
  let ctx: AudioContext | null = null
  let bus: GainNode | null = null

  onMounted(() => {
    try {
      muted.value = localStorage.getItem(MUTE_KEY) === '1'
    } catch { /* storage blocked — default to sound on */ }
  })

  function context(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()

      // Master chain: everything is softened and given a small room tail.
      const master = ctx.createGain()
      master.gain.value = 0.75

      const warm = ctx.createBiquadFilter()
      warm.type = 'lowpass'
      warm.frequency.value = 2600
      warm.Q.value = 0.4

      const delay = ctx.createDelay()
      delay.delayTime.value = 0.13
      const feedback = ctx.createGain()
      feedback.gain.value = 0.22
      const wet = ctx.createGain()
      wet.gain.value = 0.16

      master.connect(warm).connect(ctx.destination)
      warm.connect(delay)
      delay.connect(feedback).connect(delay)
      delay.connect(wet).connect(ctx.destination)

      bus = master
    }
    // Browsers start the context suspended until a user gesture.
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  function toggleMute() {
    muted.value = !muted.value
    try { localStorage.setItem(MUTE_KEY, muted.value ? '1' : '0') } catch { /* ignore */ }
    if (!muted.value) play('hint')
  }

  /**
   * A soft bell note: two slightly detuned sines with a slow attack and a long
   * tail, so it fades rather than clicks.
   */
  function bell(freq: number, start = 0, gain = 0.11, duration = 1.1) {
    const ac = context()
    if (!ac || !bus) return
    const t = ac.currentTime + start

    const vol = ac.createGain()
    vol.gain.setValueAtTime(0, t)
    vol.gain.linearRampToValueAtTime(gain, t + 0.05)          // gentle attack
    vol.gain.exponentialRampToValueAtTime(0.0001, t + duration) // long soft tail
    vol.connect(bus)

    for (const detune of [-4, 4]) {
      const osc = ac.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = detune
      osc.connect(vol)
      osc.start(t)
      osc.stop(t + duration + 0.05)
    }
  }

  /** A quiet, low-passed breath of noise — the soft paper of a card, not a hiss. */
  function paper(start = 0, gain = 0.05, duration = 0.16, cutoff = 900) {
    const ac = context()
    if (!ac || !bus) return
    const t = ac.currentTime + start
    const frames = Math.floor(ac.sampleRate * duration)
    const buffer = ac.createBuffer(1, frames, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) {
      const fade = Math.sin((i / frames) * Math.PI) // fade in AND out: no click
      data[i] = (Math.random() * 2 - 1) * fade
    }
    const src = ac.createBufferSource()
    src.buffer = buffer

    const soften = ac.createBiquadFilter()
    soften.type = 'lowpass'
    soften.frequency.value = cutoff
    soften.Q.value = 0.3

    const vol = ac.createGain()
    vol.gain.value = gain

    src.connect(soften).connect(vol).connect(bus)
    src.start(t)
  }

  function play(name: SoundName) {
    if (muted.value) return
    context()
    switch (name) {
      case 'deal':
        for (let i = 0; i < 5; i++) paper(i * 0.09, 0.035, 0.18, 780)
        bell(F4, 0.1, 0.05, 1.2)
        break
      case 'draw':
        paper(0, 0.04, 0.15, 850)
        bell(A4, 0, 0.045, 0.5)
        break
      case 'recycle':
        paper(0, 0.035, 0.42, 700)
        bell(F4, 0.04, 0.05, 0.9)
        bell(C5, 0.16, 0.045, 0.9)
        break
      case 'flip':
        paper(0, 0.03, 0.12, 950)
        break
      case 'place':
        paper(0, 0.045, 0.16, 700)
        bell(G4, 0, 0.05, 0.5)
        break
      case 'foundation': // a warm rising third
        bell(C5, 0, 0.1, 1.0)
        bell(G5, 0.09, 0.085, 1.2)
        break
      case 'invalid': // a soft "hmm", never a buzz
        bell(F4, 0, 0.06, 0.42)
        bell(D5 / 2, 0.1, 0.05, 0.5)
        break
      case 'undo':
        bell(D5, 0, 0.06, 0.6)
        bell(A4, 0.09, 0.055, 0.7)
        break
      case 'hint': // little sparkle upward
        bell(C6, 0, 0.07, 0.8)
        bell(F5, 0.08, 0.06, 0.9)
        break
      case 'nohint':
        bell(A4, 0, 0.055, 0.7)
        break
      case 'win': { // a soft music-box flourish
        const melody = [F4, A4, C5, F5, A5, C6]
        melody.forEach((f, i) => bell(f, i * 0.16, 0.1, 1.6))
        bell(F5, 1.05, 0.07, 2.4)
        bell(C6, 1.12, 0.055, 2.6)
        break
      }
    }
  }

  return { play, muted, toggleMute }
}
