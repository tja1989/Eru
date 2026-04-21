import QRCode from 'qrcode';

export const qrService = {
  /**
   * Render an SVG QR code for the given payload string.
   *
   * Server-side generation (Dev Spec §13) so:
   *   1. The mobile client never has to bundle a QR encoder.
   *   2. The same code stored in the DB always renders identically.
   *   3. Future payload changes (signing, expiry markers) ship server-only.
   */
  async generate(code: string): Promise<string> {
    if (!code || code.length === 0) {
      throw new Error('qrService.generate: code is required');
    }
    return QRCode.toString(code, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  },
};
