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

interface NewQuestionEmailProps {
  userName: string
  questionTitle: string
  authorName: string
  questionId: string
}

export function NewQuestionEmail({
  userName,
  questionTitle,
  authorName,
  questionId
}: NewQuestionEmailProps) {
  const previewText = `New question from ${authorName}`
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={baseStyles.box}>
            <Heading style={baseStyles.heading}>
              New question in Q&A
            </Heading>
            
            <Text style={baseStyles.paragraph}>
              Assalamu alaikum {userName},
            </Text>
            
            <Text style={baseStyles.paragraph}>
              <strong>{authorName}</strong> has posted a new question:
            </Text>

            <Section style={baseStyles.highlightBox}>
              <Text style={baseStyles.paragraph}>
                &ldquo;{questionTitle}&rdquo;
              </Text>
            </Section>

            <Text style={baseStyles.paragraph}>
              Share your knowledge and help the community by providing an answer.
            </Text>

            <Button
              style={baseStyles.button}
              href={`${process.env.NEXT_PUBLIC_APP_URL}/q-and-a/${questionId}`}
            >
              View Question
            </Button>

            <Text style={baseStyles.footer}>
              &ldquo;Whoever guides someone to goodness will have a reward like the one who did it.&rdquo; - Prophet Muhammad ﷺ
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}