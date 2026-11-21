/**
 * Lab 1: Desert Dune Buggy Whoops & Suspension Lab (Palm III Chapter 4, Sections 4.1–4.5)
 * Real Time-Domain Quarter-Car / Base-Excitation ODE (Palm III Example 4.5.8, Book pp. 215–216 / PDF pp. 228–229):
 *   m * x'' + c * x' + k * x = c * y'(t) + k * y(t)
 * where:
 *   x(t) = vertical displacement of the Dune Buggy chassis
 *   y(t) = desert "whoops" bump elevation under the tires at buggy forward position s = v_buggy * t
 *   z(t) = y(t) - x(t) = suspension compression deflection across the coil spring & shock damper
 * Integrated in real time at fixed dt = 1/120 s using 4th-Order Runge-Kutta (RK4).
 */

import { rk4Step, drawForceArrow, soundFX } from '../solver.js';

export const SPRING_OPTIONS = [
  { id: 'soft', label: 'Soft Coil (100)', k: 5200, color: '#38bdf8' },
  { id: 'medium', label: 'Medium Coil (200)', k: 10500, color: '#3b82f6' },
  { id: 'stiff', label: 'Stiff Trophy Coil (350)', k: 18500, color: '#1d4ed8' }
];

export const DAMPER_OPTIONS = [
  { id: 'none', label: 'No Shock Oil! (Pogo Buggy)', c: 55, badge: '0 Squish' },
  { id: 'watery', label: 'Watery Oil (Light Squish)', c: 550, badge: '25 Squish' },
  { id: 'syrupy', label: 'Syrupy Oil (Desert Tuned)', c: 1550, badge: '75 Squish' },
  { id: 'honey', label: 'Thick Honey (Baja Heavy)', c: 2950, badge: '140 Squish' }
];

