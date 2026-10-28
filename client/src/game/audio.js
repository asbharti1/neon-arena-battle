let context;
export function playTone(kind = 'shot') {
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const profiles = {
      shot: [520, 210, 0.08],
      hit: [160, 70, 0.16],
      eliminate: [300, 60, 0.42],
      start: [380, 740, 0.4],
      win: [460, 920, 0.65],
      dodge: [620, 240, 0.14]
    };
    const [from, to, duration] = profiles[kind] || profiles.shot;
    osc.type = kind === 'hit' || kind === 'eliminate' ? 'sawtooth' : kind === 'dodge' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    /* Audio enhancement should never block execution */
  }
}
