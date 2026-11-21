/**
 * Lab 4: Mountain Cabin Water & Hot Cocoa Station (Palm III Chapter 7, Part I & Part II)
 * Big Toggle Switch between:
 *   - 💧 WATER TOWER MODE (Ch. 7 Part I: Fluid Capacitance, Valve Resistance & Hydrostatic Head)
 *       ODE: A * dh/dt = q_vi - (q_top + q_mid + q_bot)
 *       where each spigot outflow depends on hydrostatic depth (h - L_j) and Valve Squeeze.
 *   - 🔥 HOT COCOA HEATER MODE (Ch. 7 Part II: Thermal Capacitance & Thermal Resistance)
 *       ODE: C * dT/dt = q_heater - (T - T_outside) / R
 * Integrated continuously in real time at fixed dt = 1/120 s using RK4.
 */

import { rk4Step, drawForceArrow, soundFX } from '../solver.js';

export const TANK_WIDTH_OPTIONS = [
  { id: 'slim', label: 'Slim Tower (Width 1)', area: 1.0 },
  { id: 'medium', label: 'Cabin Tank (Width 2)', area: 2.0 },
  { id: 'wide', label: 'Giant Cistern (Width 4)', area: 4.0 }
];

export const BUCKET_SIZE_OPTIONS = [
  { id: 'mug', label: 'Camp Mug (Size 1)', C: 1.2 },
  { id: 'kettle', label: 'Cabin Kettle (Size 2)', C: 2.5 },
  { id: 'vat', label: 'Giant Cocoa Vat (Size 4)', C: 5.0 }
];

export const BLANKET_INSULATION_OPTIONS = [
  { id: 'bare', label: 'Bare Metal Pot (1x Blanket)', R: 1.0, factor: 1 },
  { id: 'wool', label: 'Wool Jacket (2x Blanket)', R: 2.0, factor: 2 },
  { id: 'foam', label: 'Super Thermos Foam (3x Blanket)', R: 3.0, factor: 3 }
];

