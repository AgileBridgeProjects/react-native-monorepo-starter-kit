/**
 * StarterKit Primitive Design Tokens — TypeScript
 *
 * Mirrors packages/shared/tokens.css exactly — when you add a value
 * to one file, add it to the other at the same time.
 *
 * Use for runtime access where CSS variables are unavailable:
 *   - React Navigation theme configuration
 *   - React Native Reanimated worklets / useAnimatedStyle
 *   - Platform-specific shadows (elevation, shadowRadius)
 *   - DevExtreme chart/canvas theming (web)
 *
 * For CSS/Tailwind styling, import tokens.css instead.
 *
 * Sections (keep in sync with tokens.css):
 *   palette.primary — StarterKit Blue ramp (anchored at Figma "Blue" #0A3D91);
 *     drives the semantic --color-primary. palette.accent — StarterKit Cyan ramp
 *     (anchored at Figma "Cyan" #3BD7F6). Figma defines flat brand swatches,
 *     not tint ramps, so the intermediate stops are derived around the anchor.
 *   palette.{neutral,category,status} — legacy ramp colors, still used by
 *     existing components (grays, chart series, status chips) pending their
 *     component-by-component Figma pass.
 *   palette.{white,blue,cyan,purple,pink,gray,green,amber,yellow,red,disc} —
 *     StarterKit palette, source of truth: Figma "StarterKit" library.
 *   palette.{volt,onyx,admin*} — admin portal brand, source of truth: the
 *     starterkit.com marketing site. Separate from the Blue/Cyan ramps above so
 *     the portal and the mobile app can be rebranded independently.
 *   gradients — named Figma gradient styles
 *   fontFamily / typeScale — named Figma text styles
 *   spacing
 *   fontSize
 *   fontWeight
 *   lineHeight
 *   borderRadius
 *   iconSize
 *   zIndex
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

export const palette = {
  primary: {
    50: '#EAF0FB',
    100: '#CBDAF4',
    200: '#9DBAEA',
    300: '#6693DD',
    400: '#2E62C4',
    500: '#0A3D91',
    600: '#09357E',
    700: '#072A64',
    800: '#051E48',
    900: '#03132E',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#ADB5BD',
    500: '#868E96',
    600: '#6C757D',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
    950: '#0D1117',
  },
  accent: {
    50: '#E8FBFE',
    100: '#C6F4FC',
    200: '#A9F1FF',
    300: '#7FE7F9',
    400: '#59DFF7',
    500: '#3BD7F6',
    600: '#16B6D9',
    700: '#0F8CA8',
  },
  category: {
    indigo: { bg: '#EEF2FF', border: '#6366F1', text: '#4338CA' },
    green: { bg: '#F0FDF4', border: '#22C55E', text: '#166534' },
    orange: { bg: '#FFF7ED', border: '#F97316', text: '#9A3412' },
    pink: { bg: '#FDF2F8', border: '#EC4899', text: '#9D174D' },
    sky: { bg: '#F0F9FF', border: '#0EA5E9', text: '#075985' },
    purple: { bg: '#FAF5FF', border: '#A855F7', text: '#6B21A8' },
    cyan: { bg: '#ECFEFF', border: '#06B6D4', text: '#155E75' },
    yellow: { bg: '#FEF9C3', border: '#EAB308', text: '#854D0E' },
  },
  /**
   * Auth hero gradient — now the StarterKit "Dark background" Figma gradient stops
   * (see `gradients.darkBackground` for the full multi-stop definition). Kept
   * as this flat {start,mid,end} shape because apps/expo's
   * AUTH_GRADIENT_COLORS consumes exactly this shape.
   */
  gradient: {
    start: '#031E58',
    mid: '#0D90B1',
    end: '#021546',
  },
  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    gold: '#D4AF37',
    silver: '#A8A9AD',
    bronze: '#CD7F32',
  },

  // ─── StarterKit palette ──────────────────────────────────────────────────────
  // Source of truth: Figma "StarterKit" library (variables + styles), file
  // I74RCYzR01MpiCm7mNG8PQ, pulled 2026-07-03. Names mirror the Figma
  // variable/style names 1:1 so a designer can cross-reference directly.

  white: {
    DEFAULT: '#FFFFFF',
    10: 'rgba(255, 255, 255, 0.1)',
    20: 'rgba(255, 255, 255, 0.2)',
    /** TODO: inferred from the 10/20/60% siblings — not directly confirmed in a Figma frame. */
    50: 'rgba(255, 255, 255, 0.5)',
    60: 'rgba(255, 255, 255, 0.6)',
  },
  blue: {
    /** TODO: Figma variable "Blue" has no confirmed hex — using Blue Dark as a placeholder. */
    DEFAULT: '#0A3D91',
    dark: '#0A3D91',
    /** TODO: Figma variable "Blue Bright" has no confirmed hex — using Cyan as a placeholder. */
    bright: '#3BD7F6',
    /**
     * Field fill for every dark input treatment — auth inputs, the message composer pill, the
     onboarding pill controls, the stats-import pickers.
     *
     * A translucent WHITE overlay rather than a navy, which is why one value now works on
     * every surface and no per-surface variant is needed. Both opaque attempts were wrong
     * somewhere: the original Figma #032158 read as a conspicuously light, saturated blue
     * against the the identity split background, and matching {@link screen} left a field sitting on a
     * SCREEN with no visible edge at all. An overlay lifts whatever is behind it, so this
     * reads correctly on the screen, on a {@link cardDark} card, and in a bottom sheet.
     *
     * Same 10% white as the skeleton, anchored menu and icon wells — see `palette.white`.
     */
    inputFill: 'rgba(255, 255, 255, 0.1)',
    /** Sign-In screen dark card background (Figma "Sign In" frame). */
    cardDark: '#0A1C40',
    /**
     * In-app screen background — solid deep navy behind all tab/detail screens
     *. Deliberately much darker than {@link cardDark} so grouped cards
     * read as raised surfaces: card-vs-background contrast is 1.14:1 here. #021130
     * read as too flat (1.11:1) and #01091f as too dark, so this sits between them
     * (pure black would be the 1.25:1 ceiling).
     */
    screen: '#010D28',
  },
  cyan: {
    DEFAULT: '#3BD7F6',
    light: '#A9F1FF',
  },
  purple: '#C744FF',
  pink: '#FF06B8',
  gray: {
    light: '#D9D9D9',
    dark: '#505050',
    /**
     * "Gray Dark 70%" is a distinct navy-gray (#576179) at 70% alpha — NOT
     * `gray.dark` at 70% opacity. Confirmed via a Figma component fill.
     */
    dark70: 'rgba(87, 97, 121, 0.7)',
    black: '#2D2D2D',
  },
  green: {
    DEFAULT: '#01A612',
    light: '#CDFFD2',
  },
  amber: {
    DEFAULT: '#FF7700',
    light: '#FFDEC2',
  },
  yellow: '#FFBF00',
  red: '#CF3928',

  /**
   * DISC profile colours (chip gradients).
   *
   * Hues follow the Skill Library's category set (`pink`, `amber`, `blue.bright`) rather than
   * the earlier red/yellow/navy, so DISC and Skills read as one family; S keeps a green — the
   * one hue the Skills set lacks — brought up to `green.DEFAULT`'s vividness to sit with the
   * others. Each `start` is the same hue darkened, so every chip keeps its light-into-dark ramp.
   *
   * Every stop, not just the darker one, is checked against `text` at WCAG 4.5:1: the small
   * trait badge (`DiscTraitBadge` size="sm") renders its letter at 16px, so this is body text,
   * not large text, and the 3:1 bar does not apply. Only `d` stays a white-on-deep chip; the
   * other three are light ramps carrying dark text, which is what let `s` use the system's
   * lighter greens rather than a dark forest green that only worked under white.
   */
  disc: {
    d: { start: '#9E0472', end: '#C8048F', text: '#FFFFFF' },
    i: { start: '#FF7700', end: '#FFBF00', text: '#2D2D2D' },
    /** `emotion.relaxed` into `green.light` — the system's lighter greens, not a dark forest. */
    s: { start: '#34D97A', end: '#CDFFD2', text: '#2D2D2D' },
    c: { start: '#2AA3BE', end: '#3BD7F6', text: '#2D2D2D' },
  },

  /**
   * Check-in emotion colours — one vivid, unique hue per emotion so no two
   * bubbles read as the same colour.
   *
   * Spread around the wheel at roughly even intervals (closest pair ~15°, happy vs
   * motivated) at high chroma, so all twelve pop against the dark screen background. The
   * first pass was much flatter: `energized` and `stressed` sat 0.2° apart in hue — the
   * same orange — while `tired`, `discouraged` and `defeated` were 16-22% saturation, i.e.
   * near-grey and indistinguishable from each other.
   *
   * Negative emotions are vivid here too, only slightly deeper in lightness than the
   * positives. Valence is carried by bubble shape instead — see `angularity` in the
   * check-ins `EMOTION_OPTIONS`, where negative emotions render pointier.
   */
  emotion: {
    happy: '#FFD60A',
    confident: '#29A9FF',
    motivated: '#FF9F1C',
    energized: '#B8E82E',
    relaxed: '#34D97A',
    focused: '#0AD5C8',
    tired: '#6A7DF0',
    discouraged: '#C049E8',
    stressed: '#FA3060',
    defeated: '#E040A8',
    angry: '#FF3B30',
    doubtful: '#9059F0',
  },

  // ─── Admin portal brand ──────────────────────────────────────────────────
  // Source of truth: the starterkit.com marketing site (pulled from its :root
  // custom properties, 2026-07-29).
  //
  // Deliberately separate from the ramps above: the portal carries the
  // marketing site's volt-on-black identity while apps/expo keeps StarterKit Blue.
  // Nothing here is consumed by mobile; rebranding one never touches the other.

  /**
   * Volt — the site's signal green (#AAFF00 at 500), the portal's primary.
   * Ramp derived by holding hue 80° / saturation 100% and walking lightness,
   * so every stop stays on the same brand hue.
   */
  volt: {
    50: '#F3FFDB',
    100: '#E6FFB3',
    200: '#D6FF85',
    300: '#C7FF57',
    400: '#B8FF29',
    500: '#AAFF00',
    600: '#8ED600',
    700: '#70A800',
    800: '#527A00',
    900: '#365200',
  },
  /**
   * Onyx — the site's near-black neutral scale. Direction matches
   * {@link palette.neutral} (0 = white, 1000 = black) so the two are
   * interchangeable in a semantic mapping.
   */
  onyx: {
    0: '#FFFFFF',
    /** site --foreground */
    50: '#F0F0F0',
    100: '#D4D4D4',
    200: '#B3B3B3',
    /** site --muted-foreground */
    300: '#888888',
    400: '#5C5C5C',
    500: '#3D3D3D',
    /** site --switch-background */
    600: '#333333',
    700: '#232323',
    /** site --secondary / --input (and --muted #1C1C1C) */
    800: '#1A1A1A',
    850: '#141414',
    /** site --card / --popover */
    900: '#111111',
    /** site --sidebar */
    925: '#0D0D0D',
    /** site --background */
    950: '#080808',
    /** site --primary-foreground (text on volt) */
    1000: '#000000',
    /**
     * Hairline rules. The site draws every border as translucent white rather
     * than a solid grey, so borders stay correct on any onyx surface. 0.08
     * mirrors the site's --border (#ffffff14).
     */
    hairline: 'rgba(255, 255, 255, 0.08)',
    hairlineStrong: 'rgba(255, 255, 255, 0.16)',
  },
  /**
   * Admin status colours, dark-tuned. The site only names `--destructive`; the
   * rest come from its chart palette, which is the Apple system-colour family.
   * Success is the family's green — volt is reserved for primary, so it cannot
   * double as the success hue.
   */
  adminStatus: {
    success: '#30D158',
    /** site --chart-4 */
    warning: '#FFCC00',
    /** site --destructive */
    error: '#FF3B30',
    /** site --chart-2 */
    info: '#00D4FF',
  },
  /** Chart series — the site's --chart-1..5 verbatim. */
  adminChart: ['#AAFF00', '#00D4FF', '#FF3B30', '#FFCC00', '#BF5AF2'],
  /**
   * Category (appointment / chart series) on dark — the dark counterpart to
   * {@link palette.category}. Backgrounds are alpha so a chip composites
   * correctly over any onyx surface.
   */
  adminCategory: {
    indigo: { bg: 'rgba(99, 102, 241, 0.16)', border: '#818CF8', text: '#C7D2FE' },
    green: { bg: 'rgba(34, 197, 94, 0.16)', border: '#4ADE80', text: '#BBF7D0' },
    orange: { bg: 'rgba(249, 115, 22, 0.16)', border: '#FB923C', text: '#FED7AA' },
    pink: { bg: 'rgba(236, 72, 153, 0.16)', border: '#F472B6', text: '#FBCFE8' },
    sky: { bg: 'rgba(14, 165, 233, 0.16)', border: '#38BDF8', text: '#BAE6FD' },
    purple: { bg: 'rgba(168, 85, 247, 0.16)', border: '#C084FC', text: '#E9D5FF' },
    cyan: { bg: 'rgba(6, 182, 212, 0.16)', border: '#22D3EE', text: '#A5F3FC' },
    yellow: { bg: 'rgba(234, 179, 8, 0.16)', border: '#FACC15', text: '#FEF08A' },
  },
  /**
   * Admin gradient stops, mirroring the flat `{start, mid, end}` shape of
   * {@link palette.gradient} so the portal's gradient classes swap over with a
   * one-line change.
   *
   * `adminGradient` is the loud volt sweep for small surfaces (CTA buttons,
   * progress fills, the AI wave). `adminHero` is the quiet volt-tinted black
   * for large decorative surfaces (the auth split panel) — a full-height volt
   * gradient at that scale is unreadable.
   *
   * All three accent stops sit in volt's bright range (600–400) on purpose, so
   * black text clears 7:1 anywhere in the sweep. See tokens.css for why a
   * dark → bright → dark volt ramp cannot carry a single text colour.
   */
  adminGradient: {
    /** volt-600 */
    start: '#8ED600',
    /** volt-400 */
    mid: '#B8FF29',
    /** volt-700 */
    end: '#70A800',
  },
  adminHero: {
    start: '#141414',
    mid: '#080808',
    end: '#1F3000',
  },
} as const;

