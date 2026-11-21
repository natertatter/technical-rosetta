/**
 * Action Systems Lab — Main Application Controller
 * Connects the 4 Playable Mini-Labs, Free Play Sandbox + 3 Progressive Challenges per Lab,
 * Predict-First Science Habit, 🔊 Speak Mission Read-Aloud, Celebration Confetti,
 * and the Collapsible "🔧 Real Book Math" Dad / Textbook Inspector Drawer.
 */

import { FixedStepLoop, ConfettiOverlay, speakText, soundFX } from './solver.js';
import {
  SuspensionLab,
  SPRING_OPTIONS,
  DAMPER_OPTIONS,
  CHALLENGES_LAB1
} from './labs/suspension.js';
import {
  GearsLab,
  DRIVER_TEETH_OPTIONS,
  DRIVEN_TEETH_OPTIONS,
  CHALLENGES_LAB2
} from './labs/gears.js';
import {
  CollisionsLab,
  BUMPER_OPTIONS,
  CHALLENGES_LAB3
} from './labs/collisions.js';
import {
  FluidThermalLab,
  TANK_WIDTH_OPTIONS,
  BUCKET_SIZE_OPTIONS,
  BLANKET_INSULATION_OPTIONS,
  CHALLENGES_LAB4
} from './labs/fluid_thermal.js';

class ActionSystemsApp {
  constructor() {
    this.canvas = document.getElementById('lab-canvas');
    this.confetti = new ConfettiOverlay('confetti-canvas');

    // Track completed challenge stars across all 4 labs
    this.completedChallenges = {
      lab1: new Set(),
      lab2: new Set(),
      lab3: new Set(),
      lab4: new Set()
    };

    const onUpdateUI = () => this.syncLiveUI();

    this.labs = {
      lab1: new SuspensionLab(this.canvas, onUpdateUI),
      lab2: new GearsLab(this.canvas, onUpdateUI),
      lab3: new CollisionsLab(this.canvas, onUpdateUI),
      lab4: new FluidThermalLab(this.canvas, onUpdateUI)
    };

    Object.entries(this.labs).forEach(([labKey, labInstance]) => {
      labInstance.onWin = (chId) => {
        this.completedChallenges[labKey].add(chId);
        this.confetti.burst();
        this.renderModeBar();
        this.updateStarBadge();
      };
    });

    this.activeLabKey = 'lab1';
    this.drawerOpen = false;

    this._initNavigation();
    this._initDrawer();
    this.switchLab('lab1');

    // Start 120 Hz fixed-timestep RK4 loop
    this.loop = new FixedStepLoop(
      (dt) => this.getActiveLab().step(dt),
      () => this.getActiveLab().render()
    );
    this.loop.start();
  }

  getActiveLab() {
    return this.labs[this.activeLabKey];
  }

  getActiveChallenges() {
    switch (this.activeLabKey) {
      case 'lab1':
        return CHALLENGES_LAB1;
      case 'lab2':
        return CHALLENGES_LAB2;
      case 'lab3':
        return CHALLENGES_LAB3;
      case 'lab4':
        return CHALLENGES_LAB4;
      default:
        return CHALLENGES_LAB1;
    }
  }

