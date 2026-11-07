"use client";

// Tiny synthesized UI sounds (Web Audio, no audio files). Respect the user's "sounds" preference,
// which is mirrored to localStorage so it works before the profile loads.

type Sound = "tap" | "pop" | "send" | "success" | "match" | "error";

let ctx: AudioContext | null = null;

export function soundsEnabled(): boolean {
  try {
    return localStorage.getItem("cx-sounds") !== "off";
  } catch {
    return true;
  }
}

export function setSoundsEnabled(on: boolean) {
  try {
    localStorage.setItem("cx-sounds", on ? "on" : "off");
  } catch {
    /* storage unavailable */
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.06, glideTo?: number) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime + start);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.02);
}

export function play(sound: Sound) {
  if (typeof window === "undefined" || !soundsEnabled()) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    switch (sound) {
      case "tap":
        tone(880, 0, 0.05, "triangle", 0.03);
        break;
      case "pop":
        tone(520, 0, 0.09, "sine", 0.05, 980);
        break;
      case "send":
        tone(440, 0, 0.12, "sine", 0.05, 880);
        tone(1320, 0.08, 0.1, "triangle", 0.025);
        break;
      case "success":
        tone(523, 0, 0.12, "sine", 0.05);
        tone(659, 0.09, 0.12, "sine", 0.05);
        tone(784, 0.18, 0.2, "sine", 0.05);
        break;
      case "match":
        tone(392, 0, 0.14, "triangle", 0.04);
        tone(587, 0.1, 0.14, "triangle", 0.04);
        tone(880, 0.2, 0.28, "sine", 0.05, 1175);
        break;
      case "error":
        tone(220, 0, 0.16, "sawtooth", 0.025, 160);
        break;
    }
  } catch {
    /* audio unavailable */
  }
}
