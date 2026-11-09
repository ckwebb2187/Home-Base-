package app.homebase.tv;

import android.animation.ValueAnimator;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Ambient music for the home screen: real recorded tracks, played one after another and faded in and out. Played by
 * the app itself (not the page), so it carries on smoothly behind the screensaver.
 * Stations (Style → Screen & sound → Ambient music): Zen ships inside the app; the others download each track once
 * (from incompetech.com) the first time that station is picked and keep it on the box. Until a track is ready the
 * station plays what it already has, or Zen.
 * Music by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0
 * (creativecommons.org/licenses/by/4.0/).
 */
final class Zen {
    private static final String[] ZEN = { "zen/zen1.m4a", "zen/zen4.m4a", "zen/zen2.m4a", "zen/zen3.m4a" };
    private static final String SRC = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/";
    private static final Map<String, String[]> STATIONS = new HashMap<>();
    static {
        STATIONS.put("piano", new String[]{ "Relaxing Piano Music", "Gymnopedie No 1", "Clean Soul", "Dreamy Flashback" });
        STATIONS.put("dreamy", new String[]{ "Ethereal Relaxation", "Floating Cities", "Dreams Become Real" });
        STATIONS.put("calm", new String[]{ "Tranquility", "Peaceful Desolation", "At Rest", "Bathed in the Light" });
        STATIONS.put("night", new String[]{ "Deep Haze", "Frozen Star", "Lightless Dawn" });
        STATIONS.put("hope", new String[]{ "Eternal Hope", "Lasting Hope", "Ascending the Vale", "Morning" });
        STATIONS.put("lounge", new String[]{ "Bossa Antigua", "Lobby Time", "Jazz Brunch", "Cool Vibes", "Airport Lounge" });
        STATIONS.put("acoustic", new String[]{ "Laid Back Guitars", "Wholesome", "Easy Lemon", "Ambler", "Wallpaper" });
    }
    /** How loud, on top of the TV's own volume: kept low so it sits in the background. */
    static final float VOLUME = 0.18f;

    private final Context c;
    private MediaPlayer mp;
    private int track = (int) (System.currentTimeMillis() / 60000 % 97);
    private float vol, level = 1f;
    private ValueAnimator fade;
    private boolean wanted, fallback;
    private final android.os.Handler ui = new android.os.Handler(android.os.Looper.getMainLooper());
    private String mode = "zen";
    private static final List<String> fetching = Collections.synchronizedList(new ArrayList<>());

    Zen(Context c) { this.c = c.getApplicationContext(); }

    /** m: "zen", "off", "mix" or a station name; loud: "low", "mid" or "high". */
    void setMode(String m, String loud) {
        level = "low".equals(loud) ? 0.6f : "high".equals(loud) ? 1.6f : 1f;
        if (m == null || m.isEmpty() || !(m.equals("zen") || m.equals("off") || m.equals("mix") || STATIONS.containsKey(m))) m = "zen";
        if (!m.equals(mode)) {
            mode = m;
            download();
            if (mp != null) { if (fade != null) fade.cancel(); try { mp.release(); } catch (Exception e) { /* gone */ } mp = null; vol = 0f; }
            if (wanted) play();
        } else if (wanted && mp != null) fadeTo(VOLUME * level, 600, false);
    }

    void play() {
        wanted = true;
        if ("off".equals(mode)) { if (mp != null) fadeTo(0f, 800, true); return; }
        if (mp == null) open();
        else if (!mp.isPlaying()) { try { mp.start(); } catch (Exception e) { release(); wanted = true; open(); } }
        fadeTo(VOLUME * level, 2500, false);
    }

    void pause() { wanted = false; if (mp != null) fadeTo(0f, 1200, true); }

    void release() { wanted = false; if (fade != null) fade.cancel(); if (mp != null) { try { mp.release(); } catch (Exception e) { /* gone */ } mp = null; } }

