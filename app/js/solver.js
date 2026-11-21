/**
 * Action Systems Lab — Real Time-Domain ODE Numerical Solver & Arcade Utilities
 * Solves William J. Palm III's System Dynamics (3rd Ed.) differential equations
 * using a fixed physics timestep dt = 1/120 s (120 Hz) with 4th-Order Runge-Kutta (RK4).
 */

export const FIXED_DT = 1 / 120; // Strict 120 Hz fixed physics timestep

/**
 * Single step of 4th-Order Runge-Kutta (RK4) integration for an autonomous or time-dependent ODE system:
 *   dy/dt = derivs(t, y, params)
 * @param {number} t Current simulation time (s)
 * @param {number[]} y State vector [y0, y1, ...]
 * @param {number} dt Fixed timestep (1/120 s)
 * @param {Function} derivs Function(t, state, params) -> number[]
 * @param {Object} params Physical parameters for the ODE
 * @returns {number[]} Next state vector y(t + dt)
 */
export function rk4Step(t, y, dt, derivs, params) {
  const n = y.length;
  const k1 = derivs(t, y, params);

  const y2 = new Array(n);
  for (let i = 0; i < n; i++) y2[i] = y[i] + 0.5 * dt * k1[i];
  const k2 = derivs(t + 0.5 * dt, y2, params);

  const y3 = new Array(n);
  for (let i = 0; i < n; i++) y3[i] = y[i] + 0.5 * dt * k2[i];
  const k3 = derivs(t + 0.5 * dt, y3, params);

  const y4 = new Array(n);
  for (let i = 0; i < n; i++) y4[i] = y[i] + dt * k3[i];
  const k4 = derivs(t + dt, y4, params);

  const next = new Array(n);
  for (let i = 0; i < n; i++) {
    next[i] = y[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return next;
}

/**
 * Semi-Implicit (Symplectic) Euler integrator helper for 1D/2D mechanical steps
 */
export function semiImplicitEulerStep(pos, vel, accel, dt) {
  const nextVel = vel + accel * dt;
  const nextPos = pos + nextVel * dt;
  return [nextPos, nextVel];
}

/**
 * Fixed-timestep accumulator loop runner.
 * Advances physics in exact increments of FIXED_DT = 1/120 s.
 */
export class FixedStepLoop {
  constructor(stepCallback, renderCallback) {
    this.stepCallback = stepCallback;
    this.renderCallback = renderCallback;
    this.accumulator = 0;
    this.lastTimestamp = null;
    this.running = false;
    this.timeScale = 1.0;
    this._rafId = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      let frameTime = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      if (frameTime > 0.1) frameTime = 0.1; // clamp spiral of death

      this.accumulator += frameTime * this.timeScale;
      while (this.accumulator >= FIXED_DT) {
        this.stepCallback(FIXED_DT);
        this.accumulator -= FIXED_DT;
      }
      this.renderCallback();
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }
}

/**
 * Web Speech API Read-Aloud Helper (🔊 Speak Mission)
 */
export function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[^\w\s.,!?'"-°×=]/g, ' ');
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 0.98;
  utterance.pitch = 1.06;
  window.speechSynthesis.speak(utterance);
}

/**
 * Web Audio API synthesized arcade sound effects (zero external assets required)
 */
class SoundManager {
  constructor() {
    this.ctx = null;
  }

  _init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPop(freq = 520, duration = 0.08) {
    try {
      this._init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, this.ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (_) {}
  }

  playClang() {
    try {
      this._init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(58, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.26, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (_) {}
  }

  playWinFanfare() {
    try {
      this._init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = this.ctx.currentTime + idx * 0.09;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.26);
      });
    } catch (_) {}
  }
}

export const soundFX = new SoundManager();

/**
 * Celebration Confetti Burst on Challenge Completion
 */
export class ConfettiOverlay {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.active = false;
  }

  burst() {
    if (!this.canvas || !this.ctx) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#eab308', '#06b6d4'];
    for (let i = 0; i < 110; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = 400 + Math.random() * 550;
      this.particles.push({
        x: this.canvas.width * (0.25 + Math.random() * 0.5),
        y: this.canvas.height * 0.55,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 7 + Math.random() * 7,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 10,
        life: 1.0
      });
    }
    if (!this.active) {
      this.active = true;
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 980 * dt;
          p.rot += p.vrot * dt;
          p.life -= dt * 0.55;
          if (p.life <= 0 || p.y > this.canvas.height + 40) {
            this.particles.splice(i, 1);
            continue;
          }
          this.ctx.save();
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate(p.rot);
          this.ctx.globalAlpha = Math.max(0, p.life);
          this.ctx.fillStyle = p.color;
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
          this.ctx.restore();
        }
        if (this.particles.length > 0) {
          requestAnimationFrame(loop);
        } else {
          this.active = false;
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
      };
      requestAnimationFrame(loop);
    }
  }
}

/**
 * Draw a bold, kid-friendly force/flow vector arrow on a 2D Canvas context
 */
export function drawForceArrow(ctx, x1, y1, x2, y2, color, label = '', lineWidth = 5) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 6) return;

  const angle = Math.atan2(dy, dx);
  const headLen = Math.min(16, Math.max(10, len * 0.35));

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - Math.cos(angle) * (headLen * 0.5), y2 - Math.sin(angle) * (headLen * 0.5));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.font = '800 12px "Nunito", "Fredoka", sans-serif';
    const textWidth = ctx.measureText(label).width;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2 - 12;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(midX - textWidth / 2 - 6, midY - 11, textWidth + 12, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, midX, midY - 2);
  }
  ctx.restore();
}
