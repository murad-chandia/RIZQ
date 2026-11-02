# Tarteeb Rush

A short browser game (3–5 minutes) by **Tarteeb, the Logistics Department of RIZQ Society, LUMS**. It proves Tarteeb is the coolest department in RIZQ while every other department watches, jealous. You run five events, each played differently, and finish with the Coolest Department Showdown.

Plain HTML, CSS and JavaScript. No install, no build step, no assets except Google Fonts.

## Play locally

**Option 1: open the file.** Double-click `index.html`. It works offline, falling back to a system font.

**Option 2: local server (recommended).**
```bash
cd rizq
python3 -m http.server 8000
```
Then open http://localhost:8000. To test on your phone, connect it to the same Wi-Fi and open `http://<your-computer-ip>:8000`.

## How to play
Fill **Venue Readiness** to 100% before the timer runs out. Play the full run for an overall best score, or tap **Choose a level** to practise any level on its own (each level keeps its own best). Each level works differently:
1. **Orientation Session:** drag each supply to its station, or tap it and then tap the station.
2. **Panel Discussion (Chair Rush):** tap chairs as fast as you can. They fly to Seating by themselves.
3. **Charity Drive (Conveyor):** supplies slide past on a belt. Grab them before they leave.
4. **Flagship Event:** everything at once, plus chaos events.
5. **Boss: Dismantling:** drag every wandering item into Storage before lockup.

Every 5-delivery combo makes the other departments jealous, which earns bonus points. When a station glows, deliver the **gold fix item** early for double points ("Tarteeb saw it coming"). Don't touch the distractions the other departments drop. They cost time.

## Second game: Tarteeb: On Duty
In the `tarteeb-world/` folder. You play as a Tarteeb member walking around the venue in 2D: pick up supplies in Storage and carry them to the station that asked for them before time runs out. Choose your position first:

| Position | How it plays |
|---|---|
| Team Member | Fastest walker, carries 1 item. Ability: Sprint. Score ×1 |
| AD | Carries 2 items, has 1 volunteer. Ability: Delegate (send the volunteer on a job). Score ×1.25 |
| Director | Slower, has 2 volunteers, has to approve department requests (📝), and every department stops them for a "quick question". Score ×1.5 |

Controls: drag anywhere to walk (phone), arrow keys or WASD and Space for the ability (computer), or tap a spot to walk there. Locally, open `http://localhost:8000/tarteeb-world/`. On GitHub Pages it is at `https://<username>.github.io/<repo>/tarteeb-world/`. Its text lives in `tarteeb-world/content.js`.

## Deploy to GitHub Pages
1. Merge the game into `main`. The files must be at the repo root.
2. On GitHub, open the repo, then **Settings → Pages**.
3. Under **Build and deployment**, set **Source: Deploy from a branch**, **Branch: `main`**, **Folder: `/ (root)`**, then click **Save**.
4. Wait 1–2 minutes. The game will be live at `https://<username>.github.io/<repo>/`, for example `https://murad-chandia.github.io/RIZQ/`.

Every push to `main` redeploys automatically. Free accounts need the repo to be public for Pages.

## Edit the jokes
All text is in **`content.js`**: roast cards, level intros, NPC messages, chaos events, rank titles and the share line. Edit the words between the quotes and keep the quotes and commas. See `CLAUDE.md` for how to add a level or a roast card.

House rule: roast departments, never individuals. No real names, event names or dates.

## Files
| File | Purpose |
|---|---|
| `index.html` | Screens and layout |
| `style.css` | Styling |
| `content.js` | All game text and level settings |
| `game.js` | Game logic |
| `CLAUDE.md` | Developer notes |
