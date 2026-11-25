// Synthesizes a clean incoming ringtone and outgoing ringback tone using Web Audio API
// so no external audio files are needed and cleanup is deterministic.

class CallSoundManager {
  private audioCtx: AudioContext | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new Ctx()
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {})
    }
    return this.audioCtx
  }

  private playTone(freqA: number, freqB: number, durationMs: number, volume = 0.08): void {
    const ctx = this.ensureContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000)
      gain.connect(ctx.destination)

      const osc1 = ctx.createOscillator()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(freqA, now)
      osc1.connect(gain)

      const osc2 = ctx.createOscillator()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(freqB, now)
      osc2.connect(gain)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + durationMs / 1000)
      osc2.stop(now + durationMs / 1000)
    } catch {
      // Ignore autoplay blocks before user gesture
    }
  }

  public startIncomingRingtone(): void {
    this.stop()
    const pulse = () => {
      this.playTone(523.25, 659.25, 380, 0.1)
      setTimeout(() => {
        if (this.intervalId) {
          this.playTone(587.33, 783.99, 420, 0.1)
        }
      }, 420)
    }
    pulse()
    this.intervalId = setInterval(pulse, 2200)
  }

  public startOutgoingRingback(): void {
    this.stop()
    const pulse = () => {
      this.playTone(440, 480, 750, 0.05)
    }
    pulse()
    this.intervalId = setInterval(pulse, 3000)
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close().catch(() => {})
      this.audioCtx = null
    }
  }
}

export const callSoundManager = new CallSoundManager()

