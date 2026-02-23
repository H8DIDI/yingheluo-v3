/**
 * Deep Bass Audio Engine
 * Synthesizes realistic explosion sounds with sub-bass, noise, and crack effects
 */

export class DeepAudioEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;
  private volume: number = 0.6;
  private limiter: DynamicsCompressorNode | null = null;

  init(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -10;
      this.limiter.knee.value = 40;
      this.limiter.ratio.value = 12;
      this.limiter.connect(this.ctx.destination);
      this.enabled = true;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Play a deep, cinematic explosion sound with:
   * - Sub-bass kick (50Hz -> 20Hz over 2.5s)
   * - Low-frequency noise (150Hz -> 30Hz over 4s)
   * - Sharp crack (200Hz -> 50Hz over 0.1s)
   */
  playDeepExplosion(): void {
    if (!this.enabled || !this.ctx || !this.limiter) return;

    const t = this.ctx.currentTime;

    // --- 1. SUB-BASS KICK ---
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 2.5);

    oscGain.gain.setValueAtTime(this.volume * 1.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 5.0);

    osc.connect(oscGain);
    oscGain.connect(this.limiter);
    osc.start(t);
    osc.stop(t + 5.0);

    // --- 2. LOW-FREQUENCY NOISE (RUMBLE) ---
    const bufferSize = this.ctx.sampleRate * 5.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(150, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(30, t + 4.0);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(this.volume * 1.0, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 4.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.limiter);
    noise.start(t);

    // --- 3. SHARP CRACK ---
    const crack = this.ctx.createOscillator();
    crack.type = 'triangle';
    const crackGain = this.ctx.createGain();
    crack.frequency.setValueAtTime(200, t);
    crack.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    crackGain.gain.setValueAtTime(this.volume * 0.3, t);
    crackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    crack.connect(crackGain);
    crackGain.connect(this.limiter);
    crack.start(t);
    crack.stop(t + 0.1);
  }

  /**
   * Play a lighter split/crackle sound for secondary explosions
   */
  playSplitSound(): void {
    if (!this.enabled || !this.ctx || !this.limiter) return;

    const t = this.ctx.currentTime;
    const duration = 0.2;

    const frameCount = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, frameCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      const time = i / frameCount;
      const envelope = Math.exp(-6 * time);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + duration);

    gainNode.gain.setValueAtTime(this.volume * 0.18, t);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.limiter);

    source.start(t);
    source.stop(t + duration);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const deepAudioEngine = new DeepAudioEngine();
