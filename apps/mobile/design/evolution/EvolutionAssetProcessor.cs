using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class FlapFitEvolutionAssetProcessor
{
    public static Bitmap LoadUnlocked(string path)
    {
        byte[] bytes = File.ReadAllBytes(path);
        using (MemoryStream stream = new MemoryStream(bytes))
        using (Image image = Image.FromStream(stream))
        {
            return new Bitmap(image);
        }
    }

    private static byte ClampByte(double value)
    {
        if (value <= 0) return 0;
        if (value >= 255) return 255;
        return (byte)Math.Round(value);
    }

    private static double Clamp01(double value)
    {
        if (value <= 0) return 0;
        if (value >= 1) return 1;
        return value;
    }

    private static double ChannelDistance(byte value, byte background)
    {
        if (value < background)
            return background == 0 ? 0 : (background - value) / (double)background;

        return background == 255 ? 0 : (value - background) / (double)(255 - background);
    }

    public static Color EstimateBackground(Bitmap source, Rectangle region)
    {
        long red = 0, green = 0, blue = 0;
        int count = 0;
        int patch = Math.Max(4, Math.Min(region.Width, region.Height) / 40);
        int[,] anchors = new int[,]
        {
            { region.Left, region.Top },
            { region.Right - patch, region.Top },
            { region.Left, region.Bottom - patch },
            { region.Right - patch, region.Bottom - patch },
            { region.Left + region.Width / 2 - patch / 2, region.Top },
            { region.Left + region.Width / 2 - patch / 2, region.Bottom - patch },
            { region.Left, region.Top + region.Height / 2 - patch / 2 },
            { region.Right - patch, region.Top + region.Height / 2 - patch / 2 }
        };

        for (int anchor = 0; anchor < anchors.GetLength(0); anchor++)
        {
            for (int y = 0; y < patch; y++)
            {
                for (int x = 0; x < patch; x++)
                {
                    int px = Math.Max(region.Left, Math.Min(region.Right - 1, anchors[anchor, 0] + x));
                    int py = Math.Max(region.Top, Math.Min(region.Bottom - 1, anchors[anchor, 1] + y));
                    Color color = source.GetPixel(px, py);
                    if (color.G > color.R + 80 && color.G > color.B + 80)
                    {
                        red += color.R;
                        green += color.G;
                        blue += color.B;
                        count++;
                    }
                }
            }
        }

        return count == 0
            ? Color.FromArgb(18, 241, 20)
            : Color.FromArgb((int)(red / count), (int)(green / count), (int)(blue / count));
    }

    public static Bitmap ExtractAndKey(Bitmap source, Rectangle sourceRegion)
    {
        Color background = EstimateBackground(source, sourceRegion);
        Bitmap keyed = new Bitmap(sourceRegion.Width, sourceRegion.Height, PixelFormat.Format32bppArgb);
        using (Graphics graphics = Graphics.FromImage(keyed))
        {
            graphics.CompositingMode = CompositingMode.SourceCopy;
            graphics.DrawImage(source,
                new Rectangle(0, 0, sourceRegion.Width, sourceRegion.Height),
                sourceRegion,
                GraphicsUnit.Pixel);
        }

        Rectangle area = new Rectangle(0, 0, keyed.Width, keyed.Height);
        BitmapData data = keyed.LockBits(area, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = Math.Abs(data.Stride);
        byte[] pixels = new byte[stride * keyed.Height];
        Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);

        for (int y = 0; y < keyed.Height; y++)
        {
            int row = y * stride;
            for (int x = 0; x < keyed.Width; x++)
            {
                int index = row + x * 4;
                byte b = pixels[index];
                byte g = pixels[index + 1];
                byte r = pixels[index + 2];

                int nonGreen = Math.Max(r, b);
                int dominance = g - nonGreen;
                bool greenDominant = g > 70 && dominance > 5;
                double outputAlpha = 1.0;

                if (greenDominant)
                {
                    if (dominance > 18)
                    {
                        pixels[index] = pixels[index + 1] = pixels[index + 2] = pixels[index + 3] = 0;
                        continue;
                    }

                    outputAlpha = 1.0 - Clamp01((dominance - 5.0) / 13.0);
                    g = (byte)Math.Min(255, nonGreen + 4);
                    if (outputAlpha <= 0.015)
                    {
                        pixels[index] = pixels[index + 1] = pixels[index + 2] = pixels[index + 3] = 0;
                        continue;
                    }
                }

                pixels[index] = b;
                pixels[index + 1] = g;
                pixels[index + 2] = r;
                pixels[index + 3] = ClampByte(outputAlpha * 255.0);
            }
        }

        Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
        keyed.UnlockBits(data);
        return keyed;
    }

    public static Rectangle FindVisibleBounds(Bitmap source)
    {
        Rectangle area = new Rectangle(0, 0, source.Width, source.Height);
        BitmapData data = source.LockBits(area, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = Math.Abs(data.Stride);
        byte[] pixels = new byte[stride * source.Height];
        Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
        source.UnlockBits(data);

        int minX = source.Width, minY = source.Height, maxX = -1, maxY = -1;
        for (int y = 0; y < source.Height; y++)
        {
            int row = y * stride;
            for (int x = 0; x < source.Width; x++)
            {
                if (pixels[row + x * 4 + 3] == 0) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }

        if (maxX < minX || maxY < minY)
            throw new InvalidOperationException("No visible subject remained after chroma keying.");

        const int padding = 2;
        minX = Math.Max(0, minX - padding);
        minY = Math.Max(0, minY - padding);
        maxX = Math.Min(source.Width - 1, maxX + padding);
        maxY = Math.Min(source.Height - 1, maxY + padding);
        return Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
    }

    public static Bitmap Normalize(Bitmap source, double silhouetteScale)
    {
        Rectangle visible = FindVisibleBounds(source);
        const int canvasSize = 512;
        const int safeMaximum = 468;
        int targetMaximum = (int)Math.Round(safeMaximum * silhouetteScale);
        double scale = targetMaximum / (double)Math.Max(visible.Width, visible.Height);
        int width = Math.Max(1, (int)Math.Round(visible.Width * scale));
        int height = Math.Max(1, (int)Math.Round(visible.Height * scale));
        int x = (canvasSize - width) / 2;
        int y = (canvasSize - height) / 2;

        Bitmap normalized = new Bitmap(canvasSize, canvasSize, PixelFormat.Format32bppArgb);
        using (Graphics graphics = Graphics.FromImage(normalized))
        using (ImageAttributes attributes = new ImageAttributes())
        {
            graphics.Clear(Color.Transparent);
            graphics.CompositingMode = CompositingMode.SourceCopy;
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            graphics.SmoothingMode = SmoothingMode.HighQuality;
            attributes.SetWrapMode(WrapMode.TileFlipXY);
            graphics.DrawImage(source,
                new Rectangle(x, y, width, height),
                visible.X, visible.Y, visible.Width, visible.Height,
                GraphicsUnit.Pixel,
                attributes);
        }
        return normalized;
    }

    private static void RgbToHsl(byte red, byte green, byte blue, out double hue, out double saturation, out double lightness)
    {
        double r = red / 255.0, g = green / 255.0, b = blue / 255.0;
        double max = Math.Max(r, Math.Max(g, b));
        double min = Math.Min(r, Math.Min(g, b));
        double delta = max - min;
        lightness = (max + min) / 2.0;
        if (delta < 0.00001)
        {
            hue = 0;
            saturation = 0;
            return;
        }

        saturation = delta / (1.0 - Math.Abs(2.0 * lightness - 1.0));
        if (max == r) hue = 60.0 * (((g - b) / delta) % 6.0);
        else if (max == g) hue = 60.0 * (((b - r) / delta) + 2.0);
        else hue = 60.0 * (((r - g) / delta) + 4.0);
        if (hue < 0) hue += 360.0;
    }

    private static double HueToRgb(double p, double q, double t)
    {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
        if (t < 1.0 / 2.0) return q;
        if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
        return p;
    }

    private static void HslToRgb(double hue, double saturation, double lightness, out byte red, out byte green, out byte blue)
    {
        hue = ((hue % 360.0) + 360.0) % 360.0;
        saturation = Clamp01(saturation);
        lightness = Clamp01(lightness);
        if (saturation < 0.00001)
        {
            byte gray = ClampByte(lightness * 255.0);
            red = green = blue = gray;
            return;
        }

        double q = lightness < 0.5
            ? lightness * (1.0 + saturation)
            : lightness + saturation - lightness * saturation;
        double p = 2.0 * lightness - q;
        double h = hue / 360.0;
        red = ClampByte(HueToRgb(p, q, h + 1.0 / 3.0) * 255.0);
        green = ClampByte(HueToRgb(p, q, h) * 255.0);
        blue = ClampByte(HueToRgb(p, q, h - 1.0 / 3.0) * 255.0);
    }

    public static Bitmap Recolor(Bitmap source, string skinId)
    {
        Bitmap output = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
        using (Graphics graphics = Graphics.FromImage(output))
        {
            graphics.CompositingMode = CompositingMode.SourceCopy;
            graphics.DrawImageUnscaled(source, 0, 0);
        }
        if (skinId == "sunny") return output;

        double targetHue = 45, targetSaturation = 0.90, lightnessScale = 1.0, lightnessOffset = 0.0;
        bool onyx = false, pearl = false;
        switch (skinId)
        {
            case "ruby":
                targetHue = 1; targetSaturation = 0.82; lightnessScale = 0.91; lightnessOffset = 0.015; break;
            case "sky":
                targetHue = 198; targetSaturation = 0.91; lightnessScale = 0.90; lightnessOffset = 0.045; break;
            case "kiwi":
                targetHue = 142; targetSaturation = 0.74; lightnessScale = 0.88; lightnessOffset = 0.045; break;
            case "violet":
                targetHue = 258; targetSaturation = 0.76; lightnessScale = 0.82; lightnessOffset = 0.095; break;
            case "onyx":
                onyx = true; break;
            case "pearl":
                pearl = true; break;
            default:
                return output;
        }

        Rectangle area = new Rectangle(0, 0, output.Width, output.Height);
        BitmapData data = output.LockBits(area, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = Math.Abs(data.Stride);
        byte[] pixels = new byte[stride * output.Height];
        Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);

        for (int y = 0; y < output.Height; y++)
        {
            int row = y * stride;
            for (int x = 0; x < output.Width; x++)
            {
                int index = row + x * 4;
                if (pixels[index + 3] == 0) continue;

                byte b = pixels[index], g = pixels[index + 1], r = pixels[index + 2];
                double hue, saturation, lightness;
                RgbToHsl(r, g, b, out hue, out saturation, out lightness);

                // Warm gold is plumage. Orange-red beaks/feet/mouths, white eyes,
                // brown brows and the navy outline intentionally stay untouched.
                bool isPlumage =
                    hue >= 28.0 && hue <= 72.0 &&
                    saturation >= 0.24 &&
                    Math.Max(r, Math.Max(g, b)) >= 45;
                if (!isPlumage) continue;

                double outputHue, outputSaturation, outputLightness;
                if (onyx)
                {
                    outputHue = 221;
                    outputSaturation = 0.22 + saturation * 0.08;
                    outputLightness = Math.Max(0.065, Math.Min(0.36, 0.025 + lightness * 0.43));
                }
                else if (pearl)
                {
                    outputHue = 214;
                    outputSaturation = 0.07 + saturation * 0.05;
                    outputLightness = Math.Max(0.58, Math.Min(0.97, 0.43 + lightness * 0.60));
                }
                else
                {
                    double sourceVariation = Math.Max(-6.0, Math.Min(6.0, (hue - 48.0) * 0.24));
                    outputHue = targetHue + sourceVariation;
                    outputSaturation = Math.Max(0.45, Math.Min(1.0, targetSaturation * (0.84 + saturation * 0.16)));
                    outputLightness = Math.Max(0.10, Math.Min(0.92, lightness * lightnessScale + lightnessOffset));
                }

                HslToRgb(outputHue, outputSaturation, outputLightness, out r, out g, out b);
                pixels[index] = b;
                pixels[index + 1] = g;
                pixels[index + 2] = r;
            }
        }

        Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
        output.UnlockBits(data);
        return output;
    }

    public static void KeepPrimaryComponent(Bitmap bitmap)
    {
        Rectangle area = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        BitmapData data = bitmap.LockBits(area, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = Math.Abs(data.Stride);
        byte[] pixels = new byte[stride * bitmap.Height];
        Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);

        int width = bitmap.Width;
        int height = bitmap.Height;
        int[] labels = new int[width * height];
        int componentId = 0, largestId = 0, largestSize = 0;
        int[] queue = new int[width * height];

        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                int position = y * width + x;
                if (labels[position] != 0 || pixels[y * stride + x * 4 + 3] == 0) continue;
                componentId++;
                int head = 0, tail = 0, size = 0;
                queue[tail++] = position;
                labels[position] = componentId;

                while (head < tail)
                {
                    int current = queue[head++];
                    size++;
                    int currentX = current % width;
                    int currentY = current / width;
                    for (int offsetY = -1; offsetY <= 1; offsetY++)
                    {
                        for (int offsetX = -1; offsetX <= 1; offsetX++)
                        {
                            if (offsetX == 0 && offsetY == 0) continue;
                            int nextX = currentX + offsetX;
                            int nextY = currentY + offsetY;
                            if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
                            int next = nextY * width + nextX;
                            if (labels[next] != 0 || pixels[nextY * stride + nextX * 4 + 3] == 0) continue;
                            labels[next] = componentId;
                            queue[tail++] = next;
                        }
                    }
                }

                if (size > largestSize)
                {
                    largestSize = size;
                    largestId = componentId;
                }
            }
        }

        for (int y = 0; y < height; y++)
        {
            int row = y * stride;
            for (int x = 0; x < width; x++)
            {
                if (labels[y * width + x] == largestId) continue;
                int index = row + x * 4;
                pixels[index] = pixels[index + 1] = pixels[index + 2] = pixels[index + 3] = 0;
            }
        }

        Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
        bitmap.UnlockBits(data);
    }

    public static void RemoveResidualGreen(Bitmap bitmap)
    {
        Rectangle area = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        BitmapData data = bitmap.LockBits(area, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = Math.Abs(data.Stride);
        byte[] pixels = new byte[stride * bitmap.Height];
        Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);

        for (int y = 0; y < bitmap.Height; y++)
        {
            int row = y * stride;
            for (int x = 0; x < bitmap.Width; x++)
            {
                int index = row + x * 4;
                int b = pixels[index];
                int g = pixels[index + 1];
                int r = pixels[index + 2];
                if (pixels[index + 3] == 0) continue;

                int nonGreen = Math.Max(r, b);
                if (g > 145 && g > r + 70 && g > b + 70)
                {
                    pixels[index] = 0;
                    pixels[index + 1] = 0;
                    pixels[index + 2] = 0;
                    pixels[index + 3] = 0;
                }
                else if (g > nonGreen + 16)
                {
                    pixels[index + 1] = (byte)Math.Min(255, nonGreen + 16);
                }
            }
        }

        Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
        bitmap.UnlockBits(data);
    }

    public static void SavePng(Bitmap bitmap, string path)
    {
        string directory = Path.GetDirectoryName(path);
        if (!Directory.Exists(directory)) Directory.CreateDirectory(directory);
        bitmap.Save(path, ImageFormat.Png);
    }

    public static int CountBrightGreenPixels(Bitmap bitmap)
    {
        Rectangle area = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        BitmapData data = bitmap.LockBits(area, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = Math.Abs(data.Stride);
        byte[] pixels = new byte[stride * bitmap.Height];
        Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
        bitmap.UnlockBits(data);
        int count = 0;

        for (int y = 0; y < bitmap.Height; y++)
        {
            int row = y * stride;
            for (int x = 0; x < bitmap.Width; x++)
            {
                int index = row + x * 4;
                int b = pixels[index], g = pixels[index + 1], r = pixels[index + 2], a = pixels[index + 3];
                if (a > 8 && g > 150 && g > r + 85 && g > b + 85) count++;
            }
        }
        return count;
    }
}
