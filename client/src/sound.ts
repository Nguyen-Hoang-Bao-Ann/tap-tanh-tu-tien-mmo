// ============================================================
// GĐ167 — ÂM THANH: nhạc nền generative + hiệu ứng, thuần WebAudio
// (không cần file nhạc ngoài; mọi tiếng đều tổng hợp tại chỗ).
// - Nhạc: đàn gảy Karplus-Strong thang ngũ cung + đệm pad êm,
//   3 tâm trạng: 'village' (làng/thành phố/khu an toàn — sáng),
//   'wild' (map hoang dã — trầm, thưa), 'meditate' (đang thiền /
//   bế quan — rất thưa, tĩnh). Tự chuyển theo map + trạng thái.
// - Hiệu ứng: đánh/trúng đòn/bị thương/tung chiêu/cảnh báo quái
//   vận đòn/nhặt đồ/mở rương/học chiêu/đột phá/gục ngã/dịch
//   chuyển/né/mua đồ — bắt từ sự kiện socket trong main.ts.
// - Trình duyệt chặn âm thanh trước thao tác đầu tiên: unlock()
//   được gọi ở pointerdown/keydown đầu tiên (main.ts gắn).
// - Tắt/bật riêng Nhạc / Hiệu ứng trong Menu; lưu localStorage.
// Mọi con số (âm lượng, nhịp, mật độ nốt) là TẠM.
// ============================================================

export type Mood = 'village' | 'wild' | 'meditate';
export type SfxName =
  | 'swing' | 'hit' | 'crit' | 'hurt' | 'cast' | 'warn' | 'pickup'
  | 'chest' | 'coin' | 'learn' | 'breakOk' | 'breakFail' | 'death'
  | 'revive' | 'teleport' | 'dodge' | 'click' | 'kill';

const PREF_KEY = 'ttt_sound_v1';

