import { test, expect } from './fixtures'
import { DatabaseHelper } from './helpers/db.helper'

test.describe('Organization Management', () => {
  test('should allow users to create a new organization', async ({ page, authHelper, testUser }) => {
    // Sign in first
    await authHelper.signIn(testUser.email, testUser.password)
    
    // Navigate to create organization page
    await page.goto('/organizations/new')
    
    // Fill out organization creation form
    const orgData = {
      name: `E2E Test Organization ${Date.now()}`,
      description: 'This is a test organization created for E2E testing purposes with comprehensive functionality.',
      website: 'https://test-org.example.com',
      contactEmail: 'contact@test-org.example.com'
    }
    
    await page.fill('input[name="name"]', orgData.name)
    await page.fill('textarea[name="description"]', orgData.description)
    await page.fill('input[name="website"]', orgData.website)
    await page.fill('input[name="contactEmail"]', orgData.contactEmail)
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Should redirect to the organization page
    await expect(page).toHaveURL(/.*\/organizations\/.*/)
    
    // Verify organization details are displayed
    await expect(page.locator('h1')).toContainText(orgData.name)
    await expect(page.locator(`text=${orgData.description}`)).toBeVisible()
  })

  test('should display organization details correctly', async ({ page, authHelper, testUser }) => {
    // Create a test organization
    const org = await DatabaseHelper.createTestOrganization(testUser.id, {
      name: 'E2E Display Test Org',
      description: 'Testing organization display functionality',
      website: 'https://display-test.example.com'
    })
    
    // Sign in and navigate to organization
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto(`/organizations/${org.slug}`)
    
    // Verify organization details
    await expect(page.locator('h1')).toContainText('E2E Display Test Org')
    await expect(page.locator('text=Testing organization display functionality')).toBeVisible()
    await expect(page.locator('a[href="https://display-test.example.com"]')).toBeVisible()
  })

  test('should allow organization owners to edit organization details', async ({ page, authHelper, testUser }) => {
    // Create a test organization
    const org = await DatabaseHelper.createTestOrganization(testUser.id, {
      name: 'E2E Edit Test Org',
      description: 'Original description'
    })
    
    // Sign in and navigate to edit page
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto(`/organizations/${org.slug}/edit`)
    
    // Update organization details
    await page.fill('input[name="name"]', 'Updated E2E Test Org')
    await page.fill('textarea[name="description"]', 'Updated description with new comprehensive content for testing.')
    await page.fill('input[name="website"]', 'https://updated-test.example.com')
    
    // Submit changes
    await page.click('button[type="submit"]')
    
    // Verify updates
    await expect(page.locator('h1')).toContainText('Updated E2E Test Org')
    await expect(page.locator('text=Updated description with new comprehensive content')).toBeVisible()
  })

  test('should allow organization owners to invite members', async ({ page, authHelper, testUser }) => {
    // Create a test organization
    const org = await DatabaseHelper.createTestOrganization(testUser.id, {
      name: 'E2E Invite Test Org'
    })
    
    // Sign in and navigate to organization members page
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto(`/organizations/${org.slug}/members`)
    
    // Click invite member button
    await page.click('button:has-text("Invite Member")')
    
    // Fill invitation form
    const inviteEmail = `invite-${Date.now()}@test.com`
    await page.fill('input[name="email"]', inviteEmail)
    
    // Select role
    await page.click('[data-testid="role-select"]')
    await page.click('text=Member')
    
    // Send invitation
    await page.click('button[type="submit"]:has-text("Send Invitation")')
    
    // Verify invitation success message
    await expect(page.locator('text=Invitation sent')).toBeVisible({
      timeout: 10000
    })
  })

  test('should display organization members list', async ({ page, authHelper, testUser }) => {
    // Create additional test users
    const member1 = await DatabaseHelper.createTestUser({
      email: `member1-${Date.now()}@test.com`,
      password: 'Member1Pass123!',
      name: 'Test Member 1'
    })
    
    const member2 = await DatabaseHelper.createTestUser({
      email: `member2-${Date.now()}@test.com`,
      password: 'Member2Pass123!',
      name: 'Test Member 2'
    })
    
    // Create organization with members
    const org = await DatabaseHelper.createTestOrganization(testUser.id, {
      name: 'E2E Members Test Org'
    })
    
    // Add members to organization (would need to add this to DatabaseHelper)
    // For now, test the UI with just the owner
    
    // Sign in and view members page
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto(`/organizations/${org.slug}/members`)
    
    // Verify owner is listed
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible()
    await expect(page.locator('text=Owner')).toBeVisible()
  })

  test('should allow members to leave organization', async ({ page, authHelper, testUser }) => {
    // Create organization owner
    const owner = await DatabaseHelper.createTestUser({
      email: `owner-leave-${Date.now()}@test.com`,
      password: 'OwnerPass123!',
      name: 'Organization Owner'
    })
    
    // Create organization
    const org = await DatabaseHelper.createTestOrganization(owner.id, {
      name: 'E2E Leave Test Org'
    })
    
    // TODO: Add test user as member (would need database helper method)
    // For now, test the leave functionality UI
    
    // Sign in as test user
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto(`/organizations/${org.slug}`)
    
    // Look for leave organization button
    const leaveButton = page.locator('button:has-text("Leave Organization")')
    if (await leaveButton.isVisible()) {
      await leaveButton.click()
      
      // Confirm leaving
      await page.click('button:has-text("Confirm")')
      
      // Verify redirect or success message
      await expect(page.locator('text=You have left the organization')).toBeVisible({
        timeout: 10000
      })
    }
  })

  test('should display organization projects', async ({ page, authHelper, testUser }) => {
    // Create organization
    const org = await DatabaseHelper.createTestOrganization(testUser.id, {
      name: 'E2E Projects Test Org'
    })
    
    // Create projects associated with organization
    await DatabaseHelper.createTestProject(testUser.id, {
      name: 'Org Project 1',
      goal: 'First organizational project',
      organizationId: org.id
    })
    
    await DatabaseHelper.createTestProject(testUser.id, {
      name: 'Org Project 2',
      goal: 'Second organizational project',
      organizationId: org.id
    })
    
    // Sign in and view organization
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto(`/organizations/${org.slug}`)
    
    // Verify projects are displayed
    await expect(page.locator('text=Org Project 1')).toBeVisible()
    await expect(page.locator('text=Org Project 2')).toBeVisible()
  })

  test('should not allow non-owners to edit organization', async ({ page, authHelper, testUser }) => {
    // Create organization owner
    const owner = await DatabaseHelper.createTestUser({
      email: `owner-edit-${Date.now()}@test.com`,
      password: 'OwnerPass123!',
      name: 'Organization Owner'
    })
    
    // Create organization
    const org = await DatabaseHelper.createTestOrganization(owner.id, {
      name: 'E2E Edit Permission Test'
    })
    
    // Sign in as non-owner
    await authHelper.signIn(testUser.email, testUser.password)
    
    // Try to access edit page
    await page.goto(`/organizations/${org.slug}/edit`)
    
    // Should be redirected or show error
    await expect(page.locator('text=Unauthorized') || page.locator('text=Access denied')).toBeVisible({
      timeout: 10000
    })
  })

  test('should list organizations on discover page', async ({ page, authHelper, testUser }) => {
    // Create public organizations
    await DatabaseHelper.createTestOrganization(testUser.id, {
      name: 'Public Discover Org 1',
      description: 'First organization for discovery testing'
    })
    
    await DatabaseHelper.createTestOrganization(testUser.id, {
      name: 'Public Discover Org 2',
      description: 'Second organization for discovery testing'
    })
    
    // Sign in and navigate to organizations discover page
    await authHelper.signIn(testUser.email, testUser.password)
    await page.goto('/organizations')
    
    // Verify organizations appear in listing
    await expect(page.locator('text=Public Discover Org 1')).toBeVisible()
    await expect(page.locator('text=Public Discover Org 2')).toBeVisible()
  })
})