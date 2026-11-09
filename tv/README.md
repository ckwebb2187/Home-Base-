# Home Base TV

The Home Base home screen and screensaver for the onn Google TV box. This branch is separate from the Drivez app
on `main`; nothing here touches it.

**Download (TV, in Downloader):** hb-tv.webb-home.workers.dev — or https://github.com/ckwebb2187/Home-Base-/raw/main/tv/HomeBaseTV.apk

## What it does
- **Home screen:** a clean background with the clock, the weather, what's up next, tonight's dinner and chores, in
  the colors (or holiday theme, with its characters) showing on the Home Base wall. One row of apps along the bottom.
  - The first tile opens the full Home Base wall (the Home Base TV app when it's installed).
  - Hold OK on an app to move it to the front.
  - Hold OK on Settings to change the Home Base code.
- **Screensaver:** after 5 idle minutes on the home screen, the same screen fills the TV with characters walking by.
  It's also a system screensaver (`HomeDream`) for when another app is open.
- **Home button:** Google TV won't let another app be the home screen, so the "Home Base home button" accessibility
  service opens this home screen whenever Google TV's own one appears.

The screen's data comes from the Home Bridge (`/w/CODE/tv.json`, read-only). Home Base fills it in whenever something
changes. The code is pasted into the app once. Typing `demo` shows sample data.

## Look and feel (app 2.2, page 13.0)
- **Always on:** one display font (Bricolage Grotesque) and one text font (Atkinson Hyperlegible) on the page, the Style
  panel and the app's own labels (bundled in `app/src/main/assets/fonts`); one spacing scale (8/16/24/48 px); one easing
  and three speeds (150/250/400 ms); nothing pops in; no error text on screen.
- **Style & settings** (★/Menu, or the palette button) slides in from the right with an icon per section. Every effect
  has its own switch: tile tilt, light sheen, glow strength, frosted glass, slow background drift, time-of-day lighting,
  weather touches, holiday touches (subtle/full/off), navigation sounds + volume, status strip, startup animation,
  screensaver pan & zoom + speed, app tile art (themed/original), Fun level (Calm/Playful/Party). Live color changing is
  off unless turned on. "Reset to recommended" (App & updates) restores the calm defaults.
- Page sources: `page/hb-look.js` (shared look, options, previews), `page/tv-style-panel.{js,css}`, `page/tv-polish.{js,css}`,
  assembled by `page/build_tv_page.py` into `page/live/tv-page.html` and the app's bundled `assets/tv.html`.
- The status strip shows who's home only when the bridge's tv.json has a `home` list of names (not sent yet).

## Setting it up on the TV
1. Install **Downloader** (by AFTVnews) from the Play Store. Allow it to install apps under
   Settings → Apps → Security & restrictions → Unknown sources.
2. In Downloader, open the download link above and install.
3. Open **Home Base Launcher** and paste the Home Base code. The Google TV remote in the Google Home app has a keyboard
   you can paste into.
4. Settings → System → Accessibility → **Home Base home button** → On.
5. Optional, for the screensaver everywhere: turn on network debugging, then from a computer run
   `adb connect <tv-ip>` and `adb shell settings put secure screensaver_components app.homebase.tv/.HomeDream`.

## Building
`./build-apk.sh` (no Gradle: the app has no outside libraries). It needs the Android build tools (`SDK=` a folder
with `build-tools/` and `platform/android.jar`) and `keystore.properties` with the signing key, which is not in git.
Updates must be signed with the same key. `page/build_tv.py` rebuilds the bundled page from Home Base's holiday art.
Pushing a new `HomeBaseTV.apk` runs it on an Android TV emulator (`ci/emulator-check.sh`).
