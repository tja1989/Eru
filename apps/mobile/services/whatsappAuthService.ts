import api from '@/services/api';

export const whatsappAuthService = {
  async send(phone: string): Promise<void> {
    await api.post('/auth/whatsapp/send', { phone });
  },
  async verify(phone: string, code: string): Promise<string> {
    const res = await api.post('/auth/whatsapp/verify', { phone, code });
    return res.data.customToken;
  },
};
