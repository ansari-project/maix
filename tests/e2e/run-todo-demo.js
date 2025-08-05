#!/usr/bin/env node

const { chromium } = require('playwright');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Demo steps with descriptions
const steps = [
  {
    name: 'Navigate to Projects',
    description: 'First, we\'ll navigate to the projects page to see available projects',
    action: async (page) => {
      await page.goto(`${BASE_URL}/projects`);
      await page.waitForSelector('h1:has-text("Projects")', { timeout: 5000 });
    }
  },
  {
    name: 'Select a Project',
    description: 'Click on a project that has the todo feature enabled',
    action: async (page) => {
      // Click the first project card
      const projectCard = await page.$('.project-card, article, div[role="article"]');
      if (projectCard) {
        await projectCard.click();
        await page.waitForNavigation();
      } else {
        console.log('No project found, navigating to a sample project...');
        // Navigate to a specific project if no cards found
        await page.goto(`${BASE_URL}/projects/sample-project-id`);
      }
    }
  },
  {
    name: 'View Todo Section',
    description: 'Scroll down to the Todo section on the project page',
    action: async (page) => {
      // Look for the Todos heading
      const todosHeading = await page.$('h2:has-text("Todos"), h3:has-text("Todos")');
      if (todosHeading) {
        await todosHeading.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000); // Pause to show the section
        console.log('✅ Found Todo section!');
      } else {
        console.log('❌ Todo section not found - user may not have permission');
      }
    }
  },
  {
    name: 'Demo Todo Creation',
    description: 'Show how to create a new todo (if Add Todo button is visible)',
    action: async (page) => {
      const addButton = await page.$('button:has-text("Add Todo")');
      if (addButton) {
        await addButton.click();
        console.log('✅ Todo creation dialog opened');
        await page.waitForTimeout(2000); // Show the form
        
        // Close the dialog
        const closeButton = await page.$('button[aria-label="Close"], button:has-text("Cancel")');
        if (closeButton) await closeButton.click();
      } else {
        console.log('ℹ️  Add Todo button not visible - user may not have permission');
      }
    }
  },
  {
    name: 'Show Todo List',
    description: 'Display existing todos and their statuses',
    action: async (page) => {
      const todos = await page.$$('.todo-card, div[data-testid="todo-item"]');
      console.log(`Found ${todos.length} todos in this project`);
      
      // Highlight each todo
      for (let i = 0; i < Math.min(todos.length, 3); i++) {
        await todos[i].scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
      }
    }
  }
];

async function runDemo() {
  console.log('🚀 Starting Todo System Demo\n');
  console.log('This demo will show the todo system features in action.\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // Slow down by 1 second for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  try {
    // First check if user needs to sign in
    await page.goto(BASE_URL);
    
    // Check if we're on the signin page
    if (page.url().includes('/auth/signin')) {
      console.log('📝 Please sign in to continue the demo\n');
      console.log('After signing in, the demo will continue automatically.\n');
      
      // Wait for user to sign in (max 2 minutes)
      await page.waitForURL(`${BASE_URL}/**`, { 
        timeout: 120000,
        waitUntil: 'networkidle' 
      });
      
      console.log('✅ Signed in successfully!\n');
    }
    
    // Run through each demo step
    for (const step of steps) {
      console.log(`\n📍 ${step.name}`);
      console.log(`   ${step.description}\n`);
      
      try {
        await step.action(page);
        await page.waitForTimeout(2000); // Pause between steps
      } catch (error) {
        console.log(`   ⚠️  Step failed: ${error.message}`);
      }
    }
    
    // Take a final screenshot
    console.log('\n📸 Taking screenshot of the todo system...');
    await page.screenshot({ 
      path: 'todo-system-demo.png',
      fullPage: true 
    });
    console.log('✅ Screenshot saved as todo-system-demo.png');
    
    console.log('\n✨ Demo complete!');
    console.log('\nKey features demonstrated:');
    console.log('- Todo section integrated into project pages');
    console.log('- Permission-based visibility (owners and volunteers)');
    console.log('- Todo creation interface');
    console.log('- Todo status tracking\n');
    
    console.log('Press any key to close the browser...');
    await page.waitForTimeout(30000); // Keep browser open for 30 seconds
    
  } catch (error) {
    console.error('❌ Demo error:', error);
  } finally {
    await browser.close();
  }
}

// Run the demo
runDemo().catch(console.error);