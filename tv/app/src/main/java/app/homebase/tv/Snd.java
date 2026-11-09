package app.homebase.tv;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.SoundPool;

import java.io.File;
import java.io.FileOutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Navigation sounds, made on the device the first time a sound pack is used: short tones with a gentle attack and a
 * quick fade, written as tiny WAV files and played through a SoundPool so they start instantly. Each pack has its own
 * sound for moving, selecting, going back and opening the menu. Off unless switched on in Style → Screen & sound.
 */
final class Snd {
    private static final int RATE = 44100;
    private static final int SINE = 0, TRI = 1, SQUARE = 2, NOISE = 3;
    private final Context ctx;
    private final SoundPool pool;
    private final Map<String, Integer> ids = new HashMap<>();

    /** A note: wave, start Hz, end Hz, start ms, length ms, loudness, fade speed. */
    private static float[] n(int wave, float f0, float f1, float at, float len, float vol, float decay) { return new float[]{ wave, f0, f1, at, len, vol, decay }; }

    /** Pack → kind → notes. Kinds: move, ok, back, menu. */
    private static float[][] notes(String pack, String kind) {
        switch (pack) {
            case "click":   // crisp, like a good remote
                switch (kind) {
                    case "ok": return new float[][]{ n(NOISE, 0, 0, 0, 14, 0.5f, 9), n(SINE, 2400, 1800, 0, 30, 0.35f, 7) };
                    case "back": return new float[][]{ n(NOISE, 0, 0, 0, 10, 0.35f, 9), n(SINE, 1400, 1100, 0, 26, 0.3f, 7) };
                    case "menu": return new float[][]{ n(NOISE, 0, 0, 0, 12, 0.4f, 9), n(NOISE, 0, 0, 45, 12, 0.35f, 9) };
                    default: return new float[][]{ n(NOISE, 0, 0, 0, 8, 0.4f, 10), n(SINE, 3000, 2600, 0, 14, 0.2f, 8) };
                }
            case "bubble":  // round little pops
                switch (kind) {
                    case "ok": return new float[][]{ n(SINE, 500, 1100, 0, 70, 0.6f, 4), n(SINE, 800, 1600, 50, 70, 0.4f, 4) };
                    case "back": return new float[][]{ n(SINE, 1000, 450, 0, 80, 0.55f, 4) };
                    case "menu": return new float[][]{ n(SINE, 400, 900, 0, 60, 0.5f, 4), n(SINE, 600, 1300, 60, 60, 0.45f, 4), n(SINE, 900, 1800, 120, 60, 0.4f, 4) };
                    default: return new float[][]{ n(SINE, 700, 1300, 0, 45, 0.55f, 5) };
                }
            case "chime":   // soft bells
                switch (kind) {
                    case "ok": return new float[][]{ n(SINE, 1047, 1047, 0, 260, 0.45f, 3), n(SINE, 1568, 1568, 70, 300, 0.35f, 3) };
                    case "back": return new float[][]{ n(SINE, 1175, 1175, 0, 200, 0.4f, 3.5f), n(SINE, 880, 880, 70, 240, 0.35f, 3.5f) };
                    case "menu": return new float[][]{ n(SINE, 784, 784, 0, 260, 0.35f, 3), n(SINE, 1047, 1047, 80, 260, 0.35f, 3), n(SINE, 1319, 1319, 160, 320, 0.35f, 3) };
                    default: return new float[][]{ n(SINE, 1760, 1760, 0, 140, 0.3f, 4) };
                }
            case "retro":   // 8-bit game console
                switch (kind) {
                    case "ok": return new float[][]{ n(SQUARE, 660, 660, 0, 50, 0.22f, 1.5f), n(SQUARE, 990, 990, 50, 80, 0.22f, 2) };
                    case "back": return new float[][]{ n(SQUARE, 520, 520, 0, 45, 0.2f, 1.5f), n(SQUARE, 390, 390, 45, 70, 0.2f, 2) };
                    case "menu": return new float[][]{ n(SQUARE, 523, 523, 0, 50, 0.2f, 1.5f), n(SQUARE, 659, 659, 50, 50, 0.2f, 1.5f), n(SQUARE, 784, 784, 100, 90, 0.2f, 2) };
                    default: return new float[][]{ n(SQUARE, 1100, 1100, 0, 30, 0.16f, 2) };
                }
            case "wood":    // warm marimba
                switch (kind) {
                    case "ok": return new float[][]{ n(TRI, 523, 523, 0, 160, 0.6f, 5), n(TRI, 784, 784, 60, 180, 0.5f, 5) };
                    case "back": return new float[][]{ n(TRI, 440, 440, 0, 140, 0.55f, 5), n(TRI, 330, 330, 60, 160, 0.5f, 5) };
                    case "menu": return new float[][]{ n(TRI, 392, 392, 0, 140, 0.5f, 5), n(TRI, 523, 523, 70, 140, 0.5f, 5), n(TRI, 659, 659, 140, 200, 0.5f, 5) };
                    default: return new float[][]{ n(TRI, 880, 880, 0, 70, 0.5f, 6) };
                }
            case "space":   // airy sci-fi sweeps
                switch (kind) {
                    case "ok": return new float[][]{ n(SINE, 600, 2200, 0, 160, 0.4f, 2.5f), n(TRI, 300, 1100, 0, 160, 0.2f, 2.5f) };
                    case "back": return new float[][]{ n(SINE, 1800, 500, 0, 150, 0.4f, 2.5f) };
                    case "menu": return new float[][]{ n(SINE, 300, 1500, 0, 240, 0.35f, 2), n(SINE, 450, 2200, 60, 240, 0.25f, 2) };
                    default: return new float[][]{ n(SINE, 1400, 1900, 0, 60, 0.3f, 4) };
                }
            default:        // soft (the original)
                switch (kind) {
                    case "ok": return new float[][]{ n(SINE, 880, 880, 0, 90, 0.5f, 4.5f), n(SINE, 1320, 1320, 55, 120, 0.45f, 4.5f) };
                    case "back": return new float[][]{ n(SINE, 990, 700, 0, 70, 0.45f, 4.5f) };
                    case "menu": return new float[][]{ n(SINE, 740, 740, 0, 80, 0.4f, 4.5f), n(SINE, 1110, 1110, 60, 110, 0.4f, 4.5f) };
                    default: return new float[][]{ n(SINE, 1480, 1180, 0, 42, 0.55f, 4.5f) };
                }
        }
    }