export const CHALLENGES_LAB1 = [
  {
    id: 'c1',
    title: 'Challenge 1: Tame the Pogo-Buggy over Desert Whoops!',
    mission:
      'Your Dune Buggy is cruising at 20 MPH over 2-ft Whoops with NO Shock Oil! Each bump makes it buck wildly! Add Shock Oil Squish so the buggy glides over the whoops without bucking or bottoming out!',
    setup: { buggySpeedMph: 20, whoopSizeFt: 2, riderCrates: 2, springId: 'medium', damperId: 'none' },
    question: '🔮 What happens when a Dune Buggy hits a row of rolling "Whoops" bumps with "No Shock Oil!" vs. "Syrupy Oil"?',
    predictions: [
      { id: 'p1', text: 'Shock oil makes the desert whoops disappear from the ground!', correct: false },
      { id: 'p2', text: 'Without oil, each whoop adds more bounce until the buggy bucks wildly; Syrupy Oil turns that extra bounce into heat!', correct: true },
      { id: 'p3', text: 'No Shock Oil makes the springs freeze solid so they cannot move!', correct: false }
    ],
    checkWin: (summary) =>
      summary.buggySpeedMph >= 20 &&
      summary.whoopSizeFt >= 2 &&
      !summary.bottomedOut &&
      !summary.buckedRider &&
      summary.damperId !== 'none',
    winMessage: 'SMOOTH DESERT GLIDE! The Shock Oil Squish soaked up the repeating Whoops and turned the bounce energy into heat!'
  },
  {
    id: 'c2',
    title: 'Challenge 2: Monster 4-Foot Baja Whoops!',
    mission:
      'Huge 4-ft Monster Whoops at 25 MPH with 3 Cargo Crates! A Soft Coil will CLANG and bottom out at 100% travel! Upgrade your Spring Bounce Strength and Shock Oil Squish to clear the whoop section cleanly!',
    setup: { buggySpeedMph: 25, whoopSizeFt: 4, riderCrates: 3, springId: 'soft', damperId: 'watery' },
    question: '🔮 Why does the Soft Coil hit 100% travel ("CLANG! Bottomed Out!") when driving over 4-ft Monster Whoops?',
    predictions: [
      { id: 'p1', text: 'Soft springs only compress when driving backward!', correct: false },
      { id: 'p2', text: '4-ft whoops have less push than 1-ft ripples!', correct: false },
      { id: 'p3', text: 'The Soft Coil lacks enough Stored Spring Power to hold up the buggy when a 4-ft whoop shoves the tires upward!', correct: true }
    ],
    checkWin: (summary) =>
      summary.whoopSizeFt >= 4 &&
      summary.buggySpeedMph >= 25 &&
      summary.riderCrates >= 3 &&
      !summary.bottomedOut &&
      !summary.buckedRider,
    winMessage: 'BAJA TROPHY TUNER! Stiff Spring Bounce Strength + Shock Oil Squish conquered the 4-ft Monster Whoops with zero bottom-out!'
  },
  {
    id: 'c3',
    title: 'Challenge 3: 40 MPH Trophy Buggy Blitz (5-ft Whoops + 5 Crates!)',
    mission:
      'Full throttle 40 MPH across massive 5-ft Whoops hauling all 5 Cargo Crates! Tune your Spring Bounce Strength and Shock Oil Squish to survive the blitz under 95% travel without bottoming out!',
    setup: { buggySpeedMph: 40, whoopSizeFt: 5, riderCrates: 5, springId: 'medium', damperId: 'watery' },
    question: '🔮 Why does driving faster (40 MPH) over 5-ft Whoops hit the suspension so much harder?',
    predictions: [
      { id: 'p1', text: 'Higher Buggy Speed slams the tires up each whoop much faster, needing Stiff Coil + Thick Honey (or Syrupy) Oil to absorb the rapid punch!', correct: true },
      { id: 'p2', text: 'Driving 40 MPH makes the 5-Crate buggy weigh nothing!', correct: false },
      { id: 'p3', text: 'Soft Coil + No Shock Oil is best for 40 MPH monster whoops!', correct: false }
    ],
    checkWin: (summary) =>
      summary.buggySpeedMph >= 40 &&
      summary.whoopSizeFt === 5 &&
      summary.riderCrates === 5 &&
      !summary.bottomedOut &&
      summary.maxTravelPct <= 95 &&
      !summary.buckedRider,
    winMessage: 'DESERT CHAMPION! You floated across 5-ft Baja Whoops at 40 MPH with 5 Crates like a real Trophy Buggy!'
  }
];

export class SuspensionLab {
  constructor(canvas, onUpdateUI) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onUpdateUI = onUpdateUI;

    // User controls
    this.buggySpeedMph = 25;  // 10 to 40 MPH (in steps of 5)
    this.whoopSizeFt = 3;     // 1 to 5 ft bump height
    this.riderCrates = 2;     // 1 to 5 cargo crates
    this.springId = 'medium';
    this.damperId = 'syrupy';

    // Mode & challenge state
    this.mode = 'sandbox'; // 'sandbox' or 'c1' | 'c2' | 'c3'
    this.selectedPrediction = null;
    this.predictionFeedback = null;

    // Max suspension stroke = 0.25 m (250 mm desert buggy shock travel)
    this.maxTravelM = 0.25;
    this.whoopWavelengthM = 5.2; // 5.2 meters between whoop peaks
    this.whoopFieldStartM = 3.0; // flat desert run-in before the whoops start
    this.whoopCount = 6;         // 6 rolling desert whoops in the test section

