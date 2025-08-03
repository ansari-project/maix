import { test, expect } from './fixtures'
import { DatabaseHelper } from './helpers/db.helper'

test.describe('Project Management', () => {
  test('should allow authenticated user to create a new project', async ({ page, authHelper, testUser }) => {
    // Sign in first
    await authHelper.signIn(testUser.email, testUser.password)
    
    // Navigate to create project page
    await page.goto('/projects/new')
    
    // Fill out the project creation form
    const projectData = {
      name: `E2E Test Project ${Date.now()}`,
      goal: 'Test project goal for E2E testing',
      description: 'This is a comprehensive description for our E2E test project that should meet all validation requirements and provide enough detail.',
      contactEmail: 'project-contact@test.com'
    }
    
    await page.fill('input[name="name"]', projectData.name)
    await page.fill('input[name="goal"]', projectData.goal)
    await page.fill('textarea[name="description"]', projectData.description)
    await page.fill('input[name="contactEmail"]', projectData.contactEmail)
    
    // Select help type
    await page.click('[data-testid="help-type-select"]')
    await page.click('text=MVP Development')
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Should redirect to the new project page
    await expect(page).toHaveURL(/.*\/projects\/.*/)
    
    // Verify project details are displayed
    await expect(page.locator('h1')).toContainText(projectData.name)
    await expect(page.locator('text=' + projectData.goal)).toBeVisible()
  })

  test('should display project details correctly', async ({ page, authHelper, testUser }) => {
    // Create a test project
    const project = await DatabaseHelper.createTestProject(testUser.id, {
      name: 'E2E Test Display Project',
      goal: 'Testing project display functionality',
      description: 'This project is created specifically for testing the project details display.'
    })
    
    // Sign in and navigate to project
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto(`/projects/${project.id}`)
    
    // Verify project details
    await expect(page.locator('h1')).toContainText('E2E Test Display Project')
    await expect(page.locator('text=Testing project display functionality')).toBeVisible()
    await expect(page.locator('text=This project is created specifically for testing')).toBeVisible()
  })

  test('should allow project owner to edit project details', async ({ page, authHelper, testUser }) => {
    // Create a test project
    const project = await DatabaseHelper.createTestProject(testUser.id, {
      name: 'E2E Edit Test Project',
      goal: 'Original goal',
      description: 'Original description for editing test.'
    })
    
    // Sign in and navigate to project
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto(`/projects/${project.id}/edit`)
    
    // Update project details
    await page.fill('input[name="name"]', 'Updated E2E Test Project')
    await page.fill('input[name="goal"]', 'Updated goal for testing')
    await page.fill('textarea[name="description"]', 'Updated description with new content for comprehensive testing.')
    
    // Submit changes
    await page.click('button[type="submit"]')
    
    // Verify updates
    await expect(page.locator('h1')).toContainText('Updated E2E Test Project')
    await expect(page.locator('text=Updated goal for testing')).toBeVisible()
  })

  test('should display projects list on dashboard', async ({ page, authHelper, testUser }) => {
    // Create multiple test projects
    await DatabaseHelper.createTestProject(testUser.id, {
      name: 'Dashboard Test Project 1',
      goal: 'First project for dashboard testing'
    })
    
    await DatabaseHelper.createTestProject(testUser.id, {
      name: 'Dashboard Test Project 2', 
      goal: 'Second project for dashboard testing'
    })
    
    // Sign in and go to dashboard
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto('/dashboard')
    
    // Verify projects appear in the list
    await expect(page.locator('text=Dashboard Test Project 1')).toBeVisible()
    await expect(page.locator('text=Dashboard Test Project 2')).toBeVisible()
  })

  test('should allow users to apply to projects', async ({ page, authHelper, testUser }) => {
    // Create another user who owns the project
    const projectOwner = await DatabaseHelper.createTestUser({
      email: `owner-${Date.now()}@test.com`,
      password: 'OwnerPass123!',
      name: 'Project Owner'
    })
    
    // Create a project owned by the other user
    const project = await DatabaseHelper.createTestProject(projectOwner.id, {
      name: 'Apply Test Project',
      goal: 'Testing application functionality',
      description: 'This project is for testing the application process.'
    })
    
    // Sign in as the test user (applicant)
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto(`/projects/${project.id}`)
    
    // Click apply button
    await page.click('button:has-text("Apply")')
    
    // Fill application form
    await page.fill('textarea[name="message"]', 'I would like to contribute to this project because I have relevant experience.')
    await page.click('button[type="submit"]')
    
    // Verify application success
    await expect(page.locator('text=Application submitted')).toBeVisible({
      timeout: 10000
    })
    
    // Verify apply button is now disabled/changed
    await expect(page.locator('button:has-text("Applied")')).toBeVisible()
  })

  test('should not allow non-owners to edit projects', async ({ page, authHelper, testUser }) => {
    // Create another user who owns the project
    const projectOwner = await DatabaseHelper.createTestUser({
      email: `owner-non-edit-${Date.now()}@test.com`,
      password: 'OwnerPass123!',
      name: 'Project Owner'
    })
    
    // Create a project owned by the other user
    const project = await DatabaseHelper.createTestProject(projectOwner.id, {
      name: 'Non-Owner Edit Test',
      goal: 'Testing edit permissions'
    })
    
    // Sign in as the test user (not the owner)
    await authHelper.signIn(testUser.email, testUser.password)
    
    // Try to access edit page
    await page.goto(`/projects/${project.id}/edit`)
    
    // Should be redirected or show error
    await expect(page.locator('text=Unauthorized') || page.locator('text=Access denied')).toBeVisible({
      timeout: 10000
    })
  })
})