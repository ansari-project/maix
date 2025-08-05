import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

// Test account credentials
const TEST_ACCOUNT = {
  email: 'waleedk+ptest@gmail.com',
  password: 'playwright-test-123',
};

// Configure the test to run in headed mode with slow motion
test.use({
  // Show the browser window
  headless: false,
  // Slow down actions by 1 second for visibility
  launchOptions: {
    slowMo: 1000,
  },
  // Set viewport
  viewport: { width: 1280, height: 720 },
});

test.describe('Todo System Interactive Demo', () => {
  test.beforeAll(async () => {
    // Ensure test account exists
    console.log('🔧 Setting up test account...');
    try {
      execSync('npx tsx scripts/setup-test-account.ts', { 
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    } catch (error) {
      console.error('Failed to setup test account:', error);
    }
  });

  test('Demo: Navigate to todo section', async ({ page }) => {
    console.log('🚀 Starting Todo System Demo...\n');
    
    // Step 1: Go to sign in page
    console.log('Step 1: Navigating to sign in page...');
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Sign in with test account
    console.log('Step 2: Signing in with test account...');
    console.log(`   Email: ${TEST_ACCOUNT.email}\n`);
    
    // Look for email input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]');
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      // Fill in credentials
      await emailInput.fill(TEST_ACCOUNT.email);
      await passwordInput.fill(TEST_ACCOUNT.password);
      
      // Find and click sign in button
      const signInButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")');
      await signInButton.click();
      
      // Wait for redirect after sign in
      try {
        await page.waitForURL('**/dashboard/**', { timeout: 30000 });
        console.log('✅ Successfully signed in!\n');
      } catch {
        console.log('⚠️  Sign in may have failed or redirected elsewhere');
        // Continue anyway to see what happens
      }
    } else {
      console.log('⚠️  Could not find sign in form fields');
      console.log('   The UI may have changed or we may already be signed in\n');
    }
    
    // Step 3: Navigate to projects
    console.log('Step 3: Navigating to projects page...');
    await page.goto('/projects');
    await expect(page.locator('h1')).toContainText('Projects');
    
    // Wait a moment to show the projects page
    await page.waitForTimeout(2000);
    
    // Step 4: Click on a project
    console.log('Step 4: Opening a project...');
    const projectCards = page.locator('article, [data-testid="project-card"]');
    const projectCount = await projectCards.count();
    
    if (projectCount > 0) {
      // Click the first project
      await projectCards.first().click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Opened project successfully\n');
    } else {
      console.log('❌ No projects found');
      return;
    }
    
    // Step 5: Find the Todo section
    console.log('Step 5: Looking for Todo section...');
    
    // Try different selectors for the todo section
    const todoSelectors = [
      'h2:has-text("Todos")',
      'h3:has-text("Todos")',
      'text=Todos',
      '[data-testid="todo-section"]'
    ];
    
    let todoSection = null;
    for (const selector of todoSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        todoSection = element;
        break;
      }
    }
    
    if (todoSection) {
      await todoSection.scrollIntoViewIfNeeded();
      console.log('✅ Found Todo section!\n');
      
      // Wait to show the todo section
      await page.waitForTimeout(2000);
      
      // Step 6: Check permissions
      console.log('Step 6: Checking user permissions...');
      const addTodoButton = page.locator('button:has-text("Add Todo")');
      
      if (await addTodoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ You have permission to create todos!');
        console.log('   - You are either the project owner or an accepted volunteer\n');
        
        // Demo: Click Add Todo to show the form
        console.log('Demo: Opening todo creation form...');
        await addTodoButton.click();
        await page.waitForTimeout(2000);
        
        // Close the form
        const closeButton = page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      } else {
        console.log('ℹ️  You cannot create todos in this project');
        console.log('   - Only project owners and accepted volunteers can manage todos\n');
      }
      
      // Step 7: Show existing todos
      console.log('Step 7: Checking for existing todos...');
      const todoCards = page.locator('.todo-card, [data-testid="todo-item"], div:has-text("OPEN"), div:has-text("IN_PROGRESS"), div:has-text("COMPLETED")');
      const todoCount = await todoCards.count();
      
      console.log(`📊 Found ${todoCount} todos in this project`);
      
      if (todoCount > 0) {
        console.log('\nTodo statuses:');
        // Try to find status badges
        const statusBadges = page.locator('[class*="status"], [data-testid*="status"]');
        const statuses = await statusBadges.allTextContents();
        statuses.forEach((status, index) => {
          if (status.trim()) {
            console.log(`   - Todo ${index + 1}: ${status}`);
          }
        });
      }
      
    } else {
      console.log('❌ Todo section not found');
      console.log('   Possible reasons:');
      console.log('   - You may not have permission to view todos');
      console.log('   - The project may not have todos enabled');
      console.log('   - You need to be signed in as a project participant');
    }
    
    // Take a screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ 
      path: 'todo-demo-result.png',
      fullPage: true 
    });
    console.log('✅ Screenshot saved as todo-demo-result.png');
    
    // Keep browser open for manual exploration
    console.log('\n✨ Demo complete!');
    console.log('The browser will stay open for 30 seconds for you to explore...');
    await page.waitForTimeout(30000);
  });
});