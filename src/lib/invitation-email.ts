import { Resend } from 'resend';
import * as React from 'react';
import { InvitationEmail } from '@/emails';
import { generateInvitationToken } from './invitation-utils';

const resend = new Resend(process.env.RESEND_API_KEY!);

interface SendInvitationEmailParams {
  invitation: {
    id: string;
    email: string;
    role: string;
    message?: string | null;
    expiresAt: Date;
    inviter: {
      name: string | null;
      email: string;
    };
    organization?: {
      name: string;
    } | null;
    product?: {
      name: string;
    } | null;
    project?: {
      name: string;
    } | null;
  };
  token: string;
}

export async function sendInvitationEmail({ invitation, token }: SendInvitationEmailParams) {
  const entityType = invitation.organization ? 'organization' : 
                    invitation.product ? 'product' : 
                    'project';
  
  const entityName = invitation.organization?.name || 
                    invitation.product?.name || 
                    invitation.project?.name || 
                    'Unknown';

  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${token}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Maix <noreply@maix.io>',
      to: invitation.email,
      subject: `You're invited to join ${entityName}`,
      react: React.createElement(InvitationEmail, {
        inviteeName: invitation.email.split('@')[0], // Use email prefix as name if not available
        inviterName: invitation.inviter.name || invitation.inviter.email,
        entityType,
        entityName,
        role: invitation.role,
        message: invitation.message || undefined,
        invitationUrl,
        expiresAt: invitation.expiresAt.toISOString()
      })
    });

    if (error) {
      console.error('Failed to send invitation email:', error);
      throw new Error('Failed to send invitation email');
    }

    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
}

interface ResendInvitationEmailParams {
  invitationId: string;
  email: string;
  role: string;
  message?: string | null;
  expiresAt: Date;
  inviterName: string;
  entityType: 'organization' | 'product' | 'project';
  entityName: string;
}

export async function resendInvitationEmail(params: ResendInvitationEmailParams) {
  // Generate a new token for the resend
  const newToken = generateInvitationToken();
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${newToken}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Maix <noreply@maix.io>',
      to: params.email,
      subject: `Reminder: You're invited to join ${params.entityName}`,
      react: React.createElement(InvitationEmail, {
        inviteeName: params.email.split('@')[0],
        inviterName: params.inviterName,
        entityType: params.entityType,
        entityName: params.entityName,
        role: params.role,
        message: params.message || undefined,
        invitationUrl,
        expiresAt: params.expiresAt.toISOString()
      })
    });

    if (error) {
      console.error('Failed to resend invitation email:', error);
      throw new Error('Failed to resend invitation email');
    }

    return { success: true, emailId: data?.id, newToken };
  } catch (error) {
    console.error('Error resending invitation email:', error);
    throw error;
  }
}