export const CHALLENGES_LAB4 = [
  {
    id: 'c1',
    title: 'Challenge 1: 💧 Deep Water Push & Steady 8-ft Water Tower!',
    station: 'water',
    mission:
      'Open the Bottom and Middle Spigots and set the Fill Pump (gal/sec) so Water In equals Water Out and the water level locks steady inside the Green Target Band (8 ft) for 3 seconds!',
    setup: {
      station: 'water',
      pumpInflow: 3,
      tankWidthId: 'medium',
      spigotTopOpen: false,
      spigotMidOpen: true,
      spigotBotOpen: true,
      valveSqueeze: 1, // 1x normal open
      waterHeight: 6.0
    },
    question: '🔮 When the water is 8 ft deep, why does the Bottom Spigot shoot water much farther than the Middle Spigot?',
    predictions: [
      { id: 'p1', text: 'The top of the tank has more gravity than the bottom!', correct: false },
      { id: 'p2', text: 'All three spigots always shoot the exact same distance!', correct: false },
      { id: 'p3', text: 'Deep Water Push! All 8 ft of heavy water pushes on the bottom spigot (4 gal/sec), while only 4 ft pushes on the middle (2 gal/sec)!', correct: true }
    ],
    checkWin: (state) =>
      state.station === 'water' &&
      Math.abs(state.waterHeight - 8.0) <= 0.45 &&
      Math.abs(state.netFlow) <= 0.35 &&
      state.steadyTimer >= 2.5,
    winMessage: 'HYDRO-MASTER! With Bottom (4 gal/s) + Middle (2 gal/s) = 6 gal/s Out, setting the Fill Pump to 6 gal/s locked the tank at 8 ft!'
  },
  {
    id: 'c2',
    title: 'Challenge 2: 🔥 Snowstorm Hot Cocoa Balance (Hold 150°F!)',
    station: 'thermal',
    mission:
      'A 30°F snowstorm is freezing the cabin! Wrap the kettle in the 2x Wool Jacket Blanket and set the Campfire Heater so Heat In equals Cold Loss Out at a cozy 150°F!',
    setup: {
      station: 'thermal',
      heaterPower: 20,
      bucketSizeId: 'kettle',
      blanketId: 'bare',
      outsideTemp: 30,
      cocoaTemp: 110
    },
    question: '🔮 At 150°F inside and 30°F outside (120°F gap), wrapping the kettle in a 2x Wool Jacket cuts heat loss to 60 Heat/sec. What Heater Power holds 150°F steady?',
    predictions: [
      { id: 'p1', text: 'Turn the Heater off (0 Heat/sec) and wait for snow to heat it up!', correct: false },
      { id: 'p2', text: 'Set Heater Power to 60 Heat/sec so Heat In (60) matches Escaping Heat Out (60)!', correct: true },
      { id: 'p3', text: 'Set Heater Power to 100 Heat/sec so it boils over at 212°F!', correct: false }
    ],
    checkWin: (state) =>
      state.station === 'thermal' &&
      state.cocoaTemp >= 145 &&
      state.cocoaTemp <= 155 &&
      Math.abs(state.netHeat) <= 4 &&
      state.steadyTimer >= 2.2,
    winMessage: 'COZY CABIN CHEF! Heat In (60) balanced Escaping Cold Loss (60) to hold the cocoa right at 150°F!'
  },
  {
    id: 'c3',
    title: 'Challenge 3: 🔥 Blizzard Emergency (0°F Outside + 3x Super Thermos!)',
    station: 'thermal',
    mission:
      'Arctic Blizzard drops Outside Air to 0°F! Upgrade to the 3x Super Thermos Foam Blanket and dial in the exact Heater Power (50 Heat/sec) to keep the Giant Cocoa Vat at 150°F!',
    setup: {
      station: 'thermal',
      heaterPower: 30,
      bucketSizeId: 'vat',
      blanketId: 'wool',
      outsideTemp: 0,
      cocoaTemp: 135
    },
    question: '🔮 At 150°F cocoa and 0°F blizzard (150°F gap), how much heat escapes through a 3x Super Thermos Blanket (150 ÷ 3)?',
    predictions: [
      { id: 'p1', text: '150 ÷ 3 = 50 Heat/sec escapes! Matching Heater Power at 50 Heat/sec locks the temperature at 150°F!', correct: true },
      { id: 'p2', text: 'Heat flows from the 0°F snowstorm into the 150°F cocoa!', correct: false },
      { id: 'p3', text: 'Heat Bucket Size changes the final steady temperature instead of how fast it heats!', correct: false }
    ],
    checkWin: (state) =>
      state.station === 'thermal' &&
      state.outsideTemp === 0 &&
      state.blanketId === 'foam' &&
      state.cocoaTemp >= 146 &&
      state.cocoaTemp <= 154 &&
      Math.abs(state.netHeat) <= 4 &&
      state.steadyTimer >= 2.0,
    winMessage: 'ARCTIC THERMODYNAMICS PRO! 3x Blanket Insulation cut the 150°F blizzard loss to 50 Heat/sec, and your 50 Heater matched it perfectly!'
  }
];

export class FluidThermalLab {
  constructor(canvas, onUpdateUI) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onUpdateUI = onUpdateUI;

    // Station Toggle: 'water' (Fluid Systems) | 'thermal' (Thermal Systems)
    this.station = 'water';

    // Water Tower Controls (Part I)
    this.pumpInflow = 6;        // 0 to 10 gal/sec
    this.tankWidthId = 'medium';
    this.spigotTopOpen = false; // at L_top = 8 ft
    this.spigotMidOpen = true;  // at L_mid = 4 ft
    this.spigotBotOpen = true;  // at L_bot = 0 ft
    this.valveSqueeze = 1;      // 1 = Wide Open (100% flow), 2 = Half Squeeze (50% flow)
    this.waterHeight = 6.0;     // 0 to 10 ft

    // Hot Cocoa Heater Controls (Part II)
    this.heaterPower = 60;      // 0 to 100 Heat/sec
    this.bucketSizeId = 'kettle';
    this.blanketId = 'wool';
    this.outsideTemp = 30;      // 0°F, 30°F, 50°F
    this.cocoaTemp = 120;       // °F

    this.mode = 'sandbox';
    this.selectedPrediction = null;
    this.predictionFeedback = null;
    this.steadyTimer = 0;
    this.wonCurrentChallenge = false;