/**
 * Admin radius — starterkit.com's near-square aesthetic (its --radius is 0.125rem).
 * A separate scale from `borderRadius` because the mobile app keeps the rounder
 * Figma geometry; the portal maps its semantic --radius-* to these.
 *
 * @knipignore mirror: exists to keep this file in sync with the
 * --starterkit-admin-radius-* block in tokens.css, per the header invariant. The
 * portal consumes the CSS variables; this is the runtime counterpart for
 * canvas/chart code that cannot read CSS.
 */
export const adminBorderRadius = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
} as const;

// ─── Gradients (named Figma fill styles) ─────────────────────────────────────

/**
 * Named StarterKit gradients, as `{ angle, stops }` — the source-of-truth shape for
 * deriving both CSS `linear-gradient()` strings (web) and `expo-linear-gradient`
 * start/end vectors (mobile; convert `angle` degrees to a direction vector at
 * the call site, since RN has no native angle API).
 */
export const gradients = {
  darkBackground: {
    angle: 212.36,
    stops: [
      ['#031E58', 0.12171],
      ['#0D90B1', 0.64004],
      ['#021546', 0.98874],
    ],
  },
  lightBackground: {
    angle: 250.79,
    stops: [
      ['#3BD7F6', 0.39438],
      ['#012D74', 0.93337],
    ],
  },
  /** Unnamed in Figma's Styles panel — a raw fill on the "Background/Variant3" symbol. */
  backgroundVariant3: {
    angle: -18.06,
    stops: [
      ['#5EC4DB', 0.35392],
      ['#DCEBFA', 0.87614],
    ],
  },
  bluePurple: {
    angle: 192.86,
    stops: [
      ['#C744FF', 0.21162],
      ['#012D74', 0.93533],
    ],
  },
  button: {
    angle: 187.69,
    stops: [
      ['#FFFFFF', 0.0316],
      ['#A9F1FF', 1.1329],
    ],
  },
  /**
   * TODO: "Button gradient light" style exists in Figma but no inspected frame
   * used it — identical to `button` as a placeholder pending confirmation.
   */
  buttonLight: {
    angle: 187.69,
    stops: [
      ['#FFFFFF', 0.0316],
      ['#A9F1FF', 1.1329],
    ],
  },
  /**
   * TODO: "Cyan gradient" style exists in Figma but no inspected frame used it —
   * identical to `button` as a placeholder pending confirmation.
   */
  cyan: {
    angle: 187.69,
    stops: [
      ['#FFFFFF', 0.0316],
      ['#A9F1FF', 1.1329],
    ],
  },
  /** Bonus: seen on an Icon Buttons/BluePink component — not yet a named Figma style. */
  bluePink: {
    angle: 90,
    stops: [
      ['#0A3D91', 0],
      ['#8322A4', 0.66581],
      ['#FF06B8', 0.98494],
    ],
  },
} as const satisfies Record<
  string,
  { angle: number; stops: readonly (readonly [string, number])[] }
