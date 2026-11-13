package app.homebase.tv;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.graphics.Outline;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextClock;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * The TV's home screen: Home Base's clean background (clock, weather, what's up next, the holiday theme) with one
 * row of apps along the bottom. After a few idle minutes it switches to the Home Base screensaver.
 */
public class HomeActivity extends Activity {
    private static final long IDLE_MS = 5 * 60 * 1000L;
    private static final Set<String> HIDE = new HashSet<>(Arrays.asList(
            "com.google.android.apps.tv.launcherx", "com.google.android.tvlauncher", "com.google.android.leanbacklauncher",
            "com.google.android.tungsten.setupwraith", "com.android.tv.settings"));

    private final Handler ui = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private View fallback;
    private WebView web;
    private LinearLayout row;
    private HorizontalScrollView scroller;
    /** The Live TV row along the bottom (live channel apps), under the main app row. Style → Layout → Live TV row. */
    private HorizontalScrollView liveScroller;
    private LinearLayout liveRow;
    private TextView liveHead;
    private int scrH, liveW, liveH;
    private String fxLive = "on";
    private static final Set<String> LIVE = new HashSet<>(Arrays.asList(
            "tv.pluto.android", "com.tubitv", "com.roku.web.trc", "com.cbs.ott", "com.smarterspro.smartersprotv", "com.google.android.tv",
            "com.google.android.youtube.tvunplugged", "com.sling", "com.fubo.firetv.screen", "com.fubotv.android", "com.philo.philo.google", "com.frndlytv.android",
            "com.haystack.android", "com.cbsnews.ott", "com.newsy.newsy", "com.xumo.xumo.tv", "com.samsung.android.tvplus", "com.plexapp.android", "com.localnow.android"));
    private static boolean isLive(String pkg) { return LIVE.contains(pkg) || pkg.startsWith("com.raycom.") || pkg.startsWith("com.graymedia.") || pkg.startsWith("com.nexstar."); }
    private TextView label;
    private int tileW, tileH;
    private String loadedFor = "";
    private boolean rowDirty = true;
    private final android.content.BroadcastReceiver appsChanged = new android.content.BroadcastReceiver() {
        @Override public void onReceive(android.content.Context c, Intent i) { rowDirty = true; if (hasWindowFocus()) { rowDirty = false; buildRow(); } }
    };
    /** The theme's colors, sent by the page, for the glow around the focused app. */
    private int glow = Color.rgb(109, 194, 164), glow2 = Color.rgb(240, 180, 60);
    private final List<Runnable> restyle = new ArrayList<>();
    private TileTheme theme = new TileTheme();
    /** Which tile is being made, so the stickers take turns and neighbors never match. */
    private int tileN;
    /** True while the screensaver is opening over the home screen, so the music keeps playing behind it. */
    private boolean toSaver;
    private Zen zen;
    /** Behind the screensaver the music stops when the box is allowed to sleep (after two hours, like the screensaver). */
    private final Runnable zenSleep = () -> { if (zen != null) zen.pause(); };
    private final Runnable idle = () -> { if (this.panelOpen) { resetIdle(); return; } toSaver = true; startActivity(new Intent(this, SaverActivity.class)); };
    /** True while the page's Style panel is open: the remote's buttons go to the page then. */
    private boolean panelOpen;
    /** Where the small Settings and Style buttons sit: "corner" (bottom right), "end" or "start" of the app row. */
    private String gearPlace = "corner";
    private LinearLayout corner;
    /** Each tile's picture and sticker, so a new theme can recolor them in place instead of rebuilding the row. */
    private static final class TileRef { final Tile t; final ImageView img, sticker; TileRef(Tile t, ImageView img, ImageView sticker) { this.t = t; this.img = img; this.sticker = sticker; } }
    private final List<TileRef> refs = new ArrayList<>();
    private int themeGen;
    /** The look's button settings, sent by the page (HBLook.fx): glow style, which tiles glow, strength, press effect. */
    private String fxBtn = "soft", fxWhich = "sel", fxStr = "normal", fxPress = "push", fxJson = "";
    /** The feel switches from Style: tilt toward you, light sheen, navigation sounds (and volume), tile art. */
    private String fxTilt = "on", fxSheen = "on", fxSnd = "off", fxSndSet = "soft", fxVol = "low", fxArt = "theme", fxMusic = "zen", fxMusicVol = "mid";
    /** The one easing every animation uses (the page's cubic-bezier(.2,.8,.2,1)); 150 / 250 / 400 ms. */
    private static final android.view.animation.Interpolator SMOOTH = new android.view.animation.PathInterpolator(0.22f, 1f, 0.36f, 1f);
    private static final android.view.animation.Interpolator EASE = new android.view.animation.PathInterpolator(0.2f, 0.8f, 0.2f, 1f);
    /** Which way the last arrow press went (-1 left, 1 right), so a newly focused tile tilts in from that side. */
    private int navDir = 0;
    private boolean keyNav;
    private Snd snd;
    /** The TV just woke: the page plays its startup animation the next time the home screen shows. */
    private boolean bootPending;
    private final android.content.BroadcastReceiver screenOn = new android.content.BroadcastReceiver() {
        @Override public void onReceive(android.content.Context c, Intent i) { bootPending = true; if (hasWindowFocus()) playBoot(); }
    };
    private void playBoot() { bootPending = false; if (web != null) web.evaluateJavascript("window.hbBoot && hbBoot()", null); }
    private void sound(String kind) {
        if (!"on".equals(fxSnd)) return;
        if (snd == null) snd = new Snd(this);
        snd.play(kind, fxSndSet, fxVol);
    }
    private int fxGlow = 0;
    private float fxK() { return "subtle".equals(fxStr) ? 0.6f : "strong".equals(fxStr) ? 1.6f : 1f; }
    private float focusScale() { return "subtle".equals(fxStr) ? 1.08f : "strong".equals(fxStr) ? 1.16f : 1.12f; }
    private int glowC() { return fxGlow != 0 ? fxGlow : glow; }
    /** Feel & extras settings the app draws (sent by the page through prefs()): tile tilt & shine, sounds, Watch button. */
    private boolean tiltOn = true, watchOn = true;
    private String soundMode = "off";
    private View watchPill;
    private int lastDx;   // which way the last left/right press went, so a tile tilts in from that side
    private void navSound(boolean select) {
        if ("off".equals(soundMode)) return;
        try {
            android.media.AudioManager am = (android.media.AudioManager) getSystemService(AUDIO_SERVICE);
            float vol = "soft".equals(soundMode) ? 0.25f : 0.7f;
            int fx = select ? android.media.AudioManager.FX_KEY_CLICK : lastDx < 0 ? android.media.AudioManager.FX_FOCUS_NAVIGATION_LEFT : lastDx > 0 ? android.media.AudioManager.FX_FOCUS_NAVIGATION_RIGHT : android.media.AudioManager.FX_FOCUS_NAVIGATION_UP;
            am.playSoundEffect(fx, vol);
        } catch (Exception e) { /* no sound is fine */ }
    }
    private void readPrefs(String json) {
        try {
            org.json.JSONObject o = new org.json.JSONObject(json == null || json.isEmpty() ? "{}" : json);
            tiltOn = o.optBoolean("tilt", true); watchOn = o.optBoolean("watch", true);
            String sm = o.optString("sound", "off"); soundMode = "soft".equals(sm) || "normal".equals(sm) ? sm : "off";
        } catch (Exception e) { /* keep the defaults */ }
    }
    /** Opens a link in another app: Nuvio for a movie or show, YouTube for a trailer or a search. "" when it opened. */
    private String openLink(String uri, String pkg) {
        if (uri == null || uri.isEmpty()) return "Nothing to open.";
        PackageManager pm = getPackageManager();
        String target = null, appName = "that app";
        if ("nuvio".equals(pkg)) {
            appName = "Nuvio";
            if (pm.getLaunchIntentForPackage("com.nuvio.tv") != null) target = "com.nuvio.tv";
            else {
                Intent li = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
                for (ResolveInfo ri : pm.queryIntentActivities(li, 0)) {
                    CharSequence l = ri.loadLabel(pm);
                    if (l != null && l.toString().toLowerCase(Locale.US).contains("nuvio")) { target = ri.activityInfo.packageName; break; }
                }
            }
        } else if ("youtube".equals(pkg)) {
            appName = "YouTube";
            if (pm.getLaunchIntentForPackage("com.google.android.youtube.tv") != null) target = "com.google.android.youtube.tv";
            else if (pm.getLaunchIntentForPackage("com.google.android.youtube") != null) target = "com.google.android.youtube";
        }
        Intent v = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(uri)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (target != null) {
            try { startActivity(new Intent(v).setPackage(target)); return ""; } catch (Exception e) { /* try without the package */ }
        }
        try { startActivity(v); return ""; } catch (Exception e) { /* nothing takes this link */ }
        if (target != null) {
            Intent l = pm.getLaunchIntentForPackage(target);
            if (l != null) { try { startActivity(l.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); return "Opened " + appName + " — search for it there."; } catch (Exception e) { /* fall through */ } }
        }
        return appName + " isn't installed on this TV.";
    }

    /** One tile: an app, the Home Base wall, or Settings. */
    private static final class Tile {
        final String key, name; final Drawable art; final boolean banner; final Runnable open;
        Tile(String key, String name, Drawable art, boolean banner, Runnable open) { this.key = key; this.name = name; this.art = art; this.banner = banner; this.open = open; }
    }

    /** The app row's look, sent by the page whenever Home Base's theme changes: its colors and a few of its stickers. */
    private static final class TileTheme {
        int main = Color.rgb(29, 91, 74), accent = Color.rgb(109, 194, 164), gold = Color.rgb(240, 180, 60);
        /** A second tile color, used on every other tile (Evergreen Glow: garnet and pine); 0 when there's only one. */
        int alt = 0;
        TileTheme altOf() { if (alt == 0) return this; TileTheme t = new TileTheme(); t.main = alt; t.accent = accent; t.gold = gold; t.json = json; return t; }
        final List<android.graphics.Bitmap> stickers = new ArrayList<>();
        String json = "";
        static TileTheme parse(String json) {
            TileTheme t = new TileTheme();
            try {
                org.json.JSONObject o = new org.json.JSONObject(json);
                t.main = Color.parseColor(o.getString("main")); t.accent = Color.parseColor(o.getString("accent")); t.gold = Color.parseColor(o.getString("gold"));
                if (o.has("alt")) t.alt = Color.parseColor(o.getString("alt"));
                org.json.JSONArray a = o.optJSONArray("stickers");
                for (int i = 0; a != null && i < a.length(); i++) {
                    byte[] b = android.util.Base64.decode(a.getString(i), android.util.Base64.DEFAULT);
                    android.graphics.Bitmap bm = android.graphics.BitmapFactory.decodeByteArray(b, 0, b.length);
                    if (bm != null) t.stickers.add(bm);
                }
                t.json = json;
            } catch (Exception e) { /* keep the defaults */ }
            return t;
        }
    }

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int W = dm.widthPixels, H = dm.heightPixels;
        tileW = Math.round(W * 0.145f); tileH = Math.round(tileW * 9f / 16f);

        String saved = Hb.prefs(this).getString("tileTheme", "");
        if (!saved.isEmpty()) theme = TileTheme.parse(saved);

        root = new FrameLayout(this);
        root.setClipChildren(false);
        root.setBackgroundColor(Color.rgb(13, 20, 18));

        // Shown until the page is ready (or if it can't load): a plain gradient and a clock.
        FrameLayout fb = new FrameLayout(this);
        GradientDrawable g = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{Color.rgb(24, 52, 44), Color.rgb(12, 18, 16)});
        fb.setBackground(g);
        TextClock clock = new TextClock(this);
        clock.setFormat12Hour("h:mm");
        clock.setTextColor(Color.rgb(238, 242, 239));
        clock.setTypeface(Hb.display(this));
        clock.setTextSize(TypedValue.COMPLEX_UNIT_PX, H * 0.16f);
        FrameLayout.LayoutParams cp = new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.START);
        cp.leftMargin = Math.round(W * 0.055f); cp.topMargin = Math.round(H * 0.05f);
        fb.addView(clock, cp);
        fallback = fb;
        root.addView(fb, new FrameLayout.LayoutParams(-1, -1));

        web = new WebView(this);
        Hb.setUpWebView(web);
        web.setFocusable(false);
        web.setFocusableInTouchMode(false);
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface public void look(String accent, String gold) {
                try { final int a = Color.parseColor(accent), g = Color.parseColor(gold); ui.post(() -> { glow = a; glow2 = g; for (Runnable r : restyle) r.run(); label.setShadowLayer(18, 0, 0, Color.argb(200, Color.red(a), Color.green(a), Color.blue(a))); }); } catch (Exception e) { /* keep the last colors */ }
            }
            @JavascriptInterface public void theme(final String json) {
                if (json == null || json.length() > 2000000) return;
                final TileTheme t = TileTheme.parse(json);   // decoded here, off the screen's thread
                ui.post(() -> {
                    if (t.json.isEmpty() || t.json.equals(theme.json)) return;
                    boolean stickersChanged = t.stickers.isEmpty() != theme.stickers.isEmpty();
                    theme = t; Hb.prefs(HomeActivity.this).edit().putString("tileTheme", t.json).apply();
                    if (stickersChanged) buildRow(); else recolorTiles();
                });
            }
            @JavascriptInterface public void panel(final boolean open) { ui.post(() -> setPanel(open)); }
            @JavascriptInterface public void feed(final boolean open) { ui.post(() -> { slidePanel = true; setPanel(open); slidePanel = false; }); }
            @JavascriptInterface public void pair() { ui.post(() -> startActivity(new Intent(HomeActivity.this, PairActivity.class))); }
            @JavascriptInterface public void place(final String where) { jsPlace(where); }
            @JavascriptInterface public void update() { jsUpdate(); }
            @JavascriptInterface public String version() { return Upd.versionName(HomeActivity.this); }
            @JavascriptInterface public void fx(final String json) { ui.post(() -> setFx(json)); }
            @JavascriptInterface public void snd(final String kind) { ui.post(() -> sound(kind)); }
            @JavascriptInterface public String net() { return netState(); }
            @JavascriptInterface public String open(String uri, String pkg) { String r = openLink(uri, pkg); return r; }
            @JavascriptInterface public void prefs(final String json) {
                if (json == null || json.length() > 2000) return;
                ui.post(() -> {
                    boolean oldTilt = tiltOn, oldWatch = watchOn; String oldSound = soundMode;
                    readPrefs(json);
                    if (oldTilt == tiltOn && oldWatch == watchOn && oldSound.equals(soundMode)) return;
                    Hb.prefs(HomeActivity.this).edit().putString("feel", json).apply();
                    if (watchPill != null) watchPill.setVisibility(watchOn ? View.VISIBLE : View.GONE);
                });
            }
            @JavascriptInterface public void ready() { ui.post(() -> sendRowTop()); ui.post(() -> fallback.animate().alpha(0f).setDuration(400).withEndAction(() -> fallback.setVisibility(View.GONE)).start()); }
        }, "HomeBaseTVApp");
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));

        // The app row and the name of the focused app under it.
        scroller = new HorizontalScrollView(this);
        scroller.setHorizontalScrollBarEnabled(false);
        scroller.setClipToPadding(false);
        scroller.setClipChildren(false);
        scroller.setFillViewport(false);
        scroller.setSmoothScrollingEnabled(true);
        int pad = Math.round(W * 0.055f);
        scroller.setPadding(pad, Math.round(tileH * 0.12f), pad, Math.round(tileH * 0.12f));
        row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setClipChildren(false);
        row.setClipToPadding(false);
        scroller.addView(row, new FrameLayout.LayoutParams(-2, -2));
        FrameLayout.LayoutParams sp = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        sp.bottomMargin = Math.round(H * 0.075f);
        root.addView(scroller, sp);
        scrH = H; liveW = Math.round(tileW * 0.78f); liveH = Math.round(tileH * 0.78f);
        liveScroller = new HorizontalScrollView(this);
        liveScroller.setHorizontalScrollBarEnabled(false);
        liveScroller.setClipToPadding(false);
        liveScroller.setClipChildren(false);
        liveScroller.setSmoothScrollingEnabled(true);
        liveScroller.setPadding(pad, Math.round(liveH * 0.12f), pad, Math.round(liveH * 0.12f));
        liveRow = new LinearLayout(this);
        liveRow.setOrientation(LinearLayout.HORIZONTAL);
        liveRow.setClipChildren(false);
        liveRow.setClipToPadding(false);
        liveScroller.addView(liveRow, new FrameLayout.LayoutParams(-2, -2));
        root.addView(liveScroller, new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM));
        liveHead = new TextView(this);
        android.text.SpannableString lh = new android.text.SpannableString("\u25CF  LIVE TV");
        lh.setSpan(new android.text.style.ForegroundColorSpan(Color.rgb(255, 77, 77)), 0, 1, 0);
        liveHead.setText(lh);
        liveHead.setTextColor(Color.argb(210, 238, 242, 239));
        liveHead.setTextSize(TypedValue.COMPLEX_UNIT_PX, H * 0.018f);
        liveHead.setLetterSpacing(0.2f);
        liveHead.setTypeface(Hb.body(this, true));
        FrameLayout.LayoutParams hp = new FrameLayout.LayoutParams(-2, -2, Gravity.BOTTOM | Gravity.START);
        hp.leftMargin = pad;
        root.addView(liveHead, hp);

        label = new TextView(this);
        label.setTextColor(Color.argb(230, 238, 242, 239));
        label.setTextSize(TypedValue.COMPLEX_UNIT_PX, H * 0.026f);
        label.setTypeface(Hb.body(this, true));
        label.setLetterSpacing(0.01f);
        label.setShadowLayer(8, 0, 2, Color.argb(160, 0, 0, 0));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-2, -2, Gravity.BOTTOM | Gravity.START);
        lp.leftMargin = pad; lp.bottomMargin = Math.round(H * 0.03f);
        root.addView(label, lp);

        // The small Style and Settings buttons, top right (or in the app row; Style → Settings button). Watch has no
        // button: it's the section below the app rows (press down).
        gearPlace = Hb.prefs(this).getString("gear", "corner");
        parseFx(Hb.prefs(this).getString("tileFx", ""));
        readPrefs(Hb.prefs(this).getString("feel", ""));
        corner = new LinearLayout(this);
        corner.setOrientation(LinearLayout.HORIZONTAL);
        corner.setClipChildren(false);
        corner.setClipToPadding(false);
        corner.addView(pill("\uD83C\uDFA8", () -> openStyle()), pillParams());   // 🎨 Style
        corner.addView(pill("\u2699", () -> openSettings()), pillParams());   // ⚙ Settings
        FrameLayout.LayoutParams kp = new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.END);
        kp.rightMargin = pad; kp.topMargin = Math.round(H * 0.025f);
        corner.setVisibility("corner".equals(gearPlace) ? View.VISIBLE : View.GONE);
        root.addView(corner, kp);
        placeRows();

        setContentView(root);
        android.content.IntentFilter pf = new android.content.IntentFilter();
        pf.addAction(Intent.ACTION_PACKAGE_ADDED); pf.addAction(Intent.ACTION_PACKAGE_REMOVED); pf.addAction(Intent.ACTION_PACKAGE_CHANGED); pf.addAction(Intent.ACTION_PACKAGE_REPLACED);
        pf.addDataScheme("package");
        registerReceiver(appsChanged, pf);
        registerReceiver(screenOn, new android.content.IntentFilter(Intent.ACTION_SCREEN_ON));
    }

    @Override protected void onResume() {
        super.onResume();
        if (Hb.code(this).isEmpty()) { startActivity(new Intent(this, PairActivity.class)); return; }
        String want = Hb.pageUrl(this, "home");
        if (Hb.takeNewPage()) loadedFor = "";
        if (!want.equals(loadedFor)) { loadedFor = want; fallback.setVisibility(View.VISIBLE); fallback.setAlpha(1f); Hb.loadPage(this, web, "home"); }
        else { web.evaluateJavascript("window.hbRefresh && hbRefresh()", null); if (bootPending) playBoot(); }
        toSaver = false;
        ui.removeCallbacks(zenSleep);
        if (zen == null) { zen = new Zen(this); zen.setMode(fxMusic, fxMusicVol); }
        zen.play();
        web.onResume();
        // The app row is only rebuilt when apps are installed or removed (or the first time), so Home is instant.
        if (rowDirty || row.getChildCount() == 0) { rowDirty = false; buildRow(); }
        resetIdle();
    }

    @Override protected void onPause() {
        super.onPause();
        ui.removeCallbacks(idle);
        if (toSaver) { ui.postDelayed(zenSleep, 2 * 60 * 60 * 1000L); return; }   // the music plays on behind the screensaver
        if (zen != null) zen.pause();   // quiet when another app opens
        web.onPause();
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.getBooleanExtra("style", false)) { openStyle(); return; }
        // Pressing Home while already here jumps back to the first app.
        if (panelOpen) web.evaluateJavascript("window.hbKey && hbKey('back')", null);
        if (row.getChildCount() > 0) { row.getChildAt(0).requestFocus(); scroller.smoothScrollTo(0, 0); }
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        resetIdle();
        int code = e.getKeyCode();
        boolean down = e.getAction() == KeyEvent.ACTION_DOWN;
        if (down) lastDx = code == KeyEvent.KEYCODE_DPAD_RIGHT ? 1 : code == KeyEvent.KEYCODE_DPAD_LEFT ? -1 : code == KeyEvent.KEYCODE_DPAD_UP || code == KeyEvent.KEYCODE_DPAD_DOWN ? 0 : lastDx;
        if (down && !panelOpen && e.getRepeatCount() == 0 && (code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER)) navSound(true);
        // Down from the top buttons (Style, Settings) goes back to the first app on the left, not the nearest one.
        if (down && !panelOpen && code == KeyEvent.KEYCODE_DPAD_DOWN && corner != null && getCurrentFocus() != null
                && getCurrentFocus().getParent() == corner && row.getChildCount() > 0) {
            row.getChildAt(0).requestFocus(); scroller.smoothScrollTo(0, 0);
            return true;
        }
        // Down from the bottom row scrolls the screen into Watch (new & trending), which is part of the home screen.
        if (down && !panelOpen && code == KeyEvent.KEYCODE_DPAD_DOWN && e.getRepeatCount() == 0 && atBottom()) {
            sound("move");
            web.evaluateJavascript("window.hbWatch && hbWatch.open()", null);
            return true;
        }
        // While Style or Watch is open, the remote drives it.
        if (panelOpen) {
            String k = keyName(code);
            if (k != null) { if (down) web.evaluateJavascript("window.hbKey && hbKey('" + k + "')", null); return true; }
        }
        // The ★ / menu buttons open Style.
        if (code == KeyEvent.KEYCODE_MENU || code == KeyEvent.KEYCODE_BOOKMARK || code == KeyEvent.KEYCODE_STAR) { if (down && e.getRepeatCount() == 0) openStyle(); return true; }
        if (code == KeyEvent.KEYCODE_BACK) return true;   // it's the home screen: nothing to go back to
        if (down && (code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_RIGHT || code == KeyEvent.KEYCODE_DPAD_UP || code == KeyEvent.KEYCODE_DPAD_DOWN)) {
            navDir = code == KeyEvent.KEYCODE_DPAD_LEFT ? -1 : code == KeyEvent.KEYCODE_DPAD_RIGHT ? 1 : 0; keyNav = true;
        }
        return super.dispatchKeyEvent(e);
    }
    private static String keyName(int code) {
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_UP: return "up";
            case KeyEvent.KEYCODE_DPAD_DOWN: return "down";
            case KeyEvent.KEYCODE_DPAD_LEFT: return "left";
            case KeyEvent.KEYCODE_DPAD_RIGHT: return "right";
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER: return "ok";
            case KeyEvent.KEYCODE_BACK: case KeyEvent.KEYCODE_ESCAPE: return "back";
            case KeyEvent.KEYCODE_MENU: case KeyEvent.KEYCODE_BOOKMARK: case KeyEvent.KEYCODE_STAR: return "menu";
            default: return null;
        }
    }
    private void jsPlace(final String where) {
        ui.post(new Runnable() { @Override public void run() {
            String w = "start".equals(where) || "end".equals(where) ? where : "corner";
            if (w.equals(gearPlace)) return;
            gearPlace = w; Hb.prefs(HomeActivity.this).edit().putString("gear", w).apply();
            corner.setVisibility(panelOpen || !"corner".equals(w) ? View.GONE : View.VISIBLE);
            sendGearTop();
            buildRow();
        } });
    }
    private void jsUpdate() {
        Upd.check(this, new Upd.Say() { @Override public void say(final String msg) { ui.post(new Runnable() { @Override public void run() { HomeActivity.this.say(msg); } }); } });
    }
    private void openStyle() { sound("menu"); web.evaluateJavascript("window.hbStyle && hbStyle.open()", null); }
    private void openSettings() {
        try { startActivity(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (Exception e) { /* nothing on screen; the home screen stays */ }
    }
    private void say(String msg) {
        String js = "window.hbUpdate && hbUpdate(" + org.json.JSONObject.quote(msg) + ")";
        web.evaluateJavascript(js, null);
        if (!panelOpen) Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }
    /** True when nothing sits below the focused app or button, so Down means "scroll into Watch". */
    private boolean atBottom() {
        View cur = getCurrentFocus();
        if (cur == null) return false;
        View nx = cur.focusSearch(View.FOCUS_DOWN);
        if (nx == null || nx == cur || nx.getVisibility() != View.VISIBLE) return true;
        int[] a = new int[2], b = new int[2];
        cur.getLocationOnScreen(a); nx.getLocationOnScreen(b);
        return b[1] <= a[1] + cur.getHeight() / 2;
    }
    /** Watch opening scrolls the rows up and out; Style just fades them. */
    private boolean slidePanel;
    /** Style or Watch opened or closed: the app row steps out of the way so nothing draws over the panel. */
    private void setPanel(boolean open) {
        if (open == panelOpen) return;
        panelOpen = open;
        final boolean slide = slidePanel;
        final float up = -scrH * 0.45f;
        final View[] parts = { scroller, label, corner, liveScroller, liveHead };
        for (View v : parts) {
            if (v == corner && !"corner".equals(gearPlace)) continue;
            v.animate().cancel();
            if (open) v.animate().alpha(0f).translationY(slide ? up : 0f).setStartDelay(0).setDuration(slide ? 380 : 100).setInterpolator(slide ? SMOOTH : EASE).withEndAction(() -> v.setVisibility(View.INVISIBLE)).start();
            else {
                v.setVisibility(View.VISIBLE);
                if (slide) v.setTranslationY(up);
                v.animate().alpha(1f).translationY(0f).setStartDelay(slide ? 60 : 0).setDuration(slide ? 420 : 150).setInterpolator(slide ? SMOOTH : EASE).start();
            }
        }
        if (!open) { View f = row.getFocusedChild(); if (f != null) f.requestFocus(); else if (row.getChildCount() > 0) row.getChildAt(0).requestFocus(); }
        if (!open) { if (rowDirty) { rowDirty = false; buildRow(); } else placeRows(); }
    }

    /** A small rounded button (Style, Settings) that glows in the theme's color when selected. */
    private View pill(String text, final Runnable open) {
        final TextView t = new TextView(this);
        t.setText(text);
        final boolean icon = text.codePointCount(0, text.length()) == 1;
        final boolean gear = "\u2699".equals(text);
        t.setContentDescription(gear ? "Settings" : icon ? "Style" : "What should I watch?");
        final PaletteIcon pal = icon && !gear ? new PaletteIcon() : null;
        final GearIcon gi = gear ? new GearIcon() : null;
        final android.graphics.drawable.Drawable ic = pal != null ? pal : gi;
        if (ic != null) { t.setText(""); int is = Math.round(tileH * 0.26f); ic.setBounds(0, 0, is, is); t.setCompoundDrawables(ic, null, null, null); }
        t.setTextColor(Color.argb(235, 238, 242, 239));
        t.setTypeface(Hb.body(this, true));
        t.setTextSize(TypedValue.COMPLEX_UNIT_PX, tileH * (icon ? 0.24f : 0.17f));
        int ph = Math.round(tileH * 0.16f), pv = Math.round(tileH * 0.07f);
        t.setPadding(ph, pv, ph, pv);
        final GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(tileH);
        t.setBackground(bg);
        t.setFocusable(true);
        t.setClickable(true);
        final int stroke = Math.max(2, Math.round(tileH * 0.025f));
        final Runnable style = () -> {
            boolean f = t.hasFocus();
            int gc = glowC();
            boolean rest = !f && "all".equals(fxWhich);
            if (pal != null) {
                pal.body = mix(theme.main, gc, 0.35f); pal.edge = mix(gc, Color.WHITE, f ? 0.6f : 0.3f);
                pal.dots = new int[]{ theme.gold, Color.WHITE, mix(gc, Color.WHITE, 0.35f), mix(theme.accent, theme.gold, 0.5f) };
                pal.invalidateSelf();
            }
            if (gi != null) { gi.body = mix(theme.main, gc, 0.35f); gi.edge = mix(gc, Color.WHITE, f ? 0.6f : 0.3f); gi.hub = theme.gold; gi.invalidateSelf(); }
            bg.setColor(f ? Color.argb(Math.min(255, Math.round(90 * fxK())), Color.red(gc), Color.green(gc), Color.blue(gc)) : Color.argb(110, 0, 0, 0));
            bg.setStroke(stroke, f ? ("neon".equals(fxBtn) ? gc : mix(gc, Color.WHITE, 0.45f)) : rest ? Color.argb(150, Color.red(gc), Color.green(gc), Color.blue(gc)) : Color.argb(60, 255, 255, 255));
        };
        style.run();
        restyle.add(style);
        t.setOnFocusChangeListener((v, has) -> {
            style.run();
            v.animate().scaleX(has ? focusScale() : 1f).scaleY(has ? focusScale() : 1f).setDuration(250).setInterpolator(EASE).start();
            if (has && keyNav) { keyNav = false; sound("move"); }
            if (has) label.setText(gear ? "Settings  ·  hold OK to change the Home Base code" : icon ? "Style  ·  colors, glows and effects" : "Watch  ·  new & trending (or just press down)");
        });
        t.setOnClickListener(v -> pressThen(v, null, open));
        t.setOnLongClickListener(v -> { if (gear) { startActivity(new Intent(this, PairActivity.class)); return true; } return false; });
        return t;
    }
    private LinearLayout.LayoutParams pillParams() { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, -2); p.leftMargin = Math.round(tileH * 0.12f); return p; }

    /** New theme colors: each tile's picture is recolored off the screen's thread, then faded in place. */
    private void recolorTiles() {
        final int gen = ++themeGen;
        final TileTheme th = theme;
        final List<TileRef> list = new ArrayList<>(refs);
        new Thread(() -> {
            final List<android.graphics.Bitmap> out = new ArrayList<>();
            final TileTheme alt = th.altOf();
            for (int i = 0; i < list.size(); i++) out.add(themedArt(list.get(i).t, i % 2 == 1 ? alt : th));
            ui.post(() -> {
                if (gen != themeGen) return;
                for (int i = 0; i < list.size(); i++) {
                    TileRef r = list.get(i);
                    android.graphics.drawable.Drawable old = r.img.getDrawable();
                    android.graphics.drawable.Drawable nu = new android.graphics.drawable.BitmapDrawable(getResources(), out.get(i));
                    if (old != null) {
                        android.graphics.drawable.TransitionDrawable td = new android.graphics.drawable.TransitionDrawable(new android.graphics.drawable.Drawable[]{ old, nu });
                        td.setCrossFadeEnabled(true); r.img.setImageDrawable(td); td.startTransition(450);
                    } else r.img.setImageDrawable(nu);
                    if (r.sticker != null && !th.stickers.isEmpty()) r.sticker.setImageBitmap(th.stickers.get(i % th.stickers.size()));
                }
            });
        }, "hb-tiles").start();
    }

    /** The page's look settings for the app's own buttons (glow style, which glow, strength, press effect, glow color). */
    private void setFx(String json) {
        if (json == null || json.length() > 4000 || json.equals(fxJson)) return;
        String art = fxArt, live = fxLive;
        parseFx(json);
        Hb.prefs(this).edit().putString("tileFx", json).apply();
        for (Runnable r : restyle) r.run();
        if (!art.equals(fxArt)) recolorTiles();
        if (zen != null) zen.setMode(fxMusic, fxMusicVol);
        if (!live.equals(fxLive)) { if (panelOpen) rowDirty = true; else buildRow(); }
        if ("on".equals(fxSnd)) { if (snd == null) snd = new Snd(this); snd.prepare(fxSndSet); }
    }
    private void parseFx(String json) {
        if (json == null || json.isEmpty()) return;
        try {
            org.json.JSONObject o = new org.json.JSONObject(json);
            fxBtn = o.optString("btn", fxBtn); fxWhich = o.optString("which", fxWhich); fxStr = o.optString("str", fxStr); fxPress = o.optString("press", fxPress);
            fxTilt = o.optString("tilt", fxTilt); fxSheen = o.optString("sheen", fxSheen); fxSnd = o.optString("snd", fxSnd); fxSndSet = o.optString("sndSet", fxSndSet); fxVol = o.optString("vol", fxVol); fxMusic = o.optString("music", fxMusic); fxLive = o.optString("live", fxLive); fxMusicVol = o.optString("musicVol", fxMusicVol); fxArt = o.optString("art", fxArt);
            String g = o.optString("glow", "");
            fxGlow = g.matches("#[0-9a-fA-F]{6}") ? Color.parseColor(g) : 0;
            fxJson = json;
        } catch (Exception e) { /* keep the last settings */ }
    }
    /** The chosen press effect (push in, pop out, squish or flash), then the tile opens. */
    private void pressThen(final View view, final View flash, final Runnable open) {
        final float f = view.hasFocus() ? focusScale() : 1f;
        sound("ok");
        view.animate().cancel();
        Runnable back = () -> view.animate().scaleX(f).scaleY(f).setDuration(150).start();
        switch (fxPress) {
            case "pop": view.animate().scaleX(f * 1.08f).scaleY(f * 1.08f).setDuration(120).withEndAction(back).start(); break;
            case "squish": view.animate().scaleX(f * 1.09f).scaleY(f * 0.9f).setDuration(120).withEndAction(back).start(); break;
            case "flash": if (flash != null) { flash.setAlpha(0.55f); flash.animate().alpha(0f).setDuration(250).start(); } else { view.setAlpha(0.55f); view.animate().alpha(1f).setDuration(250).start(); } break;
            default: view.animate().scaleX(f * 0.93f).scaleY(f * 0.93f).setDuration(120).withEndAction(back).start();
        }
        ui.postDelayed(open, 170);
    }

    /** Stacks the rows: the Live TV row at the bottom (when it's on and has apps), the main row above it, and tells the
     *  page where the rows start so its cards stay clear of them. */
    private void placeRows() {
        if (liveScroller == null) return;
        boolean on = "on".equals(fxLive) && liveRow.getChildCount() > 0 && !panelOpen;
        int base = Math.round(scrH * 0.075f), liveBlock = Math.round(liveH * 1.24f);
        liveScroller.setVisibility(on ? View.VISIBLE : View.GONE);
        liveHead.setVisibility(on ? View.VISIBLE : View.GONE);
        ((FrameLayout.LayoutParams) liveScroller.getLayoutParams()).bottomMargin = base;
        ((FrameLayout.LayoutParams) liveHead.getLayoutParams()).bottomMargin = base + liveBlock;
        int mainBottom = on ? base + liveBlock + Math.round(scrH * 0.035f) : base;
        ((FrameLayout.LayoutParams) scroller.getLayoutParams()).bottomMargin = mainBottom;
        root.requestLayout();
        sendRowTop();
    }
    /** The buttons sit at the top right: the page leaves room for them so the Up next card isn't under them. */
    private void sendGearTop() {
        if (web != null) web.evaluateJavascript("document.body.classList.toggle('gear-top'," + "corner".equals(gearPlace) + ")", null);
    }
    private void sendRowTop() {
        sendGearTop();
        boolean on = "on".equals(fxLive) && liveRow != null && liveRow.getChildCount() > 0;
        int base = Math.round(scrH * 0.075f), liveBlock = Math.round(liveH * 1.24f);
        int top = (on ? base + liveBlock + Math.round(scrH * 0.035f) : base) + Math.round(tileH * 1.24f);
        float vh = Math.max(30f, top * 100f / scrH + 1.5f);
        if (web != null) web.evaluateJavascript("document.documentElement.style.setProperty('--row','" + String.format(Locale.US, "%.1f", vh) + "vh')", null);
    }

    private void resetIdle() { ui.removeCallbacks(idle); ui.postDelayed(idle, IDLE_MS); }

    // ---------- the app row ----------

    private void buildRow() {
        String focusedKey = null;
        View f = row.getFocusedChild();
        if (f != null && f.getTag() instanceof String) focusedKey = (String) f.getTag();
        List<Tile> tiles = tiles();
        row.removeAllViews();
        if (liveRow != null) liveRow.removeAllViews();
        restyle.clear();
        refs.clear();
        if (corner != null) for (int i = 0; i < corner.getChildCount(); i++) { final View c = corner.getChildAt(i); restyle.add(() -> c.getOnFocusChangeListener().onFocusChange(c, c.hasFocus())); }
        int gap = Math.round(tileW * 0.09f);
        View first = null, refocus = null;
        tileN = 0;
        boolean liveOn = "on".equals(fxLive) && liveRow != null;
        for (Tile t : tiles) {
            View v = tileView(t);
            tileN++;
            if (liveOn && isLive(t.key)) {
                LinearLayout.LayoutParams lp2 = new LinearLayout.LayoutParams(liveW, liveH);
                lp2.rightMargin = Math.round(liveW * 0.09f);
                liveRow.addView(v, lp2);
                if (t.key.equals(focusedKey)) refocus = v;
                continue;
            }
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(tileW, tileH);
            p.rightMargin = gap;
            row.addView(v, p);
            if (first == null) first = v;
            if (t.key.equals(focusedKey)) refocus = v;
        }
        View target = refocus != null ? refocus : first;
        if (target != null) target.requestFocus();
        placeRows();
    }

    private List<Tile> tiles() {
        PackageManager pm = getPackageManager();
        List<Tile> apps = new ArrayList<>();
        Intent q = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
        Intent hb = Hb.homeBaseApp(this);
        String hbPkg = hb != null && hb.getComponent() != null ? hb.getComponent().getPackageName() : (hb != null ? hb.getPackage() : null);
        Set<String> seen = new HashSet<>();
        for (ResolveInfo r : pm.queryIntentActivities(q, 0)) {
            final String pkg = r.activityInfo.packageName;
            if (pkg.equals(getPackageName()) || HIDE.contains(pkg) || pkg.equals(hbPkg) || !seen.add(pkg)) continue;
            Drawable banner = r.activityInfo.loadBanner(pm);
            if (banner == null) banner = r.activityInfo.applicationInfo.loadBanner(pm);
            final boolean isBanner = banner != null;
            Drawable art = isBanner ? banner : appIcon(r, pm);
            final ComponentName cn = new ComponentName(pkg, r.activityInfo.name);
            apps.add(new Tile(pkg, String.valueOf(r.loadLabel(pm)), art, isBanner, () -> {
                Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER).setComponent(cn).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { startActivity(i); } catch (Exception e) { /* nothing on screen; the home screen stays */ }
            }));
        }
        // Apps moved to the front come first (in that order), then the rest A to Z.
        final List<String> order = new ArrayList<>(Arrays.asList(Hb.prefs(this).getString("order", "").split(",")));
        Collections.sort(apps, (a, b) -> {
            int ia = order.indexOf(a.key), ib = order.indexOf(b.key);
            if (ia >= 0 || ib >= 0) return ia < 0 ? 1 : ib < 0 ? -1 : ia - ib;
            return a.name.toLowerCase(Locale.US).compareTo(b.name.toLowerCase(Locale.US));
        });
        List<Tile> out = new ArrayList<>();
        Tile set = new Tile("settings", "Settings  ·  hold OK to change the Home Base code", getDrawable(android.R.drawable.ic_menu_preferences), false, this::openSettings);
        out.add(new Tile("homebase", "Home Base", getDrawable(R.drawable.banner), true, () -> Hb.openWall(this)));
        if ("start".equals(gearPlace)) out.add(set);
        out.addAll(apps);
        if ("end".equals(gearPlace)) out.add(set);
        return out;
    }

    private View tileView(final Tile t) {
        final float r = tileH * 0.12f;
        FrameLayout v = new FrameLayout(this);
        v.setTag(t.key);
        v.setFocusable(true);
        v.setClickable(true);
        // Themed tile: the app's own banner filling the whole tile (or its icon on its own color when it has no
        // banner), with every pixel recolored into Home Base's theme, so it looks like the app's native tile in the
        // theme's colors. In holiday themes one of the theme's stickers sits in the corner.
        v.setBackgroundColor(Color.TRANSPARENT);
        v.setClipToOutline(true);
        v.setOutlineProvider(new ViewOutlineProvider() {
            @Override public void getOutline(View view, Outline o) { o.setRoundRect(0, 0, view.getWidth(), view.getHeight(), r); }
        });
        ImageView img = new ImageView(this);
        img.setScaleType(ImageView.ScaleType.FIT_XY);
        img.setImageBitmap(themedArt(t, refs.size() % 2 == 1 ? theme.altOf() : theme));
        v.addView(img, new FrameLayout.LayoutParams(-1, -1));
        ImageView stickerView = null;
        if (!theme.stickers.isEmpty()) {
            int h = Math.abs(t.key.hashCode());
            ImageView st = new ImageView(this);
            st.setImageBitmap(theme.stickers.get(tileN % theme.stickers.size()));
            st.setScaleType(ImageView.ScaleType.FIT_CENTER);
            st.setRotation((h / 7 % 25) - 12);
            int ss = Math.round(tileH * 0.36f);
            FrameLayout.LayoutParams stp = new FrameLayout.LayoutParams(ss, ss, Gravity.TOP | Gravity.END);
            stp.topMargin = Math.round(tileH * 0.03f); stp.rightMargin = Math.round(tileH * 0.03f);
            v.addView(st, stp);
            stickerView = st;
        }
        refs.add(new TileRef(t, img, stickerView));
        // Focus glow drawn on top: a bright ring in the theme's color with a soft wash inside it, plus a colored
        // shadow (Android 9 and up) so the tile seems to light up. It breathes gently while it's selected.
        final View ring = new View(this);
        final GradientDrawable rd = new GradientDrawable();
        rd.setCornerRadius(r);
        ring.setBackground(rd);
        ring.setVisibility(View.INVISIBLE);
        v.addView(ring, new FrameLayout.LayoutParams(-1, -1));
        final int stroke = Math.max(3, Math.round(tileH * 0.035f));
        Runnable style = () -> {
            int edge = mix(glow, Color.WHITE, 0.45f);
            rd.setStroke(stroke, edge);
            rd.setColor(Color.argb(38, Color.red(glow), Color.green(glow), Color.blue(glow)));
            if (Build.VERSION.SDK_INT >= 28) { v.setOutlineSpotShadowColor(glow); v.setOutlineAmbientShadowColor(glow2); }
        };
        // A soft halo of the theme's color spreading out behind the selected tile (outside it, so it sits in a holder).
        final FrameLayout holder = new FrameLayout(this);
        holder.setTag(t.key);
        holder.setClipChildren(false);
        holder.setClipToPadding(false);
        final int hs = Math.round(tileW * 1.75f);
        final View halo = new View(this);
        final GradientDrawable hd = new GradientDrawable();
        hd.setShape(GradientDrawable.OVAL);
        hd.setGradientType(GradientDrawable.RADIAL_GRADIENT);
        hd.setGradientRadius(hs / 2f);
        halo.setBackground(hd);
        halo.setScaleY(0.62f);
        halo.setAlpha(0f);
        holder.addView(halo, new FrameLayout.LayoutParams(hs, hs, Gravity.CENTER));
        holder.addView(v, new FrameLayout.LayoutParams(-1, -1));

        Runnable haloStyle = () -> { int hc = mix(glow, Color.WHITE, 0.2f); hd.setColors(new int[]{ Color.argb(210, Color.red(hc), Color.green(hc), Color.blue(hc)),
                Color.argb(80, Color.red(glow), Color.green(glow), Color.blue(glow)), Color.TRANSPARENT }); };
        style.run();
        haloStyle.run();
        restyle.add(style);
        restyle.add(haloStyle);
        // A soft light band that slides across the tile (Light sweep, Hologram), and a white wash for the Flash press.
        final View sweep = new View(this);
        sweep.setBackground(new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, new int[]{ Color.TRANSPARENT, Color.argb(95, 255, 255, 255), Color.TRANSPARENT }));
        sweep.setAlpha(0f);
        v.addView(sweep, new FrameLayout.LayoutParams(Math.round(tileW * 0.45f), -1));
        final View flash = new View(this);
        flash.setBackgroundColor(Color.WHITE);
        flash.setAlpha(0f);
        v.addView(flash, new FrameLayout.LayoutParams(-1, -1));
        final boolean isMain = t.key.equals("homebase");
        final List<android.animation.Animator> running = new ArrayList<>();
        final String[] lastKey = { "" };
        // The selected tile's look, in the glow style chosen in Style → Buttons & glows (the same names as on the page).
        // A new color (theme cycling) only recolors it; a new style or a focus change restarts its animation.
        final Runnable look = () -> {
            boolean has = v.hasFocus();
            float k = fxK();
            int gc = glowC();
            boolean rest = !has && ("all".equals(fxWhich) || ("main".equals(fxWhich) && isMain));
            int st = Math.round(stroke * (has ? ("neon".equals(fxBtn) ? 1.6f : 1f) : 0.7f) * Math.max(0.8f, k));
            int edge = "holo".equals(fxBtn) ? Color.rgb(120, 245, 255) : "neon".equals(fxBtn) ? gc : mix(gc, Color.WHITE, 0.45f);
            if (!"rainbow".equals(fxBtn) || !has) rd.setStroke(st, edge);
            rd.setColor(has ? Color.argb(Math.min(255, Math.round(38 * k)), Color.red(gc), Color.green(gc), Color.blue(gc)) : Color.TRANSPARENT);
            if (Build.VERSION.SDK_INT >= 28) { v.setOutlineSpotShadowColor(gc); v.setOutlineAmbientShadowColor(glow2); }
            String key = fxBtn + has + fxStr + fxWhich;
            if (key.equals(lastKey[0])) return;
            lastKey[0] = key;
            for (android.animation.Animator a : running) a.cancel();
            running.clear();
            ring.setAlpha(has ? 1f : 0.5f); halo.setScaleX(1f); halo.setScaleY(0.62f); sweep.setAlpha(0f); sweep.setTranslationX(0f);
            ring.setVisibility(has || rest ? View.VISIBLE : View.INVISIBLE);
            halo.animate().cancel();
            if (!has) { halo.animate().alpha(0f).setDuration(150).start(); return; }
            halo.animate().alpha(Math.min(1f, 0.85f * k)).setDuration(250).start();
            switch (fxBtn) {
                case "pulse": { ObjectAnimator a = ObjectAnimator.ofPropertyValuesHolder(halo, android.animation.PropertyValuesHolder.ofFloat("scaleX", 0.9f, 1.18f), android.animation.PropertyValuesHolder.ofFloat("scaleY", 0.56f, 0.74f));
                    a.setDuration(1000); a.setRepeatCount(ValueAnimator.INFINITE); a.setRepeatMode(ValueAnimator.REVERSE); a.start(); running.add(a); break; }
                case "breathe": { ObjectAnimator a = ObjectAnimator.ofFloat(ring, "alpha", 1f, 0.45f); a.setDuration(2000); a.setRepeatCount(ValueAnimator.INFINITE); a.setRepeatMode(ValueAnimator.REVERSE); a.start(); running.add(a);
                    ObjectAnimator b = ObjectAnimator.ofFloat(halo, "alpha", Math.min(1f, 0.85f * k), 0.35f); b.setStartDelay(250); b.setDuration(2000); b.setRepeatCount(ValueAnimator.INFINITE); b.setRepeatMode(ValueAnimator.REVERSE); b.start(); running.add(b); break; }
                case "sweep": case "holo": { sweep.setAlpha(1f); ObjectAnimator a = ObjectAnimator.ofFloat(sweep, "translationX", -tileW * 0.5f, tileW * 1.05f);
                    a.setDuration("holo".equals(fxBtn) ? 3200 : 2400); a.setRepeatCount(ValueAnimator.INFINITE); a.setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator()); a.start(); running.add(a); break; }
                case "rainbow": { ValueAnimator a = ValueAnimator.ofFloat(0f, 360f); a.setDuration(6000); a.setRepeatCount(ValueAnimator.INFINITE); a.setInterpolator(new android.view.animation.LinearInterpolator());
                    final int stw = st; a.addUpdateListener(an -> rd.setStroke(stw, Color.HSVToColor(new float[]{ (float) an.getAnimatedValue(), 0.7f, 1f }))); a.start(); running.add(a); break; }
                default: break;   // soft and neon stay still
            }
        };
        look.run();
        restyle.add(look);

        v.setCameraDistance(9000 * getResources().getDisplayMetrics().density);
        v.setOnFocusChangeListener((view, has) -> {
            look.run();
            boolean tilt = "on".equals(fxTilt);
            android.view.ViewPropertyAnimator a = view.animate().scaleX(has ? focusScale() : 1f).scaleY(has ? focusScale() : 1f).translationZ(has ? 36f * Math.max(0.8f, fxK()) : 0f).setInterpolator(EASE);
            if (has && tilt) {
                // It lifts toward you, turned slightly toward the side the remote came from, then settles flat.
                view.setRotationY(navDir * -10f); view.setRotationX(5f);
                a.rotationY(0f).rotationX(0f).setDuration(400);
            } else a.rotationY(0f).rotationX(0f).setDuration(has ? 250 : 150);
            a.start();
            if (has && "on".equals(fxSheen) && !"sweep".equals(fxBtn) && !"holo".equals(fxBtn)) {
                // One soft band of light slides across the tile as it lifts.
                sweep.animate().cancel(); sweep.setTranslationX(-tileW * 0.5f); sweep.setAlpha(1f);
                sweep.animate().translationX(tileW * 1.05f).setDuration(400).setStartDelay(60).setInterpolator(EASE).withEndAction(() -> { if (!"sweep".equals(fxBtn) && !"holo".equals(fxBtn)) sweep.setAlpha(0f); }).start();
            }
            if (has && keyNav) { keyNav = false; sound("move"); }
            if (has) label.setText(t.name);
        });
        v.setOnClickListener(view -> pressThen(view, flash, t.open));
        v.setOnLongClickListener(view -> {
            if (t.key.equals("settings")) { startActivity(new Intent(this, PairActivity.class)); return true; }
            if (t.key.equals("homebase")) return false;
            moveToFront(t.key);
            Toast.makeText(this, t.name + " moved to the front", Toast.LENGTH_SHORT).show();
            return true;
        });
        return holder;
    }

    /**
     * The tile picture: the app's banner (or its icon centered on its own main color) drawn at tile size, then every
     * pixel's brightness mapped onto the theme's colors: darkest to a deep shade of the theme, the middle to the theme's
     * main color, the brightest to a warm cream touched with the highlight color. Each tile's brightness is stretched
     * first, so logos stay crisp against their background.
     */
    private android.graphics.Bitmap themedArt(Tile t, TileTheme theme) {
        int w = Math.max(16, Math.round(tileW * 1.5f)), h = Math.max(9, Math.round(tileH * 1.5f));
        android.graphics.Bitmap bm = android.graphics.Bitmap.createBitmap(w, h, android.graphics.Bitmap.Config.ARGB_8888);
        android.graphics.Canvas c = new android.graphics.Canvas(bm);
        try {
            if (t.banner) {
                c.drawColor(Color.BLACK);
                t.art.setBounds(0, 0, w, h); t.art.draw(c);
            } else {
                c.drawColor(averageColor(t.art));
                int s = Math.round(h * 0.62f), x = (w - s) / 2, y = (h - s) / 2;
                t.art.setBounds(x, y, x + s, y + s); t.art.draw(c);
            }
        } catch (Exception e) { c.drawColor(Color.DKGRAY); }
        if ("real".equals(fxArt)) return bm;   // Style → App tiles → Original app art
        int[] px = new int[w * h];
        bm.getPixels(px, 0, w, 0, 0, w, h);
        int lo = 255, hi = 0;
        int[] hist = new int[256];
        for (int p : px) { int l = lum(p); hist[l]++; }
        int n = px.length, acc = 0;
        for (int l = 0; l < 256; l++) { acc += hist[l]; if (acc > n * 0.01) { lo = l; break; } }
        acc = 0;
        for (int l = 255; l >= 0; l--) { acc += hist[l]; if (acc > n * 0.01) { hi = l; break; } }
        if (hi - lo < 40) { int m = (hi + lo) / 2; lo = Math.max(0, m - 60); hi = Math.min(255, m + 60); }
        int dark = mix(theme.main, Color.BLACK, 0.72f), mid = theme.main, light = mix(Color.rgb(255, 248, 236), theme.gold, 0.18f);
        int[] lut = new int[256];
        for (int l = 0; l < 256; l++) {
            float f = Math.max(0f, Math.min(1f, (l - lo) / (float) (hi - lo)));
            lut[l] = f < 0.55f ? mix(dark, mid, f / 0.55f) : mix(mid, light, (f - 0.55f) / 0.45f);
        }
        for (int k = 0; k < n; k++) px[k] = lut[lum(px[k])] | 0xFF000000;
        bm.setPixels(px, 0, w, 0, 0, w, h);
        return bm;
    }
    /** For the status strip: "wifi:0".."wifi:3" (signal bars), "eth", or "none". */
    private String netState() {
        try {
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            android.net.NetworkCapabilities nc = cm == null ? null : cm.getNetworkCapabilities(cm.getActiveNetwork());
            if (nc == null) return "none";
            if (nc.hasTransport(android.net.NetworkCapabilities.TRANSPORT_ETHERNET)) return "eth";
            if (nc.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI)) {
                android.net.wifi.WifiManager wm = (android.net.wifi.WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
                int lvl = wm == null ? 3 : android.net.wifi.WifiManager.calculateSignalLevel(wm.getConnectionInfo().getRssi(), 4);
                return "wifi:" + lvl;
            }
            return "eth";
        } catch (Exception e) { return ""; }
    }
    private static int lum(int p) { return (((p >> 16) & 255) * 54 + ((p >> 8) & 255) * 183 + (p & 255) * 19) >> 8; }
    /** The icon's average color, so an icon-only app gets a tile in its own color before it's recolored. */
    private static int averageColor(Drawable d) {
        try {
            android.graphics.Bitmap b = android.graphics.Bitmap.createBitmap(24, 24, android.graphics.Bitmap.Config.ARGB_8888);
            d.setBounds(0, 0, 24, 24); d.draw(new android.graphics.Canvas(b));
            long R = 0, G = 0, B = 0, N = 0;
            for (int y = 0; y < 24; y++) for (int x = 0; x < 24; x++) { int p = b.getPixel(x, y); if ((p >>> 24) < 128) continue; R += (p >> 16) & 255; G += (p >> 8) & 255; B += p & 255; N++; }
            return N == 0 ? Color.DKGRAY : Color.rgb((int) (R / N), (int) (G / N), (int) (B / N));
        } catch (Exception e) { return Color.DKGRAY; }
    }

    /** The app's icon at the sharpest size it has (TV apps often give a small one by default). */
    private Drawable appIcon(ResolveInfo r, PackageManager pm) {
        try {
            int res = r.getIconResource();
            if (res != 0) {
                Drawable d = pm.getResourcesForApplication(r.activityInfo.applicationInfo).getDrawableForDensity(res, DisplayMetrics.DENSITY_XXXHIGH, null);
                if (d != null) return d;
            }
        } catch (Exception e) { /* fall through */ }
        return r.loadIcon(pm);
    }

    private static int mix(int a, int b, float t) {
        return Color.rgb(Math.round(Color.red(a) + (Color.red(b) - Color.red(a)) * t), Math.round(Color.green(a) + (Color.green(b) - Color.green(a)) * t), Math.round(Color.blue(a) + (Color.blue(b) - Color.blue(a)) * t));
    }

    /** Hold OK on an app to move it right after Home Base. */
    private void moveToFront(String key) {
        SharedPreferences p = Hb.prefs(this);
        List<String> order = new ArrayList<>(Arrays.asList(p.getString("order", "").split(",")));
        order.remove(key); order.remove("");
        order.add(0, key);
        StringBuilder sb = new StringBuilder();
        for (String s : order) { if (sb.length() > 0) sb.append(','); sb.append(s); }
        p.edit().putString("order", sb.toString()).apply();
        buildRow();
        if (row.getChildCount() > 1) row.getChildAt(1).requestFocus();
        scroller.smoothScrollTo(0, 0);
    }

    @Override protected void onDestroy() {
        if (zen != null) zen.release();
        ui.removeCallbacksAndMessages(null);
        try { unregisterReceiver(appsChanged); } catch (Exception e) { /* not registered */ }
        try { unregisterReceiver(screenOn); } catch (Exception e) { /* not registered */ }
        if (snd != null) snd.release();
        if (web != null) { ((ViewGroup) web.getParent()).removeView(web); web.destroy(); }
        super.onDestroy();
    }
}