    Snd(Context c) {
        ctx = c;
        AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        pool = new SoundPool.Builder().setMaxStreams(4).setAudioAttributes(aa).build();
    }

    /** Loads a pack's four sounds ahead of time, so the first press isn't silent. */
    void prepare(String pack) { for (String k : new String[]{ "move", "ok", "back", "menu" }) id(pack, k); }

    /** kind: move, ok, back or menu; pack: soft, click, bubble, chime, retro, wood or space; vol: low, mid or high. */
    void play(String kind, String pack, String vol) {
        int id = id(pack, kind);
        float v = "high".equals(vol) ? 0.85f : "mid".equals(vol) ? 0.5f : 0.25f;
        if (id != 0) pool.play(id, v, v, 1, 0, 1f);
    }

    void release() { pool.release(); }

    private int id(String pack, String kind) {
        String key = pack + "-" + kind;
        Integer have = ids.get(key);
        if (have != null) return have;
        int id = 0;
        try {
            File f = new File(ctx.getCacheDir(), "hb-snd-" + key + "-v2.wav");
            if (!f.isFile()) write(f, notes(pack, kind));
            id = pool.load(f.getPath(), 1);
        } catch (Exception e) { id = 0; }
        ids.put(key, id);
        return id;
    }

    private static void write(File f, float[][] notes) throws Exception {
        float endMs = 0;
        for (float[] n : notes) endMs = Math.max(endMs, n[3] + n[4]);
        int len = (int) (RATE * (endMs + 10) / 1000f);
        float[] buf = new float[len];
        java.util.Random rnd = new java.util.Random(7);
        for (float[] n : notes) {
            int wave = (int) n[0], start = (int) (RATE * n[3] / 1000f), dur = (int) (RATE * n[4] / 1000f);
            double phase = 0;
            for (int i = 0; i < dur && start + i < len; i++) {
                float t = i / (float) dur;
                double hz = n[1] + (n[2] - n[1]) * t;
                phase += 2 * Math.PI * hz / RATE;
                double s;
                switch (wave) {
                    case TRI: s = 2 / Math.PI * Math.asin(Math.sin(phase)); break;
                    case SQUARE: s = Math.sin(phase) >= 0 ? 1 : -1; break;
                    case NOISE: s = rnd.nextFloat() * 2 - 1; break;
                    default: s = Math.sin(phase) + 0.18 * Math.sin(phase * 2);
                }
                float env = Math.min(1f, i / (RATE * 0.003f)) * (float) Math.exp(-n[6] * t);
                buf[start + i] += (float) s * env * n[5];
            }
        }
        byte[] pcm = new byte[len * 2];
        for (int i = 0; i < len; i++) {
            int s = Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767 * 0.8f)));
            pcm[i * 2] = (byte) s; pcm[i * 2 + 1] = (byte) (s >> 8);
        }
        try (FileOutputStream o = new FileOutputStream(f)) { o.write(header(pcm.length)); o.write(pcm); }
    }

    private static byte[] header(int dataLen) {
        java.nio.ByteBuffer b = java.nio.ByteBuffer.allocate(44).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        b.put("RIFF".getBytes()).putInt(36 + dataLen).put("WAVE".getBytes()).put("fmt ".getBytes()).putInt(16).putShort((short) 1).putShort((short) 1)
                .putInt(RATE).putInt(RATE * 2).putShort((short) 2).putShort((short) 16).put("data".getBytes()).putInt(dataLen);
        return b.array();
    }
}
