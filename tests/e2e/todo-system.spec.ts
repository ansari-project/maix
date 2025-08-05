import { test, expect } from '@playwright/test';

test.describe('Todo System Demo', () => {
  test('View todo section on project page', async ({ page }) => {
    // Navigate to the projects page
    await page.goto('/projects');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Projects');
    
    // Click on the first project
    const firstProject = page.locator('article').first();
    await firstProject.click();
    
    // Wait for project page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we need to sign in
    if (page.url().includes('/auth/signin')) {
      console.log('Sign in required - skipping test');
      test.skip();
      return;
    }
    
    // Look for the Todos section
    const todoSection = page.locator('text=Todos').first();
    
    if (await todoSection.isVisible()) {
      // Scroll to the todo section
      await todoSection.scrollIntoViewIfNeeded();
      
      // Take a screenshot of the todo section
      await page.screenshot({ 
        path: 'todo-section-screenshot.png',
        fullPage: false 
      });
      
      console.log('✅ Todo section found and screenshot taken');
      
      // Check for Add Todo button (only visible to authorized users)
      const addTodoButton = page.locator('button:has-text("Add Todo")');
      if (await addTodoButton.isVisible()) {
        console.log('✅ User has permission to create todos');
      } else {
        console.log('ℹ️  User does not have permission to create todos');
      }
      
      // Count existing todos
      const todoCards = page.locator('[class*="todo"]');
      const todoCount = await todoCards.count();
      console.log(`📊 Found ${todoCount} todos in this project`);
      
    } else {
      console.log('❌ Todo section not found - user may not have access');
    }
  });
});