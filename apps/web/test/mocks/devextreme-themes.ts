export function current() {
  return 'generic.light';
}

export const initialized = true;

export function isMaterial() {
  return false;
}

export function ready(callback?: () => void) {
  callback?.();
}