>;

/** CSS `linear-gradient()` strings derived from `gradients` — for direct use as a `background` value. */
export const cssGradients = Object.fromEntries(
  Object.entries(gradients).map(([id, { angle, stops }]) => [
    id,
    `linear-gradient(${angle}deg, ${stops.map(([color, pos]) => `${color} ${(pos * 100).toFixed(3)}%`).join(', ')})`,
  ]),
) as Record<keyof typeof gradients, string>;

// ─── Typography ──────────────────────────────────────────────────────────────

/**
 * Font families. Headings use "Bebas Neue"; body copy uses "Poppins". Both are
 * Google Fonts. On mobile, load via `@expo-google-fonts/bebas-neue` and
 * `@expo-google-fonts/poppins` — the string values below are the exact keys
 * `useFonts()` registers each weight under. On web, load via `next/font/google`
 * and reference the family name directly (weight is a separate CSS property).
 */
export const fontFamily = {
  heading: 'BebasNeue_400Regular',
  bodyRegular: 'Poppins_400Regular',
  bodyMedium: 'Poppins_500Medium',
  bodyBold: 'Poppins_700Bold',
} as const;

/** Named Figma text styles: size/line-height/letter-spacing, in px. */
export const typeScale = {
  h1: { fontSize: 32, lineHeight: 30, letterSpacing: 1 },
  h2: { fontSize: 20, lineHeight: 30, letterSpacing: 1 },
  h3: { fontSize: 16, lineHeight: 30, letterSpacing: 1 },
  bigBody: { fontSize: 14, lineHeight: 16, letterSpacing: 0 },
  body: { fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  small: { fontSize: 10, lineHeight: 12, letterSpacing: 0 },
  xSmall: { fontSize: 8, lineHeight: 16, letterSpacing: 0 },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ─── Border radius ───────────────────────────────────────────────────────────

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  /** Auth card top corners, every auth screen (Figma "Sign In" frame). */
  '2xl': 20,
  /**
   * General pill-shaped controls — NOT the Sign-In screen's `Button`/`Input`,
   * which are taller (52-55px) and need `authControl` instead: at 15px this
   * radius is less than half their height, so it reads as rounded corners
   * rather than a true pill/stadium shape.
   */
  pill: 15,
  /**
   * Sign-In screen's auth-size `Button` and floating-label `Input` (Figma
   * "Sign In" frame) — taller than half `authControlHeight.button`/
   * `.input` so the ends stay fully round on both. Exposed as the
   * `rounded-auth-control` Tailwind class (see `global.css`), unlike
   * `authControlHeight`, since a radius has no layout-math dependency and so
   * doesn't need the JS constant too.
   */
  authControl: 60,
  full: 9999,
} as const;

/**
 * Fixed control heights for the redesigned Sign-In screen (Figma "Sign In"
 * frame) — not part of the generic `spacing` scale since 45px/52px
 * don't align to its 4px grid. Applied via inline `style` on `Button`'s and
 * `Input`'s `auth` size (not a Tailwind class), since Tailwind/NativeWind
 * classNames must be static strings and can't reference this constant. Also
 * consumed directly by `Input`'s floating-label position math, which must
 * match the rendered height exactly.
 */
export const authControlHeight = {
  input: 52,
  button: 55,
} as const;

// ─── Icon Sizes ──────────────────────────────────────────────────────────────

export const iconSize = {
  /** 8 — miniature preview icons only */
  xxxs: 8,
  /** 10 — very compact UI elements (nav items, dense lists) */
  xxs: 10,
  /** 16 — compact UI elements (nav items, dense lists) */
  xs: 16,
  /** 20 — standard inline icons */
  sm: 20,
  /** 28 — prominent action icons */
  md: 28,
  /** 48 — large display icons (empty states, achievements) */
  lg: 48,
} as const;

// ─── Avatar Sizes ────────────────────────────────────────────────────────────

export const avatarSize = {
  /** 24 — compact avatar (list items, nav) */
  sm: 24,
  /** 40 — standard avatar (cards, headers) */
  md: 40,
} as const;

// ─── Z-index ─────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;

// ─── Cover gradient presets ──────────────────────────────────────────────────

/**
 * Raw color stop pairs for each cover gradient preset — the single source of truth for
 * gradient colours across all platforms.
 *
 * - **Web**: derive `coverGradient` (CSS string) below.
 * - **Mobile**: pass directly to `expo-linear-gradient`
 *   (`start={{ x:0, y:0 }} end={{ x:1, y:1 }}`).
 *
 * Persisted in `imageUrl` columns as the sentinel `gradient:<id>`.
 * On club subdomains, these are overridden at render time by brand-derived colours.
 */
export const coverGradientColors = {
  '1': ['#667eea', '#b8a9c9'] as const, // indigo–mauve
  '2': ['#d4956a', '#c4a882'] as const, // terracotta–sand
  '3': ['#7bb89e', '#a8c5b8'] as const, // sage–mint
  '4': ['#e88dac', '#c4a8b8'] as const, // rose–blush
  '5': ['#7b9ee8', '#a8b8d4'] as const, // periwinkle–slate
} as const;

export type CoverGradientId = keyof typeof coverGradientColors;

/**
 * CSS `linear-gradient` strings for each preset — derived from `coverGradientColors`
 * so the two representations are always in sync. Used as CSS `background` values on web.
 */
export const coverGradient = Object.fromEntries(
  (Object.entries(coverGradientColors) as [CoverGradientId, readonly [string, string]][]).map(
    ([id, [start, end]]) => [id, `linear-gradient(135deg, ${start} 0%, ${end} 100%)`],
  ),
) as Record<CoverGradientId, string>;

/** All available gradient IDs, ordered for display in pickers. */
export const DEFAULT_GRADIENT_IDS: readonly CoverGradientId[] = ['1', '2', '3', '4', '5'];

/** Sentinel prefix stored in `imageUrl` for gradient selections. */
export const GRADIENT_PREFIX = 'gradient:';

/** Separator used to append a pattern id to a gradient or image sentinel. */
export const PATTERN_SEPARATOR = '|pattern:';

/** Available pattern overlay ids. `'none'` means no overlay. */
export const coverPatternIds = ['none', 'stripes', 'waves', 'spots', 'blobs', 'rings'] as const;
export type CoverPatternId = (typeof coverPatternIds)[number];

/**
 * Strip the `|pattern:N` suffix from an imageUrl, returning the base sentinel or URL.
 * Returns null when the input is null/undefined/empty.
 */
export function getBaseImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const sep = imageUrl.lastIndexOf(PATTERN_SEPARATOR);
  return sep !== -1 ? imageUrl.slice(0, sep) : imageUrl;
}

