import { api } from './http';

export const reportsApi = {
  submit: (body: {
    targetType: 'user' | 'company';
    targetUsername: string;
    reason: 'SPAM' | 'FAKE' | 'HARASSMENT' | 'OTHER';
    details?: string;
  }) =>
    api('/api/reports', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
