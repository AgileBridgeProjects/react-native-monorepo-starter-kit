import { useMutation } from '@tanstack/react-query';
import { HelpDataSource } from '../../infrastructure/help.datasource';

const helpDataSource = new HelpDataSource();

export function useSendHelpEmail() {
  return useMutation({
    mutationFn: (request: { subject: string; body: string }) =>
      helpDataSource.sendHelpEmail(request),
  });
}
