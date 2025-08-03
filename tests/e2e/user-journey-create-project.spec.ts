import { test, expect } from './fixtures'

test.describe('User Journey: Create Project', () => {
  test('user can register, set up profile, and create a project', async ({ page, authHelper }) => {
    // Step 1: Register a new user
    const uniqueId = Date.now()
    const testUser = {
      name: `Test User ${uniqueId}`,
      email: `testuser${uniqueId}@test.com`,
      password: 'TestPassword123!'
    }
    
    await test.step('Register new user', async () => {
      await page.goto('/auth/signup')
      
      // Fill registration form
      await page.fill('input[name="name"]', testUser.name)
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="password"]', testUser.password)
      
      // Submit form
      await page.click('button[type="submit"]:has-text("Sign up")')
      
      // Should redirect to dashboard
      await page.waitForURL('**/dashboard/**')
      
      // Verify user is logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
      await expect(page.locator('text=' + testUser.name)).toBeVisible()
    })
    
    // Step 2: Set up user profile
    await test.step('Set up user profile', async () => {
      // Navigate to profile page
      await page.goto('/profile')
      
      // Wait for profile form to load
      await page.waitForSelector('form')
      
      // Fill in profile details
      await page.fill('textarea[name="bio"]', 'I am a passionate AI developer interested in education technology.')
      await page.fill('input[name="linkedinUrl"]', 'https://linkedin.com/in/testuser')
      await page.fill('input[name="githubUrl"]', 'https://github.com/testuser')
      await page.fill('input[name="availability"]', '20')
      
      // Add skills
      const skillsInput = page.locator('input[placeholder*="skills"]')
      await skillsInput.fill('Python')
      await skillsInput.press('Enter')
      await skillsInput.fill('Machine Learning')
      await skillsInput.press('Enter')
      await skillsInput.fill('Next.js')
      await skillsInput.press('Enter')
      
      // Save profile
      await page.click('button:has-text("Save")')
      
      // Verify success message
      await expect(page.locator('text=Profile updated successfully')).toBeVisible()
    })
    
    // Step 3: Create a new project
    await test.step('Create a new project', async () => {
      // Navigate to new project page
      await page.goto('/projects/new')
      
      // Fill in project details
      await page.fill('input[name="name"]', 'AI-Powered Learning Assistant')
      await page.fill('textarea[name="goal"]', 'Build an AI assistant that helps students learn programming concepts through interactive conversations')
      await page.fill('textarea[name="description"]', `
        This project aims to create an intelligent learning assistant that can:
        - Answer programming questions in a beginner-friendly way
        - Provide code examples and explanations
        - Guide students through problem-solving steps
        - Track learning progress and adapt to student needs
        
        We need volunteers with experience in AI/ML, education technology, and full-stack development.
      `.trim())
      
      // Select help type
      await page.click('button[role="combobox"]:has-text("Select help type")')
      await page.click('text=MVP Development')
      
      // Set contact email
      await page.fill('input[name="contactEmail"]', testUser.email)
      
      // Set target completion date (3 months from now)
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 3)
      const dateString = futureDate.toISOString().slice(0, 16)
      await page.fill('input[type="datetime-local"]', dateString)
      
      // Keep default visibility (PUBLIC)
      
      // Submit the form
      await page.click('button:has-text("Post Project")')
      
      // Should redirect to project page
      await page.waitForURL('**/projects/**')
      
      // Verify project was created
      await expect(page.locator('h1:has-text("AI-Powered Learning Assistant")')).toBeVisible()
      await expect(page.locator('text=MVP Development')).toBeVisible()
      await expect(page.locator('text=' + testUser.name)).toBeVisible()
    })
    
    // Step 4: Verify project appears in user's project list
    await test.step('Verify project in list', async () => {
      // Navigate to projects page
      await page.goto('/projects')
      
      // Should see the project in the list
      await expect(page.locator('text=AI-Powered Learning Assistant')).toBeVisible()
      await expect(page.locator('text=Build an AI assistant that helps students')).toBeVisible()
      
      // Click on the project
      await page.click('text=AI-Powered Learning Assistant')
      
      // Should navigate to project details
      await expect(page.url()).toContain('/projects/')
      
      // Verify all details are displayed correctly
      await expect(page.locator('text=Project Details')).toBeVisible()
      await expect(page.locator('text=' + testUser.email)).toBeVisible()
    })
  })
  
  test('user can create a project under an organization', async ({ page, authHelper, testUser }) => {
    // Sign in with test user
    await authHelper.signIn(testUser.email, testUser.password)
    
    // Step 1: Create an organization
    const orgSlug = `test-org-${Date.now()}`
    await test.step('Create organization', async () => {
      await page.goto('/organizations/new')
      
      await page.fill('input[name="name"]', 'Test Tech Foundation')
      await page.fill('input[name="slug"]', orgSlug)
      
      await page.click('button:has-text("Create Organization")')
      
      // Should redirect to organization page
      await page.waitForURL(`**/organizations/${orgSlug}`)
      
      await expect(page.locator('h1:has-text("Test Tech Foundation")')).toBeVisible()
    })
    
    // Step 2: Create a project under the organization
    await test.step('Create project under organization', async () => {
      // Click create project button on org page
      await page.click('a:has-text("Create Project")')
      
      // Should navigate to new project page with org pre-selected
      await expect(page.url()).toContain(`organizationId=`)
      
      // Verify organization is pre-selected
      await expect(page.locator('[data-testid="organization-selector"]')).toContainText('Test Tech Foundation')
      
      // Fill in project details
      await page.fill('input[name="name"]', 'Community AI Initiative')
      await page.fill('textarea[name="goal"]', 'Develop AI tools for community benefit')
      await page.fill('textarea[name="description"]', 'A'.repeat(60)) // Min 50 chars
      
      await page.click('button[role="combobox"]:has-text("Select help type")')
      await page.click('text=Full Product Development')
      
      await page.fill('input[name="contactEmail"]', 'org@test.com')
      
      // Submit
      await page.click('button:has-text("Post Project")')
      
      // Verify project was created under organization
      await page.waitForURL('**/projects/**')
      
      await expect(page.locator('text=Test Tech Foundation')).toBeVisible()
      await expect(page.locator('h1:has-text("Community AI Initiative")')).toBeVisible()
    })
  })
})