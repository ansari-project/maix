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

interface ApplicationReceivedEmailProps {
  userName: string
  projectName: string
  applicantName: string
  applicantEmail: string
  projectId: string
  applicationMessage: string
}

export function ApplicationReceivedEmail({
  userName,
  projectName,
  applicantName,
  applicantEmail,
  projectId,
  applicationMessage
}: ApplicationReceivedEmailProps) {
  const previewText = `${applicantName} wants to volunteer for ${projectName}`
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={baseStyles.box}>
            <Heading style={baseStyles.heading}>
              Assalamu alaikum {userName}!
            </Heading>
            
            <Text style={baseStyles.paragraph}>
              Good news! <strong>{applicantName}</strong> ({applicantEmail}) has applied to volunteer 
              for your project &ldquo;{projectName}&rdquo;.
            </Text>

            <Text style={baseStyles.paragraph}>
              <strong>Their message:</strong>
            </Text>
            
            <Section style={baseStyles.messageBox}>
              <Text style={baseStyles.paragraph}>
                {applicationMessage}
              </Text>
            </Section>

            <Button
              style={baseStyles.button}
              href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects/${projectId}/applications`}
            >
              Review Application
            </Button>

            <Text style={baseStyles.footer}>
              May Allah bless your project with success.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}