import type { GameEvent } from './types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public playEvents(events: GameEvent[]): void {
    for (const ev of events) {
      this.play(ev.type);
    }
  }

  public play(type: GameEvent['type']): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12; // ±6-8% pitch variation

    switch (type) {
      case 'samosa': {
        // Crispy upbeat Indian pentatonic chime + tiny crunch pop
        this.tone(ctx, 'triangle', 587.33 * jitter, 880 * jitter, now, 0.11, 0.16);
        this.tone(ctx, 'sine', 1174.66 * jitter, 1318.5 * jitter, now + 0.03, 0.09, 0.09);
        break;
      }
      case 'jump': {
        this.tone(ctx, 'sine', 210 * jitter, 520 * jitter, now, 0.14, 0.17);
        break;
      }
      case 'double_jump': {
        // Patlu "Idea Bulb!" ding + spring
        this.tone(ctx, 'sine', 420 * jitter, 840 * jitter, now, 0.15, 0.16);
        this.tone(ctx, 'triangle', 1046.5 * jitter, 1396.9 * jitter, now + 0.04, 0.14, 0.12);
        break;
      }
      case 'land': {
        this.tone(ctx, 'triangle', 130 * jitter, 62, now, 0.07, 0.11);
        break;
      }
      case 'lane_switch': {
        this.tone(ctx, 'sine', 300 * jitter, 460 * jitter, now, 0.06, 0.08);
        break;
      }
      case 'slide': {
        this.tone(ctx, 'sawtooth', 320 * jitter, 120, now, 0.15, 0.07);
        break;
      }
      case 'switch_runner': {
        this.tone(ctx, 'triangle', 392, 523.25, now, 0.09, 0.14);
        this.tone(ctx, 'triangle', 523.25, 659.25, now + 0.06, 0.1, 0.13);
        break;
      }
      case 'power_start': {
        // Heroic Samosa Power fanfare chord
        this.tone(ctx, 'sawtooth', 220, 440, now, 0.24, 0.14);
        this.tone(ctx, 'triangle', 440, 659.25, now + 0.06, 0.28, 0.16);
        this.tone(ctx, 'triangle', 659.25, 880, now + 0.14, 0.34, 0.16);
        break;
      }
      case 'power_end': {
        this.tone(ctx, 'sine', 520, 260, now, 0.2, 0.09);
        break;
      }
      case 'smash':
      case 'john_strike': {
        // Punchy cartoon WHAM!
        this.tone(ctx, 'sawtooth', 160 * jitter, 44, now, 0.22, 0.24);
        this.tone(ctx, 'square', 420 * jitter, 760 * jitter, now + 0.03, 0.14, 0.12);
        this.noiseBurst(ctx, now, 0.14, 0.18);
        break;
      }
      case 'rickshaw_honk': {
        // Iconic Indian auto-rickshaw "peep-peep!"
        this.tone(ctx, 'sawtooth', 475, 485, now, 0.08, 0.09);
        this.tone(ctx, 'sawtooth', 595, 605, now, 0.08, 0.07);
        this.tone(ctx, 'sawtooth', 475, 485, now + 0.11, 0.1, 0.09);
        this.tone(ctx, 'sawtooth', 595, 605, now + 0.11, 0.1, 0.07);
        break;
      }
      case 'goon_telegraph': {
        this.tone(ctx, 'triangle', 260, 410, now, 0.14, 0.08);
        break;
      }
      case 'hurt': {
        // Comical bonk + downward slide
        this.tone(ctx, 'sawtooth', 260, 88, now, 0.26, 0.22);
        this.tone(ctx, 'triangle', 390, 140, now + 0.04, 0.22, 0.16);
        this.noiseBurst(ctx, now, 0.12, 0.14);
        break;
      }
      case 'victory': {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((n, idx) => {
          this.tone(ctx, 'triangle', n, n * 1.02, now + idx * 0.1, 0.25, 0.18);
        });
        break;
      }
      case 'gameover': {
        const notes = [392, 349.23, 311.13, 246.94];
        notes.forEach((n, idx) => {
          this.tone(ctx, 'sawtooth', n, n * 0.94, now + idx * 0.13, 0.24, 0.12);
        });
        break;
      }
    }
  }

  private tone(
    ctx: AudioContext,
    wave: OscillatorType,
    startFreq: number,
    endFreq: number,
    startTime: number,
    duration: number,
    gainPeak: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFreq),
      startTime + duration,
    );

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private noiseBurst(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    gainPeak: number,
  ): void {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }
}
