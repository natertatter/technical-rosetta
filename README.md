# Technical Rosetta — Action Systems Lab (Palm III System Dynamics)

An interactive **4th-Grade Science Arcade Engine** built on real time-domain differential equations from William J. Palm III's *System Dynamics (3rd Edition)* (**Chapters 3, 4, and 7**).

---

## Architecture Overview

1. **Phase 1 — Local Textbook Ingestion & Scoped Chapter Retrieval (`./tools/index_book.py`):**
   - Parses `./textbooks/System Dynamics 3rd Edition - Palm III.pdf` page-by-page using PyMuPDF (`pymupdf`) into a local SQLite FTS5 database at `./index/palm_dynamics.db`.
   - CLI Search Interface:
     ```bash
     python ./tools/index_book.py --index
     python ./tools/index_book.py --search "Hooke spring constant" --limit 5
     python ./tools/index_book.py --page 218
     ```

2. **Phase 2 — 4th-Grade Pedagogical Skill (`.agents/skills/kid-systems-lab/SKILL.md`):**
   - Enforces a **Dual-Layer Architecture**:
     - **Under-the-Hood Engine:** Fixed-timestep (`dt = 1/120` s) 4th-Order Runge-Kutta (`RK4`) numerical integrator solving Palm III's actual time-domain ODEs in real time.
     - **Kid-Facing Layer:** Strict zero-jargon 4th-grade translation map, clean whole-number mental math scoreboards, Predict-First Challenge hypothesis cards, and `🔊 Speak Mission` audio read-aloud.
     - **Hidden Dad / Textbook Inspector Drawer (`🔧 Real Book Math`):** Collapsible drawer displaying the governing differential equations, live engineering units, exact Palm III page citations, and a 1-sentence Backyard / Trail Bike Analogy.

3. **Phase 3 — 4-Lab Interactive Web App (`./app/`):**
   - **🚵 Lab 1: Trail Bike Jump & Suspension Lab** (Ch. 4, Sections 4.1–4.4: Mass-Spring-Damper $m\ddot{x} + c\dot{x} + kx = f(t)$)
   - **⚙️ Lab 2: Steep Trail & Monster Winch Gear Lab** (Ch. 3, Sections 3.1–3.3: Spur Gears, Torque Ratio $N = n_2/n_1$, Equivalent Inertia $I_e = I_1 + I_2/N^2$)
   - **💥 Lab 3: Spring-Launcher Bumper Carts** (Ch. 4, Sections 4.3 & 4.6: Elastic Potential Energy $V = \frac{1}{2}kx^2$, Linear Impulse & Momentum Conservation $m_1v_1 + m_2v_2 = m_1v_3 + m_2v_4$)
   - **💧🔥 Lab 4: Mountain Cabin Water & Hot Cocoa Station** (Ch. 7, Part I & Part II: Liquid-Level Hydrostatic Head $A\frac{dh}{dt} = q_{vi} - \sum q_{vo,j}$ & Lumped Thermal Capacitance/Resistance $C\frac{dT}{dt} = q_{\text{heater}} - \frac{T - T_{\text{outside}}}{R}$)

---

## Running Locally

```bash
python3 -m http.server 8080 --directory ./app
```
