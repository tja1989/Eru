import { Redis } from '@upstash/redis';
import { randomInt } from 'node:crypto';

const redis = Redis.fromEnv();
const OTP_TTL_SECONDS = 5 * 60;

export const whatsappOtpService = {
  async sendOtp(phone: string): Promise<{ channel: 'whatsapp' }> {
    const code = String(randomInt(100000, 1000000));
    await redis.set(`otp:${phone}`, code, { ex: OTP_TTL_SECONDS });

    if (process.env.NODE_ENV !== 'test') {
      const params = new URLSearchParams({
        channel: 'whatsapp',
        source: process.env.GUPSHUP_SOURCE ?? '',
        destination: phone,
        message: JSON.stringify({
          type: 'text',
          text: `Your Eru verification code: ${code}. Valid for 5 minutes.`,
        }),
        'src.name': 'eru',
      });

      await fetch('https://api.gupshup.io/sm/api/v1/msg', {
        method: 'POST',
        headers: {
          apikey: process.env.GUPSHUP_API_KEY ?? '',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    }

    return { channel: 'whatsapp' };
  },

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const stored = await redis.get(`otp:${phone}`);
    if (stored === code) {
      await redis.del(`otp:${phone}`);
      return true;
    }
    return false;
  },
};
