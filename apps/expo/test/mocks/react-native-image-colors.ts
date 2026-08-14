import { vi } from 'vitest';

export const getColors = vi.fn().mockResolvedValue({
  platform: 'android',
  average: '#888888',
  vibrant: '#888888',
  darkVibrant: '#444444',
  lightVibrant: '#cccccc',
  dominant: '#888888',
  darkMuted: '#333333',
  lightMuted: '#aaaaaa',
  muted: '#888888',
});
