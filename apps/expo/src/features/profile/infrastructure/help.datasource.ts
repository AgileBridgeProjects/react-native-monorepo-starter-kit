import { postApiSupportHelp } from '@/src/proxy/services/support/support';

export interface HelpRequestPayload {
  subject: string;
  body: string;
}

export class HelpDataSource {
  async sendHelpEmail(request: HelpRequestPayload): Promise<void> {
    return postApiSupportHelp(request);
  }
}
