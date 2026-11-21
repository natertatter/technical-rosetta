---
name: kid-systems-lab
description: Enforces a strict Dual-Layer Architecture combining real time-domain differential equations from Palm III (Chapters 3, 4, and 7) with a zero-jargon 4th-grade interactive science game and a hidden Dad/Textbook Inspector drawer.
---

# Action Systems Lab — 4th-Grade Pedagogical Skill (`kid-systems-lab`)

Use this skill whenever building, extending, or running Voice Mode "What-If" experiments inside the **Action Systems Lab**. Every interactive mini-lab and experiment must strictly maintain the **Dual-Layer Architecture** and include the **Hidden "Dad / Textbook Inspector" Drawer (`🔧 Real Book Math`)**.

---

## 1. Dual-Layer Architecture

### Layer A: Under-the-Hood Engine (Real Time-Domain Physics)
- **Fixed-Timestep Numerical Integration:** Always run a real-time numerical ODE solver with a fixed physics timestep `dt = 1/120` s (120 Hz using 4th-Order Runge-Kutta `RK4` or Semi-Implicit Euler) driven by an accumulator inside `requestAnimationFrame`.
- **No Fake Motion:** Never use pre-baked CSS `@keyframes` or scripted tweens for physical motion. Every bounce, gear spin, cart collision, water jet, tank level change, and temperature curve must emerge directly from integrating the state variables of William J. Palm III's *System Dynamics (3rd Edition)* time-domain differential equations.
- **Strictly Time-Domain (Chapters 3, 4, and 7 Only):** Do **not** use Chapter 2 Laplace transforms, transfer functions $T(s)$, $s$-domain algebra, or Bode plots.

#### Scoped Governing Equations & Palm III Citations (`./index/palm_dynamics.db`)
1. **🚵 Lab 1: Trail Bike Jump & Suspension Lab (Ch. 4, Sections 4.1–4.4)**
   - **Governing ODE:**
     $$m\ddot{x} + c\dot{x} + kx = f(t)$$
   - **Component Laws:** Hooke's Law restoring force $f_s = kx$ (Eq. 4.1.1, Book p. 169 / PDF p. 182), Viscous damper force $f_d = c\dot{x}$ (Section 4.4, Book p. 203 / PDF p. 216), and Generic Mass-Spring-Damper Model (Example 4.4.3, Book p. 205 / PDF p. 218).
   - **Energy Balance:** Gravitational drop energy $V_g = mgh$ converts on impact into initial kinetic energy $T_0 = \frac{1}{2}mv_0^2$, compressing into elastic potential energy $V_s = \frac{1}{2}kx^2$ (Eq. 4.3.1, Book p. 190 / PDF p. 203) while the shock absorber dissipates energy into thermal heat $E_{\text{heat}} = \int c\dot{x}^2\,dt$.

2. **⚙️ Lab 2: Steep Trail & Monster Winch Gear Lab (Ch. 3, Sections 3.1–3.3)**
   - **Governing ODE:**
     $$I_e\dot{\omega}_1 = T_1 - \frac{T_{\text{load}}}{N} - c_{\text{rot}}\omega_1, \quad \text{where } I_e = I_1 + \frac{I_2}{N^2}$$
   - **Gear Ratio & Torque Multiplication:**
     $$N = \frac{n_2}{n_1} = \frac{D_2}{D_1} = \frac{\omega_1}{\omega_2} = \frac{T_2}{T_1}$$
   - **Citations:** Fixed-axis rotation $I_O\dot{\omega} = M_O$ (Eq. 3.2.1, Book p. 123 / PDF p. 136), Spur-gear tooth/speed/torque ratios and Equivalent Inertia $I_e$ (Section 3.3, Example 3.3.2, Book pp. 131–132 / PDF pp. 144–145).

