import { test, expect } from './fixtures'

test.describe('Authentication Flow', () => {
  test('should allow user to sign up with new account', async ({ page, authHelper }) => {
    const userData = {
      email: `signup-test-${Date.now()}@test.com`,
      password: 'SignUpTest123!',
      name: 'Sign Up Test User'
    }

    await authHelper.signUp(userData)
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*\/dashboard.*/)
    
    // Verify we're logged in by checking for Sign Out button
    await expect(page.locator('button:has-text("Sign Out")')).toBeVisible()
  })

  test('should allow existing user to sign in', async ({ page, authHelper, testUser }) => {
    await authHelper.signIn(testUser.email, testUser.password)
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*\/dashboard.*/)
    
    // Verify we're logged in
    await expect(page.locator('button:has-text("Sign Out")')).toBeVisible()
  })

  test('should allow user to sign out', async ({ page, authHelper, testUser }) => {
    // First sign in
    await authHelper.signIn(testUser.email, testUser.password)
    await expect(page.locator('button:has-text("Sign Out")')).toBeVisible()
    
    // Then sign out
    await authHelper.signOut()
    
    // Verify we're back on home page
    await expect(page).toHaveURL('/')
    
    // Verify user menu is no longer visible
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible()
  })

  test('should persist authentication across page reloads', async ({ page, authHelper, testUser }) => {
    // Sign in
    await authHelper.signIn(testUser.email, testUser.password)
    await expect(page.locator('button:has-text("Sign Out")')).toBeVisible()
    
    // Reload the page
    await page.reload()
    
    // Verify we're still authenticated
    await expect(page.locator('button:has-text("Sign Out")')).toBeVisible()
  })

  test('should redirect to sign in page when accessing protected route while unauthenticated', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/dashboard')
    
    // Should be redirected to sign in
    await expect(page).toHaveURL(/.*\/auth\/signin.*/)
  })

  test('should handle invalid login credentials', async ({ page, authHelper }) => {
    await page.goto('/auth/signin')
    
    // Try to sign in with invalid credentials
    await page.fill('input#email', 'nonexistent@test.com')
    await page.fill('input#password', 'WrongPassword123!')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible({
      timeout: 10000
    })
    
    // Should still be on signin page
    await expect(page).toHaveURL(/.*\/auth\/signin.*/)
  })
})