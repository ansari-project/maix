import { test, expect } from '@playwright/test';

// Test account credentials
const TEST_ACCOUNT = {
  email: 'waleedk+ptest@gmail.com',
  password: 'playwright-test-123',
};

// Configure the test to run in headed mode with slow motion
test.use({
  headless: false,
  launchOptions: {
    slowMo: 1000,
  },
  viewport: { width: 1280, height: 720 },
});

test.describe('Todo System Simple Demo', () => {
  test('Demo: Show todo system features (requires manual sign in)', async ({ page }) => {
    console.log('🚀 Starting Todo System Demo...\n');
    console.log('This demo shows the todo system integrated into project pages.\n');
    
    // Step 1: Go to home page
    console.log('Step 1: Navigate to Maix platform...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if we need to sign in
    const isSignInPage = page.url().includes('/auth/signin');
    
    if (isSignInPage) {
      console.log('\n📝 Sign In Required');
      console.log('=====================================');
      console.log('Please sign in with a test account:');
      console.log(`Email: ${TEST_ACCOUNT.email}`);
      console.log(`Password: ${TEST_ACCOUNT.password}`);
      console.log('=====================================\n');
      
      console.log('Or use your own account that has access to projects.\n');
      
      // Highlight the sign in form
      const signInForm = page.locator('form').first();
      if (await signInForm.isVisible()) {
        await signInForm.scrollIntoViewIfNeeded();
      }
      
      console.log('⏳ Waiting for sign in (timeout: 2 minutes)...');
      
      try {
        // Wait for navigation away from sign in page
        await page.waitForFunction(
          () => !window.location.href.includes('/auth/signin'),
          { timeout: 120000 }
        );
        console.log('✅ Successfully signed in!\n');
      } catch {
        console.log('⏱️ Timeout waiting for sign in');
        return;
      }
    }
    
    // Step 2: Navigate to projects
    console.log('Step 2: Navigate to Projects page...');
    await page.goto('/projects');
    await expect(page.locator('h1')).toContainText('Projects');
    console.log('✅ Projects page loaded\n');
    
    // Wait to show the projects
    await page.waitForTimeout(2000);
    
    // Step 3: Open a project
    console.log('Step 3: Select a project to view...');
    const projectCards = page.locator('article').or(page.locator('[data-testid="project-card"]'));
    const projectCount = await projectCards.count();
    
    if (projectCount === 0) {
      console.log('❌ No projects found.');
      console.log('   Create a project first or ensure you have access to projects.\n');
      return;
    }
    
    console.log(`📦 Found ${projectCount} project(s). Opening the first one...`);
    await projectCards.first().click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Project page loaded\n');
    
    // Step 4: Locate Todo Section
    console.log('Step 4: Locate the Todo Section...');
    console.log('   (Todo section is only visible to project owners and accepted volunteers)\n');
    
    // Try to find the todo section
    const todoHeading = page.locator('h2:text-is("Todos")').or(
      page.locator('h3:text-is("Todos")')
    );
    
    const todoSectionFound = await todoHeading.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (todoSectionFound) {
      await todoHeading.scrollIntoViewIfNeeded();
      console.log('✅ Todo Section Found!\n');
      
      // Take a screenshot of the todo section
      await page.screenshot({ 
        path: 'todo-section-demo.png',
        fullPage: false 
      });
      
      // Check for Add Todo button
      console.log('Step 5: Check user permissions...');
      const addTodoButton = page.locator('button:has-text("Add Todo")');
      const canCreateTodos = await addTodoButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (canCreateTodos) {
        console.log('✅ You have permission to manage todos!');
        console.log('   - You are either the project owner or an accepted volunteer\n');
        
        // Demo the Add Todo dialog
        console.log('Step 6: Demo todo creation...');
        await addTodoButton.click();
        console.log('   - Opened todo creation dialog');
        await page.waitForTimeout(3000);
        
        // Close the dialog
        const closeButton = page.locator('button[aria-label="Close"]').or(
          page.locator('button:has-text("Cancel")')
        );
        if (await closeButton.isVisible()) {
          await closeButton.click();
          console.log('   - Closed dialog\n');
        }
      } else {
        console.log('ℹ️  You can view todos but cannot create them');
        console.log('   - Only project owners and accepted volunteers can manage todos\n');
      }
      
      // Count existing todos
      console.log('Step 7: Analyze existing todos...');
      const todoItems = page.locator('[data-testid="todo-item"]').or(
        page.locator('.todo-card')
      ).or(
        page.locator('div:has-text("OPEN")').or(
          page.locator('div:has-text("IN_PROGRESS")')
        ).or(
          page.locator('div:has-text("COMPLETED")')
        )
      );
      
      const todoCount = await todoItems.count();
      console.log(`📊 Found ${todoCount} todo(s) in this project\n`);
      
      if (todoCount > 0) {
        console.log('Todo Status Legend:');
        console.log('   🔵 OPEN - New tasks ready to be worked on');
        console.log('   🟡 IN_PROGRESS - Tasks currently being worked on');
        console.log('   🟢 COMPLETED - Finished tasks\n');
      }
      
    } else {
      console.log('❌ Todo Section Not Found\n');
      console.log('Possible reasons:');
      console.log('   1. You are not signed in as a project participant');
      console.log('   2. The project owner has not enabled todos');
      console.log('   3. You need to be an accepted volunteer or project owner\n');
    }
    
    // Final summary
    console.log('\n✨ Demo Complete!');
    console.log('=====================================');
    console.log('Key Features Demonstrated:');
    console.log('- Todo section integrated into project pages');
    console.log('- Permission-based access (owners & volunteers only)');
    console.log('- Todo creation interface');
    console.log('- Status tracking (OPEN, IN_PROGRESS, COMPLETED)');
    console.log('=====================================\n');
    
    // Keep browser open
    console.log('Browser will remain open for 30 seconds for exploration...');
    await page.waitForTimeout(30000);
  });
});