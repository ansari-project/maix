import { chromium, Browser, Page } from 'playwright'

// Configuration
const BASE_URL = 'http://localhost:3000'
const SLOW_MO = 1000 // Slow down actions by 1 second for visibility

// Test credentials - update these with real test accounts
const PROJECT_OWNER = {
  email: 'owner@test.com',
  password: 'password123'
}

const VOLUNTEER = {
  email: 'volunteer@test.com',
  password: 'password123'
}

class TodoSystemDemo {
  private browser: Browser | null = null
  private page: Page | null = null

  async setup() {
    console.log('🚀 Starting Todo System Interactive Demo...\n')
    
    this.browser = await chromium.launch({
      headless: false, // Show the browser
      slowMo: SLOW_MO  // Slow down for visibility
    })
    
    this.page = await this.browser.newPage()
    await this.page.setViewportSize({ width: 1280, height: 800 })
  }

  async signIn(email: string, password: string, role: string) {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log(`\n👤 Signing in as ${role}...`)
    await this.page.goto(`${BASE_URL}/auth/signin`)
    
    // Fill in credentials
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    
    // Submit
    await this.page.click('button[type="submit"]')
    
    // Wait for navigation
    await this.page.waitForURL(`${BASE_URL}/dashboard/**`, { timeout: 10000 })
    console.log(`✅ Signed in successfully as ${role}`)
  }

  async navigateToProject(projectId: string) {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('\n📁 Navigating to project...')
    await this.page.goto(`${BASE_URL}/projects/${projectId}`)
    await this.page.waitForSelector('h1', { timeout: 5000 })
    
    // Scroll to todo section
    const todoSection = await this.page.$('text=Todos')
    if (todoSection) {
      await todoSection.scrollIntoViewIfNeeded()
      console.log('✅ Found Todo section')
    }
  }

  async demo1_CreateTodo() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('\n📝 DEMO 1: Creating a new todo...')
    
    // Click Add Todo button
    await this.page.click('button:has-text("Add Todo")')
    console.log('  → Opened todo creation form')
    
    // Fill in the form
    await this.page.fill('input[name="title"]', 'Implement user authentication')
    await this.page.fill('textarea[name="description"]', 'Set up OAuth with Google and add session management')
    
    // Optional: Set a due date
    const dueDateButton = await this.page.$('button[aria-label*="calendar"]')
    if (dueDateButton) {
      await dueDateButton.click()
      // Select a date 7 days from now
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      await this.page.click(`button[aria-label*="${futureDate.getDate()}"]`)
    }
    
    // Submit
    await this.page.click('button:has-text("Create")')
    console.log('✅ Todo created successfully!')
    