    // ---------- tracks ----------
    private List<String> titles() {
        if ("mix".equals(mode)) { List<String> all = new ArrayList<>(); for (String[] a : STATIONS.values()) all.addAll(Arrays.asList(a)); Collections.sort(all); return all; }
        String[] a = STATIONS.get(mode); return a == null ? new ArrayList<>() : Arrays.asList(a);
    }
    private File file(String title) { return new File(new File(c.getFilesDir(), "music"), title.replaceAll("[^A-Za-z0-9]", "_") + ".mp3"); }
    /** The tracks ready to play for this station (Zen's always are). */
    private List<String> ready() {
        List<String> out = new ArrayList<>();
        for (String t : titles()) if (file(t).isFile()) out.add(t);
        return out;
    }
    /** Fetches this station's missing tracks one at a time, in the background. */
    private void download() {
        final List<String> need = new ArrayList<>();
        for (String t : titles()) if (!file(t).isFile() && !fetching.contains(t)) need.add(t);
        if (need.isEmpty()) return;
        fetching.addAll(need);
        new Thread(() -> {
            for (String t : need) {
                File f = file(t), tmp = new File(f.getPath() + ".part");
                try {
                    f.getParentFile().mkdirs();
                    HttpURLConnection h = (HttpURLConnection) new URL(SRC + t.replace(" ", "%20") + ".mp3").openConnection();
                    h.setConnectTimeout(15000); h.setReadTimeout(30000); h.setRequestProperty("User-Agent", "HomeBaseTV");
                    try (InputStream in = h.getInputStream(); FileOutputStream o = new FileOutputStream(tmp)) {
                        byte[] b = new byte[65536]; int n; while ((n = in.read(b)) > 0) o.write(b, 0, n);
                    }
                    if (h.getResponseCode() == 200 && tmp.length() > 100000) tmp.renameTo(f); else tmp.delete();
                } catch (Exception e) { tmp.delete(); }
                fetching.remove(t);
                // The station's first track is ready: switch over from the Zen stand-in right away.
                ui.post(() -> { if (wanted && fallback && mp != null && f.isFile()) { try { mp.release(); } catch (Exception e) { /* gone */ } mp = null; vol = 0f; open(); fadeTo(VOLUME * level, 2500, false); } });
            }
        }, "hb-music").start();
    }

    private void open() {
        try {
            MediaPlayer m = new MediaPlayer();
            List<String> have = "zen".equals(mode) ? null : ready();
            fallback = have != null && have.isEmpty();
            if (have == null || have.isEmpty()) {   // Zen, or a station still downloading its first track
                try (AssetFileDescriptor fd = c.getAssets().openFd(ZEN[track % ZEN.length])) { m.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength()); }
            } else m.setDataSource(file(have.get(track % have.size())).getPath());
            m.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
            m.setOnCompletionListener(done -> {
                if (done != mp) return;
                done.release(); mp = null; track++;
                if (wanted) open();
            });
            m.setOnErrorListener((bad, what, extra) -> { if (bad == mp) { try { bad.release(); } catch (Exception e) { /* gone */ } mp = null; track++; if (wanted) open(); } return true; });
            m.prepare();
            m.setVolume(vol, vol);
            m.start();
            mp = m;
        } catch (Exception e) { mp = null; }
    }

    private void fadeTo(float to, long ms, boolean thenPause) {
        if (fade != null) fade.cancel();
        fade = ValueAnimator.ofFloat(vol, to);
        fade.setDuration(ms);
        fade.addUpdateListener(a -> { vol = (float) a.getAnimatedValue(); if (mp != null) try { mp.setVolume(vol, vol); } catch (Exception e) { /* gone */ } });
        if (thenPause) fade.addListener(new android.animation.AnimatorListenerAdapter() {
            @Override public void onAnimationEnd(android.animation.Animator a) { if (!wanted && mp != null) try { mp.pause(); } catch (Exception e) { /* gone */ } }
        });
        fade.start();
    }
}