    this.resetSimulation();
  }

  getParams() {
    const spring = SPRING_OPTIONS.find((s) => s.id === this.springId) || SPRING_OPTIONS[1];
    const damper = DAMPER_OPTIONS.find((d) => d.id === this.damperId) || DAMPER_OPTIONS[2];
    const massKg = 110 + this.riderCrates * 35; // Quarter-car buggy mass: 145 kg to 285 kg
    const speedMs = this.buggySpeedMph * 0.25; // Scaled ground speed in m/s for clear visual inspection
    const whoopPeakM = this.whoopSizeFt * 0.082; // Physical road bump peak amplitude (m)
    return {
      m: massKg,
      k: spring.k,
      c: damper.c,
      springLabel: spring.label,
      damperLabel: damper.label,
      speedMs,
      whoopPeakM
    };
  }

  /**
   * Road profile y(s) and time derivative dy/dt = (dy/ds) * v_buggy
   * Models a series of raised cosine desert "whoops":
   *   y(s) = (H / 2) * (1 - cos(2*pi*(s - s0)/L))
   */
  getRoadInputAtDistance(distM, speedMs, whoopPeakM) {
    const L = this.whoopWavelengthM;
    const sRel = distM - this.whoopFieldStartM;
    const totalLength = this.whoopCount * L;

    if (sRel <= 0 || sRel >= totalLength) {
      return { y: 0, dydt: 0, inWhoops: false };
    }

    const omegaSpatial = (2 * Math.PI) / L;
    const y = 0.5 * whoopPeakM * (1 - Math.cos(omegaSpatial * sRel));
    const dyds = 0.5 * whoopPeakM * omegaSpatial * Math.sin(omegaSpatial * sRel);
    const dydt = dyds * speedMs;
    return { y, dydt, inWhoops: true };
  }

  resetSimulation() {
    this.phase = 'ready'; // 'ready' | 'driving' | 'settled'
    this.simTime = 0;
    this.distanceM = 0;
    this.wheelRot = 0;

    // Quarter-car chassis displacement x (m) and vertical velocity v = dx/dt (m/s)
    // Road elevation y (m) and suspension compression deflection z = y - x (m)
    this.x = 0;
    this.v = 0;
    this.y = 0;
    this.dydt = 0;
    this.defl = 0; // z = y - x (positive = compressed)

    this.maxDefl = 0;
    this.maxChassisBounce = 0;
    this.bottomedOut = false;
    this.buckedRider = false;
    this.settleTime = null;
    this.statusBanner = 'Tune your Buggy Speed, Whoop Bump Size & Shocks, then press 🏁 DRIVE OVER WHOOPS!';
    this.statusType = 'neutral';

    this.heatDissipatedJ = 0;
    this.history = [];
    this._notifyUI();
  }

  launchDrop() {
    if (this.mode !== 'sandbox' && !this.selectedPrediction) {
      this.statusBanner = '🔮 Pick your Scientist Prediction first, then drive over the whoops!';
      this.statusType = 'warn';
      this._notifyUI();
      return;
    }
    this.resetSimulation();
    this.phase = 'driving';
    this.statusBanner = `🏎️ Driving at ${this.buggySpeedMph} MPH over ${this.whoopSizeFt}-ft Desert Whoops...`;
    this.statusType = 'active';
    soundFX.playPop(420, 0.1);
    this._notifyUI();
  }

  setMode(modeId) {
    this.mode = modeId;
    this.selectedPrediction = null;
    this.predictionFeedback = null;
    if (modeId !== 'sandbox') {
      const ch = CHALLENGES_LAB1.find((c) => c.id === modeId);
      if (ch) {
        this.buggySpeedMph = ch.setup.buggySpeedMph;
        this.whoopSizeFt = ch.setup.whoopSizeFt;
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
      ? '✅ Spot-on hypothesis! Now tune your shocks and press 🏁 DRIVE OVER WHOOPS to prove it!'
      : '🤔 Good guess! Watch the coils and the 3 Energy Bars as the tires hit the whoops!';
    soundFX.playPop(pred.correct ? 660 : 420, 0.09);
    this._notifyUI();
  }

  step(dt) {
    if (this.phase !== 'driving') return;

    const { m, k, c, speedMs, whoopPeakM } = this.getParams();
    this.simTime += dt;
    this.distanceM += speedMs * dt;
    this.wheelRot += (speedMs / 0.38) * dt;

    // Solve Palm III Chapter 4 Quarter-Car ODE (Example 4.5.8, Book p. 216 / PDF p. 229):
    //   m * x'' + c * x' + k * x = c * y'(t) + k * y(t)
    const derivs = (tLocal, state, p) => {
      const xChassis = state[0];
      const vChassis = state[1];
      const distAtT = this.distanceM + (tLocal - this.simTime) * p.speedMs;
      const road = this.getRoadInputAtDistance(distAtT, p.speedMs, p.whoopPeakM);
      const springForce = p.k * (road.y - xChassis);
      const damperForce = p.c * (road.dydt - vChassis);
      const acc = (springForce + damperForce) / p.m;
      return [vChassis, acc];
    };

    const next = rk4Step(this.simTime, [this.x, this.v], dt, derivs, {
      m,
      k,
      c,
      speedMs,
      whoopPeakM
    });

    this.x = next[0];
    this.v = next[1];

    const roadNow = this.getRoadInputAtDistance(this.distanceM, speedMs, whoopPeakM);
    this.y = roadNow.y;
    this.dydt = roadNow.dydt;

    // Suspension compression deflection z = y - x (positive when wheel is pushed up toward chassis)
    this.defl = this.y - this.x;
    const relVel = this.dydt - this.v;

    // Integrate viscous damper thermal energy dissipated: dE_heat = c * (y' - x')^2 * dt
    this.heatDissipatedJ += c * relVel * relVel * dt;

    // Track peak compression & bottom-out stop
    if (this.defl > this.maxDefl) {
      this.maxDefl = this.defl;
    }
    if (Math.abs(this.x) > this.maxChassisBounce) {
      this.maxChassisBounce = Math.abs(this.x);
    }

    if (this.defl >= this.maxTravelM) {
      this.defl = this.maxTravelM;
      this.x = this.y - this.maxTravelM;
      if (!this.bottomedOut) {
        this.bottomedOut = true;
        soundFX.playClang();
      }
      if (this.v < this.dydt) {
        this.v = this.dydt + (this.dydt - this.v) * 0.45;
      }
    }

    // Detect wild pogo bucking (excessive extension rebound or lingering post-whoop oscillation when undamped)
    if (this.defl < -this.maxTravelM * 0.92 || (this.damperId === 'none' && Math.abs(this.defl) > this.maxTravelM * 0.25)) {
      this.buckedRider = true;
    }

    const totalWhoopEndM = this.whoopFieldStartM + this.whoopCount * this.whoopWavelengthM;
    const afterWhoopsTime =
      this.distanceM > totalWhoopEndM ? (this.distanceM - totalWhoopEndM) / speedMs : 0;

    // Record trail graph history (suspension travel % and chassis bounce %)
    const travelPct = Math.max(-100, Math.min(100, (this.defl / this.maxTravelM) * 100));
    const chassisPct = Math.max(-100, Math.min(100, (this.x / this.maxTravelM) * 100));
    this.history.push({
      t: this.simTime,
      xPct: travelPct,
      chassisPct
    });
    if (this.history.length > 520) this.history.shift();

    // Check settling after clearing the whoop field
    if (this.distanceM > totalWhoopEndM) {
      if (Math.abs(this.defl) / this.maxTravelM < 0.1 && Math.abs(this.v) < 0.35) {
        if (this.settleTime === null) {
          this.settleTime = Number(afterWhoopsTime.toFixed(1));
        }
      } else if (afterWhoopsTime > 1.35) {
        this.buckedRider = true;
      }
    }

    // Complete run 1.4 seconds after clearing the 6 whoops
    if (afterWhoopsTime >= 1.4 || this.simTime >= 10.0) {
      this.phase = 'settled';
      if (this.settleTime === null) this.settleTime = 2.5;
      this._evaluateRunResult();
    }

    this._notifyUI();
  }

  _evaluateRunResult() {
    const maxPct = Math.round(Math.min(100, (this.maxDefl / this.maxTravelM) * 100));
    const settleSec = Number((this.settleTime || 1.2).toFixed(1));
    const summary = {
      buggySpeedMph: this.buggySpeedMph,
      whoopSizeFt: this.whoopSizeFt,
      riderCrates: this.riderCrates,
      springId: this.springId,
      damperId: this.damperId,
      bottomedOut: this.bottomedOut,
      buckedRider: this.buckedRider,
      maxTravelPct: maxPct,
      settleTime: settleSec
    };

    if (this.bottomedOut) {
      this.statusBanner = `💥 CLANG! Bottomed Out at 100% travel over the ${this.whoopSizeFt}-ft Whoops! Upgrade Spring Bounce Strength or Shock Oil Squish!`;
      this.statusType = 'fail';
      return;
    }

    if (this.buckedRider) {
      this.statusBanner = `🦘 POGO BUCKING! The buggy bounced wildly over the whoops! Add thicker Shock Oil Squish to soak up the bounce!`;
      this.statusType = 'warn';
      return;
    }

    if (this.mode !== 'sandbox') {
      const ch = CHALLENGES_LAB1.find((c) => c.id === this.mode);
      if (ch && ch.checkWin(summary)) {
        this.statusBanner = `🏆 CHALLENGE COMPLETE! ${ch.winMessage} (Max Squish: ${maxPct}%)`;
        this.statusType = 'win';
        soundFX.playWinFanfare();
        if (this.onWin) this.onWin(this.mode);
        return;
      } else if (ch) {
        this.statusBanner = `Cleared the whoops smoothly (${maxPct}% peak travel), but check the Challenge Speed, Whoop Size & Crate targets!`;
        this.statusType = 'warn';
        return;
      }
    }

    this.statusBanner = `✅ SMOOTH BAJA RUN! Glided over ${this.whoopSizeFt}-ft Whoops at ${this.buggySpeedMph} MPH (Max Squish: ${maxPct}%)!`;
    this.statusType = 'win';
    soundFX.playWinFanfare();
  }

  getEnergyBreakdown() {
    const { m, k } = this.getParams();
    // Clean 4th-grade whole-number energy units
    const totalUnits = this.buggySpeedMph * this.whoopSizeFt * 2;

    if (this.phase === 'ready') {
      return {
        totalUnits,
        storedSpringUnits: 0,
        movingSpeedUnits: totalUnits,
        shockHeatUnits: 0,
        storedPct: 0,
        movingPct: 100,
        heatPct: 0
      };
    }

    const springJ = 0.5 * k * this.defl * this.defl;
    const kineticJ = 0.5 * m * this.v * this.v + 15;
    const heatJ = this.heatDissipatedJ * 0.22;
    const sumJ = Math.max(1, springJ + kineticJ + heatJ);

    const storedPct = Math.min(100, Math.round((springJ / sumJ) * 100));
    const heatPct = Math.min(100 - storedPct, Math.round((heatJ / sumJ) * 100));
    const movingPct = Math.max(0, 100 - storedPct - heatPct);

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
    const { m, k, c, springLabel, damperLabel, speedMs } = this.getParams();
    const wn = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(m * k));
    const whoopFreq = (2 * Math.PI * speedMs) / this.whoopWavelengthM;
    return {
      title: 'Chapter 4 (Section 4.5): Quarter-Car Vehicle Suspension Over Road Whoops',
      equation: 'm x\'\'(t) + c x\'(t) + k x(t) = c y\'(t) + k y(t),   where y(t) = ½ H [1 − cos(2π v t / L)]',
      citation:
        'Palm III, Chapter 4, Sections 4.1–4.5: The Quarter-Car Suspension Model with Road Surface Displacement Input y(t) (Example 4.5.8, Figure 4.5.8, Book pp. 215–216 / PDF pp. 228–229); Hooke\'s Law f = k(y − x) (Eq. 4.1.1, PDF p. 182); Viscous Damper f = c(y\' − x\') (Section 4.4, PDF p. 216).',
      liveParams: [
        `Quarter-Buggy Mass (m): ${m} kg | Speed (v): ${this.buggySpeedMph} MPH | Whoop Height (H): ${this.whoopSizeFt} ft`,
        `Spring Stiffness (k): ${k.toLocaleString()} N/m [${springLabel}]`,
        `Viscous Damping (c): ${c.toLocaleString()} N·s/m [${damperLabel}]`,
        `Natural Freq (ω_n): ${wn.toFixed(1)} rad/s | Whoop Excitation Freq (ω_road): ${whoopFreq.toFixed(1)} rad/s | Damping Ratio (ζ): ${zeta.toFixed(2)}`
      ],
      analogy:
        'When a desert Dune Buggy blasts across a row of sandy "Whoops" bumps, the ground y(t) shoves the tires up and down rapidly—the coil springs cushion the hits while the shock oil keeps the buggy cab floating level instead of bucking like a rodeo bull!'
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

    const { speedMs, whoopPeakM } = this.getParams();

    // Sunset Desert Baja Sky Backdrop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.55, '#1e293b');
    skyGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Distant Desert Mesas & Red Rock Dunes
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.72);
    ctx.lineTo(W * 0.12, H * 0.52);
    ctx.lineTo(W * 0.28, H * 0.52);
    ctx.lineTo(W * 0.38, H * 0.68);
    ctx.lineTo(W * 0.52, H * 0.48);
    ctx.lineTo(W * 0.68, H * 0.48);
    ctx.lineTo(W * 0.82, H * 0.72);
    ctx.closePath();
    ctx.fill();

    const baseGroundY = H * 0.79;
    const pxPerMeterX = 32; // horizontal scale for scrolling desert whoops
    const pxPerMeterY = 175; // vertical amplification for crisp visual bump & suspension travel
    const buggyCenterX = W * 0.25;

    // Draw Scrolling Desert Whoops Terrain Profile y(s)
    ctx.save();
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let px = 0; px <= W; px += 6) {
      const worldDist = this.distanceM + (px - buggyCenterX) / pxPerMeterX;
      const road = this.getRoadInputAtDistance(worldDist, speedMs, whoopPeakM);
      const terrainY = baseGroundY - road.y * pxPerMeterY;
      ctx.lineTo(px, terrainY);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Label the Whoops Field on the desert floor
    ctx.fillStyle = '#fef08a';
    ctx.font = '800 13px "Fredoka", "Nunito", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `🏜️ DESERT WHOOPS: ${this.whoopSizeFt} ft Bump Height  •  🏎️ Buggy Speed: ${this.buggySpeedMph} MPH`,
      22,
      30
    );

    // Compute Front & Rear Wheel Ground Contact Elevations
    const wheelBasePx = 148;
    const rearWheelX = buggyCenterX - wheelBasePx / 2;
    const frontWheelX = buggyCenterX + wheelBasePx / 2;
    const wheelRadius = 32;

    const rearWorldDist = this.distanceM - wheelBasePx / 2 / pxPerMeterX;
    const frontWorldDist = this.distanceM + wheelBasePx / 2 / pxPerMeterX;
    const rearRoad = this.getRoadInputAtDistance(rearWorldDist, speedMs, whoopPeakM);
    const frontRoad = this.getRoadInputAtDistance(frontWorldDist, speedMs, whoopPeakM);

    const rearWheelY = baseGroundY - rearRoad.y * pxPerMeterY - wheelRadius;
    const frontWheelY = baseGroundY - frontRoad.y * pxPerMeterY - wheelRadius;

    // Chassis Vertical Position x(t) from Quarter-Car RK4 Solver
    const chassisBaseHeight = 82;
    const chassisOffsetPx = this.x * pxPerMeterY;
    const chassisCenterY = baseGroundY - wheelRadius - chassisBaseHeight - chassisOffsetPx;
    // Subtle pitch angle from front/rear terrain difference
    const pitchAngle = Math.atan2(frontWheelY - rearWheelY, wheelBasePx) * 0.45;

    const springOpt = SPRING_OPTIONS.find((s) => s.id === this.springId) || SPRING_OPTIONS[1];
    const energy = this.getEnergyBreakdown();
    const heatGlow = Math.min(1, energy.heatPct / 55);

    // Helper to draw Long-Travel Coil-Over Shock Strut between each wheel hub and buggy roll-cage
    const drawCoilOverShock = (wx, wy, topX, topY) => {
      const dx = wx - topX;
      const dy = wy - topY;
      const len = Math.max(24, Math.hypot(dx, dy));
      const ang = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(topX, topY);
      ctx.rotate(ang - Math.PI / 2);

      // Inner Damper Oil Cylinder (glows bright orange as it turns bounce into heat!)
      ctx.fillStyle =
        this.damperId === 'none'
          ? 'rgba(100, 116, 139, 0.35)'
          : `rgba(${Math.round(56 + 199 * heatGlow)}, ${Math.round(189 - 95 * heatGlow)}, ${Math.round(248 - 220 * heatGlow)}, 0.92)`;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-8, 4, 16, len * 0.58, 4);
      ctx.fill();
      ctx.stroke();

      // Chrome Shock Shaft
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-3.5, len * 0.55, 7, len * 0.42);

      // Helical Coil Spring wrapped around the Damper
      const coils = 6;
      ctx.strokeStyle = springOpt.color;
      ctx.lineWidth = this.springId === 'stiff' ? 5.5 : this.springId === 'medium' ? 4 : 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 6);
      for (let i = 1; i <= coils * 2; i++) {
        const py = 6 + (i / (coils * 2)) * (len - 12);
        const px = i % 2 === 0 ? -13 : 13;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(0, len - 6);
      ctx.stroke();

      ctx.restore();
    };

    // Draw Rear and Front Long-Travel Coil-Over Shocks
    const rearMountX = buggyCenterX - 54;
    const rearMountY = chassisCenterY - 4;
    const frontMountX = buggyCenterX + 54;
    const frontMountY = chassisCenterY - 4;

    drawCoilOverShock(rearWheelX, rearWheelY, rearMountX, rearMountY);
    drawCoilOverShock(frontWheelX, frontWheelY, frontMountX, frontMountY);

    // Draw Dune Buggy Tubular Roll-Cage Chassis & Cargo Rack
    ctx.save();
    ctx.translate(buggyCenterX, chassisCenterY);
    ctx.rotate(pitchAngle);

    // Lower Chassis Skid Frame
    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = '#fff7ed';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-84, -10, 168, 28, 10);
    ctx.fill();
    ctx.stroke();

    // Tubular Desert Roll Cage
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-72, -10);
    ctx.lineTo(-46, -54);
    ctx.lineTo(28, -54);
    ctx.lineTo(74, -10);
    ctx.stroke();

    // Center Roll Bar & Roof Visor
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(-10, -54);
    ctx.moveTo(-54, -10);
    ctx.lineTo(-46, -54);
    ctx.stroke();

    // Driver Helmet inside Roll Cage
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(8, -26, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(10, -30, 9, 6);

    // Headlight Whip & Baja Roof Light Bar
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(78, -2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Cargo Crates stacked in Rear Bed of the Dune Buggy
    for (let c = 0; c < this.riderCrates; c++) {
      const cx = -76;
      const cy = -28 - c * 17;
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx, cy, 44, 15, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 10px "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Crate ${c + 1}`, cx + 22, cy + 11);
    }

    ctx.restore();

    // Draw Knobby Off-Road Desert Buggy Tires
    [
      { x: rearWheelX, y: rearWheelY },
      { x: frontWheelX, y: frontWheelY }
    ].forEach((w) => {
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(this.wheelRot);

      // Knobby Outer Tire
      ctx.beginPath();
      ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 10;
      ctx.stroke();

      // Tire Treads
      for (let t = 0; t < 12; t++) {
        const a = (t * Math.PI) / 6;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (wheelRadius + 2), Math.sin(a) * (wheelRadius + 2), 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Beadlock Gold Rim
      ctx.beginPath();
      ctx.arc(0, 0, wheelRadius - 11, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Wheel Spokes
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      for (let s = 0; s < 3; s++) {
        const sa = (s * Math.PI) / 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * -(wheelRadius - 12), Math.sin(sa) * -(wheelRadius - 12));
        ctx.lineTo(Math.cos(sa) * (wheelRadius - 12), Math.sin(sa) * (wheelRadius - 12));
        ctx.stroke();
      }
      ctx.restore();
    });

    // Live Force Arrows on Front Suspension Strut during Whoops
    if (this.phase === 'driving') {
      if (Math.abs(this.defl) > 0.02) {
        const pushLen = Math.min(68, Math.max(22, Math.abs(this.defl / this.maxTravelM) * 68));
        drawForceArrow(
          ctx,
          frontWheelX + 44,
          frontWheelY - 10,
          frontWheelX + 44,
          frontWheelY - 10 - pushLen,
          '#38bdf8',
          'Spring Push'
        );
      }
      if (Math.abs(this.dydt - this.v) > 0.12 && this.damperId !== 'none') {
        drawForceArrow(
          ctx,
          rearWheelX - 42,
          rearWheelY - 15,
          rearWheelX - 42,
          rearWheelY - 58,
          '#fb923c',
          'Oil Squish'
        );
      }
    }

    // Suspension Travel Meter Bar beside Buggy
    const meterX = frontWheelX + 76;
    const meterY = baseGroundY - 185;
    const meterH = 140;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(meterX, meterY, 26, meterH, 8);
    ctx.fill();
    ctx.stroke();

    const fillPct = Math.max(0, Math.min(100, (this.defl / this.maxTravelM) * 100));
    const maxPct = Math.max(0, Math.min(100, (this.maxDefl / this.maxTravelM) * 100));
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

    // Bottomed Out / Pogo Bucking Warning Callout above Buggy
    if (this.bottomedOut) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#fef2f2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(buggyCenterX - 122, chassisCenterY - 116, 250, 40, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 15px "Fredoka", "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💥 CLANG! BOTTOMED OUT! (100%)', buggyCenterX + 3, chassisCenterY - 91);
      ctx.restore();
    } else if (this.buckedRider) {
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fffbeb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(buggyCenterX - 122, chassisCenterY - 116, 250, 40, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 14px "Fredoka", "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🦘 POGO BUCKING! ADD SHOCK OIL!', buggyCenterX + 3, chassisCenterY - 91);
      ctx.restore();
    }

    // Right Panel on Canvas: Live Shock Travel & Buggy Ride Graph
    const graphX = W * 0.55;
    const graphY = 22;
    const graphW = W * 0.42;
    const graphH = H * 0.63;

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
    ctx.fillText('📈 Live Shock Squish Over Whoops (Stay < 100% CLANG!)', graphX + 14, graphY + 24);

    const plotX = graphX + 46;
    const plotY = graphY + 42;
    const plotW = graphW - 62;
    const plotH = graphH - 60;
    const midY = plotY + plotH * 0.54;

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
    ctx.fillText('100% CLANG! (Bottom-Out)', plotX + 6, bottomLineY - 5);

    // Green smooth ride zone band
    ctx.fillStyle = 'rgba(34, 197, 94, 0.16)';
    ctx.fillRect(plotX, midY - 16, plotW, 32);

    // Zero equilibrium line
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotX, midY);
    ctx.lineTo(plotX + plotW, midY);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText('Level (0%)', plotX - 6, midY + 4);

    // Plot shock deflection curve across whoops
    if (this.history.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      const maxPlotTime = Math.max(4.5, this.simTime);
      this.history.forEach((pt, idx) => {
        const px = plotX + Math.min(1, pt.t / maxPlotTime) * plotW;
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
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(18, stripY, W - 36, 36, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 13px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `🧠 Whoop Math: ${this.buggySpeedMph} MPH × ${this.whoopSizeFt} ft Whoops × 2 = ${energy.totalUnits} Bump Power  ➔  ${energy.storedSpringUnits} Spring Power + ${energy.movingSpeedUnits} Speed Power + ${energy.shockHeatUnits} Oil Heat`,
      W / 2,
      stripY + 23
    );
  }
}
