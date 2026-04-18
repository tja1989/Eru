import type { FastifyInstance } from 'fastify';
import { whatsappOtpService } from '../services/whatsappOtpService.js';
import { Errors } from '../utils/errors.js';
import { z } from 'zod';

export async function whatsappOtpRoutes(app: FastifyInstance) {
  const sendSchema = z.object({ phone: z.string().regex(/^\+\d{10,15}$/) });
  const verifySchema = z.object({
    phone: z.string().regex(/^\+\d{10,15}$/),
    code: z.string().regex(/^\d{6}$/),
  });

  app.post('/auth/whatsapp/send', async (request) => {
    const parsed = sendSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest('Invalid phone');
    await whatsappOtpService.sendOtp(parsed.data.phone);
    return { success: true };
  });

  app.post('/auth/whatsapp/verify', async (request, reply) => {
    const parsed = verifySchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest('Invalid input');

    const ok = await whatsappOtpService.verifyOtp(parsed.data.phone, parsed.data.code);
    if (!ok) throw Errors.unauthorized('Invalid code');

    // Get or create firebase user for this phone, then create a custom token
    const admin = await import('firebase-admin');
    const fbUser = await admin.auth().getUserByPhoneNumber(parsed.data.phone).catch(() => null);
    const uid = fbUser?.uid ?? (await admin.auth().createUser({ phoneNumber: parsed.data.phone })).uid;
    const customToken = await admin.auth().createCustomToken(uid);

    return reply.send({ customToken });
  });
}
