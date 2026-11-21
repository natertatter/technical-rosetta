/**
 * Lab 1: Trail Bike Jump & Suspension Lab (Palm III Chapter 4, Sections 4.1–4.4)
 * Real Time-Domain ODE: m * x'' + c * x' + k * x = f(t)
 * Integrated at fixed dt = 1/120 s using RK4.
 */

import { rk4Step, drawForceArrow, soundFX, speakText } from '../solver.js';

export const SPRING_OPTIONS = [
  { id: 'soft', label: 'Soft Coil (100)', k: 4800, color: '#38bdf8' },
  { id: 'medium', label: 'Medium Coil (200)', k: 9600, color: '#3b82f6' },
  { id: 'stiff', label: 'Stiff Coil (350)', k: 15600, color: '#1d4ed8' }
];

export const DAMPER_OPTIONS = [
  { id: 'none', label: 'No Shock Oil! (Pogo Mode)', c: 20, badge: '0 Squish' },
  { id: 'watery', label: 'Watery Oil (Light Squish)', c: 420, badge: '25 Squish' },
  { id: 'syrupy', label: 'Syrupy Oil (Trail Tuned)', c: 1250, badge: '75 Squish' },
  { id: 'honey', label: 'Thick Honey (Super Squish)', c: 2450, badge: '140 Squish' }
];

export const CHALLENGES_LAB1 = [
  {
    id: 'c1',
    title: 'Challenge 1: Tame the Pogo-Stick Bike!',
    mission:
      'A rider with 2 Crates drops 4 ft onto a Medium Coil with NO Shock Oil! Pick the right Shock Oil Squish so the bike stops bouncing and settles flat within 2 seconds!',
    setup: { dropFeet: 4, riderCrates: 2, springId: 'medium', damperId: 'none' },
    question: '🔮 What will happen if you jump with "No Shock Oil!" vs. adding "Syrupy Oil"?',
    predictions: [
      { id: 'p1', text: 'Without oil it bounces like a pogo stick; Syrupy Oil turns extra bounce into heat!', correct: true },
      { id: 'p2', text: 'Shock oil makes the spring bounce higher into the air!', correct: false },
      { id: 'p3', text: 'Shock oil changes the rider weight to zero!', correct: false }
    ],
    checkWin: (summary) => !summary.bottomedOut && !summary.buckedRider && summary.settleTime <= 2.0 && summary.damperId !== 'none',
    winMessage: 'AWESOME! The Shock Oil Squish turned the extra bounce energy into harmless heat in under 2 seconds!'
  },
  {
    id: 'c2',
    title: 'Challenge 2: The 8-Foot Boulder Drop!',
    mission:
      'Huge 8-ft trail drop with 3 Cargo Crates! A Soft spring will CLANG and bottom out! Upgrade Spring Bounce Strength and Shock Oil Squish so you never hit 100% travel!',
    setup: { dropFeet: 8, riderCrates: 3, springId: 'soft', damperId: 'watery' },
    question: '🔮 Why does the Soft Coil hit 100% travel ("CLANG! Bottomed Out!") on an 8-ft drop?',
    predictions: [
      { id: 'p1', text: 'The Soft Coil lacks enough Stored Spring Power to stop 8 ft of Moving Speed Power before running out of travel!', correct: true },
      { id: 'p2', text: 'Soft springs only work when riding uphill!', correct: false },
      { id: 'p3', text: 'An 8-ft drop has less energy than a 2-ft drop!', correct: false }
    ],
    checkWin: (summary) =>
      summary.dropFeet >= 8 &&
      summary.riderCrates >= 3 &&
      !summary.bottomedOut &&
      !summary.buckedRider &&
      summary.settleTime <= 2.0,
    winMessage: 'DIALED IN! Stiff Spring Bounce Strength + Shock Oil Squish absorbed the 8-ft drop with zero bottom-out!'
  },
  {
    id: 'c3',
    title: 'Challenge 3: Pro Downhill Heavy Haul (10 ft + 5 Crates)',
    mission:
      'Maximum test: 10-ft cliff drop hauling all 5 Cargo Crates! Tune your Spring Bounce Strength and Shock Oil Squish to land under 95% travel and settle flat in under 1.8 seconds!',
    setup: { dropFeet: 10, riderCrates: 5, springId: 'medium', damperId: 'watery' },
    question: '🔮 With 5 heavy crates dropping 10 ft, which combo absorbs all that Crash Oomph safely?',
    predictions: [
      { id: 'p1', text: 'Stiff Coil + Thick Honey (or Syrupy) Shock Oil so both spring push and heat squish work together!', correct: true },
      { id: 'p2', text: 'Soft Coil + No Shock Oil so the frame hits the metal stop immediately!', correct: false },
      { id: 'p3', text: 'Medium Coil + No Shock Oil!', correct: false }
    ],
    checkWin: (summary) =>
      summary.dropFeet === 10 &&
      summary.riderCrates === 5 &&
      !summary.bottomedOut &&
      summary.maxTravelPct <= 95 &&
      !summary.buckedRider &&
      summary.settleTime <= 1.8,
    winMessage: 'PRO MECHANIC! You conquered the 10-ft Pro Downhill Drop with textbook suspension tuning!'
  }
];

