/**
 * Lab 3: Spring-Launcher Bumper Carts (Palm III Chapter 4, Sections 4.3 & 4.6)
 * Real Time-Domain Physics:
 *   1. Elastic Spring Potential Energy -> Kinetic Energy: V(x) = 1/2 k x^2 = 1/2 m_1 v_1^2
 *   2. Conservation of Momentum & Restitution (Eqs. 4.6.3–4.6.7):
 *        m_1 v_1 + m_2 v_2 = m_1 v_3 + m_2 v_4
 *        v_4 - v_3 = e (v_1 - v_2)
 *   3. Post-collision track friction deceleration integrated via RK4 at fixed dt = 1/120 s.
 */

import { rk4Step, drawForceArrow, soundFX } from '../solver.js';

export const BUMPER_OPTIONS = [
  { id: 'mud', label: '🧽 Mud Splat (Stick Together!)', e: 0.0, color: '#a16207' },
  { id: 'tire', label: '🛞 Bike Tire Bounce (Medium)', e: 0.6, color: '#3b82f6' },
  { id: 'spring', label: '⚡ Super Spring (100% Bounce!)', e: 1.0, color: '#10b981' }
];

export const CHALLENGES_LAB3 = [
  {
    id: 'c1',
    title: 'Challenge 1: Equal-Weight Super Spring Swap!',
    mission:
      'Cart A (2 Crates) and Target Cart B (2 Crates) have equal weight! Use the ⚡ Super Spring bumper and pick the right Spring Pull-Back Clicks (6 Clicks) to park Cart B squarely in the Green Goal Zone!',
    setup: { pullClicks: 3, cratesA: 2, cratesB: 2, bumperId: 'spring' },
    question: '🔮 When two 2-Crate carts hit with a ⚡ Super Spring bumper, what happens to their speeds?',
    predictions: [
      { id: 'p1', text: 'Cart A stops dead (0 Speed) and hands 100% of its Crash Oomph and Speed to Cart B!', correct: true },
      { id: 'p2', text: 'Both carts glue together and move backward!', correct: false },
      { id: 'p3', text: 'Neither cart moves after the crash!', correct: false }
    ],
    checkWin: (summary) =>
      summary.inGoalZone &&
      !summary.fellOffTrack &&
      summary.cratesA === 2 &&
      summary.cratesB === 2 &&
      summary.bumperId === 'spring',
    winMessage: 'BULLSEYE! Equal weights with a Super Spring swap speeds 100%—parking Cart B right in the Green Goal Zone!'
  },
  {
    id: 'c2',
    title: 'Challenge 2: The 🧽 Mud Splat Sticky Coupling!',
    mission:
      'Switch to the 🧽 Mud Splat bumper! Cart A (2 Crates) smashes into Cart B (2 Crates) and they stick together as a 4-Crate train! Pull the spring back far enough (8 or 9 Clicks) to push both into the Goal Zone!',
    setup: { pullClicks: 4, cratesA: 2, cratesB: 2, bumperId: 'mud' },
    question: '🔮 When a 2-Crate cart hits a resting 2-Crate cart and sticks with Mud Splat (4 Crates total), what is their new speed?',
    predictions: [
      { id: 'p1', text: 'Total weight doubles (4 Crates), so their speed cuts in HALF to keep Crash Oomph (Weight × Speed) equal!', correct: true },
      { id: 'p2', text: 'Their speed doubles when they stick together!', correct: false },
      { id: 'p3', text: 'Crash Oomph disappears before the collision!', correct: false }
    ],
    checkWin: (summary) => summary.inGoalZone && !summary.fellOffTrack && summary.bumperId === 'mud',
    winMessage: 'MUD SPLAT MASTER! You kept Crash Oomph conserved (2 × Speed = 4 × Half-Speed) and rolled right into the Goal Zone!'
  },
  {
    id: 'c3',
    title: 'Challenge 3: Heavy Monster Cart vs. Light Cart (Don\'t Overshoot!)',
    mission:
      'Cart A has 4 Heavy Crates and Target Cart B has only 1 Light Crate! If you pull back 10 Clicks, Cart B flies off the cliff! Dial back your Pull Clicks so Cart B lands safely inside the Green Goal Zone!',
    setup: { pullClicks: 10, cratesA: 4, cratesB: 1, bumperId: 'tire' },
    question: '🔮 Why does a 4-Crate cart launch a 1-Crate cart at super high speed?',
    predictions: [
      { id: 'p1', text: '4 Crates carry huge Crash Oomph (4 × Speed), so the 1-Crate cart shoots forward way faster!', correct: true },
      { id: 'p2', text: 'Heavy carts bounce backward off light carts!', correct: false },
      { id: 'p3', text: 'Weight has no effect on Crash Oomph!', correct: false }
    ],
    checkWin: (summary) =>
      summary.inGoalZone &&
      !summary.fellOffTrack &&
      summary.cratesA === 4 &&
      summary.cratesB === 1,
    winMessage: 'PRECISION ENGINEER! You tamed the 4-Crate vs 1-Crate momentum transfer without flying off the track!'
  }
];

