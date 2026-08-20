// ==============================================================================
// Aura Glassmorphism Audio & Haptic Feedback System
// Uses Web Audio API for lightweight, zero-dependency, crystalline UI sound effects.
// ==============================================================================

class SoundHapticService {
  private audioCtx: AudioContext | null = null;
  private isSoundEnabled: boolean = true;
  private isHapticsEnabled: boolean = true;

  constructor() {
    this.isSoundEnabled = true;
    this.isHapticsEnabled = true;
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
  }

  public getSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.isHapticsEnabled = enabled;
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
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.audioCtx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch (e) {}

    this.triggerHaptic([10]);
  }

  // 2. Pop / Like Heart Burst
  public playLike() {
    if (!this.isSoundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(450, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(950, this.audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.09, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.08);
    } catch (e) {}

    this.triggerHaptic([15, 30, 20]);
  }

  // 3. Crisp Navigation Tab Switch
  public playNav() {
    if (!this.isSoundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(550, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, this.audioCtx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.03);
    } catch (e) {}

    this.triggerHaptic([8]);
  }

  // 4. Send Message / Publish Post Whoosh
  public playSend() {
    if (!this.isSoundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(320, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.12);
    } catch (e) {}

    this.triggerHaptic([20]);
  }

  // 5. Receive Message Chime
  public playReceive() {
    if (!this.isSoundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(750, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1050, this.audioCtx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.07, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.1);
    } catch (e) {}

    this.triggerHaptic([15, 10, 15]);
  }

  // 6. Native Vibration Trigger (Mobile Devices)
  private triggerHaptic(pattern: number[]) {
    if (!this.isHapticsEnabled) return;
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  }
}

export const audioHaptics = new SoundHapticService();
