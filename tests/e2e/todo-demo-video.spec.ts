import { test, expect } from '@playwright/test';

// Configure the test specifically for video recording
test.use({
  // Force video recording even if global config is different
  video: {
    mode: 'on',
    size: { width: 1280, height: 720 }
  },
  // Run in headed mode for better demo
  headless: false,
  // Slow down actions for visibility
  launchOptions: {
    slowMo: 1000,
  },
  viewport: { width: 1280, height: 720 },
});

test.describe('Todo System Video Demo', () => {
  test('Record video of todo system features', async ({ page }, testInfo) => {
    console.log('🎬 Recording video demo of todo system...\n');
    
    // Add annotations to the test
    test.info().annotations.push({ type: 'demo', description: 'Todo system features' });
    
    try {
      // Navigate to home
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // Try to navigate to projects
      await page.goto('/projects');
      await page.waitForTimeout(3000);
      
      // Try to find and click a project
      const projectCards = page.locator('article, [data-testid="project-card"]');
      const projectCount = await projectCards.count();
      
      if (projectCount > 0) {
        await projectCards.first().click();
        await page.waitForTimeout(3000);
        
        // Look for todo section
        const todoSection = page.locator('h2:text("Todos"), h3:text("Todos")');
        if (await todoSection.isVisible({ timeout: 5000 }).catch(() => false)) {
          await todoSection.scrollIntoViewIfNeeded();
          await page.waitForTimeout(3000);
        }
      }
      
    } catch (error) {
      console.log('Demo encountered an error:', error.message);
    }
    
    // Get video path
    const videoPath = await testInfo.attachments.find(a => a.name === 'video')?.path;
    console.log('\n📹 Video will be saved to:', videoPath || 'test-results/');
    console.log('   Look for the video in the test-results folder after the test completes.\n');
    
    // Keep browser open a bit longer
    await page.waitForTimeout(5000);
  });
  
  test.afterEach(async ({}, testInfo) => {
    // Log video location after test
    console.log('\n✅ Test completed!');
    console.log('📁 Video location: test-results/' + testInfo.project.name + '-' + testInfo.title.replace(/\s+/g, '-') + '/');
    console.log('   The video file will be named: video.webm\n');
  });
});