/**
 * Extract the pattern id from an imageUrl sentinel (e.g. `"gradient:1|pattern:dots"`).
 * Returns `null` when no valid pattern suffix is present.
 */
export function getPatternId(imageUrl: string | null | undefined): CoverPatternId | null {
  if (!imageUrl) return null;
  const sep = imageUrl.lastIndexOf(PATTERN_SEPARATOR);
  if (sep === -1) return null;
  const id = imageUrl.slice(sep + PATTERN_SEPARATOR.length);
  return (coverPatternIds as readonly string[]).includes(id) ? (id as CoverPatternId) : null;
}

/**
 * Return `imageUrl` with the given pattern appended, replacing any existing pattern.
 * Passing `null` or `'none'` strips the pattern suffix.
 */
export function withPattern(
  imageUrl: string,
  patternId: CoverPatternId | null | undefined,
): string {
  const base = getBaseImageUrl(imageUrl) ?? imageUrl;
  if (!patternId || patternId === 'none') return base;
  return `${base}${PATTERN_SEPARATOR}${patternId}`;
}

/**
 * Check whether an `imageUrl` value is a valid gradient sentinel.
 * Handles optional `|pattern:N` suffix transparently.
 */
export function isGradientImage(imageUrl: string | null | undefined): imageUrl is string {
  const base = getBaseImageUrl(imageUrl);
  if (!base?.startsWith(GRADIENT_PREFIX)) return false;
  const id = base.slice(GRADIENT_PREFIX.length);
  return id in coverGradientColors;
}

