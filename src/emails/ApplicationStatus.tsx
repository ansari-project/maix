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

interface ApplicationStatusEmailProps {
  userName: string
  projectName: string
  projectId: string
  accepted: boolean
}

export function ApplicationStatusEmail({
  userName,
  projectName,
  projectId,
  accepted
}: ApplicationStatusEmailProps) {
  const previewText = accepted 
    ? `Your application for ${projectName} was accepted!` 
    : `Application update for ${projectName}`
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={baseStyles.box}>
            <Heading style={baseStyles.heading}>
              {accepted ? 'Congratulations! 🎉' : 'Application Update'}
            </Heading>
            
            <Text style={baseStyles.paragraph}>
              Assalamu alaikum {userName},
            </Text>
            
            <Text style={baseStyles.paragraph}>
              {accepted ? (
                <>
                  Great news! Your application to volunteer for <strong>{projectName}</strong> has been accepted.
                  The project owner will be in touch with you soon about next steps.
                </>
              ) : (
                <>
                  Thank you for your interest in volunteering for <strong>{projectName}</strong>. 
                  Unfortunately, your application was not selected at this time. 
                  We encourage you to apply to other projects that match your skills and interests.
                </>
              )}
            </Text>

            <Button
              style={baseStyles.button}
              href={`${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}`}
            >
              View Project
            </Button>

            <Text style={baseStyles.footer}>
              {accepted 
                ? 'May Allah reward your efforts and make this project beneficial for the Ummah.'
                : 'May Allah guide you to the project where your skills will have the most impact.'
              }
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}