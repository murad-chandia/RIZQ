# Tarteeb Rush

A short browser game (3–5 minutes) by **Tarteeb, the Logistics Department of RIZQ Society, LUMS**. You set up five events before the doors open, prevent problems before they happen, and finish with the Department Showdown.

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
- Drag each supply to its station: Stage, Registration, Seating or Refreshments. You can also tap the supply, then tap the station.
- Fill **Venue Readiness** to 100% before the timer runs out.
- When a station glows with a warning, deliver the **gold fix item** before it triggers. That scores double and shows "Tarteeb saw it coming."
- Don't touch the junk the other departments drop. It costs time.
- Level 5: drag every item into Storage before security locks the venue.

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
