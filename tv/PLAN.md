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
to open other apps. All picks must be free and legal (YouTube, Tubi, Pluto TV, Freevee, Kanopy/Hoopla with a library
card, PBS, public podcasts). Claude's knowledge of where something streams can be out of date, so every Play button
opens the app's own search for the title rather than a guessed direct link.

1. "What should I watch?" button on the TV home screen
   - Remote-friendly picker: Mood (funny, cozy, exciting, scary, learn something), Time (30 min / 1 hr / 2 hr+),
     Energy (wind down / medium / wide awake), Who's watching (family members from Home Base + "everyone", with a
     kid-safe filter when kids are included).
   - Returns 5 cards: 1 movie, 1 YouTube video, 1 podcast, 1 game, 1 documentary, each with a one-line "why".
   - Play opens the right app to a search for it (YouTube: com.google.android.youtube.tv with a search intent; others
     by their package's search, falling back to opening the app). "More like this" and "Something else" buttons.
2. Movie night planner
   - Pick a mood → a short list of free movies with where to watch, why you'll like it, and backups.
   - Optional: put "Movie night" on the family calendar and suggest a matching dinner in Meals.
3. Family channel guide (YouTube as rows)
   - Rows on the TV home screen: Learning, Kids, Cooking, Chill (rows editable), filled with YouTube picks that
     change daily, plus a simple 7-day lineup. Remembers the channels the family likes.
   - On/off switch, and which rows show.

Keep all three in the Style/Settings groups under a new "Watch" section, off by default until switched on.
