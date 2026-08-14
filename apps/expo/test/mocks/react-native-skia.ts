/**
 * Mock for @shopify/react-native-skia — the native Skia renderer has no Node
 * equivalent. Components render as string host elements (prefixed `Skia*` so
 * assertions never collide with the react-native-svg mock's names), and
 * `Skia.Path.Make()` returns a recorder that accumulates an SVG-style string,
 * so geometry tests can keep asserting on coordinates via `toSVGString()` —
 * the same format the pure string builders emit.
 */
export const Canvas = 'SkiaCanvas';
export const Group = 'SkiaGroup';
export const Path = 'SkiaPath';
export const Circle = 'SkiaCircle';
export const Rect = 'SkiaRect';
export const LinearGradient = 'SkiaLinearGradient';
export const RadialGradient = 'SkiaRadialGradient';
export const BlurMask = 'SkiaBlurMask';

export const vec = (x: number, y: number) => ({ x, y });

/** 2dp rounding, mirroring the string path builders. */
const round = (value: number) => Math.round(value * 100) / 100;

class FakeSkPath {
  private d = '';

  moveTo(x: number, y: number) {
    this.d += `${this.d ? ' ' : ''}M ${round(x)} ${round(y)}`;
    return this;
  }

  lineTo(x: number, y: number) {
    this.d += ` L ${round(x)} ${round(y)}`;
    return this;
  }

  quadTo(cx: number, cy: number, x: number, y: number) {
    this.d += ` Q ${round(cx)} ${round(cy)}, ${round(x)} ${round(y)}`;
    return this;
  }

  cubicTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    this.d += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(x)} ${round(y)}`;
    return this;
  }

  close() {
    this.d += ' Z';
    return this;
  }

  reset() {
    this.d = '';
    return this;
  }

  toSVGString() {
    return this.d;
  }
}

export const Skia = {
  Path: {
    Make: () => new FakeSkPath(),
  },
};