  _initNavigation() {
    document.querySelectorAll('[data-lab-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-lab-tab');
        soundFX.playPop(540, 0.07);
        this.switchLab(key);
      });
    });

    const speakBtn = document.getElementById('btn-speak-mission');
    if (speakBtn) {
      speakBtn.addEventListener('click', () => {
        const storyEl = document.getElementById('mission-story-text');
        const statusEl = document.getElementById('status-banner-text');
        const textToRead = `${storyEl ? storyEl.textContent : ''}. ${statusEl ? statusEl.textContent : ''}`;
        speakText(textToRead);
      });
    }
  }

  _initDrawer() {
    const toggleBtn = document.getElementById('btn-toggle-math-drawer');
    const closeBtn = document.getElementById('btn-close-math-drawer');
    const drawer = document.getElementById('real-book-math-drawer');

    const setOpen = (open) => {
      this.drawerOpen = open;
      if (drawer) {
        drawer.classList.toggle('open', open);
      }
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', String(open));
      }
      this.syncLiveUI();
    };

    if (toggleBtn) toggleBtn.addEventListener('click', () => setOpen(!this.drawerOpen));
    if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));
  }

  switchLab(labKey) {
    this.activeLabKey = labKey;
    document.querySelectorAll('[data-lab-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lab-tab') === labKey);
    });

    this.renderModeBar();
    this.renderControlsPanel();
    this.renderPredictionPanel();
    this.syncLiveUI();
  }

  updateStarBadge() {
    let total = 0;
    Object.values(this.completedChallenges).forEach((s) => {
      total += s.size;
    });
    const el = document.getElementById('total-stars-count');
    if (el) el.textContent = `${total} / 12`;
  }

  renderModeBar() {
    const container = document.getElementById('mode-selector-bar');
    if (!container) return;

    const lab = this.getActiveLab();
    const challenges = this.getActiveChallenges();
    const completed = this.completedChallenges[this.activeLabKey];

    const buttonsHTML = [
      `<button id="mode-btn-sandbox" class="mode-pill ${lab.mode === 'sandbox' ? 'active' : ''}" data-mode="sandbox">
        🎮 Free Play Sandbox
      </button>`
    ];

    challenges.forEach((ch, idx) => {
      const done = completed.has(ch.id);
      buttonsHTML.push(
        `<button id="mode-btn-${ch.id}" class="mode-pill ${lab.mode === ch.id ? 'active' : ''} ${done ? 'completed' : ''}" data-mode="${ch.id}">
          ${done ? '⭐' : '🎯'} Challenge ${idx + 1}
        </button>`
      );
    });

    container.innerHTML = buttonsHTML.join('');

    container.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modeId = btn.getAttribute('data-mode');
        soundFX.playPop(580, 0.08);
        lab.setMode(modeId);
        this.renderModeBar();
        this.renderControlsPanel();
        this.renderPredictionPanel();
        this.syncLiveUI();
      });
    });
  }

  renderPredictionPanel() {
    const box = document.getElementById('prediction-card-container');
    if (!box) return;

    const lab = this.getActiveLab();
    if (lab.mode === 'sandbox') {
      box.innerHTML = '';
      box.classList.add('hidden');
      return;
    }

    const ch = this.getActiveChallenges().find((c) => c.id === lab.mode);
    if (!ch) return;

    box.classList.remove('hidden');
    const predButtons = ch.predictions
      .map((p, idx) => {
        const isSelected = lab.selectedPrediction === p.id;
        const stateClass = isSelected ? (p.correct ? 'pred-correct' : 'pred-try') : '';
        return `<button id="pred-btn-${p.id}" class="pred-choice-btn ${stateClass}" data-pred="${p.id}">
          <span class="pred-letter">${String.fromCharCode(65 + idx)}</span>
          <span>${p.text}</span>
        </button>`;
      })
      .join('');

    box.innerHTML = `
      <div class="prediction-prompt-box">
        <div class="pred-header">${ch.question}</div>
        <div class="pred-grid">${predButtons}</div>
        ${
          lab.predictionFeedback
            ? `<div class="pred-feedback-banner">${lab.predictionFeedback}</div>`
            : `<div class="pred-hint">👆 Pick your Scientist Prediction above first!</div>`
        }
      </div>
    `;

    box.querySelectorAll('[data-pred]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const predId = btn.getAttribute('data-pred');
        lab.selectPrediction(predId);
        this.renderPredictionPanel();
        this.syncLiveUI();
      });
    });
  }

  renderControlsPanel() {
    const panel = document.getElementById('lab-controls-container');
    if (!panel) return;

    if (this.activeLabKey === 'lab1') {
      this._renderLab1Controls(panel, this.labs.lab1);
    } else if (this.activeLabKey === 'lab2') {
      this._renderLab2Controls(panel, this.labs.lab2);
    } else if (this.activeLabKey === 'lab3') {
      this._renderLab3Controls(panel, this.labs.lab3);
    } else if (this.activeLabKey === 'lab4') {
      this._renderLab4Controls(panel, this.labs.lab4);
    }
  }

  _renderLab1Controls(panel, lab) {
    panel.innerHTML = `
      <div class="control-action-row">
        <button id="btn-launch-bike" class="arcade-action-btn primary-launch">
          🚀 DROP BIKE!
        </button>
        <button id="btn-reset-bike" class="arcade-action-btn secondary-reset">
          🔄 Reset Ledge
        </button>
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label for="slider-drop-height">⛰️ Trail Drop Height</label>
          <span id="val-drop-height" class="control-value-badge">${lab.dropFeet} ft</span>
        </div>
        <input id="slider-drop-height" type="range" min="1" max="10" step="1" value="${lab.dropFeet}" class="arcade-slider" />
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label for="slider-rider-crates">🎒 Rider + Cargo Crates (Weight)</label>
          <span id="val-rider-crates" class="control-value-badge">${lab.riderCrates} Crates</span>
        </div>
        <input id="slider-rider-crates" type="range" min="1" max="5" step="1" value="${lab.riderCrates}" class="arcade-slider" />
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label>🌀 Spring Bounce Strength</label>
        </div>
        <div class="pill-choice-group" id="spring-choice-group">
          ${SPRING_OPTIONS.map(
            (s) => `
            <button id="btn-spring-${s.id}" class="choice-chip ${lab.springId === s.id ? 'active' : ''}" data-spring="${s.id}">
              ${s.label}
            </button>`
          ).join('')}
        </div>
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label>🍯 Shock Oil Squish <small>(turns bounce into heat!)</small></label>
        </div>
        <div class="pill-choice-group two-col" id="damper-choice-group">
          ${DAMPER_OPTIONS.map(
            (d) => `
            <button id="btn-damper-${d.id}" class="choice-chip ${lab.damperId === d.id ? 'active' : ''}" data-damper="${d.id}">
              ${d.label}
            </button>`
          ).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-launch-bike').addEventListener('click', () => lab.launchDrop());
    document.getElementById('btn-reset-bike').addEventListener('click', () => lab.resetSimulation());

    document.getElementById('slider-drop-height').addEventListener('input', (e) => {
      lab.dropFeet = Number(e.target.value);
      document.getElementById('val-drop-height').textContent = `${lab.dropFeet} ft`;
      lab.resetSimulation();
    });

    document.getElementById('slider-rider-crates').addEventListener('input', (e) => {
      lab.riderCrates = Number(e.target.value);
      document.getElementById('val-rider-crates').textContent = `${lab.riderCrates} Crates`;
      lab.resetSimulation();
    });

    panel.querySelectorAll('[data-spring]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lab.springId = btn.getAttribute('data-spring');
        soundFX.playPop(500, 0.06);
        lab.resetSimulation();
        this._renderLab1Controls(panel, lab);
      });
    });

    panel.querySelectorAll('[data-damper]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lab.damperId = btn.getAttribute('data-damper');
        soundFX.playPop(440, 0.06);
        lab.resetSimulation();
        this._renderLab1Controls(panel, lab);
      });
    });
  }

  _renderLab2Controls(panel, lab) {
    panel.innerHTML = `
      <div class="control-action-row">
        <button id="btn-crank-winch" class="arcade-action-btn primary-launch">
          ⚙️ CRANK WINCH!
        </button>
        <button id="btn-reset-winch" class="arcade-action-btn secondary-reset">
          🔄 Reset Slope
        </button>
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label>🔵 Driver Gear Teeth (Input)</label>
          <span class="control-value-badge">${lab.driverTeeth} Teeth</span>
        </div>
        <div class="pill-choice-group">
          ${DRIVER_TEETH_OPTIONS.map(
            (t) => `
            <button id="btn-driver-${t}" class="choice-chip ${lab.driverTeeth === t ? 'active' : ''}" data-driver="${t}">
              ${t} Teeth
            </button>`
          ).join('')}
        </div>
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label>🟠 Driven Winch Gear Teeth (Output)</label>
          <span class="control-value-badge">${lab.drivenTeeth} Teeth</span>
        </div>
        <div class="pill-choice-group two-col">
          ${DRIVEN_TEETH_OPTIONS.map(
            (t) => `
            <button id="btn-driven-${t}" class="choice-chip ${lab.drivenTeeth === t ? 'active' : ''}" data-driven="${t}">
              ${t} Teeth
            </button>`
          ).join('')}
        </div>
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label for="slider-hill-steep">🪨 Hill Steepness & Boulder Weight</label>
          <span id="val-hill-steep" class="control-value-badge">Level ${lab.hillLevel} (${lab.hillLevel * 30} Weight)</span>
        </div>
        <input id="slider-hill-steep" type="range" min="1" max="5" step="1" value="${lab.hillLevel}" class="arcade-slider" />
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label for="slider-leg-power">🦵 Pedal / Motor Leg Power</label>
          <span id="val-leg-power" class="control-value-badge">${lab.legPower} Power</span>
        </div>
        <input id="slider-leg-power" type="range" min="10" max="50" step="10" value="${lab.legPower}" class="arcade-slider" />
      </div>
    `;

    document.getElementById('btn-crank-winch').addEventListener('click', () => lab.startHaul());
    document.getElementById('btn-reset-winch').addEventListener('click', () => lab.resetSimulation());

    panel.querySelectorAll('[data-driver]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lab.driverTeeth = Number(btn.getAttribute('data-driver'));
        soundFX.playPop(520, 0.06);
        lab.resetSimulation();
        this._renderLab2Controls(panel, lab);
      });
    });

    panel.querySelectorAll('[data-driven]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lab.drivenTeeth = Number(btn.getAttribute('data-driven'));
        soundFX.playPop(460, 0.06);
        lab.resetSimulation();
        this._renderLab2Controls(panel, lab);
      });
    });

    document.getElementById('slider-hill-steep').addEventListener('input', (e) => {
      lab.hillLevel = Number(e.target.value);
      document.getElementById('val-hill-steep').textContent = `Level ${lab.hillLevel} (${lab.hillLevel * 30} Weight)`;
      lab.resetSimulation();
    });

    document.getElementById('slider-leg-power').addEventListener('input', (e) => {
      lab.legPower = Number(e.target.value);
      document.getElementById('val-leg-power').textContent = `${lab.legPower} Power`;
      lab.resetSimulation();
    });
  }

  _renderLab3Controls(panel, lab) {
    panel.innerHTML = `
      <div class="control-action-row">
        <button id="btn-launch-cart" class="arcade-action-btn primary-launch">
          💥 LAUNCH CART!
        </button>
        <button id="btn-reset-cart" class="arcade-action-btn secondary-reset">
          🔄 Reset Track
        </button>
      </div>

      <div class="control-group">
        <button id="btn-toggle-slowmo" class="choice-chip full-width ${lab.slowMo ? 'active' : ''}">
          🐢 Slow-Mo Crash Replay: ${lab.slowMo ? 'ON (0.3x Speed)' : 'OFF (Normal Speed)'}
        </button>
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label for="slider-pull-clicks">🌀 Spring Pull-Back Clicks</label>
          <span id="val-pull-clicks" class="control-value-badge">${lab.pullClicks} Clicks</span>
        </div>
        <input id="slider-pull-clicks" type="range" min="1" max="10" step="1" value="${lab.pullClicks}" class="arcade-slider" />
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label for="slider-crates-a">🔵 Launcher Cart A Cargo Crates</label>
          <span id="val-crates-a" class="control-value-badge">${lab.cratesA} Crates</span>
        </div>
        <input id="slider-crates-a" type="range" min="1" max="5" step="1" value="${lab.cratesA}" class="arcade-slider" />
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label for="slider-crates-b">🟢 Target Cart B Cargo Crates</label>
          <span id="val-crates-b" class="control-value-badge">${lab.cratesB} Crates</span>
        </div>
        <input id="slider-crates-b" type="range" min="1" max="5" step="1" value="${lab.cratesB}" class="arcade-slider" />
      </div>

      <div class="control-group">
        <div class="control-label-row">
          <label>🛡️ Cart Bumper Type</label>
        </div>
        <div class="pill-choice-group">
          ${BUMPER_OPTIONS.map(
            (b) => `
            <button id="btn-bumper-${b.id}" class="choice-chip ${lab.bumperId === b.id ? 'active' : ''}" data-bumper="${b.id}">
              ${b.label}
            </button>`
          ).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-launch-cart').addEventListener('click', () => lab.launchCart());
    document.getElementById('btn-reset-cart').addEventListener('click', () => lab.resetSimulation());
    document.getElementById('btn-toggle-slowmo').addEventListener('click', () => {
      lab.slowMo = !lab.slowMo;
      soundFX.playPop(420, 0.06);
      this._renderLab3Controls(panel, lab);
    });

    document.getElementById('slider-pull-clicks').addEventListener('input', (e) => {
      lab.pullClicks = Number(e.target.value);
      document.getElementById('val-pull-clicks').textContent = `${lab.pullClicks} Clicks`;
      lab.resetSimulation();
    });

    document.getElementById('slider-crates-a').addEventListener('input', (e) => {
      lab.cratesA = Number(e.target.value);
      document.getElementById('val-crates-a').textContent = `${lab.cratesA} Crates`;
      lab.resetSimulation();
    });

    document.getElementById('slider-crates-b').addEventListener('input', (e) => {
      lab.cratesB = Number(e.target.value);
      document.getElementById('val-crates-b').textContent = `${lab.cratesB} Crates`;
      lab.resetSimulation();
    });

    panel.querySelectorAll('[data-bumper]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lab.bumperId = btn.getAttribute('data-bumper');
        soundFX.playPop(510, 0.06);
        lab.resetSimulation();
        this._renderLab3Controls(panel, lab);
      });
    });
  }

  _renderLab4Controls(panel, lab) {
    const stationSwitchHTML = `
      <div class="station-big-switch">
        <button id="btn-station-water" class="station-toggle-btn ${lab.station === 'water' ? 'active-water' : ''}">
          💧 Water Tower Mode
        </button>
        <button id="btn-station-thermal" class="station-toggle-btn ${lab.station === 'thermal' ? 'active-thermal' : ''}">
          🔥 Hot Cocoa Mode
        </button>
      </div>
    `;

    if (lab.station === 'water') {
      panel.innerHTML = `
        ${stationSwitchHTML}
        <div class="control-group">
          <div class="control-label-row">
            <label for="slider-pump-inflow">🚰 Fill Pump Inflow</label>
            <span id="val-pump-inflow" class="control-value-badge">${lab.pumpInflow} gal/sec</span>
          </div>
          <input id="slider-pump-inflow" type="range" min="0" max="10" step="1" value="${lab.pumpInflow}" class="arcade-slider" />
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <label>🛢️ Water Tower Tank Width</label>
          </div>
          <div class="pill-choice-group">
            ${TANK_WIDTH_OPTIONS.map(
              (w) => `
              <button id="btn-tank-width-${w.id}" class="choice-chip ${lab.tankWidthId === w.id ? 'active' : ''}" data-width="${w.id}">
                ${w.label}
              </button>`
            ).join('')}
          </div>
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <label>🚿 3 Drain Spigots (Test Deep Water Push!)</label>
          </div>
          <div class="pill-choice-group">
            <button id="btn-spigot-top" class="choice-chip ${lab.spigotTopOpen ? 'active' : ''}">
              Top (8 ft): ${lab.spigotTopOpen ? 'OPEN' : 'SHUT'}
            </button>
            <button id="btn-spigot-mid" class="choice-chip ${lab.spigotMidOpen ? 'active' : ''}">
              Middle (4 ft): ${lab.spigotMidOpen ? 'OPEN' : 'SHUT'}
            </button>
            <button id="btn-spigot-bot" class="choice-chip ${lab.spigotBotOpen ? 'active' : ''}">
              Bottom (0 ft): ${lab.spigotBotOpen ? 'OPEN' : 'SHUT'}
            </button>
          </div>
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <label>🔧 Valve Squeeze (Pipe Resistance)</label>
          </div>
          <div class="pill-choice-group two-col">
            <button id="btn-squeeze-1" class="choice-chip ${lab.valveSqueeze === 1 ? 'active' : ''}">
              Wide Open Valve (1x Squeeze)
            </button>
            <button id="btn-squeeze-2" class="choice-chip ${lab.valveSqueeze === 2 ? 'active' : ''}">
              Half-Squeezed Valve (2x Squeeze)
            </button>
          </div>
        </div>
      `;

      document.getElementById('slider-pump-inflow').addEventListener('input', (e) => {
        lab.pumpInflow = Number(e.target.value);
        document.getElementById('val-pump-inflow').textContent = `${lab.pumpInflow} gal/sec`;
      });

      panel.querySelectorAll('[data-width]').forEach((btn) => {
        btn.addEventListener('click', () => {
          lab.tankWidthId = btn.getAttribute('data-width');
          soundFX.playPop(480, 0.06);
          this._renderLab4Controls(panel, lab);
        });
      });

      document.getElementById('btn-spigot-top').addEventListener('click', () => {
        lab.spigotTopOpen = !lab.spigotTopOpen;
        soundFX.playPop(520, 0.06);
        this._renderLab4Controls(panel, lab);
      });
      document.getElementById('btn-spigot-mid').addEventListener('click', () => {
        lab.spigotMidOpen = !lab.spigotMidOpen;
        soundFX.playPop(480, 0.06);
        this._renderLab4Controls(panel, lab);
      });
      document.getElementById('btn-spigot-bot').addEventListener('click', () => {
        lab.spigotBotOpen = !lab.spigotBotOpen;
        soundFX.playPop(440, 0.06);
        this._renderLab4Controls(panel, lab);
      });

      document.getElementById('btn-squeeze-1').addEventListener('click', () => {
        lab.valveSqueeze = 1;
        soundFX.playPop(500, 0.06);
        this._renderLab4Controls(panel, lab);
      });
      document.getElementById('btn-squeeze-2').addEventListener('click', () => {
        lab.valveSqueeze = 2;
        soundFX.playPop(430, 0.06);
        this._renderLab4Controls(panel, lab);
      });
    } else {
      panel.innerHTML = `
        ${stationSwitchHTML}
        <div class="control-group">
          <div class="control-label-row">
            <label for="slider-heater-power">🔥 Campfire Heater Power</label>
            <span id="val-heater-power" class="control-value-badge">${lab.heaterPower} Heat/sec</span>
          </div>
          <input id="slider-heater-power" type="range" min="0" max="100" step="10" value="${lab.heaterPower}" class="arcade-slider" />
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <label>☕ Heat Bucket Size (Kettle Size)</label>
          </div>
          <div class="pill-choice-group">
            ${BUCKET_SIZE_OPTIONS.map(
              (b) => `
              <button id="btn-bucket-${b.id}" class="choice-chip ${lab.bucketSizeId === b.id ? 'active' : ''}" data-bucket="${b.id}">
                ${b.label}
              </button>`
            ).join('')}
          </div>
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <label>🧣 Blanket Insulation Power</label>
          </div>
          <div class="pill-choice-group">
            ${BLANKET_INSULATION_OPTIONS.map(
              (b) => `
              <button id="btn-blanket-${b.id}" class="choice-chip ${lab.blanketId === b.id ? 'active' : ''}" data-blanket="${b.id}">
                ${b.label}
              </button>`
            ).join('')}
          </div>
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <label>❄️ Outside Snowstorm Temperature</label>
          </div>
          <div class="pill-choice-group">
            ${[0, 30, 50]
              .map(
                (t) => `
              <button id="btn-outside-${t}" class="choice-chip ${lab.outsideTemp === t ? 'active' : ''}" data-outside="${t}">
                ${t === 0 ? '0°F Arctic Blizzard' : t === 30 ? '30°F Snowstorm' : '50°F Chilly Fall'}
              </button>`
              )
              .join('')}
          </div>
        </div>
      `;

      document.getElementById('slider-heater-power').addEventListener('input', (e) => {
        lab.heaterPower = Number(e.target.value);
        document.getElementById('val-heater-power').textContent = `${lab.heaterPower} Heat/sec`;
      });

      panel.querySelectorAll('[data-bucket]').forEach((btn) => {
        btn.addEventListener('click', () => {
          lab.bucketSizeId = btn.getAttribute('data-bucket');
          soundFX.playPop(480, 0.06);
          this._renderLab4Controls(panel, lab);
        });
      });

      panel.querySelectorAll('[data-blanket]').forEach((btn) => {
        btn.addEventListener('click', () => {
          lab.blanketId = btn.getAttribute('data-blanket');
          soundFX.playPop(530, 0.06);
          this._renderLab4Controls(panel, lab);
        });
      });

      panel.querySelectorAll('[data-outside]').forEach((btn) => {
        btn.addEventListener('click', () => {
          lab.outsideTemp = Number(btn.getAttribute('data-outside'));
          soundFX.playPop(440, 0.06);
          this._renderLab4Controls(panel, lab);
        });
      });
    }

    document.getElementById('btn-station-water').addEventListener('click', () => {
      lab.setStation('water');
      this._renderLab4Controls(panel, lab);
    });
    document.getElementById('btn-station-thermal').addEventListener('click', () => {
      lab.setStation('thermal');
      this._renderLab4Controls(panel, lab);
    });
  }

  syncLiveUI() {
    const lab = this.getActiveLab();
    const challenges = this.getActiveChallenges();

    // Update Mission Story Headline
    const titleEl = document.getElementById('mission-title-text');
    const storyEl = document.getElementById('mission-story-text');

    const sandboxStories = {
      lab1: {
        title: '🚵 Lab 1: Trail Bike Jump & Suspension Lab',
        story:
          'Tune your mountain bike Spring Bounce Strength and Shock Oil Squish to absorb big trail drops without bottoming out (CLANG!) or bouncing like a pogo stick!'
      },
      lab2: {
        title: '⚙️ Lab 2: Steep Trail & Monster Winch Gear Lab',
        story:
          'Snap Driver and Driven gears together on the winch drivetrain! Trade Spin Speed for Climbing Muscle to haul heavy boulders up the mountain ridge!'
      },
      lab3: {
        title: '💥 Lab 3: Spring-Launcher Bumper Carts',
        story:
          'Pull back the giant coil spring to turn Stored Spring Power into Crash Oomph (Weight × Speed) and knock Target Cart B squarely into the Green Goal Zone!'
      },
      lab4: {
        title: '💧🔥 Lab 4: Mountain Cabin Water & Hot Cocoa Station',
        story:
          'Balance the cabin Gravity Water Tower (watch Deep Water Push shoot farther at the bottom!) or wrap the Hot Cocoa Kettle in Blanket Insulation during a snowstorm!'
      }
    };

    if (lab.mode === 'sandbox') {
      const info = sandboxStories[this.activeLabKey];
      if (titleEl) titleEl.textContent = info.title;
      if (storyEl) storyEl.textContent = info.story;
    } else {
      const ch = challenges.find((c) => c.id === lab.mode);
      if (ch) {
        if (titleEl) titleEl.textContent = ch.title;
        if (storyEl) storyEl.textContent = ch.mission;
      }
    }

    // Update Live Status Banner
    const statusBox = document.getElementById('live-status-banner');
    const statusText = document.getElementById('status-banner-text');
    if (statusText) statusText.textContent = lab.statusBanner;
    if (statusBox) {
      statusBox.className = `status-callout status-${lab.statusType || 'neutral'}`;
    }

    // Update Live 4th-Grade Gauges Bar
    this._updateLiveGauges(lab);

    // Update Hidden "Dad / Textbook Inspector" Drawer (`🔧 Real Book Math`)
    if (this.drawerOpen) {
      this._updateMathDrawer(lab);
    }
  }

  _updateLiveGauges(lab) {
    const gaugesEl = document.getElementById('live-gauges-strip');
    if (!gaugesEl) return;

    if (this.activeLabKey === 'lab1') {
      const e = lab.getEnergyBreakdown();
      gaugesEl.innerHTML = `
        <div class="gauge-item">
          <div class="gauge-top">
            <span>🔵 Stored Spring Power</span>
            <strong>${e.storedSpringUnits} (${e.storedPct}%)</strong>
          </div>
          <div class="gauge-track"><div class="gauge-fill fill-blue" style="width:${e.storedPct}%"></div></div>
        </div>
        <div class="gauge-item">
          <div class="gauge-top">
            <span>🟢 Moving Speed Power</span>
            <strong>${e.movingSpeedUnits} (${e.movingPct}%)</strong>
          </div>
          <div class="gauge-track"><div class="gauge-fill fill-green" style="width:${e.movingPct}%"></div></div>
        </div>
        <div class="gauge-item">
          <div class="gauge-top">
            <span>🟠 Shock Oil Heat (Squish!)</span>
            <strong>${e.shockHeatUnits} (${e.heatPct}%)</strong>
          </div>
          <div class="gauge-track"><div class="gauge-fill fill-orange" style="width:${e.heatPct}%"></div></div>
        </div>
      `;
    } else if (this.activeLabKey === 'lab2') {
      const { N, outputMuscle, loadNeed } = lab.getMechanics();
      const musclePct = Math.min(100, Math.round((outputMuscle / 240) * 100));
      const speedPct = Math.min(100, Math.round((2 / N) * 45));
      const hillPct = Math.min(100, Math.round(lab.haulProgress));
      gaugesEl.innerHTML = `
        <div class="gauge-item">
          <div class="gauge-top">
            <span>💪 Climbing / Pulling Muscle</span>
            <strong>${outputMuscle} (Needs > ${loadNeed})</strong>
          </div>
          <div class="gauge-track"><div class="gauge-fill fill-orange" style="width:${musclePct}%"></div></div>
        </div>
        <div class="gauge-item">
          <div class="gauge-top">
            <span>⚡ Winch Spin Speed</span>
            <strong>1/${Number.isInteger(N) ? N : N.toFixed(1)}x Driver Speed</strong>
          </div>
          <div class="gauge-track"><div class="gauge-fill fill-blue" style="width:${speedPct}%"></div></div>
        </div>
        <div class="gauge-item">
          <div class="gauge-top">
            <span>🏔️ Ridge Climb Progress</span>
            <strong>${hillPct}%</strong>
          </div>
          <div class="gauge-track"><div class="gauge-fill fill-green" style="width:${hillPct}%"></div></div>
        </div>
      `;
    } else if (this.activeLabKey === 'lab3') {
      const { storedSpringPower, launchSpeedA, initialOomph } = lab.getLaunchMetrics();
      const oomphA = lab.cratesA * (lab.collided ? lab.postSpeedA : launchSpeedA);
      const oomphB = lab.cratesB * (lab.collided ? lab.postSpeedB : 0);
      gaugesEl.innerHTML = `
        <div class="gauge-item">
          <div class="gauge-top">
            <span>🔵 Stored Spring Power</span>
            <strong>${storedSpringPower} (${lab.pullClicks} Clicks)</strong>
          </div>
          <div class="gauge-track"><div class="gauge-fill fill-blue" style="width:${lab.pullClicks * 10}%"></div></div>
        </div>
        <div class="gauge-item">
          <div class="gauge-top">
            <span>🚀 Cart A Crash Oomph</span>
            <strong>${oomphA} (${lab.cratesA} × ${lab.collided ? lab.postSpeedA : launchSpeedA})</strong>
          </div>
          <div class="gauge-track"><div class="gauge-fill fill-orange" style="width:${Math.min(100, (Math.abs(oomphA) / Math.max(1, initialOomph)) * 100)}%"></div></div>
        </div>
        <div class="gauge-item">
          <div class="gauge-top">
            <span>🟢 Cart B Crash Oomph</span>
            <strong>${oomphB} (${lab.cratesB} × ${lab.collided ? lab.postSpeedB : 0})</strong>
          </div>
          <div class="gauge-track"><div class="gauge-fill fill-green" style="width:${Math.min(100, (Math.abs(oomphB) / Math.max(1, initialOomph)) * 100)}%"></div></div>
        </div>
      `;
    } else if (this.activeLabKey === 'lab4') {
      if (lab.station === 'water') {
        const { totalOut, qBot } = lab.getFluidFlows();
        gaugesEl.innerHTML = `
          <div class="gauge-item">
            <div class="gauge-top">
              <span>💧 Tank Water Depth</span>
              <strong>${lab.waterHeight.toFixed(1)} ft / 10 ft</strong>
            </div>
            <div class="gauge-track"><div class="gauge-fill fill-blue" style="width:${lab.waterHeight * 10}%"></div></div>
          </div>
          <div class="gauge-item">
            <div class="gauge-top">
              <span>🚿 Bottom Deep Water Push</span>
              <strong>${qBot.toFixed(1)} gal/sec</strong>
            </div>
            <div class="gauge-track"><div class="gauge-fill fill-green" style="width:${Math.min(100, qBot * 18)}%"></div></div>
          </div>
          <div class="gauge-item">
            <div class="gauge-top">
              <span>⚖️ Total Spigots Outflow</span>
              <strong>${totalOut.toFixed(1)} gal/sec</strong>
            </div>
            <div class="gauge-track"><div class="gauge-fill fill-orange" style="width:${Math.min(100, totalOut * 10)}%"></div></div>
          </div>
        `;
      } else {
        const { heatLoss, R } = lab.getThermalFlows();
        gaugesEl.innerHTML = `
          <div class="gauge-item">
            <div class="gauge-top">
              <span>☕ Cocoa Temperature</span>
              <strong>${Math.round(lab.cocoaTemp)}°F (Goal: 150°F)</strong>
            </div>
            <div class="gauge-track"><div class="gauge-fill fill-orange" style="width:${Math.min(100, (lab.cocoaTemp / 200) * 100)}%"></div></div>
          </div>
          <div class="gauge-item">
            <div class="gauge-top">
              <span>🧣 Blanket Insulation Power</span>
              <strong>${R}x Blanket Shield</strong>
            </div>
            <div class="gauge-track"><div class="gauge-fill fill-green" style="width:${(R / 3) * 100}%"></div></div>
          </div>
          <div class="gauge-item">
            <div class="gauge-top">
              <span>❄️ Escaping Heat Loss</span>
              <strong>${Math.round(heatLoss)} Heat/sec</strong>
            </div>
            <div class="gauge-track"><div class="gauge-fill fill-blue" style="width:${Math.min(100, heatLoss)}%"></div></div>
          </div>
        `;
      }
    }
  }

  _updateMathDrawer(lab) {
    const info = lab.getTextbookMathInfo();
    const titleEl = document.getElementById('math-drawer-title');
    const eqEl = document.getElementById('math-drawer-equation');
    const citeEl = document.getElementById('math-drawer-citation');
    const paramsEl = document.getElementById('math-drawer-params');
    const analogyEl = document.getElementById('math-drawer-analogy');

    if (titleEl) titleEl.textContent = info.title;
    if (eqEl) eqEl.textContent = info.equation;
    if (citeEl) citeEl.textContent = info.citation;
    if (paramsEl) {
      paramsEl.innerHTML = info.liveParams.map((p) => `<li>${p}</li>`).join('');
    }
    if (analogyEl) analogyEl.textContent = info.analogy;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.actionSystemsApp = new ActionSystemsApp();
});
