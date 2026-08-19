// ==============================================================================
// Aura Glassmorphism Audio & Haptic Feedback System
// Uses Web Audio API for lightweight, zero-dependency, crystalline UI sound effects.
// ==============================================================================

class SoundHapticService {
  private audioCtx: AudioContext | null = null;
  private isSoundEnabled: boolean = true;
  private isHapticsEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.isSoundEnabled = localStorage.getItem("aura_ui_sounds") !== "false";
      this.isHapticsEnabled = localStorage.getItem("aura_ui_haptics") !== "false";
    }
  }

  private initAudio() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.isSoundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("aura_ui_sounds", enabled ? "true" : "false");
    }
  }

  public getSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.isHapticsEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("aura_ui_haptics", enabled ? "true" : "false");
    }
  }

  public getHapticsEnabled(): boolean {
    return this.isHapticsEnabled;
  }

  // 1. Soft Glass Tap (Button / Card / Tab Click)
  public playTap() {
    if (!this.isSoundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.06);
    } catch (e) {
      // Ignore audio restriction errors
    }
    this.triggerHaptic(8);
  }

  // 2. Crystalline Like Confirmation (Double tap / Heart)
  public playLike() {
    if (!this.isSoundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      // Chime Note 1
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Chime Note 2 (Sparkle harmonic)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.05); // A5
      gain2.gain.setValueAtTime(0.14, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.25);
    } catch (e) {
      // Ignore
    }
    this.triggerHaptic([12, 40, 15]);
  }

  // 3. Navigation Click
  public playNav() {
    if (!this.isSoundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(520, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(650, this.audioCtx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);
    } catch (e) {
      // Ignore
    }
    this.triggerHaptic(10);
  }

  // 4. Send Message / Publish Post confirmation
  public playSend() {
    if (!this.isSoundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.12); // Swoosh up

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      // Ignore
    }
    this.triggerHaptic([15, 20, 25]);
  }

  // Haptic feedback trigger
  public triggerHaptic(pattern: number | number[]) {
    if (!this.isHapticsEnabled) return;
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(pattern);
      } catch (e) {
        // Ignore on unsupported browsers
      }
    }
  }
}

export const audioHaptics = new SoundHapticService();
