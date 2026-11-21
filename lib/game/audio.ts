const TRACKS = [
  { root: 55, bpm: 140, bass: [0, 0, 3, -2], bell: [0, 3, 7, 10, 12, 7] },
  { root: 49, bpm: 145, bass: [0, 5, 3, -2], bell: [0, 3, 5, 7, 10, 7] },
  { root: 58.27, bpm: 136, bass: [0, -4, -2, 3], bell: [0, 7, 3, 10, 5, 12] },
  { root: 41.2, bpm: 150, bass: [0, 3, 5, 1], bell: [0, 3, 7, 12, 10, 6] },
]

export class GameAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfx: GainNode | null = null
  private music: GainNode | null = null
  private noise: AudioBuffer | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private step = 0
  private nextTime = 0
  private track = TRACKS[0]
  muted = false

  init() {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.7
    this.master.connect(ctx.destination)
    this.sfx = ctx.createGain()
    this.sfx.gain.value = 0.9
    this.sfx.connect(this.master)
    this.music = ctx.createGain()
    this.music.gain.value = 0.3
    this.music.connect(this.master)
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.noise = buf
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.02)
    }
  }

  private tone(t: number, freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, dest?: AudioNode | null) {
    const ctx = this.ctx
    const out = dest ?? this.sfx
    if (!ctx || !out) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(out)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  private burst(t: number, dur: number, vol: number, freq: number, type: BiquadFilterType, dest?: AudioNode | null) {
    const ctx = this.ctx
    const out = dest ?? this.sfx
    if (!ctx || !out || !this.noise) return
    const s = ctx.createBufferSource()
    s.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f)
    f.connect(g)
    g.connect(out)
    s.start(t, Math.random() * 0.5)
    s.stop(t + dur + 0.02)
  }

  private get now() {
    return this.ctx?.currentTime ?? 0
  }

  whoosh() {
    this.burst(this.now, 0.1, 0.22, 2600, 'bandpass')
  }
  hit(heavy: boolean) {
    const t = this.now
    this.tone(t, heavy ? 130 : 200, heavy ? 0.2 : 0.1, 'square', 0.22, 45)
    this.burst(t, heavy ? 0.18 : 0.1, 0.6, heavy ? 900 : 1800, 'lowpass')
  }
  jump() {
    this.tone(this.now, 280, 0.14, 'square', 0.1, 620)
  }
  hurt() {
    this.tone(this.now, 240, 0.28, 'sawtooth', 0.22, 80)
  }
  pickup() {
    const t = this.now
    this.tone(t, 660, 0.09, 'square', 0.14)
    this.tone(t + 0.08, 990, 0.14, 'square', 0.14)
  }
  special() {
    const t = this.now
    this.tone(t, 180, 0.35, 'sawtooth', 0.22, 900)
    this.tone(t + 0.05, 90, 0.4, 'square', 0.15, 360)
  }
  ko() {
    this.tone(this.now, 420, 0.7, 'triangle', 0.3, 50)
  }
  boss() {
    const t = this.now
    for (let i = 0; i < 3; i++) this.tone(t + i * 0.18, 110, 0.16, 'sawtooth', 0.2, 70)
  }
  win() {
    const t = this.now
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => this.tone(t + i * 0.12, n, 0.3, 'square', 0.13))
  }

  startMusic(level: number) {
    this.init()
    const ctx = this.ctx
    if (!ctx) return
    this.stopMusic()
    this.track = TRACKS[level % TRACKS.length]
    this.step = 0
    this.nextTime = ctx.currentTime + 0.08
    this.timer = setInterval(this.tick, 25)
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private tick = () => {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const spb = 60 / this.track.bpm / 4
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, spb)
      this.nextTime += spb
      this.step = (this.step + 1) % 64
    }
  }

  private playStep(s: number, t: number, spb: number) {
    const m = this.music
    const bar = Math.floor(s / 16)
    const st = s % 16
    const kicks = bar % 2 === 0 ? [0, 6, 10] : [0, 3, 10, 13]
    const root = this.track.root * Math.pow(2, this.track.bass[bar] / 12)
    if (kicks.includes(st)) {
      this.tone(t, 150, 0.3, 'sine', 0.9, 42, m)
      this.tone(t, root, st === 0 ? 0.55 : 0.32, 'sine', 0.55, root * 0.97, m)
    }
    if (st === 8) {
      this.burst(t, 0.18, 0.55, 1700, 'bandpass', m)
      this.tone(t, 210, 0.08, 'triangle', 0.25, 160, m)
    }
    if (st % 2 === 0) this.burst(t, 0.04, 0.18, 8000, 'highpass', m)
    if (bar === 3 && st >= 12) this.burst(t + spb / 2, 0.03, 0.14, 9000, 'highpass', m)
    const bellSteps = [0, 3, 6, 10, 12, 14]
    const idx = bellSteps.indexOf(st)
    if (idx >= 0) {
      const f = this.track.root * 8 * Math.pow(2, this.track.bell[idx] / 12)
      this.tone(t, f, 0.35, 'triangle', 0.09, undefined, m)
    }
  }
}
