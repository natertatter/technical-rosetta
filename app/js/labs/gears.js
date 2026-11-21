/**
 * Lab 2: Steep Trail & Monster Winch Gear Lab (Palm III Chapter 3, Sections 3.1–3.3)
 * Real Time-Domain Rotational ODE:
 *   I_e * d(omega_1)/dt = T_1 - (T_load / N) - c_rot * omega_1
 *   where N = n_2 / n_1 (Gear Tooth Ratio) and I_e = I_1 + I_2 / N^2
 */

import { rk4Step, drawForceArrow, soundFX } from '../solver.js';

export const DRIVER_TEETH_OPTIONS = [10, 15, 20];
export const DRIVEN_TEETH_OPTIONS = [10, 20, 40, 60];

export const CHALLENGES_LAB2 = [
  {
    id: 'c1',
    title: 'Challenge 1: The 4x Climbing Muscle Ridge!',
    mission:
      'A level-3 Boulder blocks the trail! A 10-Tooth Driver on a 10-Tooth Driven Gear (1x Muscle) stalls out! Snap in a gear combo with exactly 4x Climbing Muscle to haul it to the top!',
    setup: { driverTeeth: 10, drivenTeeth: 10, hillLevel: 3, legPower: 30 },
    question: '🔮 Which gear pair gives you 4x Climbing Muscle (Spin 4 Times -> Winch Turns 1 Time)?',
    predictions: [
      { id: 'p1', text: '20-Tooth Driver -> 10-Tooth Driven Gear (Half the muscle, twice the speed)', correct: false },
      { id: 'p2', text: '10-Tooth Driver -> 10-Tooth Driven Gear (1x muscle)', correct: false },
      { id: 'p3', text: '10-Tooth Driver -> 40-Tooth Driven Gear (40 ÷ 10 = 4x Climbing Muscle!)', correct: true }
    ],
    checkWin: (summary) => summary.reachedTop && Math.abs(summary.ratio - 4) < 0.05 && summary.timeSec <= 12.0,
    winMessage: 'CRUSHED IT! 10-Tooth -> 40-Tooth multiplied your 30 Leg Power by 4 = 120 Climbing Muscle!'
  },
  {
    id: 'c2',
    title: 'Challenge 2: Fast Express Delivery (Beat the 5.5s Clock!)',
    mission:
      'Light cargo (Level 1 Hill), but you must reach the ridge summit in UNDER 5.5 seconds! A 60-tooth gear has lots of muscle, but spins way too slow! Pick a fast gear combo!',
    setup: { driverTeeth: 10, drivenTeeth: 60, hillLevel: 1, legPower: 40 },
    question: '🔮 Why does the 10-Tooth -> 60-Tooth gear lose the speed race on a light hill?',
    predictions: [
      { id: 'p1', text: '6x Muscle means the winch turns 6 times SLOWER! Matching 20 -> 20 (or 15 -> 20) spins the winch way faster!', correct: true },
      { id: 'p2', text: 'More teeth make the rope shorter!', correct: false },
      { id: 'p3', text: 'Big gears have zero Climbing Muscle!', correct: false }
    ],
    checkWin: (summary) => summary.reachedTop && summary.hillLevel === 1 && summary.timeSec <= 5.5,
    winMessage: 'SPEED DEMON! Trading unneeded muscle for Spin Speed zipped the cargo up in record time!'
  },
  {
    id: 'c3',
    title: 'Challenge 3: Monster 5-Crate Cliff Winch (6x Muscle!)',
    mission:
      'Extreme Level 5 Monster Boulder (needs 150 Pull Force) with only 30 Leg Power! Build a 6x Climbing Muscle gear train so 30 × 6 = 180 Pulling Muscle!',
    setup: { driverTeeth: 20, drivenTeeth: 20, hillLevel: 5, legPower: 30 },
    question: '🔮 With 30 Leg Power against a 150-Force Monster Boulder, what happens with a 10-Tooth -> 60-Tooth combo?',
    predictions: [
      { id: 'p1', text: '20 ÷ 20 = 1x Muscle is enough to lift 150 with 30 power!', correct: false },
      { id: 'p2', text: '60 ÷ 10 = 6x Muscle! 30 × 6 = 180 Pulling Muscle, which beats the 150 Boulder Weight!', correct: true },
      { id: 'p3', text: 'Gears create free energy without slowing down spin speed!', correct: false }
    ],
    checkWin: (summary) => summary.reachedTop && summary.hillLevel === 5 && summary.legPower <= 30 && summary.ratio >= 6,
    winMessage: 'MONSTER WINCH MASTER! 10-Tooth -> 60-Tooth gave you 6x Climbing Muscle (30 × 6 = 180 > 150)!'
  }
];

