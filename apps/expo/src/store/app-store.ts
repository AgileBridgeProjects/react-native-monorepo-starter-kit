import { mmkvStorage } from '@lib/storage/mmkv-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ColorScheme = 'light' | 'dark' | 'system';

export type ScoreMetricPreference = 'points' | 'percentage';

interface AppState {
  colorScheme: ColorScheme;
  isOnboarded: boolean;
  notificationsEnabled: boolean;
  soundsEnabled: boolean;
  sfxVolume: number;
  ambientEnabled: boolean;
  ambientVolume: number;
  /** ISO-8601 UTC timestamp of the last XP event that was animated on the league card. */
  lastSeenXpAt: string;
  /** YYYY-MM-DD local date of the last streak-celebration animation. Empty string = never. */
  lastStreakCelebrationDate: string;
  /** YYYY-MM-DD (Monday) of the last week whose weekly-streak advance was celebrated. Empty = never. */
  lastWeeklyStreakCelebratedWeek: string;
  scoreMetric: ScoreMetricPreference;
  /** YYYY-MM-DD (Monday) of the week whose streak advance is pending overlay celebration. Empty = none pending. */
  pendingStreakCelebrationWeek: string;
  /** When true, skip or simplify non-essential animations (for low-end devices). */
  reduceMotion: boolean;
  /**
   * User id whose onboarding requirement is already known to be satisfied — either
   * completed, or their role has no flow.
   *
   * Lets `(tabs)/_layout` stop blocking app entry on the profile query once the
   * answer is known: without it, every single app open showed a full-screen
   * skeleton while that request was in flight. Keyed by user id so switching
   * accounts on one device re-gates properly. Empty string = not yet known.
   */
  onboardingSettledForUserId: string;
}

interface AppActions {
  setColorScheme: (scheme: ColorScheme) => void;
  setOnboarded: (onboarded: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundsEnabled: (enabled: boolean) => void;
  setSfxVolume: (volume: number) => void;
  setAmbientEnabled: (enabled: boolean) => void;
  setAmbientVolume: (volume: number) => void;
  setLastSeenXpAt: (isoTimestamp: string) => void;
  setLastStreakCelebrationDate: (date: string) => void;
  setLastWeeklyStreakCelebratedWeek: (weekStart: string) => void;
  setScoreMetric: (metric: ScoreMetricPreference) => void;
  setPendingStreakCelebrationWeek: (weekStart: string) => void;
  setReduceMotion: (enabled: boolean) => void;
  setOnboardingSettledForUserId: (userId: string) => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // State
      colorScheme: 'system',
      isOnboarded: false,
      notificationsEnabled: true,
      soundsEnabled: true,
      sfxVolume: 0.8,
      ambientEnabled: true,
      ambientVolume: 0.5,
      lastSeenXpAt: new Date().toISOString(),
      lastStreakCelebrationDate: '',
      lastWeeklyStreakCelebratedWeek: '',
      scoreMetric: 'points',
      pendingStreakCelebrationWeek: '',
      reduceMotion: false,
      onboardingSettledForUserId: '',

      // Actions
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setOnboarded: (isOnboarded) => set({ isOnboarded }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setSoundsEnabled: (soundsEnabled) => set({ soundsEnabled }),
      setSfxVolume: (sfxVolume) => set({ sfxVolume: Math.min(1, Math.max(0, sfxVolume)) }),
      setAmbientEnabled: (ambientEnabled) => set({ ambientEnabled }),
      setAmbientVolume: (ambientVolume) =>
        set({ ambientVolume: Math.min(1, Math.max(0, ambientVolume)) }),
      setLastSeenXpAt: (lastSeenXpAt) => set({ lastSeenXpAt }),
      setLastStreakCelebrationDate: (lastStreakCelebrationDate) =>
        set({ lastStreakCelebrationDate }),
      setLastWeeklyStreakCelebratedWeek: (lastWeeklyStreakCelebratedWeek) =>
        set({ lastWeeklyStreakCelebratedWeek }),
      setScoreMetric: (scoreMetric) => set({ scoreMetric }),
      setPendingStreakCelebrationWeek: (pendingStreakCelebrationWeek) =>
        set({ pendingStreakCelebrationWeek }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setOnboardingSettledForUserId: (onboardingSettledForUserId) =>
        set({ onboardingSettledForUserId }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
