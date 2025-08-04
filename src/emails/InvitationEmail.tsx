import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { baseStyles } from './styles'

interface InvitationEmailProps {
  inviteeName: string
  inviterName: string
  entityType: 'organization' | 'product' | 'project'
  entityName: string
  role: string
  message?: string
  invitationUrl: string
  expiresAt: string
}

export function InvitationEmail({
  inviteeName,
  inviterName,
  entityType,
  entityName,
  role,
  message,
  invitationUrl,
  expiresAt
}: InvitationEmailProps) {
  const previewText = `${inviterName} invited you to join ${entityName}`
  
  const entityTypeLabel = entityType === 'organization' ? 'organization' :
                         entityType === 'product' ? 'product' : 'project'
  
  const roleLabel = role.toLowerCase()
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={baseStyles.box}>
            <Heading style={baseStyles.heading}>
              You&apos;re invited to join {entityName}!
            </Heading>
            
            <Text style={baseStyles.paragraph}>
              Hi {inviteeName || 'there'},
            </Text>
            
            <Text style={baseStyles.paragraph}>
              <strong>{inviterName}</strong> has invited you to join <strong>{entityName}</strong> as a <strong>{roleLabel}</strong>.
            </Text>

            {message && (
              <>
                <Text style={baseStyles.paragraph}>
                  <strong>Message from {inviterName}:</strong>
                </Text>
                
                <Section style={baseStyles.messageBox}>
                  <Text style={baseStyles.paragraph}>
                    &ldquo;{message}&rdquo;
                  </Text>
                </Section>
              </>
            )}

            <Text style={baseStyles.paragraph}>
              Click the button below to accept this invitation and join the {entityTypeLabel}.
            </Text>

            <Button
              style={baseStyles.button}
              href={invitationUrl}
            >
              Accept Invitation
            </Button>

            <Text style={{...baseStyles.paragraph, fontSize: '14px', color: '#666'}}>
              This invitation will expire on {new Date(expiresAt).toLocaleDateString()}.
            </Text>

            <Text style={{...baseStyles.paragraph, fontSize: '14px', color: '#666', marginTop: '20px'}}>
              If you didn&apos;t expect this invitation, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}