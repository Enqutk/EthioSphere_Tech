import { api } from './http';

export const reportsApi = {
  submit: (
    token: string,
    body: {
      targetType: 'user' | 'company';
      targetUsername: string;
      reason: 'SPAM' | 'FAKE' | 'HARASSMENT' | 'OTHER';
      details?: string;
    }
  ) =>
    api('/api/reports', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
};