    // Wait for todo to appear
    await this.page.waitForSelector('text=Implement user authentication')
  }

  async demo2_AssignTodo() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('\n👥 DEMO 2: Assigning todo to volunteer...')
    
    // Find the todo card
    const todoCard = await this.page.$('.todo-card:has-text("Implement user authentication")')
    if (!todoCard) {
      console.log('❌ Todo not found')
      return
    }
    
    // Click assignee selector
    const assigneeButton = await todoCard.$('button[aria-label*="assign"]')
    if (assigneeButton) {
      await assigneeButton.click()
      console.log('  → Opened assignee selector')
      
      // Search for volunteer
      await this.page.fill('input[placeholder*="Search"]', 'volunteer')
      
      // Select volunteer
      await this.page.click('text=volunteer@test.com')
      console.log('✅ Todo assigned to volunteer!')
    }
  }

  async demo3_UpdateStatus() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('\n🔄 DEMO 3: Updating todo status...')
    
    // Find the todo
    const todoCard = await this.page.$('.todo-card:has-text("Implement user authentication")')
    if (!todoCard) return
    
    // Update to In Progress
    const statusButton = await todoCard.$('button[aria-label*="status"]')
    if (statusButton) {
      await statusButton.click()
      await this.page.click('text=In Progress')
      console.log('  → Status changed to: In Progress')
      
      // Wait a moment
      await this.page.waitForTimeout(2000)
      
      // Update to Completed
      await statusButton.click()
      await this.page.click('text=Completed')
      console.log('✅ Todo marked as completed!')
    }
  }

  async demo4_CreateLinkedUpdate() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('\n💬 DEMO 4: Creating update linked to todo...')
    
    // Find and click Post Update button
    await this.page.click('button:has-text("Post Update")')
    console.log('  → Opened update form')
    
    // Write update
    await this.page.fill(
      'textarea[placeholder*="Share progress"]',
      'Authentication implementation is complete! Google OAuth is now integrated and working smoothly.'
    )
    
    // Link to todo if the option exists
    const todoSelect = await this.page.$('select[name="todoId"]')
    if (todoSelect) {
      await todoSelect.selectOption({ label: 'Implement user authentication' })
      console.log('  → Linked update to todo')
    }
    
    // Submit
    await this.page.click('button:has-text("Post")')
    console.log('✅ Update posted and linked to todo!')
  }

  async demo5_FilterTodos() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('\n🔍 DEMO 5: Filtering todos by status...')
    
    // Look for filter controls
    const filterButton = await this.page.$('button[aria-label*="Filter"]')
    if (filterButton) {
      await filterButton.click()
      
      // Filter by Completed
      await this.page.click('text=Completed')
      console.log('  → Showing only completed todos')
      
      await this.page.waitForTimeout(2000)
      
      // Show all
      await filterButton.click()
      await this.page.click('text=All')
      console.log('✅ Filter demonstration complete!')
    }
  }

  async takeScreenshots() {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('\n📸 Taking screenshots...')
    
    // Full page screenshot
    await this.page.screenshot({ 
      path: 'todo-demo-full-page.png', 
      fullPage: true 
    })
    
    // Todo section only
    const todoSection = await this.page.$('section:has(h2:has-text("Todos"))')
    if (todoSection) {
      await todoSection.screenshot({ 
        path: 'todo-demo-section.png' 
      })
    }
    
    console.log('✅ Screenshots saved!')
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...')
    if (this.browser) {
      await this.browser.close()
    }
    console.log('✅ Demo complete!')
  }

  async runFullDemo(projectId: string) {
    try {
      await this.setup()
      
      // Part 1: Project owner creates and assigns todo
      await this.signIn(PROJECT_OWNER.email, PROJECT_OWNER.password, 'Project Owner')
      await this.navigateToProject(projectId)
      await this.demo1_CreateTodo()
      await this.demo2_AssignTodo()
      
      // Part 2: Volunteer updates status
      await this.signIn(VOLUNTEER.email, VOLUNTEER.password, 'Volunteer')
      await this.navigateToProject(projectId)
      await this.demo3_UpdateStatus()
      await this.demo4_CreateLinkedUpdate()
      
      // Part 3: View filters and take screenshots
      await this.demo5_FilterTodos()
      await this.takeScreenshots()
      
    } catch (error) {
      console.error('❌ Error during demo:', error)
    } finally {
      await this.cleanup()
    }
  }
}

// Run the demo
async function main() {
  const demo = new TodoSystemDemo()
  
  // Replace with your actual project ID
  const PROJECT_ID = 'your-test-project-id'
  
  console.log('====================================')
  console.log('    TODO SYSTEM INTERACTIVE DEMO    ')
  console.log('====================================')
  console.log('\nThis demo will show:')
  console.log('1. Creating a todo as project owner')
  console.log('2. Assigning it to a volunteer')
  console.log('3. Updating status as volunteer')
  console.log('4. Creating linked project update')
  console.log('5. Filtering todos by status')
  console.log('\nMake sure:')
  console.log('- The app is running on localhost:3000')
  console.log('- Test accounts exist')
  console.log('- You have a test project created')
  console.log('\nPress Ctrl+C to stop at any time.\n')
  
  await demo.runFullDemo(PROJECT_ID)
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error)
}

export { TodoSystemDemo }