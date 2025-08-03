import { test, expect } from './fixtures'
import { DatabaseHelper } from './helpers/db.helper'

test.describe('User Journey: Volunteer Application', () => {
  test('volunteer can browse projects, apply, and get accepted', async ({ page, authHelper, testUser }) => {
    // Create a project owner and a project
    const projectOwner = await DatabaseHelper.createTestUser({
      email: `owner-${Date.now()}@test.com`,
      password: 'OwnerPass123!',
      name: 'Project Owner'
    })
    
    const testProject = await DatabaseHelper.createTestProject(projectOwner.id, {
      name: 'Open Source AI Chat Bot',
      goal: 'Build an open-source AI chatbot for customer support',
      description: `
        We are building an open-source AI chatbot that can handle customer support queries.
        The bot will use natural language processing to understand customer questions and provide helpful responses.
        We need volunteers with experience in Python, NLP, and chatbot development.
      `.trim(),
      helpType: 'MVP',
      contactEmail: projectOwner.email,
      visibility: 'PUBLIC',
      isActive: true
    })
    
    // Sign in as volunteer
    await authHelper.signIn(testUser.email, testUser.password)
    
    // Step 1: Browse public projects
    await test.step('Browse public projects', async () => {
      // Navigate to public projects page
      await page.goto('/public/projects')
      
      // Wait for projects to load
      await page.waitForSelector('[data-testid="project-card"]')
      
      // Search for the project
      await page.fill('input[placeholder*="Search projects"]', 'AI Chat Bot')
      await page.press('input[placeholder*="Search projects"]', 'Enter')
      
      // Verify project appears in results
      await expect(page.locator('text=Open Source AI Chat Bot')).toBeVisible()
      await expect(page.locator('text=Build an open-source AI chatbot')).toBeVisible()
      await expect(page.locator('text=MVP')).toBeVisible()
      
      // Click on the project to view details
      await page.click('text=Open Source AI Chat Bot')
      
      // Should navigate to project details page
      await page.waitForURL(`**/public/projects/${testProject.id}`)
    })
    
    // Step 2: View project details and apply
    await test.step('Apply to project', async () => {
      // Verify project details are displayed
      await expect(page.locator('h1:has-text("Open Source AI Chat Bot")')).toBeVisible()
      await expect(page.locator('text=' + projectOwner.name)).toBeVisible()
      await expect(page.locator('text=natural language processing')).toBeVisible()
      
      // Click apply button
      await page.click('button:has-text("Apply to Volunteer")')
      
      // Fill application form
      await page.waitForSelector('textarea[name="message"]')
      await page.fill('textarea[name="message"]', `
        Hi! I'm excited to contribute to this project. I have 3 years of experience with:
        - Python and NLP libraries (NLTK, spaCy, Transformers)
        - Building chatbots with Rasa and Dialogflow
        - Integrating AI models into production systems
        
        I can dedicate 15-20 hours per week to this project.
      `.trim())
      
      await page.fill('input[name="availability"]', '20 hours per week')
      
      // Submit application
      await page.click('button:has-text("Submit Application")')
      
      // Verify success message
      await expect(page.locator('text=Application submitted successfully')).toBeVisible()
      
      // Button should change to "Application Pending"
      await expect(page.locator('button:has-text("Application Pending")')).toBeVisible()
      await expect(page.locator('button:has-text("Application Pending")')).toBeDisabled()
    })
    
    // Step 3: Check application status in volunteer dashboard
    await test.step('Check application status', async () => {
      // Navigate to volunteering dashboard
      await page.goto('/volunteering')
      
      // Should see the pending application
      await expect(page.locator('text=Open Source AI Chat Bot')).toBeVisible()
      await expect(page.locator('text=PENDING').first()).toBeVisible()
      await expect(page.locator('text=20 hours per week')).toBeVisible()
    })
    
    // Step 4: Project owner accepts the application
    await test.step('Owner accepts application', async () => {
      // Sign out current user
      await authHelper.signOut()
      
      // Sign in as project owner
      await authHelper.signIn(projectOwner.email, projectOwner.password)
      
      // Navigate to project volunteers page
      await page.goto(`/projects/${testProject.id}/volunteers`)
      
      // Should see pending application
      await expect(page.locator('text=' + testUser.name)).toBeVisible()
      await expect(page.locator('text=PENDING')).toBeVisible()
      await expect(page.locator('text=Python and NLP libraries')).toBeVisible()
      
      // Accept the application
      await page.click('button:has-text("Accept")')
      
      // Confirm in dialog
      await page.click('button:has-text("Confirm")')
      
      // Status should change to accepted
      await expect(page.locator('text=ACCEPTED')).toBeVisible()
      await expect(page.locator('text=Application accepted')).toBeVisible()
    })
    
    // Step 5: Volunteer sees accepted status
    await test.step('Volunteer sees accepted status', async () => {
      // Sign out owner
      await authHelper.signOut()
      
      // Sign back in as volunteer
      await authHelper.signIn(testUser.email, testUser.password)
      
      // Navigate to volunteering dashboard
      await page.goto('/volunteering')
      
      // Should see accepted status
      await expect(page.locator('text=Open Source AI Chat Bot')).toBeVisible()
      await expect(page.locator('text=ACCEPTED').first()).toBeVisible()
      
      // Should have access to project resources
      await page.click('text=Open Source AI Chat Bot')
      
      // Should navigate to project page (not public page)
      await expect(page.url()).toContain(`/projects/${testProject.id}`)
      await expect(page.url()).not.toContain('/public/')
      
      // Should see volunteer-specific actions
      await expect(page.locator('text=Post Update')).toBeVisible()
      await expect(page.locator('text=Contact Project Owner')).toBeVisible()
    })
  })
  
  test('volunteer can filter projects by help type and skills', async ({ page, authHelper, testUser }) => {
    // Create multiple projects with different help types
    const owner = await DatabaseHelper.createTestUser({
      email: `owner2-${Date.now()}@test.com`,
      password: 'OwnerPass123!',
      name: 'Another Owner'
    })
    
    await DatabaseHelper.createTestProject(owner.id, {
      name: 'Quick Advice Needed',
      goal: 'Need advice on ML architecture',
      helpType: 'ADVICE',
      visibility: 'PUBLIC'
    })
    
    await DatabaseHelper.createTestProject(owner.id, {
      name: 'Prototype Development',
      goal: 'Build a prototype for image recognition',
      helpType: 'PROTOTYPE',
      visibility: 'PUBLIC'
    })
    
    await DatabaseHelper.createTestProject(owner.id, {
      name: 'Full Product Build',
      goal: 'Complete e-commerce platform',
      helpType: 'FULL_PRODUCT',
      visibility: 'PUBLIC'
    })
    
    // Sign in as volunteer
    await authHelper.signIn(testUser.email, testUser.password)
    
    await test.step('Filter by help type', async () => {
      await page.goto('/public/projects')
      
      // Wait for projects to load
      await page.waitForSelector('[data-testid="project-card"]')
      
      // Filter by ADVICE
      await page.click('button:has-text("Help Type")')
      await page.click('label:has-text("Advice & Consultation")')
      await page.click('button:has-text("Apply Filters")')
      
      // Should only see advice project
      await expect(page.locator('text=Quick Advice Needed')).toBeVisible()
      await expect(page.locator('text=Prototype Development')).not.toBeVisible()
      await expect(page.locator('text=Full Product Build')).not.toBeVisible()
      
      // Clear filter
      await page.click('button:has-text("Clear Filters")')
      
      // Filter by PROTOTYPE
      await page.click('button:has-text("Help Type")')
      await page.click('label:has-text("Prototype Development")')
      await page.click('button:has-text("Apply Filters")')
      
      // Should only see prototype project
      await expect(page.locator('text=Prototype Development')).toBeVisible()
      await expect(page.locator('text=Quick Advice Needed')).not.toBeVisible()
    })
  })
})