import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

const WAVE_HEIGHT = 80;

interface WaveDividerProps {
  /** Full width of the screen so the curve spans edge-to-edge. */
  width: number;
}

/**
 * Asymmetric S-curve SVG wave that sits at the top of a white panel,
 * overlapping the gradient hero above it.
 */
export function WaveDivider({ width }: WaveDividerProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const fillColor = colors[colorScheme].surface;
  const w = width;
  const h = WAVE_HEIGHT;
  // Asymmetric S-curve: rises high on the left, sweeps down to the right
  const d = `M0,${h * 0.15} C${w * 0.3},${-h * 0.35} ${w * 0.65},${h * 1.15} ${w},${h * 0.7} L${w},${h} L0,${h} Z`;
  return (
    <View testID={AUTH_TEST_IDS.components.waveDivider} className="absolute left-0 -top-[79px]">
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <Path d={d} fill={fillColor} />
      </Svg>
    </View>
  );
}