3. **💥 Lab 3: Spring-Launcher Bumper Carts (Ch. 4, Sections 4.3 & 4.6)**
   - **Spring Launch Energy Conversion:**
     $$V(x) = \frac{1}{2}kx^2 = \frac{1}{2}m_1v_1^2 \implies v_1 = x\sqrt{\frac{k}{m_1}}$$
     (Section 4.3, Eq. 4.3.1, Book p. 190 / PDF p. 203).
   - **Impulse-Momentum & Collision Restitution:**
     $$m_1v_1(0^-) - m_1v_1(0) = \int_{0^-}^{0^+} f(t)\,dt, \quad m_1v_1 + m_2v_2 = m_1v_3 + m_2v_4$$
     With bumper restitution $e \in [0, 1]$ ($e=0$ Mud Splat inelastic, $e=0.6$ Bike Tire Bounce, $e=1.0$ Super Spring perfectly elastic):
     $$v_3 = \frac{(m_1 - e m_2)v_1 + (1 + e)m_2 v_2}{m_1 + m_2}, \quad v_4 = \frac{(1 + e)m_1 v_1 + (m_2 - e m_1)v_2}{m_1 + m_2}$$
     (Section 4.6, Eqs. 4.6.1–4.6.7, Examples 4.6.1 & 4.6.2, Book pp. 223–225 / PDF pp. 236–238).

