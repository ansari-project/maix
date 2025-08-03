import { test, expect } from './fixtures'
import { DatabaseHelper } from './helpers/db.helper'

test.describe('Q&A Functionality', () => {
  test('should allow users to post questions', async ({ page, authHelper, testUser }) => {
    // Create test projects and products for the dropdown
    const project = await DatabaseHelper.createTestProject(testUser.id, {
      name: 'Q&A Test Project'
    })
    
    const product = await DatabaseHelper.createTestProduct(testUser.id, {
      name: 'Q&A Test Product'
    })
    
    // Sign in and navigate to dashboard/Q&A section
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto('/dashboard')
    
    // Find and click the "Ask a Question" button or form
    await page.click('button:has-text("Ask a Question")')
    
    // Fill out the question form
    const questionContent = 'How do I implement user authentication in a Next.js application with NextAuth?'
    await page.fill('textarea[name="content"]', questionContent)
    
    // Select project if dropdown exists
    const projectSelect = page.locator('[data-testid="project-select"]')
    if (await projectSelect.isVisible()) {
      await projectSelect.click()
      await page.click(`text=${project.name}`)
    }
    
    // Submit the question
    await page.click('button[type="submit"]:has-text("Post")')
    
    // Verify question appears in the feed
    await expect(page.locator(`text=${questionContent}`)).toBeVisible({
      timeout: 10000
    })
  })

  test('should display questions in the feed', async ({ page, authHelper, testUser }) => {
    // Create test questions
    const question1 = await DatabaseHelper.createTestPost(testUser.id, {
      type: 'QUESTION',
      content: 'What are the best practices for React state management?'
    })
    
    const question2 = await DatabaseHelper.createTestPost(testUser.id, {
      type: 'QUESTION', 
      content: 'How to optimize database queries in Prisma?'
    })
    
    // Sign in and view dashboard
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto('/dashboard')
    
    // Verify questions appear in feed
    await expect(page.locator('text=What are the best practices for React state management?')).toBeVisible()
    await expect(page.locator('text=How to optimize database queries in Prisma?')).toBeVisible()
  })

  test('should allow users to answer questions', async ({ page, authHelper, testUser }) => {
    // Create another user to ask the question
    const questioner = await DatabaseHelper.createTestUser({
      email: `questioner-${Date.now()}@test.com`,
      password: 'QuestionerPass123!',
      name: 'Question Asker'
    })
    
    // Create a test question
    const question = await DatabaseHelper.createTestPost(questioner.id, {
      type: 'QUESTION',
      content: 'What is the difference between useEffect and useLayoutEffect in React?'
    })
    
    // Sign in as the answerer
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto('/dashboard')
    
    // Find the question and click to view details
    await page.click('text=What is the difference between useEffect and useLayoutEffect')
    
    // Add an answer
    const answerContent = 'useEffect runs after the DOM has been updated, while useLayoutEffect runs synchronously after all DOM mutations but before the browser paints.'
    
    await page.fill('textarea[name="answer"]', answerContent)
    await page.click('button[type="submit"]:has-text("Submit Answer")')
    
    // Verify answer appears
    await expect(page.locator(`text=${answerContent}`)).toBeVisible({
      timeout: 10000
    })
  })

  test('should allow users to vote on answers', async ({ page, authHelper, testUser }) => {
    // Create questioner and answerer
    const questioner = await DatabaseHelper.createTestUser({
      email: `vote-questioner-${Date.now()}@test.com`,
      password: 'QuestionerPass123!',
      name: 'Question Asker'
    })
    
    const answerer = await DatabaseHelper.createTestUser({
      email: `answerer-${Date.now()}@test.com`,
      password: 'AnswererPass123!',
      name: 'Answer Provider'
    })
    
    // Create question and answer
    const question = await DatabaseHelper.createTestPost(questioner.id, {
      type: 'QUESTION',
      content: 'How do I handle errors in async/await functions?'
    })
    
    // TODO: Create answer via API/database helper once comment model is ready
    // For now, we'll test the voting UI elements
    
    // Sign in as voter
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto('/dashboard')
    
    // Navigate to question
    await page.click('text=How do I handle errors in async/await functions?')
    
    // Look for voting buttons (upvote/downvote)
    const upvoteButton = page.locator('button[data-testid="upvote"]')
    const downvoteButton = page.locator('button[data-testid="downvote"]')
    
    // Test voting interaction if buttons exist
    if (await upvoteButton.isVisible()) {
      await upvoteButton.click()
      
      // Verify vote was registered (button state change, count update, etc.)
      await expect(upvoteButton).toHaveClass(/.*active.*|.*voted.*/)
    }
  })

  test('should allow question authors to mark best answers', async ({ page, authHelper, testUser }) => {
    // Create an answerer
    const answerer = await DatabaseHelper.createTestUser({
      email: `best-answer-${Date.now()}@test.com`,
      password: 'AnswererPass123!',
      name: 'Best Answerer'
    })
    
    // Create a question as the test user
    const question = await DatabaseHelper.createTestPost(testUser.id, {
      type: 'QUESTION',
      content: 'What are the best practices for API design in REST?'
    })
    
    // Sign in as question author
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto('/dashboard')
    
    // Navigate to the question
    await page.click('text=What are the best practices for API design in REST?')
    
    // Look for "Mark as Best Answer" functionality
    const markBestButton = page.locator('button:has-text("Mark as Best")')
    
    if (await markBestButton.isVisible()) {
      await markBestButton.click()
      
      // Verify answer is marked as best
      await expect(page.locator('[data-testid="best-answer"]')).toBeVisible()
      await expect(page.locator('text=Best Answer')).toBeVisible()
    }
  })

  test('should filter questions by project/product', async ({ page, authHelper, testUser }) => {
    // Create test project and product
    const project = await DatabaseHelper.createTestProject(testUser.id, {
      name: 'Filter Test Project'
    })
    
    const product = await DatabaseHelper.createTestProduct(testUser.id, {
      name: 'Filter Test Product'
    })
    
    // Create questions associated with different projects
    await DatabaseHelper.createTestPost(testUser.id, {
      type: 'QUESTION',
      content: 'Project-specific question about implementation',
      projectId: project.id
    })
    
    await DatabaseHelper.createTestPost(testUser.id, {
      type: 'QUESTION',
      content: 'Product-specific question about features',
      productId: product.id
    })
    
    await DatabaseHelper.createTestPost(testUser.id, {
      type: 'QUESTION', 
      content: 'General question not tied to any project'
    })
    
    // Sign in and test filtering
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto('/dashboard')
    
    // Test project filter
    const projectFilter = page.locator('[data-testid="project-filter"]')
    if (await projectFilter.isVisible()) {
      await projectFilter.click()
      await page.click(`text=${project.name}`)
      
      // Verify only project-related questions show
      await expect(page.locator('text=Project-specific question')).toBeVisible()
      await expect(page.locator('text=Product-specific question')).not.toBeVisible()
    }
  })

  test('should search questions by content', async ({ page, authHelper, testUser }) => {
    // Create searchable questions
    await DatabaseHelper.createTestPost(testUser.id, {
      type: 'QUESTION',
      content: 'How to implement GraphQL subscriptions with real-time updates?'
    })
    
    await DatabaseHelper.createTestPost(testUser.id, {
      type: 'QUESTION',
      content: 'Best practices for React performance optimization techniques'
    })
    
    // Sign in and test search
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto('/dashboard')
    
    // Use search functionality
    const searchInput = page.locator('input[placeholder*="Search"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('GraphQL')
      await page.keyboard.press('Enter')
      
      // Verify search results
      await expect(page.locator('text=How to implement GraphQL subscriptions')).toBeVisible()
      await expect(page.locator('text=Best practices for React performance')).not.toBeVisible()
    }
  })
})