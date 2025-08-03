import { test, expect } from './fixtures'
import { DatabaseHelper } from './helpers/db.helper'

test.describe('User Journey: Q&A Flow', () => {
  test('user can ask question, receive answer, and mark as resolved', async ({ page, authHelper, testUser }) => {
    // Create another user who will answer the question
    const answerer = await DatabaseHelper.createTestUser({
      email: `answerer-${Date.now()}@test.com`,
      password: 'AnswerPass123!',
      name: 'Helpful Expert'
    })
    
    // Sign in as question asker
    await authHelper.signIn(testUser.email, testUser.password)
    
    // Step 1: Ask a new question
    let questionUrl: string
    await test.step('Ask a new question', async () => {
      // Navigate to Q&A page
      await page.goto('/q-and-a')
      
      // Click "Ask Question" button
      await page.click('a:has-text("Ask Question")')
      
      // Should navigate to new question page
      await page.waitForURL('**/q-and-a/new')
      
      // Fill in question form
      await page.fill('input[name="title"]', 'How to implement real-time updates in Next.js?')
      
      await page.fill('textarea[name="content"]', `
        I'm building a collaborative app with Next.js and need to implement real-time updates.
        
        Requirements:
        - Multiple users should see updates instantly
        - Should work with Server Components
        - Minimal latency
        
        What's the best approach? Should I use WebSockets, Server-Sent Events, or something else?
        
        I've looked at Pusher and Ably but not sure which integrates better with Next.js 14.
      `.trim())
      
      // Add tags
      const tagsInput = page.locator('input[placeholder*="tags"]')
      await tagsInput.fill('nextjs')
      await tagsInput.press('Enter')
      await tagsInput.fill('real-time')
      await tagsInput.press('Enter')
      await tagsInput.fill('websockets')
      await tagsInput.press('Enter')
      
      // Submit question
      await page.click('button:has-text("Post Question")')
      
      // Should redirect to question page
      await page.waitForURL('**/q-and-a/**')
      questionUrl = page.url()
      
      // Verify question is displayed
      await expect(page.locator('h1:has-text("How to implement real-time updates in Next.js?")')).toBeVisible()
      await expect(page.locator('text=' + testUser.name)).toBeVisible()
      await expect(page.locator('text=Multiple users should see updates instantly')).toBeVisible()
      
      // Tags should be displayed
      await expect(page.locator('text=nextjs')).toBeVisible()
      await expect(page.locator('text=real-time')).toBeVisible()
      await expect(page.locator('text=websockets')).toBeVisible()
    })
    
    // Step 2: Browse questions in public Q&A
    await test.step('Question appears in public Q&A', async () => {
      // Sign out to view as anonymous user
      await authHelper.signOut()
      
      // Navigate to public questions
      await page.goto('/public/questions')
      
      // Search for the question
      await page.fill('input[placeholder*="Search questions"]', 'real-time updates Next.js')
      await page.press('input[placeholder*="Search questions"]', 'Enter')
      
      // Question should appear
      await expect(page.locator('text=How to implement real-time updates in Next.js?')).toBeVisible()
      await expect(page.locator('text=' + testUser.name)).toBeVisible()
      await expect(page.locator('text=0 answers')).toBeVisible()
      
      // Click to view question
      await page.click('text=How to implement real-time updates in Next.js?')
      
      // Should show sign in prompt for answering
      await expect(page.locator('text=Sign in to answer')).toBeVisible()
    })
    
    // Step 3: Another user answers the question
    await test.step('Expert provides answer', async () => {
      // Sign in as answerer
      await authHelper.signIn(answerer.email, answerer.password)
      
      // Navigate to the question
      await page.goto(questionUrl)
      
      // Click answer button
      await page.click('button:has-text("Write an Answer")')
      
      // Write detailed answer
      await page.fill('textarea[name="answer"]', `
        Great question! For real-time updates in Next.js 14, I recommend using **Pusher** or **Ably** with the following approach:
        
        ## 1. Server-Sent Events for Simple Updates
        If you only need server-to-client updates, SSE is the simplest:
        \`\`\`typescript
        // app/api/events/route.ts
        export async function GET() {
          const stream = new ReadableStream({
            start(controller) {
              // Send updates
              controller.enqueue('data: {"update": "new data"}\\n\\n')
            }
          })
          return new Response(stream, {
            headers: { 'Content-Type': 'text/event-stream' }
          })
        }
        \`\`\`
        
        ## 2. Pusher for Bidirectional Communication
        For full real-time features, Pusher integrates well:
        \`\`\`typescript
        // lib/pusher.ts
        import Pusher from 'pusher-js'
        export const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: 'eu'
        })
        \`\`\`
        
        ## 3. Implementation with Server Components
        Use Client Components for real-time parts:
        \`\`\`typescript
        'use client'
        import { useEffect, useState } from 'react'
        import { pusher } from '@/lib/pusher'
        
        export function RealtimeMessages({ channelId }: { channelId: string }) {
          const [messages, setMessages] = useState<Message[]>([])
          
          useEffect(() => {
            const channel = pusher.subscribe(channelId)
            channel.bind('new-message', (data: Message) => {
              setMessages(prev => [...prev, data])
            })
            return () => {
              pusher.unsubscribe(channelId)
            }
          }, [channelId])
          
          return <MessageList messages={messages} />
        }
        \`\`\`
        
        **Recommendation**: Start with Pusher - it has great Next.js docs and handles scaling for you.
      `.trim())
      
      // Submit answer
      await page.click('button:has-text("Post Answer")')
      
      // Answer should appear
      await expect(page.locator('text=Great question! For real-time updates')).toBeVisible()
      await expect(page.locator('text=' + answerer.name)).toBeVisible()
      await expect(page.locator('text=Server-Sent Events for Simple Updates')).toBeVisible()
    })
    
    // Step 4: Question asker marks answer as resolved
    await test.step('Mark answer as best answer', async () => {
      // Sign out answerer
      await authHelper.signOut()
      
      // Sign back in as question asker
      await authHelper.signIn(testUser.email, testUser.password)
      
      // Navigate to the question
      await page.goto(questionUrl)
      
      // Should see the answer
      await expect(page.locator('text=Great question! For real-time updates')).toBeVisible()
      
      // Mark as best answer
      await page.click('button:has-text("Mark as Best Answer")')
      
      // Confirm in dialog
      await page.click('button:has-text("Confirm")')
      
      // Should show as resolved
      await expect(page.locator('text=Best Answer')).toBeVisible()
      await expect(page.locator('[data-testid="resolved-badge"]')).toBeVisible()
      
      // The mark button should be gone
      await expect(page.locator('button:has-text("Mark as Best Answer")')).not.toBeVisible()
    })
    
    // Step 5: Verify question shows as resolved in listings
    await test.step('Question shows as resolved in listings', async () => {
      // Navigate to Q&A page
      await page.goto('/q-and-a')
      
      // Question should show resolved status
      await expect(page.locator('text=How to implement real-time updates in Next.js?')).toBeVisible()
      await expect(page.locator('[data-testid="question-card"]:has-text("How to implement real-time updates") [data-testid="resolved-icon"]')).toBeVisible()
      await expect(page.locator('text=1 answer')).toBeVisible()
      
      // Navigate to public questions
      await page.goto('/public/questions')
      
      // Should also show as resolved there
      await expect(page.locator('[data-testid="question-card"]:has-text("How to implement real-time updates") [data-testid="resolved-icon"]')).toBeVisible()
    })
  })
  
  test('user can comment on answers', async ({ page, authHelper, testUser }) => {
    // Create a question with an answer
    const questionAuthor = await DatabaseHelper.createTestUser({
      email: `qauthor-${Date.now()}@test.com`,
      password: 'QAuthorPass123!',
      name: 'Question Author'
    })
    
    const question = await DatabaseHelper.createTestPost(questionAuthor.id, {
      type: 'QUESTION',
      content: '## How to optimize Next.js build times?\n\nMy builds are taking too long. Any tips?',
      visibility: 'PUBLIC'
    })
    
    const answer = await DatabaseHelper.createTestPost(testUser.id, {
      type: 'ANSWER',
      content: 'Try using `next build --profile` to identify slow parts.',
      parentId: question.id,
      visibility: 'PUBLIC'
    })
    
    // Sign in and navigate to question
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto(`/q-and-a/${question.id}`)
    
    await test.step('Add comment to answer', async () => {
      // Find the answer
      await expect(page.locator('text=Try using `next build --profile`')).toBeVisible()
      
      // Click comment button on the answer
      await page.locator('[data-testid="answer-card"]').locator('button:has-text("Comment")').click()
      
      // Write comment
      await page.fill('textarea[placeholder*="Add a comment"]', 'Also check out the Next.js Bundle Analyzer plugin for detailed insights!')
      
      // Submit comment
      await page.click('button:has-text("Post Comment")')
      
      // Comment should appear
      await expect(page.locator('text=Also check out the Next.js Bundle Analyzer')).toBeVisible()
      await expect(page.locator('[data-testid="comment"]:has-text("Bundle Analyzer")').locator('text=' + testUser.name)).toBeVisible()
    })
  })
})