export class CollisionsLab {
  constructor(canvas, onUpdateUI) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onUpdateUI = onUpdateUI;

    // Controls
    this.pullClicks = 6;     // 1 to 10 clicks
    this.cratesA = 2;        // 1 to 5 crates
    this.cratesB = 2;        // 1 to 5 crates
    this.bumperId = 'spring';
    this.slowMo = false;     // 🐢 Slow-Mo Crash Replay toggle

    this.mode = 'sandbox';
    this.selectedPrediction = null;
    this.predictionFeedback = null;

    // Track geometry in normalized track units (0 to 100 m)
    this.goalStart = 68;
    this.goalEnd = 86;
    this.trackLimit = 95;

    this.resetSimulation();
  }

  getBumper() {
    return BUMPER_OPTIONS.find((b) => b.id === this.bumperId) || BUMPER_OPTIONS[2];
  }

  getLaunchMetrics() {
    // 4th-grade friendly whole numbers rooted in V = 1/2 k x^2 = 1/2 m v^2
    // Stored Spring Power = clicks^2 * 10
    const storedSpringPower = this.pullClicks * this.pullClicks * 10;
    // Launch velocity v1 = clicks * 4 * sqrt(2 / cratesA) rounded to clean whole number
    const rawV1 = this.pullClicks * 4 * Math.sqrt(2 / this.cratesA);
    const launchSpeedA = Math.max(2, Math.round(rawV1));
    const initialOomph = this.cratesA * launchSpeedA;
    return {
      storedSpringPower,
      launchSpeedA,
      initialOomph
    };
  }

  resetSimulation() {
    this.phase = 'ready'; // 'ready' | 'releasing' | 'rolling_pre' | 'impact_flash' | 'rolling_post' | 'finished'
    this.simTime = 0;
    this.impactTimer = 0;

    // Positions along track (0 to 100)
    this.posA = 16 - this.pullClicks * 0.7;
    this.posB = 46;
    this.vA = 0;
    this.vB = 0;

    // Pre/post collision whole-number scoreboard values
    const { launchSpeedA, initialOomph } = this.getLaunchMetrics();
    this.preSpeedA = launchSpeedA;
    this.preOomphA = initialOomph;
    this.postSpeedA = 0;
    this.postSpeedB = 0;
    this.impulseStrength = 0;
    this.collided = false;

    this.statusBanner = 'Pull back the launcher spring and press 💥 LAUNCH CART!';
    this.statusType = 'neutral';
    this._notifyUI();
  }

  launchCart() {
    if (this.mode !== 'sandbox' && !this.selectedPrediction) {
      this.statusBanner = '🔮 Pick your Scientist Prediction first, then launch the cart!';
      this.statusType = 'warn';
      this._notifyUI();
      return;
    }
    this.resetSimulation();
    const { launchSpeedA } = this.getLaunchMetrics();
    this.vA = launchSpeedA;
    this.phase = 'rolling_pre';
    this.statusBanner = '🚀 Spring released! Stored Spring Power transformed into Moving Speed Power!';
    this.statusType = 'active';
    soundFX.playPop(500, 0.1);
    this._notifyUI();
  }

  setMode(modeId) {
    this.mode = modeId;
    this.selectedPrediction = null;
    this.predictionFeedback = null;
    if (modeId !== 'sandbox') {
      const ch = CHALLENGES_LAB3.find((c) => c.id === modeId);
      if (ch) {
        this.pullClicks = ch.setup.pullClicks;
        this.cratesA = ch.setup.cratesA;
        this.cratesB = ch.setup.cratesB;
        this.bumperId = ch.setup.bumperId;
      }
    }
    this.resetSimulation();
  }

  selectPrediction(predId) {
    const ch = CHALLENGES_LAB3.find((c) => c.id === this.mode);
    if (!ch) return;
    const pred = ch.predictions.find((p) => p.id === predId);
    if (!pred) return;
    this.selectedPrediction = predId;
    this.predictionFeedback = pred.correct
      ? '✅ Awesome prediction! Watch the Crash Oomph (Weight × Speed) scoreboards above both carts!'
      : '🤔 Remember: Total Crash Oomph before the smash equals Total Crash Oomph right after the smash!';
    soundFX.playPop(pred.correct ? 660 : 420, 0.09);
    this._notifyUI();
  }

  step(dt) {
    if (this.phase === 'ready' || this.phase === 'finished') return;

    const effDt = this.slowMo ? dt * 0.28 : dt;
    this.simTime += effDt;

    if (this.phase === 'rolling_pre') {
      // Cart A travels at constant launch speed on low-friction steel rails until collision
      this.posA += this.vA * effDt * 1.15;
      const cartWidth = 10;
      if (this.posA + cartWidth >= this.posB) {
        this.posA = this.posB - cartWidth;
        this._resolveCollision();
      }
      this._notifyUI();
    } else if (this.phase === 'impact_flash') {
      this.impactTimer += effDt;
      if (this.impactTimer >= (this.slowMo ? 0.32 : 0.18)) {
        this.phase = 'rolling_post';
      }
      this._notifyUI();
    } else if (this.phase === 'rolling_post') {
      // Post-collision motion with gentle track rolling resistance so carts come to rest in or past the Goal Zone
      const frictionDecel = 11.2; // tuned so 24 speed stops at posB(46) + 24^2/(2*11.2)*1.05 ~ 73 (center of Goal Zone 68..86)
      const derivs = (_t, state) => {
        const [xA, velA, xB, velB] = state;
        const accA = Math.abs(velA) > 0.08 ? -Math.sign(velA) * frictionDecel : 0;
        const accB = Math.abs(velB) > 0.08 ? -Math.sign(velB) * frictionDecel : 0;
        return [velA * 1.05, accA, velB * 1.05, accB];
      };

      const next = rk4Step(this.simTime, [this.posA, this.vA, this.posB, this.vB], effDt, derivs, {});
      this.posA = Math.max(6, next[0]);
      this.vA = Math.abs(next[1]) < 0.15 ? 0 : next[1];
      this.posB = next[2];
      this.vB = Math.abs(next[3]) < 0.15 ? 0 : next[3];

      // Keep mud-splat coupled carts locked together
      if (this.bumperId === 'mud') {
        this.posA = this.posB - 10;
        this.vA = this.vB;
      }

      if (this.posB >= this.trackLimit) {
        this.posB = this.trackLimit + 3;
        this.vA = 0;
        this.vB = 0;
        this.phase = 'finished';
        this._evaluateResult(true);
      } else if (this.vA === 0 && this.vB === 0) {
        this.phase = 'finished';
        this._evaluateResult(false);
      }
      this._notifyUI();
    }
  }

  _resolveCollision() {
    // Palm III Section 4.6 Eqs. (4.6.2)–(4.6.7), Book pp. 223–225 / PDF pp. 236–238:
    // m1 v1 + m2 v2 = m1 v3 + m2 v4
    // v4 - v3 = e (v1 - v2)
    const m1 = this.cratesA;
    const m2 = this.cratesB;
    const v1 = this.vA;
    const e = this.getBumper().e;

    const v3 = ((m1 - e * m2) / (m1 + m2)) * v1;
    const v4 = (((1 + e) * m1) / (m1 + m2)) * v1;

    this.vA = v3;
    this.vB = v4;
    this.postSpeedA = Math.round(v3);
    this.postSpeedB = Math.round(v4);
    this.impulseStrength = Math.round(m2 * v4); // Linear impulse A = int f(t) dt = delta(m*v)
    this.collided = true;
    this.phase = 'impact_flash';
    this.impactTimer = 0;
    soundFX.playClang();
  }

  _evaluateResult(fellOffTrack) {
    const cartBCenter = this.posB + 5;
    const inGoalZone = !fellOffTrack && cartBCenter >= this.goalStart && cartBCenter <= this.goalEnd;
    const summary = {
      inGoalZone,
      fellOffTrack,
      cratesA: this.cratesA,
      cratesB: this.cratesB,
      bumperId: this.bumperId,
      pullClicks: this.pullClicks
    };

    if (fellOffTrack) {
      this.statusBanner = `💥 WHOA! Cart B flew off the end of the track! Too much Crash Oomph—use fewer Spring Pull-Back Clicks!`;
      this.statusType = 'fail';
      return;
    }

    if (!inGoalZone) {
      if (cartBCenter < this.goalStart) {
        this.statusBanner = `🛑 Stopped short of the Green Goal Zone! Pull the spring back more clicks or add crates to Cart A!`;
      } else {
        this.statusBanner = `⚠️ Rolled past the Green Goal Zone! Dial back the Spring Pull-Back Clicks slightly!`;
      }
      this.statusType = 'warn';
      return;
    }

    if (this.mode !== 'sandbox') {
      const ch = CHALLENGES_LAB3.find((c) => c.id === this.mode);
      if (ch && ch.checkWin(summary)) {
        this.statusBanner = `🏆 CHALLENGE COMPLETE! ${ch.winMessage}`;
        this.statusType = 'win';
        soundFX.playWinFanfare();
        if (this.onWin) this.onWin(this.mode);
        return;
      } else if (ch) {
        this.statusBanner = `Landed in the Goal Zone, but make sure your Crates & Bumper match the Challenge rules!`;
        this.statusType = 'warn';
        return;
      }
    }

    this.statusBanner = `🎯 BULLSEYE! Target Cart B parked squarely inside the Green Goal Zone!`;
    this.statusType = 'win';
    soundFX.playWinFanfare();
  }

  getTextbookMathInfo() {
    const { launchSpeedA } = this.getLaunchMetrics();
    const e = this.getBumper().e;
    const m1 = this.cratesA;
    const m2 = this.cratesB;
    const v3 = (((m1 - e * m2) / (m1 + m2)) * launchSpeedA).toFixed(1);
    const v4 = ((((1 + e) * m1) / (m1 + m2)) * launchSpeedA).toFixed(1);
    return {
      title: 'Chapter 4 (Sections 4.3 & 4.6): Energy Methods, Collisions & Impulse',
      equation: 'V(x) = ½kx² = ½m₁v₁²   |   m₁v₁ + m₂v₂ = m₁v₃ + m₂v₄   |   ∫ f(t)dt = Δ(mv)',
      citation:
        'Palm III, Chapter 4: Elastic Potential & Kinetic Energy Conservation ½mẋ² + ½kx² = const (Section 4.3, Eq. 4.3.1, Book p. 190 / PDF p. 203); Linear Impulse-Momentum & Inelastic/Elastic Collisions (Section 4.6, Eqs. 4.6.1–4.6.7, Examples 4.6.1 & 4.6.2, Book pp. 223–225 / PDF pp. 236–238).',
      liveParams: [
        `Cart A Mass (m₁): ${m1} units | Cart B Mass (m₂): ${m2} units | Restitution (e): ${e.toFixed(1)}`,
        `Pre-Collision Velocity (v₁): ${launchSpeedA} m/s | Momentum (m₁v₁): ${m1 * launchSpeedA} N·s`,
        `Post-Collision Velocities (Eq. 4.6.7): v₃ = ${v3} m/s, v₄ = ${v4} m/s`,
        `Collision Linear Impulse (A = ∫ f(t)dt = m₂v₄): ${(m2 * Number(v4)).toFixed(1)} N·s`
      ],
      analogy:
        'When you shoot a heavy shooter marble into a light target marble, momentum (Weight × Speed) is handed over at the moment of impact—and how bouncy the bumper is decides whether they stick together or ricochet apart!'
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

    // Science Arcade Track Studio Backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const { storedSpringPower, launchSpeedA, initialOomph } = this.getLaunchMetrics();
    const bumper = this.getBumper();

    // Top Momentum Conservation Scoreboard Banner
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(16, 14, W - 32, 54, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 15px "Fredoka", "Nunito", sans-serif';
    ctx.textAlign = 'center';
    if (!this.collided) {
      ctx.fillText(
        `⚡ Stored Spring Power (${storedSpringPower}) ➔ Cart A: ${this.cratesA} Crates × ${launchSpeedA} Speed = ${initialOomph} Crash Oomph!`,
        W / 2,
        46
      );
    } else {
      const oomphA = this.cratesA * this.postSpeedA;
      const oomphB = this.cratesB * this.postSpeedB;
      ctx.fillStyle = '#fef08a';
      ctx.fillText(
        `💥 CRASH OOMPH CONSERVED! Before: ${initialOomph} Oomph  =  After: Cart A (${this.cratesA}×${this.postSpeedA}=${oomphA}) + Cart B (${this.cratesB}×${this.postSpeedB}=${oomphB}) = ${oomphA + oomphB} Oomph!`,
        W / 2,
        46
      );
    }

    // Track Coordinate Helper (maps 0..100 track units to pixels)
    const trackLeft = 56;
    const trackRight = W - 46;
    const trackY = H * 0.68;
    const toPx = (u) => trackLeft + (u / 100) * (trackRight - trackLeft);

    // Green Goal Zone Shading
    const goalX1 = toPx(this.goalStart);
    const goalX2 = toPx(this.goalEnd);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(goalX1, trackY - 115, goalX2 - goalX1, 115, [12, 12, 0, 0]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4ade80';
    ctx.font = '900 14px "Fredoka", "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎯 GREEN GOAL ZONE', (goalX1 + goalX2) / 2, trackY - 92);

    // Danger Cliff Zone at Right End
    const cliffX = toPx(this.trackLimit);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.fillRect(cliffX, trackY - 80, W - cliffX - 16, 80);
    ctx.fillStyle = '#f87171';
    ctx.font = '800 12px "Nunito", sans-serif';
    ctx.fillText('⚠️ CLIFF!', cliffX + 26, trackY - 60);

    // Steel Track Rail
    ctx.fillStyle = '#475569';
    ctx.fillRect(24, trackY, W - 48, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(24, trackY, W - 48, 4);

    // Left Spring Wall & Giant Launcher Coil Spring
    const wallX = 28;
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.fillRect(wallX, trackY - 75, 18, 75);

    const cartAX = toPx(this.posA);
    const cartBX = toPx(this.posB);
    const cartW = ((10) / 100) * (trackRight - trackLeft);
    const cartH = 44;

    // Draw Giant Coil Spring connecting Wall to Cart A (when ready) or at rest length
    const springEndX = this.phase === 'ready' ? cartAX : toPx(17);
    const coils = 8;
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(wallX + 18, trackY - 26);
    for (let i = 1; i <= coils * 2; i++) {
      const sx = wallX + 18 + (i / (coils * 2)) * Math.max(18, springEndX - (wallX + 18));
      const sy = trackY - 26 + (i % 2 === 0 ? -12 : 12);
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();

    // Helper to draw a Cart + Crates + Scoreboard + Oomph Arrow
    const drawCart = (x, crates, speedDisplay, oomphDisplay, bodyColor, title, isCartA) => {
      const y = trackY - cartH - 8;

      // Wheels
      [x + 16, x + cartW - 16].forEach((wx) => {
        ctx.beginPath();
        ctx.arc(wx, trackY - 8, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      // Cart Chassis
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, cartW, cartH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px "Fredoka", "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, x + cartW / 2, y + 27);

      // Bumper nose on inner facing edge
      const bumperX = isCartA ? x + cartW : x - 10;
      ctx.fillStyle = bumper.color;
      ctx.beginPath();
      ctx.roundRect(bumperX, y + 10, 10, 24, 5);
      ctx.fill();

      // Cargo Crates stacked on top
      for (let c = 0; c < crates; c++) {
        const cy = y - 18 - c * 17;
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x + 12, cy, cartW - 24, 15, 4);
        ctx.fill();
        ctx.stroke();
      }

      // Whole-Number "Weight × Speed = Crash Oomph" Floating Scoreboard above Cart
      const boardY = y - 26 - crates * 17 - 44;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - 24, boardY, cartW + 48, 38, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 12px "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${crates} Crates × ${speedDisplay} Speed`, x + cartW / 2, boardY + 15);
      ctx.fillStyle = '#fef08a';
      ctx.font = '900 13px "Fredoka", "Nunito", sans-serif';
      ctx.fillText(`= ${oomphDisplay} Crash Oomph`, x + cartW / 2, boardY + 31);

      // Stretching Crash Oomph Arrow
      if (Math.abs(speedDisplay) > 0) {
        const dir = Math.sign(speedDisplay);
        const arrowLen = Math.min(110, Math.max(28, Math.abs(oomphDisplay) * 1.1));
        const startX = x + cartW / 2;
        const arrowY = y - 10;
        drawForceArrow(
          ctx,
          startX,
          arrowY,
          startX + dir * arrowLen,
          arrowY,
          isCartA ? '#38bdf8' : '#22c55e',
          `${oomphDisplay} Oomph`
        );
      }
    };

    const dispSpeedA =
      this.phase === 'ready'
        ? launchSpeedA
        : !this.collided
        ? Math.round(this.vA)
        : this.postSpeedA;
    const dispOomphA = this.cratesA * dispSpeedA;

    const dispSpeedB = !this.collided ? 0 : this.postSpeedB;
    const dispOomphB = this.cratesB * dispSpeedB;

    drawCart(cartAX, this.cratesA, dispSpeedA, dispOomphA, '#0284c7', 'CART A', true);
    drawCart(cartBX, this.cratesB, dispSpeedB, dispOomphB, '#16a34a', 'CART B', false);

    // Impact Flash Starburst at Moment of Collision
    if (this.phase === 'impact_flash' || (this.collided && this.simTime < 1.8)) {
      const hitX = cartAX + cartW + 4;
      const hitY = trackY - 32;
      ctx.save();
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const r = i % 2 === 0 ? 34 : 16;
        const a = (i * Math.PI) / 6;
        const px = hitX + Math.cos(a) * r;
        const py = hitY + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 12px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`+${this.impulseStrength} PUSH!`, hitX, hitY + 4);
      ctx.restore();
    }

    // Bottom Explanation Strip
    const stripY = H - 48;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = bumper.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(16, stripY, W - 32, 36, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 13px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `🧠 Bumper Rule (${bumper.label}): ${
        this.bumperId === 'mud'
          ? 'Carts lock together and share their Crash Oomph!'
          : this.bumperId === 'spring'
          ? '100% Super Bounce transfers maximum speed into Cart B!'
          : 'Medium Tire Bounce shares speed and cushion!'
      } ${this.slowMo ? ' [🐢 SLOW-MO REPLAY ACTIVE]' : ''}`,
      W / 2,
      stripY + 23
    );
  }
}