/**
 * Build the `imageUrl` sentinel for a given gradient id, with an optional pattern.
 * E.g. `gradientImageUrl('2', 'dots')` → `"gradient:2|pattern:dots"`.
 */
export function gradientImageUrl(id: CoverGradientId, patternId?: CoverPatternId | null): string {
  const base = `${GRADIENT_PREFIX}${id}`;
  return patternId && patternId !== 'none' ? `${base}${PATTERN_SEPARATOR}${patternId}` : base;
}

/**
 * Resolve an imageUrl to a CSS background style using the static preset colours.
 * Handles optional `|pattern:N` suffix transparently.
 * Returns undefined for non-gradient URLs.
 */
export function getGradientStyle(imageUrl: string | null | undefined): string | undefined {
  const base = getBaseImageUrl(imageUrl);
  if (!base?.startsWith(GRADIENT_PREFIX)) return undefined;
  const id = base.slice(GRADIENT_PREFIX.length);
  return id in coverGradient ? coverGradient[id as CoverGradientId] : undefined;
}

/**
 * Extract the gradient id from a gradient sentinel, handling the optional pattern suffix.
 * Returns null for non-gradient imageUrls.
 */
export function getGradientId(imageUrl: string | null | undefined): CoverGradientId | null {
  const base = getBaseImageUrl(imageUrl);
  if (!base?.startsWith(GRADIENT_PREFIX)) return null;
  const id = base.slice(GRADIENT_PREFIX.length);
  return id in coverGradientColors ? (id as CoverGradientId) : null;
}

