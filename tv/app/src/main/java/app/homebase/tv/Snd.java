package app.homebase.tv;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.SoundPool;

import java.io.File;
import java.io.FileOutputStream;

/**
 * Soft navigation sounds (move, select, back), made on the device the first time they're needed: a few short sine
 * tones with a gentle attack and a quick fade, written as tiny WAV files and played through a SoundPool so they
 * start instantly. Off unless switched on in Style → Screen & sound.
 */
final class Snd {
    private static final int RATE = 44100;
    private final SoundPool pool;
    private final int move, ok, back;

    Snd(Context c) {
        AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        pool = new SoundPool.Builder().setMaxStreams(3).setAudioAttributes(aa).build();
        // [start Hz, end Hz, start ms, length ms, loudness]
        move = load(c, "hb-move", new float[][]{ { 1480, 1180, 0, 42, 0.55f } });
        ok = load(c, "hb-ok", new float[][]{ { 880, 880, 0, 90, 0.5f }, { 1320, 1320, 55, 120, 0.45f } });
        back = load(c, "hb-back", new float[][]{ { 990, 700, 0, 70, 0.45f } });
    }

    /** kind: "move", "ok" or "back"; vol: "low", "mid" or "high". */
    void play(String kind, String vol) {
        int id = "ok".equals(kind) ? ok : "back".equals(kind) ? back : move;
        float v = "high".equals(vol) ? 0.85f : "mid".equals(vol) ? 0.5f : 0.25f;
        if (id != 0) pool.play(id, v, v, 1, 0, 1f);
    }

    void release() { pool.release(); }

    private int load(Context c, String name, float[][] notes) {
        try {
            File f = new File(c.getCacheDir(), name + "-v1.wav");
            if (!f.isFile()) write(f, notes);
            return pool.load(f.getPath(), 1);
        } catch (Exception e) { return 0; }
    }

    private static void write(File f, float[][] notes) throws Exception {
        float endMs = 0;
        for (float[] n : notes) endMs = Math.max(endMs, n[2] + n[3]);
        int len = (int) (RATE * (endMs + 10) / 1000f);
        float[] buf = new float[len];
        for (float[] n : notes) {
            int start = (int) (RATE * n[2] / 1000f), dur = (int) (RATE * n[3] / 1000f);
            double phase = 0;
            for (int i = 0; i < dur && start + i < len; i++) {
                float t = i / (float) dur;
                double hz = n[0] + (n[1] - n[0]) * t;
                phase += 2 * Math.PI * hz / RATE;
                float env = Math.min(1f, i / (RATE * 0.004f)) * (float) Math.exp(-4.5 * t);
                buf[start + i] += (float) (Math.sin(phase) + 0.18 * Math.sin(phase * 2)) * env * n[4];
            }
        }
        byte[] pcm = new byte[len * 2];
        for (int i = 0; i < len; i++) {
            int s = Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767 * 0.8f)));
            pcm[i * 2] = (byte) s; pcm[i * 2 + 1] = (byte) (s >> 8);
        }
        try (FileOutputStream o = new FileOutputStream(f)) {
            o.write(header(pcm.length)); o.write(pcm);
        }
    }

    private static byte[] header(int dataLen) {
        java.nio.ByteBuffer b = java.nio.ByteBuffer.allocate(44).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        b.put("RIFF".getBytes()).putInt(36 + dataLen).put("WAVE".getBytes()).put("fmt ".getBytes()).putInt(16).putShort((short) 1).putShort((short) 1)
                .putInt(RATE).putInt(RATE * 2).putShort((short) 2).putShort((short) 16).put("data".getBytes()).putInt(dataLen);
        return b.array();
    }
}
