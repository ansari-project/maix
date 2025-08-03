import { Page, expect } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  name: string
}

export class AuthHelper {
  constructor(private page: Page) {}

  async signIn(email: string, password: string) {
    await this.page.goto('/auth/signin')
    
    // Wait for page to be fully loaded
    await this.page.waitForLoadState('networkidle')
    
    // Wait for form elements to be visible
    await this.page.waitForSelector('input#email', { state: 'visible' })
    await this.page.waitForSelector('input#password', { state: 'visible' })
    
    // Fill in the sign-in form using id selectors
    await this.page.fill('input#email', email)
    await this.page.fill('input#password', password)
    
    // Submit the form
    await this.page.click('button[type="submit"]')
    
    // Wait for navigation to dashboard
    await this.page.waitForURL('**/dashboard/**')
    
    // Verify we're logged in by checking for Dashboard link or Sign Out button
    await expect(this.page.locator('text=Dashboard').or(this.page.locator('text=Sign Out'))).toBeVisible()
  }

  async signUp(user: TestUser) {
    await this.page.goto('/auth/signup')
    
    // Wait for page to load and check for errors
    await this.page.waitForLoadState('networkidle')
    
    // Check if there's a runtime error dialog
    const errorDialog = this.page.locator('dialog:has-text("Runtime Error")')
    if (await errorDialog.isVisible()) {
      throw new Error('Application has runtime error - check dev server logs')
    }
    
    // Wait for the signup form to be present
    await this.page.waitForSelector('form', { timeout: 10000 })
    
    // Fill form fields
    await this.page.fill('input#name', user.name)
    await this.page.fill('input#username', user.email.split('@')[0])
    await this.page.fill('input#email', user.email)
    await this.page.fill('input#password', user.password)
    await this.page.fill('input#confirmPassword', user.password)
    
    // Submit the form
    await this.page.click('button[type="submit"]')
    
    // Wait for either redirect to signin or error messages
    try {
      // Wait for redirect to sign in page (since signup redirects there)
      await this.page.waitForURL('**/auth/signin**', { timeout: 10000 })
      
      // Now sign in with the newly created account
      await this.signIn(user.email, user.password)
    } catch (error) {
      // Take a screenshot for debugging
      await this.page.screenshot({ path: 'signup-debug.png' })
      
      // Check current URL
      const currentUrl = this.page.url()
      
      // Check for validation errors on the signup page
      const errorElements = await this.page.locator('.text-red-600').count()
      if (errorElements > 0) {
        const errorText = await this.page.locator('.text-red-600').first().textContent()
        throw new Error(`Signup failed with error: ${errorText}`)
      }
      
      throw new Error(`Signup form submitted but didn't redirect. Current URL: ${currentUrl}`)
    }
  }

  async signOut() {
    // Click the Sign Out button
    await this.page.click('button:has-text("Sign Out")')
    
    // Wait for redirect to home page
    await this.page.waitForURL('/')
  }

  async isSignedIn(): Promise<boolean> {
    try {
      await this.page.locator('text=Dashboard').or(this.page.locator('text=Sign Out')).waitFor({ 
        state: 'visible', 
        timeout: 5000 
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Sets up authentication state using cookies/session storage
   * This is faster than going through the sign-in flow every time
   */
  async setupAuthState(sessionData: any) {
    // Set NextAuth session cookie
    await this.page.context().addCookies([{
      name: 'next-auth.session-token',
      value: sessionData.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 86400 // 24 hours
    }])
    
    // Reload to apply auth state
    await this.page.reload()
  }
}