// ─── Brand gradient helpers ───────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + hn / 30) % 12;
    const c = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generate five brand-derived gradient color-stop pairs from a brand hex colour.
 * Returns `[start, end]` hex pairs — suitable for `expo-linear-gradient` on mobile
 * and as the basis for CSS gradient strings on web.
 */
export function generateBrandGradientColors(
  brandHex: string,
): Record<CoverGradientId, readonly [string, string]> {
  const [h, s, l] = hexToHsl(brandHex);
  const ls = Math.max(25, Math.min(65, l));
  const ss = Math.max(35, Math.min(90, s));
  return {
    '1': [brandHex, hslToHex(h, ss * 0.55, Math.min(ls + 28, 82))],
    '2': [hslToHex(h, ss, Math.max(ls - 15, 15)), brandHex],
    '3': [hslToHex(h + 30, ss * 0.9, ls + 5), hslToHex(h + 50, ss * 0.55, Math.min(ls + 28, 82))],
    '4': [hslToHex(h - 30, ss * 0.9, ls + 5), hslToHex(h - 10, ss * 0.55, Math.min(ls + 28, 82))],
    '5': [hslToHex(h, ss * 0.42, ls + 12), hslToHex(h + 18, ss * 0.32, Math.min(ls + 36, 86))],
  };
}

