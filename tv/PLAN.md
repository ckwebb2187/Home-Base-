# Home Base TV — plan for the next updates

Read this before working on the TV app or its page. Work only in this repo (Home-Base-, folder tv/). Never touch Drivez.

## Shipping (how every update reaches the TV)
- Build tv/build-apk.sh, signed with the key from Google Drive "Home Base TV signing key (keep private).zip"
  (certificate SHA-256 27:D2:D9:FA…). Never commit the key.
- Bump tv/version.txt ("versionCode versionName"), put the signed tv/HomeBaseTV.apk next to it, push to main.
  The TV's Style → "Update Home Base TV" installs it.
- Page changes: rebuild tv/app/src/main/assets/tv.html and also upload it to Cloudflare KV namespace
  "home-bridge" (id 7f3afe324542487aaf849de8927bd623), key "tv_page".

## Done in 2.1 / page 12.0
Shared look module (tv/page/hb-look.js), quick looks, part colors, clock/date styles and minute animations, button
glows, press effects, card styles, 17 background motions, original characters, cached live previews, sectioned Style
panel, native tiles follow glow/press settings.

## Next: premium polish (every effect switchable on/off; calm by default)
- Live color changing/cycling: OFF by default, option only. "Reset to recommended" restores calm defaults.
- Foundation (always on): one display font + one text font everywhere (page, Style panel, native labels); spacing
  grid 8/16/24/48; big clock with lighter supporting text; one motion language (same easing, 150/250/400 ms;
  fade + short slide, never pop; menus open from the button that opened them); no error text on screen
  (show the last good version instead).
- Focus: tiles lift with a theme-colored shadow and a sliding sheen (parallax tilt); options for tilt, sheen, glow
  strength; soft navigation/select sounds with on/off + volume; high-res banners with one consistent shadow.
- Depth: frosted-glass panels (on/off), top-edge highlight on cards, slow background drift (on/off).
- Living background: time-of-day lighting (on/off), weather touches (on/off), holiday themes subtle/full/off.
- Settings: side panel sliding in from the right with section icons, live previews, smooth fades.
- Little details: status strip (time, weather, Wi-Fi, who's home) on/off; startup animation on/off; screensaver
  crossfade with gentle zoom (zoom on/off, speed).
- Fun: original mascot that appears briefly (morning wave, chores-done celebration); Fun level Calm/Playful/Party.
- Performance: transforms/opacity only, no full rebuilds on a press, blur auto-off in Performance mode (on by default
  on the TV), respect reduce-motion.

## Next: Watch features (optional section with its own on/off switch)
Uses Claude through the Home Base wall (it already asks Claude for meal plans and recipes) and the TV app's ability
to open other apps. Picks are simply the best fit for the mood: any movie, show, video, podcast or game, not limited
to free services. Each card shows where it streams, and Play opens it in Nuvio first (the family's main app), with
the streaming service's own app or YouTube as the other options. Claude's knowledge of where something streams can be
out of date, so buttons open the app's own page or search for the title rather than a guessed direct link.

1. "What should I watch?" button on the TV home screen
   - Remote-friendly picker: Mood (funny, cozy, exciting, scary, learn something), Time (30 min / 1 hr / 2 hr+),
     Energy (wind down / medium / wide awake), Who's watching (family members from Home Base + "everyone", with a
     kid-safe filter when kids are included).
   - Returns 5 cards: 1 movie, 1 YouTube video, 1 podcast, 1 game, 1 documentary, each with a one-line "why".
   - Play opens the right app to a search for it (YouTube: com.google.android.youtube.tv with a search intent; others
     by their package's search, falling back to opening the app). "More like this" and "Something else" buttons.
2. Movie night planner
   - Pick a mood → a short list of great movies with where to watch, why you'll like it, and backups.
   - Optional: put "Movie night" on the family calendar and suggest a matching dinner in Meals.
3. Family channel guide (YouTube as rows)
   - Rows on the TV home screen: Learning, Kids, Cooking, Chill (rows editable), filled with YouTube picks that
     change daily, plus a simple 7-day lineup. Remembers the channels the family likes.
   - On/off switch, and which rows show.

Keep all three in the Style/Settings groups under a new "Watch" section, off by default until switched on.

## Next: Nuvio on the TV (the Nuvio app is already installed on the box)
Find its package and deep links first: `adb shell pm list packages | grep -i nuvio`, and its intent filters/URL scheme
from `adb shell dumpsys package <pkg>` (Nuvio is open source, so its manifest can be checked too). Don't guess them.
1. Play buttons: when a Watch pick is a movie or show, "Open in Nuvio" is the main button (to the title's page or its
   search), with the streaming service's app as a second option. Fall back to just opening Nuvio when there's no deep link.
2. Continue watching / watchlist row (optional, off by default): Nuvio syncs with Trakt. If the family turns it on and
   signs in to Trakt once (device-code sign-in on the TV, token kept on the Home Bridge, never in the repo), show a
   "Continue watching" and "Watchlist" poster row on the home screen that opens each title in Nuvio.
3. Nuvio-style look for the Watch section: big backdrop "hero" for the top pick, poster rows with a soft zoom on
   focus, title logo art, rating and runtime chips, and an optional muted trailer preview after a few seconds on a
   tile (on/off). Artwork from TMDB (free API key, stored on the Home Bridge, not in the repo), with TMDB credited.
4. Tile in the app row: Nuvio keeps its themed tile; "hold OK" offers Open / Continue watching / Watchlist.
Home Base opens titles in Nuvio as it's already set up; it doesn't install or configure Nuvio add-ons.
