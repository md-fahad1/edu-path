import { Injectable, Logger } from '@nestjs/common';

/**
 * Brevo HTTP API diye mail pathay (Render free-e SMTP port block thake, tai SMTP na).
 * BREVO_API_KEY na thakle (local dev) mail-er lekha console-e print hoy.
 */
@Injectable()
export class MailService {
  private log = new Logger('Mail');

  async send(to: string, subject: string, text: string, html?: string) {
    const key = process.env.BREVO_API_KEY;
    if (!key) {
      // production-e token log-e rakhbo na
      this.log.warn(process.env.NODE_ENV === 'production' ? `BREVO_API_KEY set nai, mail pathano jayni (to: ${to})` : `[DEV MAIL] to=${to}\n${subject}\n${text}`);
      return;
    }
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: process.env.MAIL_FROM_NAME || 'শিক্ষাপথ', email: process.env.MAIL_FROM_EMAIL },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html ?? text,
      }),
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}