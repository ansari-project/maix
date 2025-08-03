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
    
    // Verify we're logged in by checking for Sign Out button
    await expect(this.page.locator('button:has-text("Sign Out")')).toBeVisible()
  }

  async signUp(user: TestUser) {
    await this.page.goto('/auth/signup')
    
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
    
    // Wait for redirect to signin page with success message
    await this.page.waitForURL('**/auth/signin?message=Account%20created%20successfully', { 
      timeout: 10000 
    })
    
    // Now sign in with the newly created account
    await this.signIn(user.email, user.password)
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