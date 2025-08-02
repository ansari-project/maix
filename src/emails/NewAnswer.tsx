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

interface NewAnswerEmailProps {
  userName: string
  answererName: string
  questionTitle: string
  questionId: string
}

export function NewAnswerEmail({
  userName,
  answererName,
  questionTitle,
  questionId
}: NewAnswerEmailProps) {
  const previewText = `${answererName} answered your question`
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={baseStyles.box}>
            <Heading style={baseStyles.heading}>
              New answer to your question
            </Heading>
            
            <Text style={baseStyles.paragraph}>
              Assalamu alaikum {userName},
            </Text>
            
            <Text style={baseStyles.paragraph}>
              <strong>{answererName}</strong> has answered your question:
            </Text>

            <Section style={baseStyles.highlightBox}>
              <Text style={baseStyles.paragraph}>
                &ldquo;{questionTitle}&rdquo;
              </Text>
            </Section>

            <Button
              style={baseStyles.button}
              href={`${process.env.NEXT_PUBLIC_APP_URL}/q-and-a/${questionId}`}
            >
              View Answer
            </Button>

            <Text style={baseStyles.footer}>
              Knowledge shared is knowledge multiplied. May this answer benefit you and others.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}