/** Raw SVG tile for a cover pattern — single source of truth for web and mobile. */
export interface CoverPatternTile {
  /** Full SVG XML string. Web encodes as a data URI; mobile renders via react-native-svg SvgXml. */
  svgXml: string;
  /** Tile repeat width matching the SVG viewBox width. */
  tileWidth: number;
  /** Tile repeat height matching the SVG viewBox height. */
  tileHeight: number;
}

/** SVG tile data for every CoverPatternId. `null` means no overlay (id = "none"). */
export const COVER_PATTERN_TILES: Record<CoverPatternId, CoverPatternTile | null> = {
  none: null,

  stripes: {
    svgXml:
      '<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">' +
      '<line x1="-10" y1="10" x2="10" y2="-10" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>' +
      '<line x1="0" y1="20" x2="20" y2="0" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>' +
      '<line x1="10" y1="30" x2="30" y2="10" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>' +
      '</svg>',
    tileWidth: 20,
    tileHeight: 20,
  },

  waves: {
    svgXml:
      '<svg width="80" height="48" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M0 12 C15 0 25 0 40 12 C55 24 65 24 80 12" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>' +
      '<path d="M0 36 C15 24 25 24 40 36 C55 48 65 48 80 36" fill="none" stroke="rgba(255,255,255,0.11)" stroke-width="1.5"/>' +
      '</svg>',
    tileWidth: 80,
    tileHeight: 48,
  },

  spots: {
    svgXml:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 304 304" width="304" height="304">' +
      '<path fill="rgba(255,255,255,0.15)" d="M44.1 224a5 5 0 1 1 0 2H0v-2h44.1zm160 48a5 5 0 1 1 0 2H82v-2h122.1zm57.8-46a5 5 0 1 1 0-2H304v2h-42.1zm0 16a5 5 0 1 1 0-2H304v2h-42.1zm6.2-114a5 5 0 1 1 0 2h-86.2a5 5 0 1 1 0-2h86.2zm-256-48a5 5 0 1 1 0 2H0v-2h12.1zm185.8 34a5 5 0 1 1 0-2h86.2a5 5 0 1 1 0 2h-86.2zM258 12.1a5 5 0 1 1-2 0V0h2v12.1zm-64 208a5 5 0 1 1-2 0v-54.2a5 5 0 1 1 2 0v54.2zm48-198.2V80h62v2h-64V21.9a5 5 0 1 1 2 0zm16 16V64h46v2h-48V37.9a5 5 0 1 1 2 0zm-128 96V208h16v12.1a5 5 0 1 1-2 0V210h-16v-76.1a5 5 0 1 1 2 0zm-5.9-21.9a5 5 0 1 1 0 2H114v48H85.9a5 5 0 1 1 0-2H112v-48h12.1zm-6.2 130a5 5 0 1 1 0-2H176v-74.1a5 5 0 1 1 2 0V242h-60.1zm-16-64a5 5 0 1 1 0-2H114v48h10.1a5 5 0 1 1 0 2H112v-48h-10.1zM66 284.1a5 5 0 1 1-2 0V274H50v30h-2v-32h18v12.1zM236.1 176a5 5 0 1 1 0 2H226v94h48v32h-2v-30h-48v-98h12.1zm25.8-30a5 5 0 1 1 0-2H274v44.1a5 5 0 1 1-2 0V146h-10.1zm-64 96a5 5 0 1 1 0-2H208v-80h16v-14h-42.1a5 5 0 1 1 0-2H226v18h-16v80h-12.1zm86.2-210a5 5 0 1 1 0 2H272V0h2v32h10.1zM98 101.9V146H53.9a5 5 0 1 1 0-2H96v-42.1a5 5 0 1 1 2 0zM53.9 34a5 5 0 1 1 0-2H80V0h2v34H53.9zm60.1 3.9V66H82v64H69.9a5 5 0 1 1 0-2H80V64h32V37.9a5 5 0 1 1 2 0zM101.9 82a5 5 0 1 1 0-2H128V37.9a5 5 0 1 1 2 0V82h-28.1zm16-64a5 5 0 1 1 0-2H146v44.1a5 5 0 1 1-2 0V18h-26.1zm102.2 270a5 5 0 1 1 0 2H98v14h-2v-16h124.1zM242 149.9V160h16v34h-16v62h48v48h-2v-46h-48v-66h16v-30h-16v-12.1a5 5 0 1 1 2 0zM53.9 18a5 5 0 1 1 0-2H64V2H48V0h18v18H53.9zm112 32a5 5 0 1 1 0-2H192V0h50v2h-48v48h-28.1zm-48-48a5 5 0 0 1-9.8-2h2.07a3 3 0 1 0 5.66 0H178v34h-18V21.9a5 5 0 1 1 2 0V32h14V2h-58.1zm0 96a5 5 0 1 1 0-2H137l32-32h39V21.9a5 5 0 1 1 2 0V66h-40.17l-32 32H117.9zm28.1 90.1a5 5 0 1 1-2 0v-76.51L175.59 80H224V21.9a5 5 0 1 1 2 0V82h-49.59L146 112.41v75.69zm16 32a5 5 0 1 1-2 0v-99.51L184.59 96H300.1a5 5 0 0 1 3.9-3.9v2.07a3 3 0 0 0 0 5.66v2.07a5 5 0 0 1-3.9-3.9H185.41L162 121.41v98.69zm-144-64a5 5 0 1 1-2 0v-3.51l48-48V48h32V0h2v50H66v55.41l-48 48v2.69zM50 53.9v43.51l-48 48V208h26.1a5 5 0 1 1 0 2H0v-65.41l48-48V53.9a5 5 0 1 1 2 0zm-16 16V89.41l-34 34v-2.82l32-32V69.9a5 5 0 1 1 2 0zM12.1 32a5 5 0 1 1 0 2H9.41L0 43.41V40.6L8.59 32h3.51zm265.8 18a5 5 0 1 1 0-2h18.69l7.41-7.41v2.82L297.41 50H277.9zm-16 160a5 5 0 1 1 0-2H288v-71.41l16-16v2.82l-14 14V210h-28.1zm-208 32a5 5 0 1 1 0-2H64v-22.59L40.59 194H21.9a5 5 0 1 1 0-2H41.41L66 216.59V242H53.9zm150.2 14a5 5 0 1 1 0 2H96v-56.6L56.6 162H37.9a5 5 0 1 1 0-2h19.5L98 200.6V256h106.1zm-150.2 2a5 5 0 1 1 0-2H80v-46.59L48.59 178H21.9a5 5 0 1 1 0-2H49.41L82 208.59V258H53.9zM34 39.8v1.61L9.41 66H0v-2h8.59L32 40.59V0h2v39.8zM2 300.1a5 5 0 0 1 3.9 3.9H3.83A3 3 0 0 0 0 302.17V256h18v48h-2v-46H2v42.1zM34 241v63h-2v-62H0v-2h34v1zM17 18H0v-2h16V0h2v18h-1zm273-2h14v2h-16V0h2v16zm-32 273v15h-2v-14h-14v14h-2v-16h18v1zM0 92.1A5.02 5.02 0 0 1 6 97a5 5 0 0 1-6 4.9v-2.07a3 3 0 1 0 0-5.66V92.1zM80 272h2v32h-2v-32zm37.9 32h-2.07a3 3 0 0 0-5.66 0h-2.07a5 5 0 0 1 9.8 0zM5.9 0A5.02 5.02 0 0 1 0 5.9V3.83A3 3 0 0 0 3.83 0H5.9zm294.2 0h2.07A3 3 0 0 0 304 3.83V5.9a5 5 0 0 1-3.9-5.9zm3.9 300.1v2.07a3 3 0 0 0-1.83 1.83h-2.07a5 5 0 0 1 3.9-3.9zM97 100a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-48 32a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm32 48a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-16 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm32-16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-32a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 32a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm32 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-16-64a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 96a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16-144a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 32a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16-32a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16-16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-96 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16-32a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm96 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-16-64a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16-16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-32 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-16 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-16 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-16 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM49 36a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-32 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm32 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM33 68a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16-48a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 240a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 32a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-16-64a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-16-32a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm80-176a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-16-16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm32 48a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16-16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-32a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm112 176a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-16 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 180a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-32a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 84a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm32 64a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16-16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>' +
      '</svg>',
    tileWidth: 304,
    tileHeight: 304,
  },

  blobs: {
    svgXml:
      '<svg width="48" height="32" viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="none" fill-rule="evenodd">' +
      '<g fill="rgba(255,255,255,0.18)">' +
      '<path d="M27 32c0-3.314 2.686-6 6-6 5.523 0 10-4.477 10-10S38.523 6 33 6c-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 6.627 0 12 5.373 12 12s-5.373 12-12 12c-2.21 0-4 1.79-4 4h-2zm-6 0c0-3.314-2.686-6-6-6-5.523 0-10-4.477-10-10S9.477 6 15 6c3.314 0 6-2.686 6-6h-2c0 2.21-1.79 4-4 4C8.373 4 3 9.373 3 16s5.373 12 12 12c2.21 0 4 1.79 4 4h2z"/>' +
      '</g></g></svg>',
    tileWidth: 48,
    tileHeight: 32,
  },

  rings: {
    svgXml:
      '<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="rgba(255,255,255,0.18)" fill-rule="evenodd"/>' +
      '</svg>',
    tileWidth: 100,
    tileHeight: 100,
  },
};
