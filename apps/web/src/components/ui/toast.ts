import { toast } from 'sonner';

export type { ExternalToast as ToastOptions } from 'sonner';
export { toast };

type NotifyType = 'error' | 'success' | 'warning' | 'info';

export function notify(message: string, type: NotifyType = 'info', _duration?: number): void {
  toast[type](message);
}
