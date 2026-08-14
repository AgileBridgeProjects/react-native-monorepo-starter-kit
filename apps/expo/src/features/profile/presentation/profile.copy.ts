export interface ProfileWeeklyActivityDay {
  day: string;
  gamesPlayed: number;
}

export const PROFILE_TEST_IDS = {
  devToolsCard: 'profile-dev-tools-card',
  logoutButton: 'profile-logout-button',
  screen: 'profile-screen',
  profileCard: 'profile-info-card',
  menuCard: 'profile-menu-card',
  displayName: 'profile-display-name',
  email: 'profile-email',
  avatarButton: 'profile-avatar-button',
  nameField: 'profile-name-field',
  // Menu rows. Previously keyed only by label (no testID), forcing E2E to click
  // ghost/text selectors. These are the real navigation rows.
  editProfileMenuItem: 'profile-edit-profile-menu-item',
  settingsMenuItem: 'profile-settings-menu-item',
  helpMenuItem: 'profile-help-menu-item',
} as const;

export const EDIT_PROFILE_TEST_IDS = {
  screen: 'edit-profile-screen',
  avatarButton: 'edit-profile-avatar-button',
  displayNameInput: 'edit-profile-display-name-input',
  saveButton: 'edit-profile-save-button',
} as const;

export const HELP_TEST_IDS = {
  screen: 'help-screen',
  subjectInput: 'help-subject-input',
  bodyInput: 'help-body-input',
  sendButton: 'help-send-button',
  successView: 'help-success-view',
  doneButton: 'help-done-button',
} as const;

export const SETTINGS_TEST_IDS = {
  screen: 'settings-screen',
  generalCard: 'settings-general-card',
  notificationsSwitch: 'settings-notifications-switch',
  darkModeSwitch: 'settings-dark-mode-switch',
  reduceMotionSwitch: 'settings-reduce-motion-switch',
  soundsSwitch: 'settings-sounds-switch',
  soundsVolumeSlider: 'settings-sounds-volume-slider',
  ambientSwitch: 'settings-ambient-switch',
  ambientVolumeSlider: 'settings-ambient-volume-slider',
} as const;

export const PROFILE_MOCK_DATA = {
  user: {
    initials: 'AJ',
    name: 'Alex Johnson',
    email: 'alex.johnson@starterkit.app',
    memberSince: '14 Jan 2024',
  },
  stats: {
    xp: 1250,
    league: 'Silver League',
    rewards: 12,
    gamesWon: 18,
    totalGames: 24,
    streak: 7,
  },
  weeklyActivity: {
    completionPercent: 84,
    xpGained: 320,
    days: [
      { day: 'M', gamesPlayed: 2 },
      { day: 'T', gamesPlayed: 4 },
      { day: 'W', gamesPlayed: 3 },
      { day: 'T', gamesPlayed: 5 },
      { day: 'F', gamesPlayed: 4 },
      { day: 'S', gamesPlayed: 6 },
      { day: 'S', gamesPlayed: 1 },
    ] satisfies ProfileWeeklyActivityDay[],
  },
} as const;