4. **💧🔥 Lab 4: Mountain Cabin Water & Hot Cocoa Station (Ch. 7, Part I & Part II)**
   - **Part I — Water Tower (Fluid Systems, Sections 7.1–7.4):**
     $$A\frac{dh}{dt} = q_{vi} - \sum_{j \in \{\text{top, mid, bot}\}} q_{vo,j}, \quad \Delta p_j = \rho g \max(0, h - L_j)$$
     Orifice/Spigot outflow driven by hydrostatic head depth $h - L_j$:
     $$q_{vo,j} = C_d A_{o,j}\sqrt{2g\max(0, h - L_j)} \quad \text{or linearized } q_{mo,j} = \frac{\rho g(h - L_j)}{R_j}$$
     (Section 7.2 Fluid Capacitance Book p. 403 / PDF p. 416; Section 7.3 Fluid Resistance Book p. 409 / PDF p. 422; Section 7.4 Example 7.4.1 & 7.4.3 Book pp. 412–415 / PDF pp. 425–428).
   - **Part II — Hot Cocoa Heater (Thermal Systems, Sections 7.6–7.8 & 7.10):**
     $$C\frac{dT}{dt} = q_{\text{heater}} - \frac{T - T_{\text{outside}}}{R}, \quad \text{or } RC\frac{dT}{dt} + T = Rq_{\text{heater}} + T_{\text{outside}}$$
     where $C = m c_p = \rho V c_p$ is thermal capacitance and $R$ is thermal insulation resistance.
     (Section 7.6 Eq. 7.6.3 Book p. 431 / PDF p. 444; Section 7.7 Newton's Law of Cooling Eq. 7.7.1 Book p. 433 / PDF p. 446; Section 7.8 Example 7.8.1 & 7.8.4 Book pp. 442–446 / PDF pp. 455–459; Section 7.10 Example 7.10.1 Book p. 457 / PDF p. 470).

---

### Layer B: Kid-Facing Layer (Strict 4th-Grade Translation Rules)

1. **Zero College Jargon on the Main Screen:**
   - Never display Greek letters ($\omega, \theta, \rho, \tau, \zeta$), dot-derivatives ($\dot{x}, \ddot{x}$), integrals, or academic terms (*viscous damping, moment of inertia, hydrostatic head, coefficient of restitution, thermal capacitance*) in the main game UI.
   - Enforce this **Exact Vocabulary Map** across all labels, sliders, gauges, scoreboards, and speech synthesis:

| Engineering Concept (Hidden in Drawer) | Mandatory 4th-Grade Kid Label (Main UI & Audio) |
| :--- | :--- |
| Spring Stiffness ($k$) | **"Spring Bounce Strength"** |
| Viscous Damping ($c$) | **"Shock Oil Squish"** *(turns extra bounce into heat!)* |
| Torque & Gear Ratio ($T, N$) | **"Climbing / Pulling Muscle vs. Spin Speed"** |
| Elastic Potential Energy ($V_s = \frac{1}{2}kx^2$) | **"Stored Spring Power"** *(Blue Gauge)* |
| Kinetic Energy ($T = \frac{1}{2}mv^2$) | **"Moving Speed Power"** *(Green Gauge)* |
| Dissipated Damper Energy ($\int c\dot{x}^2 dt$) | **"Shock Oil Heat"** *(Orange/Red Gauge)* |
| Momentum ($p = m \times v$) | **"Crash Oomph (Weight × Speed)"** |
| Hydrostatic Pressure ($\Delta p = \rho g h$) | **"Deep Water Push"** |
| Fluid Resistance ($R_f$ / Valve Area) | **"Valve Squeeze"** |
| Thermal Capacitance ($C = m c_p$) | **"Heat Bucket Size"** |
| Thermal Resistance ($R_t$ / Insulation) | **"Blanket Insulation Power"** |

2. **4th-Grade Whole-Number Mental Math:**
   - Every numerical scoreboard on the main screen must use clean whole numbers so a 9-to-10-year-old can verify the multiplication, division, or balance in his head:
     - Gears: `10-Tooth Driver -> 40-Tooth Driven = 4x Climbing Muscle! (Spin 4 Times -> Wheel Turns 1 Time)`
     - Momentum: `3 Crates × 20 Speed = 60 Crash Oomph!`
     - Water Balance: `Fill Pump: 6 gal/sec = Top Drain (1) + Mid Drain (2) + Bottom Drain (3) = 6 gal/sec -> Steady Level!`
     - Heat Balance: `Heater Power: 40 Heat/sec = Escaping Cold Loss: 40 Heat/sec -> Steady 150°F Cocoa!`

3. **Predict-First Science Habit (Challenge Mode):**
   - Before running any Challenge test, present a 3-button hypothesis card: *"🔮 Scientist Prediction: What do you think will happen when you press GO?"*
   - Require selecting one of 3 clear predictions before unlocking/launching the test, then show whether the prediction matched and **why** in 1 punchy sentence.
   - **Mixed Answer Positions (Never All Option A):** Always vary and mix up the position of the correct prediction across Options **A**, **B**, and **C** across challenges so kids must read and think through all three choices rather than clicking the first button every time.

4. **Audio Read-Aloud (`🔊 Speak Mission`):**
   - Keep all mission prompts and result callouts to 1–2 punchy sentences paired with a big tactile `🔊 Speak Mission` button driven by `window.speechSynthesis`.

---

## 2. Hidden "Dad / Textbook Inspector" Drawer (`🔧 Real Book Math`)

- Include a corner toggle button (`🔧 Real Book Math`) that slides open a collapsible engineering inspector drawer without cluttering the kid's arcade view.
- Inside the drawer, dynamically display for the active lab:
  1. **Governing Time-Domain Differential Equation** (rendered cleanly with real variables & live parameter values).
  2. **Live Engineering Telemetry & Units** (e.g., $m$ in $\text{kg}$, $k$ in $\text{N/m}$, $c$ in $\text{N}\cdot\text{s/m}$, $\zeta$ damping ratio, $\omega_n$ natural frequency, $I_e$ in $\text{kg}\cdot\text{m}^2$, $C$ in $\text{J/}^\circ\text{C}$, $R$ in $^\circ\text{C/W}$).
  3. **Exact Palm III Textbook Citation** from `./index/palm_dynamics.db` (Chapter, Section, Equation number, Book page, and PDF page).
  4. **1-Sentence "Backyard / Trail Bike Analogy"** so a parent and 4th grader can connect the equation on screen to a real mountain bike fork, bike cassette, bumper car, or thermos bottle.