export class SuspensionLab {
  constructor(canvas, onUpdateUI) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onUpdateUI = onUpdateUI;

    // User controls
    this.dropFeet = 5;        // 1 to 10 ft
    this.riderCrates = 2;     // 1 to 5 crates (mass = 30 kg + crates * 12 kg)
    this.springId = 'medium';
    this.damperId = 'syrupy';

    // Mode & challenge state
    this.mode = 'sandbox'; // 'sandbox' or 'c1' | 'c2' | 'c3'
    this.selectedPrediction = null;
    this.predictionFeedback = null;

    // Max fork travel = 0.22 m (220 mm downhill fork)
    this.maxTravelM = 0.22;

    this.resetSimulation();
  }

  getParams() {
    const spring = SPRING_OPTIONS.find((s) => s.id === this.springId) || SPRING_OPTIONS[1];
    const damper = DAMPER_OPTIONS.find((d) => d.id === this.damperId) || DAMPER_OPTIONS[2];
    const massKg = 30 + this.riderCrates * 12; // 42 kg to 90 kg
    const dropMeters = this.dropFeet * 0.3048;
    return {
      m: massKg,
      k: spring.k,
      c: damper.c,
      springLabel: spring.label,
      damperLabel: damper.label,
      dropMeters
    };
  }

  resetSimulation() {
    const { m, dropMeters } = this.getParams();
    this.phase = 'ready'; // 'ready' | 'falling' | 'compressing' | 'settled'
    this.simTime = 0;
    this.airHeight = dropMeters;
    this.airVel = 0;

    // Suspension deflection x (m) from equilibrium after impact, velocity v = dx/dt (m/s)
    this.x = 0;
    this.v = 0;
    this.maxX = 0;
    this.bottomedOut = false;
    this.buckedRider = false;
    this.reboundPeak = 0;
    this.settleTime = null;
    this.statusBanner = 'Press 🚀 DROP BIKE! to test your suspension!';
    this.statusType = 'neutral';

    // Energy tracking (scaled to clean whole-number percentage & kid units)
    this.initialDropEnergyJ = m * 9.81 * dropMeters;
    this.heatDissipatedJ = 0;
    this.history = [];
    this._notifyUI();
  }

  launchDrop() {
    if (this.mode !== 'sandbox' && !this.selectedPrediction) {
      this.statusBanner = '🔮 Pick your Scientist Prediction first, then launch the jump!';
      this.statusType = 'warn';
      this._notifyUI();
      return;
    }
    this.resetSimulation();
    this.phase = 'falling';
    this.statusBanner = '🚵 Dropping off the trail ledge...';
    this.statusType = 'active';
    soundFX.playPop(380, 0.1);
    this._notifyUI();
  }

  setMode(modeId) {
    this.mode = modeId;
    this.selectedPrediction = null;
    this.predictionFeedback = null;
    if (modeId !== 'sandbox') {
      const ch = CHALLENGES_LAB1.find((c) => c.id === modeId);
      if (ch) {
        this.dropFeet = ch.setup.dropFeet;
        this.riderCrates = ch.setup.riderCrates;
        this.springId = ch.setup.springId;
        this.damperId = ch.setup.damperId;
      }
    }
    this.resetSimulation();
  }

  selectPrediction(predId) {
    const ch = CHALLENGES_LAB1.find((c) => c.id === this.mode);
    if (!ch) return;
    const pred = ch.predictions.find((p) => p.id === predId);
    if (!pred) return;
    this.selectedPrediction = predId;
    this.predictionFeedback = pred.correct
      ? '✅ Spot-on hypothesis! Now adjust your sliders and press 🚀 DROP BIKE to prove it!'
      : '🤔 Good guess! Watch the 3 Energy Bars during the jump to see where the bounce energy really goes!';
    soundFX.playPop(pred.correct ? 660 : 420, 0.09);
    this._notifyUI();
  }

  step(dt) {
    const { m, k, c } = this.getParams();

    if (this.phase === 'falling') {
      // Free-fall dynamics: dy/dt = -v, dv/dt = g
      this.airVel += 9.81 * dt * 1.65; // crisp visual free-fall into impact
      this.airHeight -= this.airVel * dt;
      if (this.airHeight <= 0) {
        this.airHeight = 0;
        // Impact velocity from conservation of energy V_g = m*g*h -> 1/2 m v_0^2
        const impactVel = Math.sqrt(2 * 9.81 * (this.dropFeet * 0.3048)) * 0.42;
        this.x = 0;
        this.v = impactVel;
        this.initialDropEnergyJ = 0.5 * m * impactVel * impactVel;
        this.heatDissipatedJ = 0;
        this.phase = 'compressing';
        this.simTime = 0;
        soundFX.playPop(220, 0.12);
      }
    } else if (this.phase === 'compressing') {
      this.simTime += dt;

      // Solve Palm III Chapter 4 Eq. (Example 4.4.3, p. 205 / PDF p. 218):
      // m * x'' + c * x' + k * x = 0  (about dynamic landing equilibrium)
      const derivs = (_t, state, p) => {
        const disp = state[0];
        const vel = state[1];
        const acc = (-p.c * vel - p.k * disp) / p.m;
        return [vel, acc];
      };

      const prevV = this.v;
      const next = rk4Step(this.simTime, [this.x, this.v], dt, derivs, { m, k, c });
      this.x = next[0];
      this.v = next[1];

      // Integrate viscous damper thermal energy dissipated: dE_heat = c * v^2 * dt
      const avgV = 0.5 * (prevV + this.v);
      this.heatDissipatedJ += c * avgV * avgV * dt;

      // Track maximum compression and bottom-out stop
      if (this.x > this.maxX) {
        this.maxX = this.x;
      }
      if (this.x >= this.maxTravelM) {
        this.x = this.maxTravelM;
        if (!this.bottomedOut) {
          this.bottomedOut = true;
          soundFX.playClang();
        }
        // Hard rubber bump-stop rebound
        if (this.v > 0) {
          this.v = -this.v * 0.45;
        }
      }

      // Track pogo rebound bucking
      if (this.x < -this.maxTravelM * 0.48) {
        this.buckedRider = true;
      }
      if (-this.x > this.reboundPeak) {
        this.reboundPeak = -this.x;
      }

      // Check settling within 5% of max travel
      const travelRatio = Math.abs(this.x) / this.maxTravelM;
      const velRatio = Math.abs(this.v) / 1.5;
      if (travelRatio < 0.045 && velRatio < 0.045) {
        if (this.settleTime === null) {
          this.settleTime = this.simTime;
        }
      } else {
        this.settleTime = null;
      }

      // Record trail graph history
      this.history.push({
        t: this.simTime,
        xPct: Math.max(-100, Math.min(100, (this.x / this.maxTravelM) * 100))
      });
      if (this.history.length > 480) this.history.shift();

      // Evaluate run completion at t = 3.2 s or early settle
      if (this.simTime >= 3.2 || (this.settleTime !== null && this.simTime - this.settleTime > 0.45)) {
        this.phase = 'settled';
        if (this.settleTime === null) this.settleTime = 3.5;
        this._evaluateRunResult();
      }
      this._notifyUI();
    }
  }

  _evaluateRunResult() {
    const maxPct = Math.round(Math.min(100, (this.maxX / this.maxTravelM) * 100));
    const settleSec = Number((this.settleTime || 3.5).toFixed(1));
    const summary = {
      dropFeet: this.dropFeet,
      riderCrates: this.riderCrates,
      springId: this.springId,
      damperId: this.damperId,
      bottomedOut: this.bottomedOut,
      buckedRider: this.buckedRider,
      maxTravelPct: maxPct,
      settleTime: settleSec
    };

    if (this.bottomedOut) {
      this.statusBanner = `💥 CLANG! Bottomed Out at 100% travel! Try stiffer Spring Bounce Strength or thicker Shock Oil Squish!`;
      this.statusType = 'fail';
      return;
    }

    if (this.buckedRider || settleSec > 2.0) {
      this.statusBanner = `🦘 BOING! Bounced for ${settleSec}s (Pogo-Stick Ride)! Increase Shock Oil Squish to turn bounce into heat!`;
      this.statusType = 'warn';
      return;
    }

    if (this.mode !== 'sandbox') {
      const ch = CHALLENGES_LAB1.find((c) => c.id === this.mode);
      if (ch && ch.checkWin(summary)) {
        this.statusBanner = `🏆 CHALLENGE COMPLETE! ${ch.winMessage} (Max Squish: ${maxPct}%, Settled in ${settleSec}s)`;
        this.statusType = 'win';
        soundFX.playWinFanfare();
        if (this.onWin) this.onWin(this.mode);
        return;
      } else if (ch) {
        this.statusBanner = `Almost! Landed smoothly (${maxPct}% travel in ${settleSec}s), but check the Challenge goal settings!`;
        this.statusType = 'warn';
        return;
      }
    }

    this.statusBanner = `✅ SMOOTH TRAIL LANDING! Used ${maxPct}% travel and settled flat in ${settleSec}s!`;
    this.statusType = 'win';
    soundFX.playWinFanfare();
  }

  getEnergyBreakdown() {
    const { m, k } = this.getParams();
    const totalJ = Math.max(1, this.initialDropEnergyJ);

    if (this.phase === 'ready' || this.phase === 'falling') {
      const currentHeightFrac = this.dropFeet > 0 ? this.airHeight / (this.dropFeet * 0.3048) : 1;
      const dropUnits = this.dropFeet * this.riderCrates * 10;
      const movingPct = Math.round((1 - currentHeightFrac) * 100);
      return {
        totalUnits: dropUnits,
        storedSpringUnits: 0,
        movingSpeedUnits: Math.round((movingPct / 100) * dropUnits),
        shockHeatUnits: 0,
        storedPct: 0,
        movingPct,
        heatPct: 0
      };
    }

    const springJ = 0.5 * k * this.x * this.x;
    const kineticJ = 0.5 * m * this.v * this.v;
    const heatJ = this.heatDissipatedJ;
    const sumJ = Math.max(totalJ, springJ + kineticJ + heatJ, 0.001);

    const storedPct = Math.min(100, Math.round((springJ / sumJ) * 100));
    const movingPct = Math.min(100, Math.round((kineticJ / sumJ) * 100));
    const heatPct = Math.min(100, Math.max(0, 100 - storedPct - movingPct));

    const totalUnits = this.dropFeet * this.riderCrates * 10; // Clean 4th-grade whole number
    return {
      totalUnits,
      storedSpringUnits: Math.round((storedPct / 100) * totalUnits),
      movingSpeedUnits: Math.round((movingPct / 100) * totalUnits),
      shockHeatUnits: Math.round((heatPct / 100) * totalUnits),
      storedPct,
      movingPct,
      heatPct
    };
  }

  getTextbookMathInfo() {
    const { m, k, c, springLabel, damperLabel } = this.getParams();
    const wn = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(m * k));
    return {
      title: 'Chapter 4: Spring & Damper Elements in Mechanical Systems',
      equation: 'm x\'\'(t) + c x\'(t) + k x(t) = f(t)',
      citation: 'Palm III, Chapter 4, Sections 4.1–4.4: Hooke\'s Law f = kx (Eq. 4.1.1, Book p. 169 / PDF p. 182), Elastic Energy V = ½kx² (Eq. 4.3.1, Book p. 190 / PDF p. 203), Mass-Spring-Damper Model (Example 4.4.3, Book p. 205 / PDF p. 218).',
      liveParams: [
        `Rider + Bike Mass (m): ${m} kg`,
        `Spring Stiffness (k): ${k.toLocaleString()} N/m [${springLabel}]`,
        `Viscous Damping (c): ${c.toLocaleString()} N·s/m [${damperLabel}]`,
        `Natural Freq (ω_n = √(k/m)): ${wn.toFixed(1)} rad/s | Damping Ratio (ζ): ${zeta.toFixed(2)}`
      ],
      analogy:
        'A trail bike fork has a metal coil spring inside one leg to catch you on a jump, and an oil damper cartridge in the other leg that squeezes oil through tiny shim holes so you don\'t bounce off the trail like a pogo stick!'
    };
  }

  _notifyUI() {
    if (this.onUpdateUI) this.onUpdateUI();
  }

  render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Sky & Mountain Trail Backdrop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.65, '#1e293b');
    skyGrad.addColorStop(1, '#1e2518');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Distant pine mountains
    ctx.fillStyle = '#1e3a2f';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.72);
    ctx.lineTo(W * 0.18, H * 0.42);
    ctx.lineTo(W * 0.35, H * 0.65);
    ctx.lineTo(W * 0.55, H * 0.38);
    ctx.lineTo(W * 0.78, H * 0.72);
    ctx.closePath();
    ctx.fill();

    const groundY = H * 0.77;
    // Dirt trail ground
    ctx.fillStyle = '#3f2e21';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, groundY - 4, W, 6);

    // Left Trail Drop Ledge
    const ledgeHeightPx = this.dropFeet * 13;
    const ledgeY = groundY - ledgeHeightPx;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(18, ledgeY, 92, ledgeHeightPx + 4, [8, 8, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 13px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.dropFeet} ft Ledge`, 64, ledgeY - 8);

    // Bike & Suspension Fork Visualization (Left-Center stage)
    const bikeCenterX = W * 0.31;
    const airOffsetPx = (this.airHeight / 0.3048) * 13;
    const travelPct = Math.max(-75, Math.min(100, (this.x / this.maxTravelM) * 100));
    const maxTravelPx = 88;
    const compressPx = (travelPct / 100) * maxTravelPx;

    const wheelRadius = 42;
    const wheelCenterY = groundY - wheelRadius - airOffsetPx;
    const forkTopY = wheelCenterY - 125 + compressPx;

    // Draw tires (front & rear bike frame silhouette)
    const rearWheelX = bikeCenterX - 95;
    const frontWheelX = bikeCenterX + 45;

    [rearWheelX, frontWheelX].forEach((wx) => {
      // Tire rubber
      ctx.save();
      ctx.beginPath();
      ctx.arc(wx, wheelCenterY, wheelRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Spokes
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(wx, wheelCenterY);
        ctx.lineTo(wx + Math.cos(a) * (wheelRadius - 6), wheelCenterY + Math.sin(a) * (wheelRadius - 6));
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    });

    // Oversized Cutaway Suspension Fork + Coil Spring + Oil Damper Tube
    const forkX = frontWheelX;
    const stanchionBottomY = wheelCenterY;
    const crownY = forkTopY;

    // Outer Fork Lower Tube
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(forkX - 30, stanchionBottomY - 96, 60, 96, 10);
    ctx.fill();
    ctx.stroke();

    // Inner Gold Stanchion Tube sliding into lower
    ctx.fillStyle = '#eab308';
    ctx.fillRect(forkX - 20, crownY, 14, stanchionBottomY - crownY - 15);
    ctx.fillRect(forkX + 6, crownY, 14, stanchionBottomY - crownY - 15);

    // Draw Animated Helical Coil Spring on Left Leg
    const springOpt = SPRING_OPTIONS.find((s) => s.id === this.springId) || SPRING_OPTIONS[1];
    const springTop = crownY + 8;
    const springBot = stanchionBottomY - 14;
    const coils = 7;
    const springHeight = Math.max(22, springBot - springTop);
    ctx.save();
    ctx.strokeStyle = springOpt.color;
    ctx.lineWidth = this.springId === 'stiff' ? 6 : this.springId === 'medium' ? 4.5 : 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(forkX - 13, springTop);
    for (let i = 1; i <= coils * 2; i++) {
      const py = springTop + (i / (coils * 2)) * springHeight;
      const px = forkX - 13 + (i % 2 === 0 ? -11 : 11);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Draw Shock Oil Squish Cartridge on Right Leg (glows orange with heat!)
    const energy = this.getEnergyBreakdown();
    const heatGlow = Math.min(1, energy.heatPct / 65);
    ctx.save();
    ctx.fillStyle =
      this.damperId === 'none'
        ? 'rgba(71, 85, 105, 0.35)'
        : `rgba(${Math.round(56 + 195 * heatGlow)}, ${Math.round(189 - 100 * heatGlow)}, ${Math.round(248 - 220 * heatGlow)}, 0.85)`;
    ctx.fillRect(forkX + 4, springTop + 10, 18, springHeight - 12);
    // Piston disc inside oil
    const pistonY = springTop + 14 + Math.max(0, Math.min(springHeight - 24, (compressPx / maxTravelPx) * (springHeight - 28)));
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(forkX + 3, pistonY, 20, 6);
    ctx.restore();

    // Mountain Bike Frame connecting Rear Wheel to Fork Crown
    const seatX = bikeCenterX - 38;
    const seatY = crownY + 12;
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(rearWheelX, wheelCenterY);
    ctx.lineTo(seatX, seatY);
    ctx.lineTo(forkX, crownY);
    ctx.lineTo(bikeCenterX - 30, wheelCenterY - 8);
    ctx.closePath();
    ctx.stroke();

    // Handlebars
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(forkX, crownY);
    ctx.lineTo(forkX - 8, crownY - 22);
    ctx.lineTo(forkX + 12, crownY - 26);
    ctx.stroke();
    ctx.restore();

    // Rider + Cargo Crates on Bike
    for (let c = 0; c < this.riderCrates; c++) {
      const cx = seatX - 24;
      const cy = seatY - 26 - c * 20;
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx, cy, 42, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.font = '800 11px "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Crate ${c + 1}`, cx + 21, cy + 13);
    }

    // Force Arrows on Fork during compression
    if (this.phase === 'compressing' || this.phase === 'settled') {
      if (Math.abs(this.x) > 0.008) {
        const pushLen = Math.min(75, Math.max(22, Math.abs(this.x / this.maxTravelM) * 75));
        drawForceArrow(
          ctx,
          forkX - 48,
          stanchionBottomY - 20,
          forkX - 48,
          stanchionBottomY - 20 - pushLen,
          '#38bdf8',
          'Spring Push'
        );
      }
      if (Math.abs(this.v) > 0.08 && this.damperId !== 'none') {
        const squishDir = this.v > 0 ? -1 : 1;
        drawForceArrow(
          ctx,
          forkX + 54,
          stanchionBottomY - 45,
          forkX + 54,
          stanchionBottomY - 45 + squishDir * 46,
          '#fb923c',
          'Oil Squish'
        );
      }
    }

    // Travel Meter Bar beside Fork
    const meterX = frontWheelX + 82;
    const meterY = groundY - 170;
    const meterH = 140;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(meterX, meterY, 26, meterH, 8);
    ctx.fill();
    ctx.stroke();

    const fillPct = Math.max(0, Math.min(100, (this.x / this.maxTravelM) * 100));
    const maxPct = Math.max(0, Math.min(100, (this.maxX / this.maxTravelM) * 100));
    const fillH = (fillPct / 100) * (meterH - 8);
    ctx.fillStyle = fillPct >= 98 ? '#ef4444' : fillPct > 80 ? '#f59e0b' : '#22c55e';
    ctx.beginPath();
    ctx.roundRect(meterX + 4, meterY + meterH - 4 - fillH, 18, fillH, 5);
    ctx.fill();

    // Peak travel marker line
    const peakY = meterY + meterH - 4 - (maxPct / 100) * (meterH - 8);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(meterX - 4, peakY);
    ctx.lineTo(meterX + 30, peakY);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 12px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Peak: ${Math.round(maxPct)}%`, meterX + 13, meterY - 8);

    // Bottomed Out Warning Flash
    if (this.bottomedOut) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#fef2f2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bikeCenterX - 115, crownY - 72, 245, 42, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 16px "Fredoka", "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💥 CLANG! BOTTOMED OUT! (100%)', bikeCenterX + 8, crownY - 46);
      ctx.restore();
    } else if (this.buckedRider) {
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fffbeb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bikeCenterX - 115, crownY - 72, 245, 42, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 15px "Fredoka", "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🦘 POGO BOUNCE! NEEDS SHOCK OIL!', bikeCenterX + 8, crownY - 46);
      ctx.restore();
    }

    // Right Panel on Canvas: Live Bounce Trail Graph
    const graphX = W * 0.56;
    const graphY = 26;
    const graphW = W * 0.41;
    const graphH = H * 0.62;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(graphX, graphY, graphW, graphH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '800 13px "Fredoka", "Nunito", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📈 Live Fork Bounce Trail (Settle flat in < 2.0s!)', graphX + 14, graphY + 24);

    const plotX = graphX + 46;
    const plotY = graphY + 42;
    const plotW = graphW - 62;
    const plotH = graphH - 64;
    const midY = plotY + plotH * 0.52;

    // 100% Bottom-out red line
    const bottomLineY = midY - plotH * 0.44;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plotX, bottomLineY);
    ctx.lineTo(plotX + plotW, bottomLineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f87171';
    ctx.font = '700 11px "Nunito", sans-serif';
    ctx.fillText('100% CLANG!', plotX + 6, bottomLineY - 5);

    // Green settled zone band
    ctx.fillStyle = 'rgba(34, 197, 94, 0.16)';
    ctx.fillRect(plotX, midY - 12, plotW, 24);

    // Zero equilibrium line
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotX, midY);
    ctx.lineTo(plotX + plotW, midY);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText('Flat (0%)', plotX - 6, midY + 4);

    // 2.0 second goal vertical marker
    const twoSecX = plotX + (2.0 / 3.2) * plotW;
    ctx.strokeStyle = '#22c55e';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(twoSecX, plotY);
    ctx.lineTo(twoSecX, plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'center';
    ctx.fillText('2.0s Goal', twoSecX, plotY + plotH + 14);

    // Plot bounce curve
    if (this.history.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      this.history.forEach((pt, idx) => {
        const px = plotX + Math.min(1, pt.t / 3.2) * plotW;
        const py = midY - (pt.xPct / 100) * (plotH * 0.44);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Bottom Whole-Number Kid Math Formula Strip on Canvas
    const stripY = H - 46;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(18, stripY, W - 36, 36, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 14px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `🧠 4th-Grade Energy Math: ${this.dropFeet} ft Drop × ${this.riderCrates} Crates × 10 = ${energy.totalUnits} Total Drop Power  ➔  ${energy.storedSpringUnits} Stored Spring Power + ${energy.movingSpeedUnits} Moving Speed Power + ${energy.shockHeatUnits} Shock Oil Heat`,
      W / 2,
      stripY + 23
    );
  }
}
