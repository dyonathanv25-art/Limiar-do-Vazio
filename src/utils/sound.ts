class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainVal = 0.08
  ) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playAttack() {
    this.playTone(260, 95, 0.14, 'triangle', 0.09);
  }

  playCast() {
    this.playTone(440, 720, 0.22, 'sine', 0.07);
  }

  playHeal() {
    this.playTone(523, 784, 0.28, 'sine', 0.07);
  }

  playParry() {
    this.playTone(880, 1320, 0.18, 'triangle', 0.1);
  }

  playBossWarn() {
    this.playTone(130, 72, 0.32, 'sawtooth', 0.06);
  }

  playParadox() {
    this.playTone(160, 52, 0.55, 'sawtooth', 0.1);
    setTimeout(() => this.playTone(620, 290, 0.45, 'sine', 0.07), 70);
  }

  playSecretUnlock() {
    this.playTone(440, 660, 0.22, 'triangle', 0.08);
    setTimeout(() => this.playTone(660, 880, 0.35, 'sine', 0.09), 140);
  }

  playVictory() {
    this.playTone(392, 523, 0.25, 'triangle', 0.08);
    setTimeout(() => this.playTone(523, 784, 0.4, 'triangle', 0.08), 160);
  }
}

export const soundEngine = new SoundEngine();
