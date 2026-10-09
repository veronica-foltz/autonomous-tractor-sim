🚜 Autonomous Tractor Simulation

Live demo: https://veronica-foltz.github.io/autonomous-tractor-sim/
 
A browser-based simulator for autonomous field navigation. It plans a shortest path with A* and can mow/cover the entire field with a boustrophedon sweep. Includes a clean UI, live speed control, Stop button, obstacle randomization, and coverage metrics. 

---

Features
- A* pathfinding (4-way) from Start → Goal, avoiding obstacles (“rocks”)
- Mow Field full-coverage path (boustrophedon sweep + A\* hops around gaps)
- Live speed slider (changes mid-drive) and a Stop button
- Coverage meter + steps, turns, fuel/time** estimates
- Random Rocks with adjustable density
- Pure HTML/CSS/JS + Canvas (no frameworks or builds) 

---

How it works
- The field is a grid (blocked cells = rocks).  
- A* uses Manhattan distance and expands 4 neighbors
- Coverage orders free cells in a snake (boustrophedon) pattern and chains them with A*, skipping unreachable islands.

