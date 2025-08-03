import { test, expect } from './fixtures'
import { DatabaseHelper } from './helpers/db.helper'

test.describe('User Journey: Organization Management', () => {
  test('user can create organization and manage members', async ({ page, authHelper, testUser }) => {
    // Create additional users for member management
    const member1 = await DatabaseHelper.createTestUser({
      email: `member1-${Date.now()}@test.com`,
      password: 'Member1Pass123!',
      name: 'Team Member One'
    })
    
    const member2 = await DatabaseHelper.createTestUser({
      email: `member2-${Date.now()}@test.com`,
      password: 'Member2Pass123!',
      name: 'Team Member Two'
    })
    
    // Sign in as organization creator
    await authHelper.signIn(testUser.email, testUser.password)
    
    // Step 1: Create an organization
    const orgSlug = `tech-innovators-${Date.now()}`
    await test.step('Create organization', async () => {
      // Navigate to organizations page
      await page.goto('/organizations')
      
      // Click create organization button
      await page.click('a:has-text("Create Organization")')
      
      // Fill organization form
      await page.fill('input[name="name"]', 'Tech Innovators Foundation')
      await page.fill('input[name="slug"]', orgSlug)
      await page.fill('textarea[name="description"]', `
        Tech Innovators Foundation is dedicated to building open-source AI tools
        that benefit the community. We focus on education, healthcare, and
        environmental projects that leverage AI for social good.
      `.trim())
      
      // Submit form
      await page.click('button:has-text("Create Organization")')
      
      // Should redirect to organization page
      await page.waitForURL(`**/organizations/${orgSlug}`)
      
      // Verify organization details
      await expect(page.locator('h1:has-text("Tech Innovators Foundation")')).toBeVisible()
      await expect(page.locator('text=building open-source AI tools')).toBeVisible()
      await expect(page.locator('text=Owner')).toBeVisible() // User role
      await expect(page.locator('text=1 member')).toBeVisible()
    })
    
    // Step 2: Invite members
    await test.step('Invite members to organization', async () => {
      // Click manage members button
      await page.click('button:has-text("Manage Members")')
      
      // Should show current members
      await expect(page.locator('text=' + testUser.name)).toBeVisible()
      await expect(page.locator('text=OWNER').first()).toBeVisible()
      
      // Click invite member button
      await page.click('button:has-text("Invite Member")')
      
      // Fill invite form - first member
      await page.fill('input[name="email"]', member1.email)
      await page.click('button:has-text("Send Invitation")')
      
      // Success message
      await expect(page.locator('text=Invitation sent to ' + member1.email)).toBeVisible()
      
      // Invite second member
      await page.click('button:has-text("Invite Member")')
      await page.fill('input[name="email"]', member2.email)
      await page.click('button:has-text("Send Invitation")')
      
      await expect(page.locator('text=Invitation sent to ' + member2.email)).toBeVisible()
    })
    
    // Step 3: Members accept invitations
    await test.step('Members join organization', async () => {
      // Sign out current user
      await authHelper.signOut()
      
      // Sign in as first member
      await authHelper.signIn(member1.email, member1.password)
      
      // Navigate to invitations/notifications
      await page.goto('/dashboard')
      
      // Should see invitation notification
      await expect(page.locator('text=You have been invited to join Tech Innovators Foundation')).toBeVisible()
      
      // Click on invitation
      await page.click('text=You have been invited to join Tech Innovators Foundation')
      
      // Accept invitation
      await page.click('button:has-text("Accept Invitation")')
      
      // Should redirect to organization page
      await page.waitForURL(`**/organizations/${orgSlug}`)
      
      // Verify membership
      await expect(page.locator('text=Member')).toBeVisible() // User role
      
      // Sign out and repeat for second member
      await authHelper.signOut()
      await authHelper.signIn(member2.email, member2.password)
      
      await page.goto('/dashboard')
      await page.click('text=You have been invited to join Tech Innovators Foundation')
      await page.click('button:has-text("Accept Invitation")')
      
      await page.waitForURL(`**/organizations/${orgSlug}`)
      await expect(page.locator('text=Member')).toBeVisible()
    })
    
    // Step 4: Create project under organization
    await test.step('Create organization project', async () => {
      // Member should be able to create project
      await page.click('a:has-text("Create Project")')
      
      // Organization should be pre-selected
      await expect(page.locator('[data-testid="organization-selector"]')).toContainText('Tech Innovators Foundation')
      
      // Fill project details
      await page.fill('input[name="name"]', 'AI Healthcare Assistant')
      await page.fill('textarea[name="goal"]', 'Build an AI assistant to help patients manage chronic conditions')
      await page.fill('textarea[name="description"]', 'A'.repeat(60))
      
      await page.click('button[role="combobox"]:has-text("Select help type")')
      await page.click('text=MVP Development')
      
      await page.fill('input[name="contactEmail"]', 'health@techinnovators.org')
      
      // Submit
      await page.click('button:has-text("Post Project")')
      
      // Verify project is under organization
      await page.waitForURL('**/projects/**')
      await expect(page.locator('text=Tech Innovators Foundation')).toBeVisible()
      await expect(page.locator('h1:has-text("AI Healthcare Assistant")')).toBeVisible()
    })
    
    // Step 5: Owner manages members
    await test.step('Owner removes a member', async () => {
      // Sign out current member
      await authHelper.signOut()
      
      // Sign back in as owner
      await authHelper.signIn(testUser.email, testUser.password)
      
      // Navigate to organization
      await page.goto(`/organizations/${orgSlug}`)
      
      // Open member management
      await page.click('button:has-text("Manage Members")')
      
      // Should see all members
      await expect(page.locator('text=' + member1.name)).toBeVisible()
      await expect(page.locator('text=' + member2.name)).toBeVisible()
      await expect(page.locator('text=3 members')).toBeVisible()
      
      // Remove first member
      await page.locator(`[data-testid="member-row"]:has-text("${member1.name}")`).locator('button:has-text("Remove")').click()
      
      // Confirm removal
      await page.click('button:has-text("Confirm Removal")')
      
      // Member should be removed
      await expect(page.locator('text=' + member1.name)).not.toBeVisible()
      await expect(page.locator('text=2 members')).toBeVisible()
      await expect(page.locator('text=Member removed successfully')).toBeVisible()
    })
    
    // Step 6: Member can leave organization
    await test.step('Member leaves organization', async () => {
      // Sign out owner
      await authHelper.signOut()
      
      // Sign in as remaining member
      await authHelper.signIn(member2.email, member2.password)
      
      // Navigate to organization
      await page.goto(`/organizations/${orgSlug}`)
      
      // Click leave organization
      await page.click('button:has-text("Leave Organization")')
      
      // Confirm
      await page.click('button:has-text("Confirm Leave")')
      
      // Should redirect to organizations list
      await page.waitForURL('**/organizations')
      
      // Organization should not appear in member's list
      await expect(page.locator('text=Tech Innovators Foundation')).not.toBeVisible()
      await expect(page.locator('text=You left the organization')).toBeVisible()
    })
  })
  
  test('organization visibility and permissions', async ({ page, authHelper, testUser }) => {
    // Create an organization
    const org = await DatabaseHelper.createTestOrganization(testUser.id, {
      name: 'Private Tech Group',
      slug: `private-tech-${Date.now()}`
    })
    
    // Create a non-member user
    const nonMember = await DatabaseHelper.createTestUser({
      email: `nonmember-${Date.now()}@test.com`,
      password: 'NonMemberPass123!',
      name: 'External User'
    })
    
    await test.step('Non-members cannot access organization details', async () => {
      // Sign in as non-member
      await authHelper.signIn(nonMember.email, nonMember.password)
      
      // Try to access organization directly
      await page.goto(`/organizations/${org.slug}`)
      
      // Should show access denied or redirect
      await expect(page.locator('text=You do not have access to this organization')).toBeVisible()
    })
    
    await test.step('Members can view and contribute', async () => {
      // Sign out non-member
      await authHelper.signOut()
      
      // Sign in as owner
      await authHelper.signIn(testUser.email, testUser.password)
      
      // Navigate to organization
      await page.goto(`/organizations/${org.slug}`)
      
      // Should have full access
      await expect(page.locator('h1:has-text("Private Tech Group")')).toBeVisible()
      await expect(page.locator('text=Owner')).toBeVisible()
      
      // Should see owner actions
      await expect(page.locator('button:has-text("Manage Members")')).toBeVisible()
      await expect(page.locator('button:has-text("Edit Organization")')).toBeVisible()
      await expect(page.locator('a:has-text("Create Project")')).toBeVisible()
    })
  })
})