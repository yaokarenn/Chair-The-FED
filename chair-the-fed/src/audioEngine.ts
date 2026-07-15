// Web Audio API waiting-game Lobby / Suspense music engine
// Custom synthesizers for Kick, Hat, Snare/Clap, Synth Bass (bwomp!), and Glockenspiel/Plucked synth

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMusicPlaying: boolean = false;
  private schedulerIntervalId: any = null;
  private delayNode: DelayNode | null = null;
  private masterGain: GainNode | null = null;
  private activeNotes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private volumeLevel: number = 0.0; // starts at 0.0 (off)
  
  // Sequencer State
  private nextStepTime: number = 0;
  private currentStep: number = 0;

  constructor() {
    // Lazy initialization
  }

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    
    // Create master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volumeLevel * 0.35, this.ctx.currentTime); // Dynamic volume level
    
    // Create soft delay/echo line for spaced depth
    this.delayNode = this.ctx.createDelay(2.0);
    const delayFeedback = this.ctx.createGain();
    
    this.delayNode.delayTime.setValueAtTime(0.35, this.ctx.currentTime); // 350ms delay for tempo sync
    delayFeedback.gain.setValueAtTime(0.25, this.ctx.currentTime); // low-feedback bounce

    // Connect delay loop
    this.delayNode.connect(delayFeedback);
    delayFeedback.connect(this.delayNode);
    
    // Connect nodes
    this.masterGain.connect(this.ctx.destination);
    this.delayNode.connect(this.masterGain);
  }

  // Play a single clean lowpass/gain enveloped pitch for cues
  public playNote(freq: number, type: OscillatorType = 'sine', duration: number = 0.8, volume: number = 0.05) {
    this.initContext();
    if (!this.ctx || this.ctx.state === 'suspended') return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(gainNode);

    if (this.delayNode) {
      gainNode.connect(this.delayNode);
    }
    if (this.masterGain) {
      gainNode.connect(this.masterGain);
    }

    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.1);

    const activeNoteObj = { osc, gain: gainNode };
    this.activeNotes.push(activeNoteObj);

    setTimeout(() => {
      this.activeNotes = this.activeNotes.filter(n => n !== activeNoteObj);
    }, (duration + 0.2) * 1000);
  }

  // Synthesize a punchy, waiting-room style bass drum
  private playKick(time: number, volume: number = 0.18) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    if (this.masterGain) gainNode.connect(this.masterGain);
    
    osc.frequency.setValueAtTime(95, time); // Lower starting pitch for a deeper sub-thump
    osc.frequency.exponentialRampToValueAtTime(26, time + 0.1); // Deeper sub sweep
    
    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
    
    osc.start(time);
    osc.stop(time + 0.12);
  }

  // Synthesize a retro hi-hat tick (using white noise)
  private playHat(time: number, isOph: boolean = false, volume: number = 0.04) {
    if (!this.ctx) return;
    
    const bufferSize = this.ctx.sampleRate * (isOph ? 0.1 : 0.035);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8500, time);
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + (isOph ? 0.08 : 0.03));
    
    source.connect(filter);
    filter.connect(gainNode);
    if (this.masterGain) gainNode.connect(this.masterGain);
    
    source.start(time);
    source.stop(time + (isOph ? 0.12 : 0.04));
  }

  // Synthesize a classic clap/snare
  private playSnare(time: number, volume: number = 0.08) {
    if (!this.ctx) return;
    
    // White noise decay component
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1100, time);
    noiseFilter.Q.setValueAtTime(1.8, time);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.75, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    if (this.masterGain) noiseGain.connect(this.masterGain);
    
    // Tonal body - lowered to 120Hz for a deeper, punchier thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, time);
    
    oscGain.gain.setValueAtTime(volume * 0.65, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    
    osc.connect(oscGain);
    if (this.masterGain) oscGain.connect(this.masterGain);
    
    noiseSource.start(time);
    noiseSource.stop(time + 0.11);
    
    osc.start(time);
    osc.stop(time + 0.09);
  }

  // Rubbery bouncy synthesizer bass: "bwomp!"
  private playBass(freq: number, time: number, duration: number = 0.22, volume: number = 0.12) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    
    // Bouncy lowpass cutoff sweep
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, time);
    filter.frequency.exponentialRampToValueAtTime(95, time + duration);
    
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume, time + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc.connect(filter);
    filter.connect(gainNode);
    if (this.masterGain) gainNode.connect(this.masterGain);
    
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  // Dual-harmonic Glockenspiel/Marimba synth pluck element
  private playPluck(freq: number, time: number, duration: number = 0.22, volume: number = 0.05) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    
    gainNode.gain.setValueAtTime(0.001, time);
    gainNode.gain.linearRampToValueAtTime(volume, time + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc.connect(gainNode);
    if (this.masterGain) gainNode.connect(this.masterGain);
    if (this.delayNode) gainNode.connect(this.delayNode); // chime delay sync
    
    // High overtone harmonic
    const chimeOsc = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(freq * 2.0, time);
    
    chimeGain.gain.setValueAtTime(0.001, time);
    chimeGain.gain.linearRampToValueAtTime(volume * 0.4, time + 0.004);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.4);
    
    chimeOsc.connect(chimeGain);
    if (this.masterGain) chimeGain.connect(this.masterGain);
    
    osc.start(time);
    osc.stop(time + duration + 0.02);
    
    chimeOsc.start(time);
    chimeOsc.stop(time + duration * 0.45);
  }

  // Master sequencer clock logic
  private scheduler = () => {
    if (!this.ctx || !this.isMusicPlaying) return;
    
    if (this.nextStepTime < this.ctx.currentTime) {
      this.nextStepTime = this.ctx.currentTime;
    }
    
    // Schedule ahead 150ms
    while (this.nextStepTime < this.ctx.currentTime + 0.15) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }
  };

  private advanceStep() {
    const tempo = 132; // Fast, high-stakes quiz game & suspense countdown tempo (132 BPM)
    const stepDuration = 60 / tempo / 4; // sixteenth notes duration
    this.nextStepTime += stepDuration;
    this.currentStep = (this.currentStep + 1) % 32;
  }

  private scheduleStep(step: number, time: number) {
    // 1. Kick Drum (Steady, driving four-on-the-floor pulse creates urgent forward motion)
    if (step % 4 === 0) {
      this.playKick(time, 0.15);
    }

    // 2. Snare/Clap (Sharp crisp backbeats on 4, 12, 20, 28)
    if (step === 4 || step === 12 || step === 20 || step === 28) {
      this.playSnare(time, 0.06);
    }

    // 3. Steady Ticking Clock Hi-Hats (Tense double-time ticking hits almost every offset step)
    if (step % 2 === 1) {
      const isQuarterOffbeat = (step % 4 === 2);
      this.playHat(time, isQuarterOffbeat, isQuarterOffbeat ? 0.03 : 0.015);
    }

    // 4. Intense Pumping Synth Bassline (Octave-bouncing rhythmic tension drives the adrenaline)
    const bassline: { [key: number]: number } = {
      0: 55.00,   // A1
      2: 110.00,  // A2 (Octave bounce!)
      4: 55.00,   // A1
      6: 110.00,  // A2
      8: 65.41,   // C2
      10: 130.81, // C3
      12: 82.41,  // E2
      14: 164.81, // E3
      16: 43.65,  // F1
      18: 87.31,  // F2
      20: 43.65,  // F1
      22: 87.31,  // F2
      24: 49.00,  // G1
      26: 98.00,  // G2
      28: 55.00,  // A1
      30: 110.00, // A2 (Tense leading tone feedback)
    };

    if (bassline[step] !== undefined) {
      const isOctaveUp = step % 4 === 2 || step % 4 === 3;
      this.playBass(bassline[step], time, isOctaveUp ? 0.08 : 0.16, 0.07);
    }

    // 5. Unresolved Countdown Glockenspiel Melody - Transposed down 1 octave for deeper suspense
    const melody: { [key: number]: number } = {
      0: 220.00,  // A3 (Suspense theme entrance)
      1: 246.94,  // B3
      2: 261.63,  // C4
      4: 246.94,  // B3
      6: 220.00,  // A3
      8: 261.63,  // C4
      9: 293.66,  // D4
      10: 329.63, // E4
      12: 293.66, // D4
      14: 261.63, // C4
      16: 220.00,  // A3
      17: 246.94,  // B3
      18: 261.63,  // C4
      20: 246.94,  // B3
      22: 220.00,  // A3
      24: 196.00,  // G3 (Low tension pivot)
      26: 246.94,  // B3
      28: 293.66,  // D4 (High unresolved pitch!)
      30: 329.63,  // E4
    };

    if (melody[step] !== undefined) {
      // Fast, bright, highly reverberated clockwork chime
      this.playPluck(melody[step], time, 0.14, 0.04);
    }
  }

  // Starts the continuous background soundtrack
  public startMusic() {
    this.initContext();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Initial state setup
    if (this.ctx) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }
    this.currentStep = 0;

    // Run scheduler clock every 50ms for low CPU and flawless timing precision
    this.scheduler();
    this.schedulerIntervalId = setInterval(this.scheduler, 50);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.schedulerIntervalId) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
    
    // Stop active cue oscillators safely
    this.activeNotes.forEach(n => {
      try {
        n.osc.stop();
      } catch (e) {}
    });
    this.activeNotes = [];
  }

  public setVolume(level: number) {
    this.volumeLevel = Math.max(0, Math.min(1, level));
    this.initContext();
    
    if (this.ctx) {
      if (this.volumeLevel > 0) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        if (!this.isMusicPlaying) {
          this.startMusic();
        }
      } else {
        if (this.isMusicPlaying) {
          this.stopMusic();
        }
      }
      
      if (this.masterGain) {
        // Soft volume transition to avoid audible clicks/pops
        this.masterGain.gain.setTargetAtTime(this.volumeLevel * 0.35, this.ctx.currentTime, 0.15);
      }
    }
  }

  public getVolume(): number {
    return this.volumeLevel;
  }

  public toggleMusic(): boolean {
    if (this.volumeLevel > 0) {
      this.setVolume(0);
      return false;
    } else {
      this.setVolume(0.5);
      return true;
    }
  }

  public getMusicPlayingState(): boolean {
    return this.isMusicPlaying;
  }
}

export const audioEngine = new AudioEngine();
