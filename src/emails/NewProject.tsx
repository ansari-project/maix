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

interface NewProjectEmailProps {
  userName: string
  projectName: string
  projectGoal: string
  projectId: string
  helpType: string
}

export function NewProjectEmail({
  userName,
  projectName,
  projectGoal,
  projectId,
  helpType
}: NewProjectEmailProps) {
  const previewText = `New project needs ${helpType.toLowerCase()} help: ${projectName}`
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={baseStyles.box}>
            <Heading style={baseStyles.heading}>
              New volunteer opportunity!
            </Heading>
            
            <Text style={baseStyles.paragraph}>
              Assalamu alaikum {userName},
            </Text>
            
            <Text style={baseStyles.paragraph}>
              A new project has been posted that needs <strong>{helpType.toLowerCase()}</strong> help:
            </Text>

            <Section style={baseStyles.highlightBox}>
              <Text style={baseStyles.projectTitle}>
                {projectName}
              </Text>
              <Text style={baseStyles.paragraph}>
                {projectGoal}
              </Text>
            </Section>

            <Button
              style={baseStyles.button}
              href={`${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}`}
            >
              View Project
            </Button>

            <Text style={baseStyles.footer}>
              Make a difference in your community through meaningful tech contributions.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}