export class GearsLab {
  constructor(canvas, onUpdateUI) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onUpdateUI = onUpdateUI;

    // User controls
    this.driverTeeth = 10; // 10, 15, 20
    this.drivenTeeth = 40; // 10, 20, 40, 60
    this.hillLevel = 3;    // 1 to 5 (Required load torque = hillLevel * 30 -> 30, 60, 90, 120, 150)
    this.legPower = 30;    // 10 to 50 whole-number input torque

    this.mode = 'sandbox';
    this.selectedPrediction = null;
    this.predictionFeedback = null;

    // Interactive canvas drag-and-drop state for gear tray
    this.draggingGear = null; // { type: 'driver'|'driven', teeth: number, x, y }
    this._bindCanvasDrag();

    this.resetSimulation();
  }

  _bindCanvasDrag() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * this.canvas.width,
        y: ((clientY - rect.top) / rect.height) * this.canvas.height
      };
    };

    const onDown = (e) => {
      const pos = getPos(e);
      if (!this.trayHitBoxes) return;
      for (const box of this.trayHitBoxes) {
        if (pos.x >= box.x && pos.x <= box.x + box.w && pos.y >= box.y && pos.y <= box.y + box.h) {
          this.draggingGear = { type: box.type, teeth: box.teeth, x: pos.x, y: pos.y };
          soundFX.playPop(480, 0.06);
          break;
        }
      }
    };

    const onMove = (e) => {
      if (!this.draggingGear) return;
      const pos = getPos(e);
      this.draggingGear.x = pos.x;
      this.draggingGear.y = pos.y;
    };

    const onUp = () => {
      if (!this.draggingGear) return;
      if (this.draggingGear.type === 'driver') {
        this.driverTeeth = this.draggingGear.teeth;
      } else {
        this.drivenTeeth = this.draggingGear.teeth;
      }
      soundFX.playPop(640, 0.09);
      this.draggingGear = null;
      this.resetSimulation();
    };

    this.canvas.addEventListener('mousedown', onDown);
    this.canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('touchstart', onDown, { passive: true });
    this.canvas.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  }

  getMechanics() {
    const N = this.drivenTeeth / this.driverTeeth; // Gear ratio N = n2 / n1
    const outputMuscle = Math.round(this.legPower * N);
    const loadNeed = this.hillLevel * 30; // 30, 60, 90, 120, 150
    // Real rotational inertia in kg*m^2 (Palm III Example 3.3.2)
    const I1 = 0.08 * (this.driverTeeth / 10);
    const I2 = 0.65 * (this.drivenTeeth / 20) + this.hillLevel * 0.25;
    const Ie = I1 + I2 / (N * N);
    const cRot = 0.42;
    return {
      N,
      outputMuscle,
      loadNeed,
      I1,
      I2,
      Ie,
      cRot
    };
  }

  resetSimulation() {
    this.phase = 'ready'; // 'ready' | 'hauling' | 'stalled' | 'won'
    this.simTime = 0;
    this.omega1 = 0; // Driver angular velocity (rad/s)
    this.omega2 = 0; // Driven winch angular velocity (rad/s)
    this.theta1 = 0; // Driver angle (rad)
    this.theta2 = 0; // Driven angle (rad)
    this.haulProgress = 0; // 0 to 100% up the ridge
    this.statusBanner = 'Snap your Driver & Driven Gears together, then press ⚙️ CRANK WINCH!';
    this.statusType = 'neutral';
    this._notifyUI();
  }

  startHaul() {
    this.resetSimulation();
    this.phase = 'hauling';
    if (this.mode !== 'sandbox' && !this.selectedPrediction) {
      this.statusBanner = '⚙️ Cranking the gear drivetrain up the ridge! (Tip: Pick a 🔮 Scientist Prediction above too!)';
    } else {
      this.statusBanner = '⚙️ Cranking the gear drivetrain up the ridge...';
    }
    this.statusType = 'active';
    soundFX.playPop(440, 0.1);
    this._notifyUI();
  }

  setMode(modeId) {
    this.mode = modeId;
    this.selectedPrediction = null;
    this.predictionFeedback = null;
    if (modeId !== 'sandbox') {
      const ch = CHALLENGES_LAB2.find((c) => c.id === modeId);
      if (ch) {
        this.driverTeeth = ch.setup.driverTeeth;
        this.drivenTeeth = ch.setup.drivenTeeth;
        this.hillLevel = ch.setup.hillLevel;
        this.legPower = ch.setup.legPower;
      }
    }
    this.resetSimulation();
  }

  selectPrediction(predId) {
    const ch = CHALLENGES_LAB2.find((c) => c.id === this.mode);
    if (!ch) return;
    const pred = ch.predictions.find((p) => p.id === predId);
    if (!pred) return;
    this.selectedPrediction = predId;
    this.predictionFeedback = pred.correct
      ? '✅ Exact gear math! Now snap in your chosen gears and press ⚙️ CRANK WINCH!'
      : '🤔 Check the 4th-Grade Ratio Scoreboard: Climbing Muscle = Driven Teeth ÷ Driver Teeth!';
    soundFX.playPop(pred.correct ? 660 : 420, 0.09);
    this._notifyUI();
  }

  step(dt) {
    if (this.phase !== 'hauling') return;

    const { N, outputMuscle, loadNeed, Ie, cRot } = this.getMechanics();
    this.simTime += dt;

    // Check stall condition: T_1 * N <= T_load
    if (outputMuscle <= loadNeed) {
      // Brief strain & stall backward jiggle
      this.omega1 = Math.sin(this.simTime * 18) * 0.4;
      this.omega2 = this.omega1 / N;
      this.theta1 += this.omega1 * dt;
      this.theta2 -= this.omega2 * dt;
      if (this.simTime > 1.3) {
        this.phase = 'stalled';
        this.omega1 = 0;
        this.omega2 = 0;
        this.statusBanner = `🛑 STALLED OUT! Your ${outputMuscle} Pulling Muscle isn't enough to beat ${loadNeed} Boulder Weight! Use a smaller Driver or bigger Driven gear!`;
        this.statusType = 'fail';
        soundFX.playClang();
        this._notifyUI();
      }
      return;
    }

    // Palm III Section 3.3 Eq. (Example 3.3.2, Book p. 132 / PDF p. 145):
    // I_e * d(omega_1)/dt = T_1 - T_2 / N - c_rot * omega_1
    const netT1 = (this.legPower - loadNeed / N) * 1.15;
    const derivs = (_t, state, p) => {
      const w1 = state[0];
      const dw1 = (p.netT1 - p.cRot * w1) / p.Ie;
      return [dw1];
    };

    const [nextW1] = rk4Step(this.simTime, [this.omega1], dt, derivs, { netT1, cRot, Ie });
    // Cap human pedaling cadence so high-ratio gears visibly spin the output slower
    const maxPedalOmega = 16.0;
    this.omega1 = Math.min(maxPedalOmega, Math.max(0, nextW1));
    this.omega2 = this.omega1 / N;

    this.theta1 += this.omega1 * dt;
    this.theta2 -= this.omega2 * dt; // Meshing spur gears rotate in opposite directions

    // Winch drum hauls rope proportional to driven gear angular speed omega2
    const drumRadius = 7.5;
    this.haulProgress += this.omega2 * drumRadius * dt;

    if (this.haulProgress >= 100) {
      this.haulProgress = 100;
      this.phase = 'won';
      this._evaluateWin();
    } else if (this.simTime >= 15.0) {
      this.phase = 'stalled';
      this.statusBanner = `⏱️ TIME'S UP (15s)! You had plenty of muscle (${outputMuscle}), but spun too slowly! Try a slightly smaller Driven gear!`;
      this.statusType = 'warn';
      soundFX.playClang();
    }
    this._notifyUI();
  }

  _evaluateWin() {
    const { N, outputMuscle, loadNeed } = this.getMechanics();
    const timeSec = Number(this.simTime.toFixed(1));
    const summary = {
      reachedTop: true,
      ratio: N,
      timeSec,
      hillLevel: this.hillLevel,
      legPower: this.legPower
    };

    if (this.mode !== 'sandbox') {
      const ch = CHALLENGES_LAB2.find((c) => c.id === this.mode);
      if (ch && ch.checkWin(summary)) {
        this.statusBanner = `🏆 CHALLENGE COMPLETE! ${ch.winMessage} (Haul Time: ${timeSec}s)`;
        this.statusType = 'win';
        soundFX.playWinFanfare();
        if (this.onWin) this.onWin(this.mode);
        return;
      } else if (ch) {
        this.statusBanner = `Reached the top in ${timeSec}s with ${Number(N.toFixed(1))}x Muscle, but check the exact Challenge target!`;
        this.statusType = 'warn';
        return;
      }
    }

    this.statusBanner = `✅ SUMMIT REACHED in ${timeSec}s! (${outputMuscle} Pulling Muscle vs. ${loadNeed} Boulder Weight)`;
    this.statusType = 'win';
    soundFX.playWinFanfare();
  }

  getTextbookMathInfo() {
    const { N, Ie, I1, I2, outputMuscle, loadNeed } = this.getMechanics();
    return {
      title: 'Chapter 3: Rotational Motion, Gears & Equivalent Inertia',
      equation: 'I_e ω̇₁ = T₁ − (T_load / N) − c_rot ω₁,   where I_e = I₁ + I₂ / N²   and   N = n₂ / n₁',
      citation:
        'Palm III, Chapter 3, Sections 3.2–3.3: Fixed-Axis Rotation I_O ω̇ = M_O (Eq. 3.2.1, Book p. 123 / PDF p. 136), Spur-Gear Tooth Ratio N = n₂/n₁ = ω₁/ω₂ = T₂/T₁ and Equivalent Inertia I_e (Example 3.3.2, Book pp. 131–132 / PDF pp. 144–145).',
      liveParams: [
        `Driver Gear Teeth (n₁): ${this.driverTeeth} | Driven Gear Teeth (n₂): ${this.drivenTeeth}`,
        `Gear Ratio (N = n₂/n₁): ${N.toFixed(2)}:1`,
        `Equivalent Inertia at Shaft 1 (I_e = I₁ + I₂/N²): ${Ie.toFixed(3)} kg·m² (I₁=${I1.toFixed(2)}, I₂=${I2.toFixed(2)})`,
        `Output Torque (T₂ = N·T₁): ${outputMuscle} N·m vs. Load Torque (T_load): ${loadNeed} N·m`
      ],
      analogy:
        'Shifting your mountain bike into the giant "granny gear" sprocket in back makes your pedals spin 4 times for every 1 wheel turn—giving your legs 4 times the climbing muscle up a steep dirt trail!'
    };
  }

  _notifyUI() {
    if (this.onUpdateUI) this.onUpdateUI();
  }

  _drawSpurGear(ctx, cx, cy, teeth, angle, color, rimColor, label) {
    const pitchRadius = teeth * 2.15 + 14;
    const outerRadius = pitchRadius + 7;
    const rootRadius = pitchRadius - 5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Gear teeth
    ctx.fillStyle = color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a0 = i * step;
      const a1 = a0 + step * 0.22;
      const a2 = a0 + step * 0.48;
      const a3 = a0 + step * 0.72;
      if (i === 0) {
        ctx.moveTo(Math.cos(a0) * rootRadius, Math.sin(a0) * rootRadius);
      } else {
        ctx.lineTo(Math.cos(a0) * rootRadius, Math.sin(a0) * rootRadius);
      }
      ctx.lineTo(Math.cos(a1) * outerRadius, Math.sin(a1) * outerRadius);
      ctx.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
      ctx.lineTo(Math.cos(a3) * rootRadius, Math.sin(a3) * rootRadius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner gear ring
    ctx.beginPath();
    ctx.arc(0, 0, rootRadius - 5, 0, Math.PI * 2);
    ctx.fillStyle = rimColor;
    ctx.fill();
    ctx.stroke();

    // High-contrast spokes so rotation speed is immediately clear
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    for (let s = 0; s < 4; s++) {
      const sa = (s * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sa) * (rootRadius - 7), Math.sin(sa) * (rootRadius - 7));
      ctx.stroke();
    }

    // Center axle hub
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Static label badge below/above gear
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 58, cy + outerRadius + 10, 116, 26, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 12px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy + outerRadius + 27);
    ctx.restore();

    return pitchRadius;
  }

  render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Workshop & Mountain Ridge Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const { N, outputMuscle, loadNeed } = this.getMechanics();
    const ratioDisplay = Number.isInteger(N) ? `${N}` : N.toFixed(1);

    // Top 4th-Grade Ratio Scoreboard Banner
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(16, 14, W - 32, 50, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 16px "Fredoka", "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `⚙️ ${this.driverTeeth}-Tooth Driver ➔ ${this.drivenTeeth}-Tooth Driven  =  Spin ${ratioDisplay} Times ➔ Winch Turns 1 Time with ${ratioDisplay}x Climbing Muscle!`,
      W / 2,
      45
    );

    // Left Stage: Meshing Driver & Driven Gears
    const r1 = this.driverTeeth * 2.15 + 14;
    const r2 = this.drivenTeeth * 2.15 + 14;
    const driverX = 115;
    const gearY = H * 0.46;
    const drivenX = driverX + r1 + r2 + 6;

    // Mounting plate
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(24, 82, 435, H - 175, 16);
    ctx.fill();
    ctx.stroke();

    // Draw Driver Gear (Blue) & Driven Gear (Amber)
    this._drawSpurGear(
      ctx,
      driverX,
      gearY,
      this.driverTeeth,
      this.theta1,
      '#38bdf8',
      '#0284c7',
      `Driver: ${this.driverTeeth}T`
    );

    // Phase offset so teeth visually mesh
    const meshOffset = Math.PI / this.drivenTeeth;
    this._drawSpurGear(
      ctx,
      drivenX,
      gearY,
      this.drivenTeeth,
      this.theta2 + meshOffset,
      '#f59e0b',
      '#b45309',
      `Driven: ${this.drivenTeeth}T`
    );

    // Draw Winch Cable Drum at center of Driven Gear
    const drumR = 24;
    ctx.beginPath();
    ctx.arc(drivenX, gearY, drumR, 0, Math.PI * 2);
    ctx.fillStyle = '#475569';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Glowing Torque & Speed Force Arrows
    const arrowY1 = Math.max(88, gearY - r1 - 16);
    drawForceArrow(
      ctx,
      driverX - 35,
      arrowY1,
      driverX + 35,
      arrowY1,
      '#38bdf8',
      `Leg Power: ${this.legPower}`
    );

    const muscleColor = outputMuscle > loadNeed ? '#22c55e' : '#ef4444';
    const arrowY2 = Math.max(88, gearY - r2 - 14);
    drawForceArrow(
      ctx,
      drivenX - 45,
      arrowY2,
      drivenX + 45,
      arrowY2,
      muscleColor,
      `Winch Muscle: ${outputMuscle}`
    );

    // Right Stage: Steep Mountain Ridge & Boulder Winch Slope
    const hillLeftX = 485;
    const hillBotY = H - 102;
    const hillTopX = W - 55;
    const angleDeg = 16 + this.hillLevel * 7; // 23 deg to 51 deg visual steepness
    const hillHeight = 110 + this.hillLevel * 28;
    const hillTopY = hillBotY - hillHeight;

    // Draw Mountain Slope Triangle
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hillLeftX, hillBotY);
    ctx.lineTo(hillTopX, hillTopY);
    ctx.lineTo(hillTopX, hillBotY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Summit Flag at top of ridge
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hillTopX - 8, hillTopY);
    ctx.lineTo(hillTopX - 8, hillTopY - 36);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(hillTopX - 8, hillTopY - 36);
    ctx.lineTo(hillTopX + 26, hillTopY - 26);
    ctx.lineTo(hillTopX - 8, hillTopY - 16);
    ctx.closePath();
    ctx.fill();

    // Position of Cargo Sled along slope (0 to 100%)
    const frac = Math.min(1, Math.max(0, this.haulProgress / 100));
    const sledX = hillLeftX + 28 + frac * (hillTopX - hillLeftX - 58);
    const sledY = hillBotY - 14 - frac * (hillBotY - hillTopY - 24);

    // Winch Steel Cable from Driven Gear Drum to Top Pulley to Sled
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(drivenX, gearY - drumR);
    ctx.lineTo(hillTopX - 10, hillTopY - 6);
    ctx.lineTo(sledX, sledY - 12);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Boulder / Cargo Sled on Slope
    const slopeAngle = Math.atan2(hillTopY - hillBotY, hillTopX - hillLeftX);
    ctx.save();
    ctx.translate(sledX, sledY);
    ctx.rotate(slopeAngle);
    const boxSize = 28 + this.hillLevel * 4;
    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = '#fff7ed';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-boxSize / 2, -boxSize, boxSize, boxSize, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${loadNeed}`, 0, -boxSize / 2 + 4);
    ctx.restore();

    // Gravity Resistance vs Pulling Muscle Battle Card above Slope
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = outputMuscle > loadNeed ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(hillLeftX, 82, W - hillLeftX - 24, 64, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 13px "Nunito", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `💪 Pulling Muscle: ${this.legPower} Leg × ${ratioDisplay}x Ratio = ${outputMuscle}`,
      hillLeftX + 14,
      106
    );
    ctx.fillStyle = outputMuscle > loadNeed ? '#4ade80' : '#f87171';
    ctx.fillText(
      `🪨 Steep Hill Weight: ${loadNeed} (Level ${this.hillLevel}, ${angleDeg}°) ➔ ${
        outputMuscle > loadNeed ? '✅ MOVING UP!' : '🛑 TOO HEAVY (STALLS!)'
      }`,
      hillLeftX + 14,
      130
    );

    // Bottom Interactive Snap-In Gear Tray (Click or Drag onto Axles!)
    const trayY = H - 82;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(16, trayY, W - 32, 68, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 12px "Nunito", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🧲 SNAP-IN GEAR TRAY (Click or Drag a Gear):', 28, trayY + 20);

    this.trayHitBoxes = [];
    let bx = 28;
    const by = trayY + 28;

    DRIVER_TEETH_OPTIONS.forEach((t) => {
      const active = this.driverTeeth === t;
      ctx.fillStyle = active ? '#0284c7' : '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, 102, 30, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 12px "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🔵 Driver ${t}T`, bx + 51, by + 19);
      this.trayHitBoxes.push({ type: 'driver', teeth: t, x: bx, y: by, w: 102, h: 30 });
      bx += 110;
    });

    bx += 18;
    DRIVEN_TEETH_OPTIONS.forEach((t) => {
      const active = this.drivenTeeth === t;
      ctx.fillStyle = active ? '#b45309' : '#1e293b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, 104, 30, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 12px "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🟠 Driven ${t}T`, bx + 52, by + 19);
      this.trayHitBoxes.push({ type: 'driven', teeth: t, x: bx, y: by, w: 104, h: 30 });
      bx += 112;
    });

    // Draw floating gear if currently dragging
    if (this.draggingGear) {
      this._drawSpurGear(
        ctx,
        this.draggingGear.x,
        this.draggingGear.y,
        this.draggingGear.teeth,
        0,
        this.draggingGear.type === 'driver' ? '#38bdf8' : '#f59e0b',
        '#1e293b',
        `Drop ${this.draggingGear.teeth}T`
      );
    }
  }
}
