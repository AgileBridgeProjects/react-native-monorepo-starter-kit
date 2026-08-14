import { StyleSheet, Text } from 'react-native';
import { GradientBackground } from '@/components/ui';
import { colors } from '@/constants/tokens';

/**
 * Minimal blank screen used as a placeholder for the five StarterKit tabs.
 * Replace each tab's screen with real content as features are built.
 */
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <GradientBackground style={styles.container} headerClearance="tab" symmetricClearance>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Placeholder screen — replace with StarterKit content.</Text>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center', color: colors.dark.text },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.dark.textSecondary,
  },
});
