import { Resend } from 'resend';
import { PublicFigure, Topic, Event, Article } from '@prisma/client';

interface EventWithRelations extends Event {
  publicFigure: PublicFigure;
  topic: Topic;
  articles: Article[];
}

export class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set');
    }
    this.resend = new Resend(apiKey);
  }

  async sendDailyDigest(userEmail: string, userName: string, events: EventWithRelations[]) {
    if (!events.length) return;

    const subject = `Causemon Daily: ${events.length} new events`;
    const html = this.generateHTML(userName, events);

    await this.resend.emails.send({
      from: process.env.EMAIL_FROM || 'Causemon <noreply@maix.app>',
      to: userEmail,
      subject,
      html
    });
  }

  private generateHTML(userName: string, events: EventWithRelations[]): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1E3A8A;">Causemon Daily Update</h1>
  
  <p>Hi ${userName || 'there'},</p>
  
  <p>Here are the latest events from your monitors:</p>
  
  ${events.map(event => `
    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 8px;">
      <h3 style="margin-top: 0;">${event.title}</h3>
      <p style="color: #666;">
        <strong>${event.publicFigure.name}</strong> on ${event.topic.name}
      </p>
      <p>${event.summary}</p>
      <a href="${process.env.NEXT_PUBLIC_URL}/causemon/events" style="color: #1E3A8A;">
        View Details →
      </a>
    </div>
  `).join('')}
  
  <hr style="margin: 30px 0;">
  
  <p style="color: #666; font-size: 14px;">
    <a href="${process.env.NEXT_PUBLIC_URL}/causemon">Manage monitors</a>
  </p>
</body>
</html>
    `;
  }
}

let emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}