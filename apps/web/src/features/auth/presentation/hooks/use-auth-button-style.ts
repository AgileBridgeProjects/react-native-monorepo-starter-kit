/**
 * Returns consistent className + style for the primary CTA button on auth pages.
 * White-labelling is off, so this is always StarterKit branding.
 *
 * Solid volt with an uppercase label — starterkit.com's CTA treatment. Colour comes
 * from the Button `primary` variant (volt fill, onyx text); no text colour here.
 */
export function useAuthButtonStyle() {
  return {
    className:
      'h-12 rounded-md text-sm font-semibold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60',
    style: undefined,
  } as const;
}