    this.statusBanner = 'Adjust the Fill Pump, Spigots, or Cocoa Heater and watch the real-time balance!';
    this.statusType = 'neutral';
  }

  setStation(stationId) {
    this.station = stationId;
    this.steadyTimer = 0;
    soundFX.playPop(520, 0.08);
    this._notifyUI();
  }

  setMode(modeId) {
    this.mode = modeId;
    this.selectedPrediction = null;
    this.predictionFeedback = null;
    this.steadyTimer = 0;
    this.wonCurrentChallenge = false;

    if (modeId !== 'sandbox') {
      const ch = CHALLENGES_LAB4.find((c) => c.id === modeId);
      if (ch) {
        this.station = ch.setup.station;
        if (ch.setup.station === 'water') {
          this.pumpInflow = ch.setup.pumpInflow;
          this.tankWidthId = ch.setup.tankWidthId;
          this.spigotTopOpen = ch.setup.spigotTopOpen;
          this.spigotMidOpen = ch.setup.spigotMidOpen;
          this.spigotBotOpen = ch.setup.spigotBotOpen;
          this.valveSqueeze = ch.setup.valveSqueeze;
          this.waterHeight = ch.setup.waterHeight;
        } else {
          this.heaterPower = ch.setup.heaterPower;
          this.bucketSizeId = ch.setup.bucketSizeId;
          this.blanketId = ch.setup.blanketId;
          this.outsideTemp = ch.setup.outsideTemp;
          this.cocoaTemp = ch.setup.cocoaTemp;
        }
        this.statusBanner = '🔮 Pick your Scientist Prediction first, then tune the controls to lock in steady balance!';
        this.statusType = 'neutral';
      }
    } else {
      this.statusBanner = 'Free Play Sandbox: Experiment with the Water Tower or Hot Cocoa Station!';
      this.statusType = 'neutral';
    }
    this._notifyUI();
  }

  selectPrediction(predId) {
    const ch = CHALLENGES_LAB4.find((c) => c.id === this.mode);
    if (!ch) return;
    const pred = ch.predictions.find((p) => p.id === predId);
    if (!pred) return;
    this.selectedPrediction = predId;
    this.predictionFeedback = pred.correct
      ? '✅ Spot-on! Now adjust the sliders to balance Inflow = Outflow and hold the Target Zone!'
      : '🤔 Watch the Inflow vs. Outflow arrows on screen to see how Deep Water Push or Blanket Insulation works!';
    soundFX.playPop(pred.correct ? 660 : 420, 0.09);
    this._notifyUI();
  }

  getFluidFlows(h = this.waterHeight) {
    // Clean 4th-grade whole-number scaling at h = 8 ft:
    // Hydrostatic pressure push is proportional to depth below surface (h - L_j).
    // At h = 8 ft with Valve Squeeze = 1 (Wide Open):
    //   Bottom spigot (L = 0 ft, depth = 8 ft) -> 4 gal/sec
    //   Middle spigot (L = 4 ft, depth = 4 ft) -> 2 gal/sec
    //   Top spigot    (L = 8 ft, depth = 0 ft) -> 0 gal/sec (or 1 gal/sec when h = 10 ft)
    const squeezeDiv = this.valveSqueeze; // 1 or 2
    const qBot = this.spigotBotOpen && h > 0 ? Math.max(0, (h - 0) * 0.5) / squeezeDiv : 0;
    const qMid = this.spigotMidOpen && h > 4 ? Math.max(0, (h - 4) * 0.5) / squeezeDiv : 0;
    const qTop = this.spigotTopOpen && h > 8 ? Math.max(0, (h - 8) * 0.5) / squeezeDiv : 0;
    const totalOut = qBot + qMid + qTop;
    const netFlow = this.pumpInflow - totalOut;
    return { qBot, qMid, qTop, totalOut, netFlow };
  }

  getThermalFlows(T = this.cocoaTemp) {
    const blanket = BLANKET_INSULATION_OPTIONS.find((b) => b.id === this.blanketId) || BLANKET_INSULATION_OPTIONS[1];
    // Palm III Section 7.7 Eq. (7.7.1) Newton's Law of Cooling: q_out = (T - T_outside) / R
    const heatLoss = Math.max(0, (T - this.outsideTemp) / blanket.R);
    const netHeat = this.heaterPower - heatLoss;
    return { heatLoss, netHeat, R: blanket.R };
  }

  step(dt) {
    if (this.station === 'water') {
      const widthOpt = TANK_WIDTH_OPTIONS.find((w) => w.id === this.tankWidthId) || TANK_WIDTH_OPTIONS[1];
      const A = widthOpt.area;

      // Palm III Section 7.4 Eq. (Example 7.4.1 / 7.4.3): A * dh/dt = q_vi - q_vo(h)
      const derivs = (_t, state) => {
        const hCurr = Math.max(0, Math.min(10.5, state[0]));
        const { netFlow } = this.getFluidFlows(hCurr);
        return [netFlow / A];
      };

      const [nextH] = rk4Step(0, [this.waterHeight], dt, derivs, {});
      this.waterHeight = Math.max(0, Math.min(10.0, nextH));

      const { netFlow } = this.getFluidFlows(this.waterHeight);
      if (Math.abs(this.waterHeight - 8.0) <= 0.45 && Math.abs(netFlow) <= 0.35) {
        this.steadyTimer += dt;
      } else {
        this.steadyTimer = Math.max(0, this.steadyTimer - dt * 0.5);
      }
    } else {
      const bucket = BUCKET_SIZE_OPTIONS.find((b) => b.id === this.bucketSizeId) || BUCKET_SIZE_OPTIONS[1];
      const C = bucket.C;

      // Palm III Section 7.8 & 7.10 Eq. (Example 7.8.1 & 7.10.1):
      // C * dT/dt = q_heater - (T - T_outside) / R
      const derivs = (_t, state) => {
        const Tcurr = state[0];
        const { netHeat } = this.getThermalFlows(Tcurr);
        return [(netHeat / C) * 1.15];
      };

      const [nextT] = rk4Step(0, [this.cocoaTemp], dt, derivs, {});
      this.cocoaTemp = Math.max(this.outsideTemp, Math.min(212, nextT));

      const { netHeat } = this.getThermalFlows(this.cocoaTemp);
      if (this.cocoaTemp >= 145 && this.cocoaTemp <= 155 && Math.abs(netHeat) <= 4) {
        this.steadyTimer += dt;
      } else {
        this.steadyTimer = Math.max(0, this.steadyTimer - dt * 0.5);
      }
    }

    // Check challenge win condition (works whether or not prediction was clicked first)
    if (this.mode !== 'sandbox' && !this.wonCurrentChallenge) {
      const ch = CHALLENGES_LAB4.find((c) => c.id === this.mode);
      const { netFlow } = this.getFluidFlows();
      const { netHeat } = this.getThermalFlows();
      if (
        ch &&
        ch.checkWin({
          station: this.station,
          waterHeight: this.waterHeight,
          netFlow,
          cocoaTemp: this.cocoaTemp,
          netHeat,
          outsideTemp: this.outsideTemp,
          blanketId: this.blanketId,
          steadyTimer: this.steadyTimer
        })
      ) {
        this.wonCurrentChallenge = true;
        this.statusBanner = `🏆 CHALLENGE COMPLETE! ${ch.winMessage}`;
        this.statusType = 'win';
        soundFX.playWinFanfare();
        if (this.onWin) this.onWin(this.mode);
      }
    }
    this._notifyUI();
  }

  startBalanceTest() {
    this.steadyTimer = 0;
    this.wonCurrentChallenge = false;
    if (this.station === 'water') {
      const { totalOut, netFlow } = this.getFluidFlows();
      this.statusBanner = `💧 Testing Water Tower Balance: Pump In (${this.pumpInflow} gal/s) vs Spigots Out (${totalOut.toFixed(1)} gal/s) -> Net ${netFlow.toFixed(1)} gal/s!`;
    } else {
      const { heatLoss, netHeat } = this.getThermalFlows();
      this.statusBanner = `🔥 Testing Hot Cocoa Balance: Heater In (${this.heaterPower} Heat/s) vs Cold Loss (${Math.round(heatLoss)} Heat/s) -> Net ${Math.round(netHeat)} Heat/s!`;
    }
    this.statusType = 'active';
    soundFX.playPop(520, 0.1);
    this._notifyUI();
  }

  resetStation() {
    if (this.mode !== 'sandbox') {
      this.setMode(this.mode);
    } else {
      if (this.station === 'water') {
        this.waterHeight = 6.0;
        this.pumpInflow = 6;
      } else {
        this.cocoaTemp = 120;
        this.heaterPower = 60;
      }
      this.steadyTimer = 0;
      this.statusBanner = '🔄 Station reset! Adjust controls to test balance!';
      this.statusType = 'neutral';
      soundFX.playPop(420, 0.08);
      this._notifyUI();
    }
  }

  getTextbookMathInfo() {
    if (this.station === 'water') {
      const widthOpt = TANK_WIDTH_OPTIONS.find((w) => w.id === this.tankWidthId) || TANK_WIDTH_OPTIONS[1];
      const { qBot, qMid, qTop, totalOut } = this.getFluidFlows();
      return {
        title: 'Chapter 7 (Part I): Fluid Systems — Tank Capacitance, Hydrostatic Head & Resistance',
        equation: 'A (dh/dt) = q_vi − Σ q_vo,j,   where Δp_j = ρg(h − L_j)   and   q_mo,j = Δp_j / R_j',
        citation:
          'Palm III, Chapter 7, Part I (Sections 7.1–7.4): Fluid Capacitance C = A/g (Section 7.2, Book p. 403 / PDF p. 416), Fluid Resistance R = p/q_m (Eq. 7.3.11, Book p. 409 / PDF p. 422), Liquid-Level System with Orifice & Flow Source (Examples 7.4.1 & 7.4.3, Book pp. 412–415 / PDF pp. 425–428).',
        liveParams: [
          `Tank Cross-Section Area (A): ${widthOpt.area.toFixed(1)} m² | Liquid Level (h): ${this.waterHeight.toFixed(2)} ft`,
          `Inflow Rate (q_vi): ${this.pumpInflow.toFixed(1)} gal/s | Total Outflow (q_vo): ${totalOut.toFixed(1)} gal/s`,
          `Spigot Head Outflows: Top(8ft)=${qTop.toFixed(1)}, Mid(4ft)=${qMid.toFixed(1)}, Bot(0ft)=${qBot.toFixed(1)} gal/s`,
          `Fluid Time Constant (τ = R·A/g): ${(widthOpt.area * this.valveSqueeze * 2.0).toFixed(1)} s`
        ],
        analogy:
          'When you poke three holes in a tall plastic milk jug filled with water, the bottom hole squirts way farther across the sink because the weight of all the water stacked above it creates Deep Water Push (hydrostatic pressure ρgh)!'
      };
    } else {
      const bucket = BUCKET_SIZE_OPTIONS.find((b) => b.id === this.bucketSizeId) || BUCKET_SIZE_OPTIONS[1];
      const { heatLoss, R } = this.getThermalFlows();
      return {
        title: 'Chapter 7 (Part II): Thermal Systems — Thermal Capacitance & Newton\'s Law of Cooling',
        equation: 'C (dT/dt) = q_heater − (T − T_outside) / R   ⟺   RC (dT/dt) + T = R q_heater + T_outside',
        citation:
          'Palm III, Chapter 7, Part II (Sections 7.6–7.8 & 7.10): Thermal Capacitance C = mc_p = ρVc_p (Eq. 7.6.3, Book p. 431 / PDF p. 444), Newton\'s Law of Cooling q_h = ΔT/R (Eq. 7.7.1, Book p. 433 / PDF p. 446), Lumped Thermal Models & Thermostatic Heater (Examples 7.8.1, 7.8.4 & 7.10.1, Book pp. 442–446, 457 / PDF pp. 455–459, 470).',
        liveParams: [
          `Thermal Capacitance (C = mc_p): ${bucket.C.toFixed(1)} kJ/°F | Thermal Resistance (R): ${R.toFixed(1)} °F·s/kJ`,
          `Thermal Time Constant (τ = R·C): ${(R * bucket.C).toFixed(2)} s`,
          `Cocoa Temp (T): ${Math.round(this.cocoaTemp)}°F | Ambient Temp (T_o): ${this.outsideTemp}°F`,
          `Heater Input (q_in): ${this.heaterPower} W vs. Conductive/Convective Loss (q_out = ΔT/R): ${Math.round(heatLoss)} W`
        ],
        analogy:
          'Wrapping your hot cocoa thermos in a thick foam blanket increases Thermal Resistance (R), slowing down the escaping heat leak so a small heater flame can keep your drink toasty in a blizzard!'
      };
    }
  }

  _notifyUI() {
    if (this.onUpdateUI) this.onUpdateUI();
  }

  render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (this.station === 'water') {
      this._renderWaterStation(ctx, W, H);
    } else {
      this._renderThermalStation(ctx, W, H);
    }
  }

  _renderWaterStation(ctx, W, H) {
    // Mountain Sky Backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const { qBot, qMid, qTop, totalOut, netFlow } = this.getFluidFlows();
    const widthOpt = TANK_WIDTH_OPTIONS.find((w) => w.id === this.tankWidthId) || TANK_WIDTH_OPTIONS[1];

    // Top 4th-Grade Flow Balance Scoreboard
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = Math.abs(netFlow) < 0.25 ? '#22c55e' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(16, 14, W - 32, 50, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 15px "Fredoka", "Nunito", sans-serif';
    ctx.textAlign = 'center';
    const balanceState =
      Math.abs(netFlow) < 0.25
        ? '⚖️ STEADY WATER LEVEL!'
        : netFlow > 0
        ? '⬆️ RISING!'
        : '⬇️ DROPPING!';
    ctx.fillText(
      `💧 Fill Pump In: ${this.pumpInflow} gal/s  −  Spigots Out: ${Number(totalOut.toFixed(1))} gal/s  =  ${Number(netFlow.toFixed(1))} gal/s (${balanceState})`,
      W / 2,
      45
    );

    // Tank Geometry
    const tankCenterX = W * 0.36;
    const tankW = widthOpt.area === 1 ? 120 : widthOpt.area === 2 ? 175 : 240;
    const tankLeft = tankCenterX - tankW / 2;
    const tankRight = tankCenterX + tankW / 2;
    const tankBotY = H - 72;
    const tankH = 250; // 10 ft = 250 px (25 px per ft)
    const tankTopY = tankBotY - tankH;

    // Wooden Water Tower Legs
    ctx.fillStyle = '#78350f';
    ctx.fillRect(tankLeft + 12, tankBotY, 16, 42);
    ctx.fillRect(tankRight - 28, tankBotY, 16, 42);

    // Tank Background Glass
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(tankLeft, tankTopY, tankW, tankH, [6, 6, 10, 10]);
    ctx.fill();

    // Target 8-ft Green Band
    const target8Y = tankBotY - (8 / 10) * tankH;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
    ctx.fillRect(tankLeft + 2, target8Y - 11, tankW - 4, 22);
    ctx.strokeStyle = '#22c55e';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(tankLeft, target8Y);
    ctx.lineTo(tankRight, target8Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#4ade80';
    ctx.font = '800 12px "Nunito", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🎯 8 ft Target', tankLeft - 10, target8Y + 4);

    // Water Column inside Tank with Hydrostatic Deep Water Push Gradient
    const waterPx = (this.waterHeight / 10) * tankH;
    const waterTopY = tankBotY - waterPx;
    if (waterPx > 1) {
      const waterGrad = ctx.createLinearGradient(0, waterTopY, 0, tankBotY);
      waterGrad.addColorStop(0, '#38bdf8');
      waterGrad.addColorStop(0.5, '#0284c7');
      waterGrad.addColorStop(1, '#1e3a8a'); // Deep dark blue at bottom for Deep Water Push
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.roundRect(tankLeft + 3, waterTopY, tankW - 6, waterPx - 2, [0, 0, 8, 8]);
      ctx.fill();

      // Depth pressure arrows inside tank
      if (this.waterHeight >= 3) {
        drawForceArrow(
          ctx,
          tankCenterX,
          waterTopY + 18,
          tankCenterX,
          tankBotY - 14,
          '#facc15',
          `Deep Water Push (${this.waterHeight.toFixed(1)} ft)`
        );
      }
    }

    // Tank Border & Depth Ruler Markings (0 to 10 ft)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(tankLeft, tankTopY, tankW, tankH, [6, 6, 10, 10]);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 11px "Nunito", sans-serif';
    ctx.textAlign = 'left';
    for (let ft = 0; ft <= 10; ft += 2) {
      const y = tankBotY - (ft / 10) * tankH;
      ctx.fillRect(tankLeft, y - 1, 10, 2);
      ctx.fillText(`${ft}ft`, tankLeft + 14, y + 4);
    }

    // Top Fill Pump Pipe & Inflow Stream
    const pipeX = tankCenterX - 35;
    ctx.fillStyle = '#64748b';
    ctx.fillRect(pipeX - 40, tankTopY - 34, 52, 14);
    ctx.fillRect(pipeX, tankTopY - 34, 14, 34);

    if (this.pumpInflow > 0) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      const streamW = Math.max(4, this.pumpInflow * 1.3);
      ctx.fillRect(pipeX + 7 - streamW / 2, tankTopY, streamW, Math.max(0, waterTopY - tankTopY + 6));
      drawForceArrow(
        ctx,
        pipeX - 55,
        tankTopY - 27,
        pipeX - 5,
        tankTopY - 27,
        '#38bdf8',
        `Pump: ${this.pumpInflow} gal/s`
      );
    }

    // 3 Drain Spigots on Right Wall (Top = 8 ft, Middle = 4 ft, Bottom = 0 ft)
    const spigots = [
      { label: 'Top Spigot (8 ft)', ft: 8, open: this.spigotTopOpen, flow: qTop, color: '#38bdf8' },
      { label: 'Mid Spigot (4 ft)', ft: 4, open: this.spigotMidOpen, flow: qMid, color: '#0ea5e9' },
      { label: 'Bottom Spigot (0 ft)', ft: 0.3, open: this.spigotBotOpen, flow: qBot, color: '#2563eb' }
    ];

    spigots.forEach((sp) => {
      const sy = tankBotY - (sp.ft / 10) * tankH;
      // Spigot nozzle
      ctx.fillStyle = sp.open ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(tankRight, sy - 9, 26, 18, 4);
      ctx.fill();
      ctx.stroke();

      // Parabolic Water Jet shooting out proportional to hydrostatic head sqrt(depth)
      if (sp.open && sp.flow > 0.05) {
        const headDepth = Math.max(0, this.waterHeight - Math.floor(sp.ft));
        const jetReach = Math.sqrt(headDepth) * (this.valveSqueeze === 1 ? 82 : 52);
        const dropH = tankBotY + 25 - sy;

        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(4, sp.flow * 2.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tankRight + 26, sy);
        for (let s = 1; s <= 16; s++) {
          const u = s / 16;
          const jx = tankRight + 26 + u * jetReach;
          const jy = sy + u * u * dropH;
          ctx.lineTo(jx, jy);
        }
        ctx.stroke();
        ctx.restore();

        // Flow label badge next to jet
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(tankRight + 36, sy - 26, 178, 22, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.font = '800 12px "Nunito", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${sp.label}: ${Number(sp.flow.toFixed(1))} gal/s (Push: ${Math.max(0, Math.round(headDepth))}ft)`,
          tankRight + 42,
          sy - 11
        );
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 12px "Nunito", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${sp.label}: ${sp.open ? '0 gal/s (Above Water)' : 'CLOSED'}`, tankRight + 34, sy + 4);
      }
    });

    // Bottom Kid Explanation Strip
    const stripY = H - 46;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(16, stripY, W - 32, 34, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 13px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `🧠 Deep Water Push Rule: Deeper water presses harder! At 8 ft deep, Bottom Spigot (8 ft push = 4 gal/s) shoots 2x faster than Middle Spigot (4 ft push = 2 gal/s)!`,
      W / 2,
      stripY + 22
    );
  }

  _renderThermalStation(ctx, W, H) {
    // Snowy Mountain Cabin Night Backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(1, '#172554');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const { heatLoss, netHeat, R } = this.getThermalFlows();
    const bucket = BUCKET_SIZE_OPTIONS.find((b) => b.id === this.bucketSizeId) || BUCKET_SIZE_OPTIONS[1];
    const blanket = BLANKET_INSULATION_OPTIONS.find((b) => b.id === this.blanketId) || BLANKET_INSULATION_OPTIONS[1];

    // Top 4th-Grade Heat Balance Scoreboard
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = Math.abs(netHeat) <= 3 ? '#22c55e' : '#f97316';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(16, 14, W - 32, 50, 12);
    ctx.fill();
    ctx.stroke();

    const heatStatus =
      Math.abs(netHeat) <= 3
        ? '⚖️ STEADY TEMPERATURE!'
        : netHeat > 0
        ? '🔥 WARMING UP!'
        : '❄️ COOLING DOWN!';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 15px "Fredoka", "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `🔥 Heater In: ${this.heaterPower} Heat/s  −  Escaping Cold Loss: ${Math.round(heatLoss)} Heat/s  =  ${Math.round(netHeat)} Heat/s (${heatStatus})`,
      W / 2,
      45
    );

    // Hot Cocoa Kettle Center Stage
    const centerX = W * 0.42;
    const kettleBotY = H - 105;
    const kettleW = bucket.C === 1.2 ? 130 : bucket.C === 2.5 ? 175 : 230;
    const kettleH = 185;
    const kettleTopY = kettleBotY - kettleH;

    // Blanket Insulation Wrap around Kettle
    const pad = blanket.factor * 10;
    ctx.fillStyle =
      this.blanketId === 'bare'
        ? 'rgba(148, 163, 184, 0.25)'
        : this.blanketId === 'wool'
        ? 'rgba(234, 179, 8, 0.38)'
        : 'rgba(16, 185, 129, 0.45)';
    ctx.strokeStyle =
      this.blanketId === 'bare' ? '#94a3b8' : this.blanketId === 'wool' ? '#facc15' : '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(centerX - kettleW / 2 - pad, kettleTopY - pad, kettleW + pad * 2, kettleH + pad * 2, 20);
    ctx.fill();
    ctx.stroke();

    // Kettle Metal Body
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(centerX - kettleW / 2, kettleTopY, kettleW, kettleH, 14);
    ctx.fill();
    ctx.stroke();

    // Hot Cocoa Liquid inside Kettle (color shifts from cold blue-brown to warm glowing cocoa)
    const warmthFrac = Math.max(0, Math.min(1, (this.cocoaTemp - 30) / 150));
    const rCol = Math.round(70 + warmthFrac * 150);
    const gCol = Math.round(45 + warmthFrac * 55);
    const bCol = Math.round(60 - warmthFrac * 40);
    ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
    ctx.beginPath();
    ctx.roundRect(centerX - kettleW / 2 + 8, kettleTopY + 26, kettleW - 16, kettleH - 34, 10);
    ctx.fill();

    // Kettle Temperature Readout
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px "Fredoka", "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.cocoaTemp)}°F`, centerX, kettleTopY + 95);
    ctx.font = '800 13px "Nunito", sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('🎯 Cozy Cocoa Goal: 150°F', centerX, kettleTopY + 122);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${bucket.label} | ${blanket.label}`, centerX, kettleTopY + 146);

    // Campfire Heater Flames Underneath Kettle
    if (this.heaterPower > 0) {
      const flameCount = 5;
      const flameH = 14 + (this.heaterPower / 100) * 34;
      for (let i = 0; i < flameCount; i++) {
        const fx = centerX - 55 + i * 27;
        ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#facc15';
        ctx.beginPath();
        ctx.moveTo(fx - 12, kettleBotY + 38);
        ctx.quadraticCurveTo(fx, kettleBotY + 38 - flameH, fx + 12, kettleBotY + 38);
        ctx.closePath();
        ctx.fill();
      }
      drawForceArrow(
        ctx,
        centerX - 140,
        kettleBotY + 22,
        centerX - kettleW / 2 - 12,
        kettleBotY - 12,
        '#f97316',
        `Heater In: +${this.heaterPower} Heat/s`
      );
    }

    // Escaping Heat Loss Arrows through Blanket to Cold Outside Air
    if (heatLoss > 1) {
      const arrowLen = Math.min(130, Math.max(35, heatLoss * 1.2));
      drawForceArrow(
        ctx,
        centerX + kettleW / 2 + pad + 8,
        kettleTopY + 65,
        centerX + kettleW / 2 + pad + 8 + arrowLen,
        kettleTopY + 65,
        '#38bdf8',
        `Escaping Loss: -${Math.round(heatLoss)} Heat/s`
      );
    }

    // Cold Outside Air Card on Right
    const airX = W - 210;
    const airY = 92;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(airX, airY, 186, 108, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 15px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`❄️ Outside Air: ${this.outsideTemp}°F`, airX + 93, airY + 28);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '800 12px "Nunito", sans-serif';
    const gap = Math.max(0, Math.round(this.cocoaTemp) - this.outsideTemp);
    ctx.fillText(`Temp Gap: ${Math.round(this.cocoaTemp)}° − ${this.outsideTemp}° = ${gap}°`, airX + 93, airY + 54);
    ctx.fillStyle = '#fef08a';
    ctx.fillText(`Blanket Divides Loss by ${R}x:`, airX + 93, airY + 76);
    ctx.fillText(`${gap} ÷ ${R} = ${Math.round(heatLoss)} Heat/s Out`, airX + 93, airY + 95);

    // Thermometer Gauge Bar on Left
    const thermX = 68;
    const thermTop = 95;
    const thermH = 210;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(thermX, thermTop, 30, thermH, 14);
    ctx.fill();
    ctx.stroke();

    const fillRatio = Math.max(0, Math.min(1, this.cocoaTemp / 200));
    const fillH = fillRatio * (thermH - 12);
    ctx.fillStyle =
      this.cocoaTemp >= 145 && this.cocoaTemp <= 155
        ? '#22c55e'
        : this.cocoaTemp > 155
        ? '#ef4444'
        : '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(thermX + 5, thermTop + thermH - 6 - fillH, 20, fillH, 10);
    ctx.fill();

    // 150°F Goal Marker on Thermometer
    const goal150Y = thermTop + thermH - 6 - (150 / 200) * (thermH - 12);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(thermX - 6, goal150Y);
    ctx.lineTo(thermX + 36, goal150Y);
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.font = '800 12px "Nunito", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('150°F Goal', thermX + 42, goal150Y + 4);

    // Bottom Kid Explanation Strip
    const stripY = H - 46;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(16, stripY, W - 32, 34, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 13px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `🧠 Blanket Insulation Rule: Escaping Heat = (Cocoa Temp − Outside Temp) ÷ Blanket Power! Match Heater Power to Escaping Heat to lock in 150°F!`,
      W / 2,
      stripY + 22
    );
  }
}
