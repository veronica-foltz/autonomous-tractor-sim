🚜 Autonomous Tractor Simulation

Live demo: https://veronica-foltz.github.io/autonomous-tractor-sim/

A tiny, browser-based simulator for autonomous field navigation. It plans a shortest path with A* and can mow/cover the entire field with a boustrophedon sweep. Includes a clean UI, live speed control, Stop button, obstacle randomization, and coverage metrics. Runs 100% client-side—no installs.

---

Business problems this helps illustrate
- Reduce overlap & fuel/time waste: Simulate coverage patterns to minimize re-driving the same ground; turns are penalized to mirror real fuel/time costs.  
- Pre-planning & what-if scenarios: Try different obstacle layouts (fences, rocks, wet patches) to see how routes change before sending equipment to the field.  
- Operator training / onboarding: Safe, visual way to explain how autonomy plans routes and why it sometimes takes “longer but cheaper” paths.  
- R&D demo for autonomy features: Quickly show stakeholders how A* path planning and coverage sweeps behave. 

---

Features
- A* pathfinding (4-way) from Start → Goal, avoiding obstacles (“rocks”)
- Mow Field full-coverage path (boustrophedon sweep + A\* hops around gaps)
- Edit modes: Rocks / Set Start / Set Goal (click grid to update)
- Live speed slider (changes mid-drive) and a Stop button
- Coverage meter + steps, turns, fuel/time** estimates
- Random Rocks with adjustable density
- Pure HTML/CSS/JS + Canvas (no frameworks or builds)

---

How it works
- The field is a grid (blocked cells = rocks).  
- **A\*** uses Manhattan distance and expands 4 neighbors; cost per move is 1, with turn counts tracked for “fuel.”  
- **Coverage** orders free cells in a snake (boustrophedon) pattern and chains them with **A\***, skipping unreachable islands.

---

Live
Deployed with GitHub Pages
https://veronica-foltz.github.io/autonomous-tractor-sim/


---
