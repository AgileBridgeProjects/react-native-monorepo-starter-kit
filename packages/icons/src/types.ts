export interface IconProps {
  /** Icon size in pixels. Defaults to `iconSize.md` (28). */
  size?: number;
  /** CSS class (web) or ignored on native. */
  className?: string;
  /** Icon colour — CSS colour string on web, resolved colour on native. */
  color?: string;
  /** Accessible label. When set, the icon is not aria-hidden. */
  'aria-label'?: string;
}
