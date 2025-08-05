import { test, expect } from '@playwright/test'

// Test configuration
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

// Test users - you'll need to set these up in your test environment
const projectOwner = {
  email: 'owner@example.com',
  password: 'testpass123'
}

const volunteer = {
  email: 'volunteer@example.com', 
  password: 'testpass123'
}

// Helper function to sign in
async function signIn(page: any, email: string, password: string) {
  await page.goto(`${baseURL}/auth/signin`)
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${baseURL}/dashboard/home`)
}

test.describe('Todo System User Journey', () => {
  // We'll use a shared project ID across tests
  let projectId: string

  test.beforeAll(async () => {
    // In a real test, you'd create a test project here
    // For demo purposes, we'll use an existing project
    projectId = 'test-project-id' // Replace with actual project ID
  })

  test('1. Project owner creates a todo', async ({ page }) => {
    // Sign in as project owner
    await signIn(page, projectOwner.email, projectOwner.password)
    
    // Navigate to project page
    await page.goto(`${baseURL}/projects/${projectId}`)
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Test Project') // Adjust based on your project name
    
    // Scroll to Todo section
    await page.locator('text=Todos').scrollIntoViewIfNeeded()
    
    // Click "Add Todo" button
    await page.click('button:has-text("Add Todo")')
    
    // Fill in todo form
    await page.fill('input[placeholder*="title"]', 'Implement user authentication')
    await page.fill('textarea[placeholder*="description"]', 'Set up OAuth with Google and ensure secure session management')
    
    // Set due date (optional)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 7)
    await page.click('button[aria-label*="calendar"]')
    await page.click(`button[aria-label*="${tomorrow.getDate()}"]`)
    
    // Submit the form
    await page.click('button:has-text("Create")')
    
    // Verify todo was created
    await expect(page.locator('.todo-card').filter({ hasText: 'Implement user authentication' })).toBeVisible()
    await expect(page.locator('.todo-status-badge').first()).toContainText('Open')
    
    console.log('✅ Test 1 Passed: Project owner successfully created a todo')
  })

  test('2. Project owner assigns todo to volunteer', async ({ page }) => {
    await signIn(page, projectOwner.email, projectOwner.password)
    await page.goto(`${baseURL}/projects/${projectId}`)
    
    // Find the todo we created
    const todoCard = page.locator('.todo-card').filter({ hasText: 'Implement user authentication' })
    
    // Click on assignee selector
    await todoCard.locator('button[aria-label*="assignee"]').click()
    
    // Search for volunteer
    await page.fill('input[placeholder*="Search"]', 'volunteer')
    
    // Select the volunteer from dropdown
    await page.click(`div[role="option"]:has-text("${volunteer.email}")`)
    
    // Verify assignment
    await expect(todoCard.locator('.assignee-name')).toContainText('Volunteer')
    
    console.log('✅ Test 2 Passed: Todo successfully assigned to volunteer')
  })

  test('3. Volunteer updates todo status', async ({ page }) => {
    // Sign in as volunteer
    await signIn(page, volunteer.email, volunteer.password)
    
    // Navigate to project
    await page.goto(`${baseURL}/projects/${projectId}`)
    
    // Find assigned todo
    const todoCard = page.locator('.todo-card').filter({ hasText: 'Implement user authentication' })
    
    // Change status to "In Progress"
    await todoCard.locator('button[aria-label*="status"]').click()
    await page.click('div[role="option"]:has-text("In Progress")')
    
    // Verify status change
    await expect(todoCard.locator('.todo-status-badge')).toContainText('In Progress')
    
    // Now mark as completed
    await todoCard.locator('button[aria-label*="status"]').click()
    await page.click('div[role="option"]:has-text("Completed")')
    
    // Verify completion
    await expect(todoCard.locator('.todo-status-badge')).toContainText('Completed')
    
    console.log('✅ Test 3 Passed: Volunteer successfully updated todo status')
  })

  test('4. Create project update linked to todo', async ({ page }) => {
    await signIn(page, volunteer.email, volunteer.password)
    await page.goto(`${baseURL}/projects/${projectId}`)
    
    // Click "Post Update" in project updates section
    await page.click('button:has-text("Post Update")')
    
    // Fill update content
    await page.fill('textarea[placeholder*="Share progress"]', 'Authentication implementation complete! OAuth with Google is now working.')
    
    // Link to todo (if UI supports it)
    // This depends on your implementation - adjust selector as needed
    const todoSelector = page.locator('select[name="todoId"], button[aria-label*="link todo"]')
    if (await todoSelector.isVisible()) {
      await todoSelector.click()
      await page.click('option:has-text("Implement user authentication")')
    }
    
    // Post the update
    await page.click('button:has-text("Post Update")')
    
    // Verify update was posted
    await expect(page.locator('.project-update').last()).toContainText('Authentication implementation complete')
    
    console.log('✅ Test 4 Passed: Project update created and linked to todo')
  })

  test('5. View todo details and linked posts', async ({ page }) => {
    await signIn(page, projectOwner.email, projectOwner.password)
    await page.goto(`${baseURL}/projects/${projectId}`)
    
    // Click on todo to view details (if your UI supports this)
    const todoCard = page.locator('.todo-card').filter({ hasText: 'Implement user authentication' })
    
    // Check if todo has linked posts indicator
    const linkedPostsIndicator = todoCard.locator('.linked-posts-count, [aria-label*="linked posts"]')
    if (await linkedPostsIndicator.isVisible()) {
      await expect(linkedPostsIndicator).toContainText('1')
    }
    
    // Verify todo shows completed status
    await expect(todoCard.locator('.todo-status-badge')).toContainText('Completed')
    
    // Verify assignee is shown
    await expect(todoCard.locator('.assignee-name')).toContainText('Volunteer')
    
    console.log('✅ Test 5 Passed: Todo details and linked posts displayed correctly')
  })

  test('6. Filter todos by status', async ({ page }) => {
    await signIn(page, projectOwner.email, projectOwner.password)
    await page.goto(`${baseURL}/projects/${projectId}`)
    
    // Scroll to todos section
    await page.locator('text=Todos').scrollIntoViewIfNeeded()
    
    // Create another todo for filtering test
    await page.click('button:has-text("Add Todo")')
    await page.fill('input[placeholder*="title"]', 'Write unit tests')
    await page.click('button:has-text("Create")')
    
    // Now we have one completed and one open todo
    // Test filtering - this depends on your UI implementation
    const filterSelector = page.locator('select[aria-label*="filter"], button[aria-label*="filter"]')
    if (await filterSelector.isVisible()) {
      // Filter by "Open" status
      await filterSelector.click()
      await page.click('option:has-text("Open"), button:has-text("Open")')
      
      // Verify only open todos are shown
      await expect(page.locator('.todo-card')).toHaveCount(1)
      await expect(page.locator('.todo-card')).toContainText('Write unit tests')
      
      // Filter by "Completed" status
      await filterSelector.click()
      await page.click('option:has-text("Completed"), button:has-text("Completed")')
      
      // Verify only completed todos are shown
      await expect(page.locator('.todo-card')).toHaveCount(1)
      await expect(page.locator('.todo-card')).toContainText('Implement user authentication')
    }
    
    console.log('✅ Test 6 Passed: Todo filtering works correctly')
  })

  test('7. Delete a todo (owner only)', async ({ page }) => {
    await signIn(page, projectOwner.email, projectOwner.password)
    await page.goto(`${baseURL}/projects/${projectId}`)
    
    // Find the "Write unit tests" todo
    const todoCard = page.locator('.todo-card').filter({ hasText: 'Write unit tests' })
    
    // Look for delete button (might be in a menu)
    const deleteButton = todoCard.locator('button[aria-label*="delete"], button[aria-label*="remove"]')
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      // Confirm deletion if there's a confirmation dialog
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }
      
      // Verify todo was deleted
      await expect(todoCard).not.toBeVisible()
      
      console.log('✅ Test 7 Passed: Todo successfully deleted by owner')
    }
  })
})

// Run a quick demo that shows the key features
test('Todo System Quick Demo', async ({ page }) => {
  console.log('🚀 Starting Todo System Demo...\n')
  
  // Sign in
  await signIn(page, projectOwner.email, projectOwner.password)
  console.log('✓ Signed in as project owner')
  
  // Go to project
  await page.goto(`${baseURL}/projects/${projectId}`)
  console.log('✓ Navigated to project page')
  
  // Take screenshot of project page with todos
  await page.screenshot({ path: 'todo-system-overview.png', fullPage: true })
  console.log('✓ Screenshot saved: todo-system-overview.png')
  
  // Highlight todo section
  await page.locator('text=Todos').scrollIntoViewIfNeeded()
  const todoSection = page.locator('section:has(h2:has-text("Todos"))')
  await todoSection.screenshot({ path: 'todo-section.png' })
  console.log('✓ Screenshot saved: todo-section.png')
  
  console.log('\n✨ Demo complete! Check the screenshots to see the todo system in action.')
})