package app.homebase.tv;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;

/** The Settings button's icon: a gear drawn in the theme's colors. */
final class GearIcon extends Drawable {
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    int body = Color.rgb(109, 194, 164), edge = Color.WHITE, hub = Color.rgb(240, 180, 60);

    @Override public void draw(Canvas c) {
        float w = getBounds().width(), cx = getBounds().exactCenterX(), cy = getBounds().exactCenterY();
        float ro = w * 0.47f, ri = w * 0.36f;
        int teeth = 8;
        Path g = new Path();
        g.setFillType(Path.FillType.EVEN_ODD);
        for (int i = 0; i < teeth * 4; i++) {
            double a = Math.PI * 2 * i / (teeth * 4) - Math.PI / 2;
            float r = (i % 4 == 1 || i % 4 == 2) ? ro : ri;
            float x = cx + (float) Math.cos(a) * r, y = cy + (float) Math.sin(a) * r;
            if (i == 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.close();
        g.addCircle(cx, cy, w * 0.16f, Path.Direction.CW);
        p.setStyle(Paint.Style.FILL); p.setColor(body); c.drawPath(g, p);
        p.setStyle(Paint.Style.STROKE); p.setStrokeJoin(Paint.Join.ROUND); p.setStrokeWidth(Math.max(1.5f, w * 0.05f)); p.setColor(edge); c.drawPath(g, p);
        p.setStyle(Paint.Style.FILL); p.setColor(hub); c.drawCircle(cx, cy, w * 0.08f, p);
    }
    @Override public void setAlpha(int a) { p.setAlpha(a); }
    @Override public void setColorFilter(ColorFilter f) { p.setColorFilter(f); }
    @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
}
