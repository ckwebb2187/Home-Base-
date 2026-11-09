package app.homebase.tv;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;

/** The Style button's icon: a painter's palette drawn in the theme's colors (body, four paint dots, a thumb hole). */
final class PaletteIcon extends Drawable {
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    int body = Color.rgb(109, 194, 164), edge = Color.WHITE;
    int[] dots = { Color.rgb(240, 180, 60), Color.WHITE, Color.rgb(255, 120, 170), Color.rgb(90, 170, 255) };

    @Override public void draw(Canvas c) {
        float w = getBounds().width(), h = getBounds().height(), x0 = getBounds().left, y0 = getBounds().top;
        Path path = new Path();
        path.setFillType(Path.FillType.EVEN_ODD);
        // body: a rounded blob with a notch on the lower right
        path.moveTo(x0 + w * 0.50f, y0 + h * 0.06f);
        path.cubicTo(x0 + w * 0.86f, y0 + h * 0.06f, x0 + w * 0.98f, y0 + h * 0.34f, x0 + w * 0.94f, y0 + h * 0.52f);
        path.cubicTo(x0 + w * 0.90f, y0 + h * 0.70f, x0 + w * 0.70f, y0 + h * 0.62f, x0 + w * 0.64f, y0 + h * 0.74f);
        path.cubicTo(x0 + w * 0.58f, y0 + h * 0.88f, x0 + w * 0.66f, y0 + h * 0.96f, x0 + w * 0.48f, y0 + h * 0.95f);
        path.cubicTo(x0 + w * 0.18f, y0 + h * 0.93f, x0 + w * 0.04f, y0 + h * 0.72f, x0 + w * 0.05f, y0 + h * 0.48f);
        path.cubicTo(x0 + w * 0.06f, y0 + h * 0.22f, x0 + w * 0.26f, y0 + h * 0.06f, x0 + w * 0.50f, y0 + h * 0.06f);
        path.close();
        path.addCircle(x0 + w * 0.36f, y0 + h * 0.70f, w * 0.09f, Path.Direction.CW);   // thumb hole
        p.setStyle(Paint.Style.FILL); p.setColor(body); c.drawPath(path, p);
        p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(Math.max(1.5f, w * 0.05f)); p.setColor(edge); c.drawPath(path, p);
        p.setStyle(Paint.Style.FILL);
        float r = w * 0.085f;
        float[][] at = { { 0.30f, 0.34f }, { 0.52f, 0.24f }, { 0.73f, 0.33f }, { 0.78f, 0.52f } };
        for (int i = 0; i < at.length; i++) { p.setColor(dots[i % dots.length]); c.drawCircle(x0 + w * at[i][0], y0 + h * at[i][1], r, p); }
    }
    @Override public void setAlpha(int a) { p.setAlpha(a); }
    @Override public void setColorFilter(ColorFilter f) { p.setColorFilter(f); }
    @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
}