interface TickPlayer { id: string; hp: number; maxHp?: number; x: number; y: number }
interface TickMonster { id: string; hp: number; x: number; y: number; st?: string | null }

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private pluckCache = new Map<number, AudioBuffer>();

  musicOn = true;
  sfxOn = true;
  private mood: Mood = 'village';
  private baseMood: Mood = 'village';
  private meditating = false;

  private counts: Record<string, number> = {};
  private lastPlayAt = new Map<string, number>();
  private lastActionAt = 0;
  private lastHurtAt = 0;
  private lastHitAt = 0;
  private lastWarnAt = 0;

  private prevMyHp: number | null = null;
  private prevMonHp = new Map<string, number>();
  private prevMonSt = new Map<string, string | null>();

  private schedTimer: number | null = null;
  private nextPluckAt = 0;
  private nextPadAt = 0;
  private chordIdx = 0;
  private scaleIdx = 2;

  constructor() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { m?: boolean; s?: boolean };
        if (typeof p.m === 'boolean') this.musicOn = p.m;
        if (typeof p.s === 'boolean') this.sfxOn = p.s;
      }
    } catch { /* mặc định bật */ }
  }

  private savePrefs(): void {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ m: this.musicOn, s: this.sfxOn })); } catch { /* bỏ qua */ }
  }

  // Gọi ở thao tác đầu tiên của người chơi: tạo AudioContext + bắt nhạc.
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicOn ? 0.55 : 0;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxOn ? 0.9 : 0;
      this.sfxBus.connect(this.master);
      // buffer nhiễu dùng chung (vút gió, va chạm)
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const now = this.ctx.currentTime;
      this.nextPluckAt = now + 0.6;
      this.nextPadAt = now + 0.2;
      this.schedTimer = window.setInterval(() => this.schedule(), 350);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get unlocked(): boolean { return !!this.ctx; }

  toggleMusic(): boolean {
    this.musicOn = !this.musicOn;
    this.savePrefs();
    if (this.ctx && this.musicBus) this.musicBus.gain.linearRampToValueAtTime(this.musicOn ? 0.55 : 0, this.ctx.currentTime + 0.4);
    return this.musicOn;
  }

  toggleSfx(): boolean {
    this.sfxOn = !this.sfxOn;
    this.savePrefs();
    if (this.ctx && this.sfxBus) this.sfxBus.gain.value = this.sfxOn ? 0.9 : 0;
    if (this.sfxOn) this.play('click');
    return this.sfxOn;
  }

  setMapMood(category?: string, safe?: boolean): void {
    this.baseMood = safe || !category || category === 'city' || category === 'profession' || category === 'current' ? 'village' : 'wild';
    if (!this.meditating) this.mood = this.baseMood;
  }

  setMeditating(on: boolean): void {
    this.meditating = on;
    this.mood = on ? 'meditate' : this.baseMood;
  }

  noteAction(): void { this.lastActionAt = Date.now(); }

  state(): { ctx: string; mood: Mood; musicOn: boolean; sfxOn: boolean; counts: Record<string, number> } {
    return { ctx: this.ctx ? this.ctx.state : 'none', mood: this.mood, musicOn: this.musicOn, sfxOn: this.sfxOn, counts: { ...this.counts } };
  }

  // ---------------- NHẠC NỀN GENERATIVE ----------------
  private scales: Record<Mood, number[]> = {
    village: [146.83, 220, 293.66, 329.63, 369.99, 440, 493.88, 587.33], // D ngũ cung, sáng
    wild: [110, 164.81, 220, 261.63, 293.66, 329.63, 392], // A thứ ngũ cung, trầm
    meditate: [146.83, 220, 293.66, 369.99, 440, 587.33],
  };
  private chords: Record<Mood, number[][]> = {
    village: [[146.83, 220, 293.66], [110, 164.81, 261.63], [98, 196, 293.66], [130.81, 196, 329.63]],
    wild: [[110, 220, 261.63], [87.31, 174.61, 261.63], [98, 196, 293.66], [110, 220, 329.63]],
    meditate: [[146.83, 220, 293.66], [110, 220, 329.63]],
  };
  private gaps: Record<Mood, [number, number]> = {
    village: [1.5, 3.2], wild: [2.6, 5.2], meditate: [4.5, 8.5],
  };

  private pluckBuffer(freq: number): AudioBuffer {
    const key = Math.round(freq * 10);
    const hit = this.pluckCache.get(key);
    if (hit) return hit;
    const sr = this.ctx!.sampleRate;
    const dur = 1.5;
    const buf = this.ctx!.createBuffer(1, Math.floor(sr * dur), sr);
    const d = buf.getChannelData(0);
    const p = Math.max(2, Math.round(sr / freq));
    for (let i = 0; i < p && i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (let i = p; i < d.length; i++) {
      const prev = d[i - p];
      const prev2 = i - p - 1 >= 0 ? d[i - p - 1] : prev;
      d[i] = 0.996 * 0.5 * (prev + prev2);
    }
    this.pluckCache.set(key, buf);
    return buf;
  }

  private pluck(freq: number, when: number, gain: number): void {
    if (!this.ctx || !this.musicBus) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.pluckBuffer(freq);
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g); g.connect(this.musicBus);
    src.start(when);
  }

  private pad(freqs: number[], when: number, dur: number): void {
    if (!this.ctx || !this.musicBus) return;
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.032, when + 3);
      g.gain.setValueAtTime(0.032, when + Math.max(3, dur - 4));
      g.gain.linearRampToValueAtTime(0, when + dur);
      osc.connect(g); g.connect(this.musicBus!);
      osc.start(when); osc.stop(when + dur + 0.1);
    }
  }

  private schedule(): void {
    if (!this.ctx) return;
    const ahead = this.ctx.currentTime + 0.9;
    const mood = this.mood;
    if (this.nextPadAt < ahead) {
      const chord = this.chords[mood][this.chordIdx % this.chords[mood].length];
      const padDur = mood === 'meditate' ? 22 : 15;
      this.pad(chord, Math.max(this.nextPadAt, this.ctx.currentTime), padDur);
      // nốt trầm gốc đệm theo hợp âm
      this.pluck(chord[0] / 2, Math.max(this.nextPadAt, this.ctx.currentTime) + 0.1, 0.10);
      this.nextPadAt += padDur - 3; // chồng mép cho liền mạch
      this.chordIdx++;
    }
    const [gMin, gMax] = this.gaps[mood];
    while (this.nextPluckAt < ahead) {
      const scale = this.scales[mood];
      const step = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
      this.scaleIdx = Math.max(0, Math.min(scale.length - 1, this.scaleIdx + step));
      const t = Math.max(this.nextPluckAt, this.ctx.currentTime);
      this.pluck(scale[this.scaleIdx], t, mood === 'meditate' ? 0.13 : 0.16);
      // thỉnh thoảng thêm nốt láy nhẹ ngay sau
      if (Math.random() < 0.22) {
        const j = Math.max(0, Math.min(scale.length - 1, this.scaleIdx + (Math.random() < 0.5 ? 1 : -1)));
        this.pluck(scale[j], t + 0.27, 0.08);
      }
      this.nextPluckAt += gMin + Math.random() * (gMax - gMin);
    }
  }

  // ---------------- HIỆU ỨNG ----------------
  private throttleMs: Partial<Record<SfxName, number>> = {
    swing: 70, hit: 80, hurt: 200, click: 50, pickup: 150, warn: 350, dodge: 150, kill: 120,
  };

  play(name: SfxName): void {
    if (!this.ctx || !this.sfxBus || !this.sfxOn) return;
    const now = Date.now();
    const th = this.throttleMs[name] || 0;
    if (th && now - (this.lastPlayAt.get(name) || 0) < th) return;
    this.lastPlayAt.set(name, now);
    this.counts[name] = (this.counts[name] || 0) + 1;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'swing': this.noiseSweep(900, 280, 0.09, 0.10); break;
      case 'hit': this.tone('triangle', 170, 70, 0.09, 0.20); this.noiseSweep(2000, 900, 0.04, 0.07); break;
      case 'crit': this.tone('triangle', 220, 80, 0.11, 0.22); this.tone('sine', 1320, 1320, 0.10, 0.08, 0.01); break;
      case 'hurt': this.tone('sawtooth', 130, 75, 0.16, 0.13); break;
      case 'cast': this.tone('sine', 480, 990, 0.18, 0.11); this.tone('sine', 960, 1480, 0.14, 0.05, 0.03); break;
      case 'warn': this.tone('square', 220, 220, 0.07, 0.07); this.tone('square', 220, 220, 0.07, 0.07, 0.13); break;
      case 'pickup': this.tone('sine', 659, 659, 0.09, 0.12); this.tone('sine', 880, 880, 0.12, 0.12, 0.07); break;
      case 'chest': [523, 659, 784, 1047].forEach((f, i) => this.tone('sine', f, f, 0.16, 0.11, i * 0.09)); break;
      case 'coin': this.tone('sine', 1568, 1568, 0.07, 0.07); this.tone('sine', 2093, 2093, 0.12, 0.07, 0.06); break;
      case 'learn': [392, 523, 659].forEach((f, i) => this.tone('sine', f, f, 0.15, 0.11, i * 0.1)); break;
      case 'breakOk': [392, 523, 659, 784, 1047].forEach((f, i) => this.tone('sine', f, f, 0.22, 0.12, i * 0.11)); this.pad([261.63, 329.63, 392], t, 2.6); break;
      case 'breakFail': [330, 262, 196].forEach((f, i) => this.tone('triangle', f, f * 0.94, 0.2, 0.12, i * 0.14)); this.tone('sine', 70, 45, 0.4, 0.16, 0.1); break;
      case 'death': this.tone('sawtooth', 300, 55, 0.7, 0.14); break;
      case 'revive': this.tone('sine', 440, 440, 0.14, 0.1); this.tone('sine', 660, 660, 0.2, 0.1, 0.12); break;
      case 'teleport': this.tone('sine', 300, 1250, 0.35, 0.10); break;
      case 'dodge': this.noiseSweep(500, 1700, 0.12, 0.09); break;
      case 'click': this.tone('square', 760, 700, 0.03, 0.035); break;
      case 'kill': this.tone('triangle', 300, 150, 0.1, 0.16); this.tone('sine', 520, 520, 0.09, 0.08, 0.05); break;
    }
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, gain: number, delay = 0): void {
    if (!this.ctx || !this.sfxBus) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(this.sfxBus);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  private noiseSweep(f0: number, f1: number, dur: number, gain: number): void {
    if (!this.ctx || !this.sfxBus || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(this.sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // ---------------- QUAN SÁT TICK (main.ts gọi mỗi tick) ----------------
  // Tự suy: mình bị thương (máu tụt) / mình đánh trúng (quái tụt máu
  // ngay sau hành động của mình) / quái gần mình bắt đầu vận đòn.
  observeTick(players: TickPlayer[], monsters: TickMonster[], myId: string): void {
    if (!this.ctx || !myId) return;
    const me = players.find((p) => p.id === myId);
    if (!me) return;
    const now = Date.now();
    if (this.prevMyHp !== null && me.hp < this.prevMyHp - 0.5 && now - this.lastHurtAt > 200) {
      const drop = this.prevMyHp - me.hp;
      this.lastHurtAt = now;
      this.play(drop >= Math.max(12, (me.maxHp || 100) * 0.15) ? 'crit' : 'hurt');
    }
    this.prevMyHp = me.hp;
    const seen = new Set<string>();
    for (const m of monsters) {
      seen.add(m.id);
      const prevHp = this.prevMonHp.get(m.id);
      if (prevHp !== undefined && m.hp < prevHp && now - this.lastActionAt < 900 && now - this.lastHitAt > 80) {
        this.lastHitAt = now;
        this.play('hit');
      }
      const prevSt = this.prevMonSt.get(m.id);
      if (m.st === 'windup' && prevSt !== 'windup' && now - this.lastWarnAt > 350) {
        const dx = m.x - me.x, dy = m.y - me.y;
        if (dx * dx + dy * dy < 520 * 520) { this.lastWarnAt = now; this.play('warn'); }
      }
      this.prevMonHp.set(m.id, m.hp);
      this.prevMonSt.set(m.id, m.st ?? null);
    }
    if (this.prevMonHp.size > seen.size + 40) {
      for (const id of [...this.prevMonHp.keys()]) if (!seen.has(id)) { this.prevMonHp.delete(id); this.prevMonSt.delete(id); }
    }
  }
}

export const sound = new SoundEngine();

// Cho probe kiểm chứng + gỡ lỗi từ console
(window as unknown as { __tttSound?: unknown }).__tttSound = {
  state: () => sound.state(),
  play: (n: SfxName) => sound.play(n),
  unlock: () => sound.unlock(),
  setMood: (m: Mood) => sound.setMapMood(m === 'village' ? 'city' : 'farm', m === 'village'),
};
