export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  unauthorized: (msg = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', msg),
  forbidden: (msg = 'Forbidden') => new AppError(403, 'FORBIDDEN', msg),
  notFound: (resource: string) => new AppError(404, 'NOT_FOUND', `${resource} not found`),
  conflict: (msg: string) => new AppError(409, 'CONFLICT', msg),
  badRequest: (msg: string) => new AppError(400, 'BAD_REQUEST', msg),
  // 402 Payment Required — used for insufficient points (treat points as a
  // currency here). Standard-conformant: Stripe / Razorpay also use 402.
  paymentRequired: (msg = 'Payment required') => new AppError(402, 'PAYMENT_REQUIRED', msg),
  tooManyRequests: (msg = 'Rate limit exceeded') => new AppError(429, 'RATE_LIMITED', msg),
  dailyCapReached: (action: string) => new AppError(400, 'DAILY_CAP_REACHED', `Daily cap reached for ${action}`),
  internal: (msg = 'Internal server error') => new AppError(500, 'INTERNAL', msg),
};
