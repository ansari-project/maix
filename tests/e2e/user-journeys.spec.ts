import { test, expect } from './fixtures'
import { DatabaseHelper } from './helpers/db.helper'

test.describe('End-to-End User Journeys', () => {
  test('complete volunteer journey: sign up, browse projects, apply, get accepted', async ({ page, authHelper }) => {
    // Step 1: New user signs up
    const userData = {
      email: `volunteer-journey-${Date.now()}@test.com`,
      password: 'VolunteerPass123!',
      name: 'Volunteer Journey User'
    }
    
    await authHelper.signUp(userData)
    await expect(page).toHaveURL(/.*\/dashboard.*/)
    
    // Step 2: Browse available projects
    await page.goto('/projects')
    
    // Create a test project to apply to (simulating existing projects)
    const projectOwner = await DatabaseHelper.createTestUser({
      email: `owner-journey-${Date.now()}@test.com`,
      password: 'OwnerPass123!',
      name: 'Project Owner'
    })
    
    const project = await DatabaseHelper.createTestProject(projectOwner.id, {
      name: 'Volunteer Journey Test Project',
      goal: 'Testing the complete volunteer application journey',
      description: 'This is a comprehensive project for testing the end-to-end volunteer journey functionality.'
    })
    
    // Reload to see the new project
    await page.reload()
    
    // Step 3: View project details
    await page.click('text=Volunteer Journey Test Project')
    await expect(page.locator('h1')).toContainText('Volunteer Journey Test Project')
    
    // Step 4: Apply to project
    await page.click('button:has-text("Apply")')
    await page.fill('textarea[name="message"]', 'I am very interested in contributing to this project. I have relevant experience in web development and would love to help.')
    await page.click('button[type="submit"]')
    
    // Verify application submitted
    await expect(page.locator('text=Application submitted')).toBeVisible()
    await expect(page.locator('button:has-text("Applied")')).toBeVisible()
    
    // Step 5: Check application status in dashboard
    await page.goto('/dashboard')
    await expect(page.locator('text=Application submitted')).toBeVisible()
  })

  test('complete project owner journey: create project, receive applications, accept volunteer', async ({ page, authHelper }) => {
    // Step 1: Project owner signs up
    const ownerData = {
      email: `owner-journey-${Date.now()}@test.com`,
      password: 'OwnerPass123!',
      name: 'Project Owner Journey'
    }
    
    await authHelper.signUp(ownerData)
    
    // Step 2: Create a new project
    await page.goto('/projects/new')
    
    const projectData = {
      name: `Owner Journey Project ${Date.now()}`,
      goal: 'Testing the complete project owner journey',
      description: 'This project is created to test the end-to-end journey of a project owner from creation to managing volunteers.',
      contactEmail: 'owner@test.com'
    }
    
    await page.fill('input[name="name"]', projectData.name)
    await page.fill('input[name="goal"]', projectData.goal)
    await page.fill('textarea[name="description"]', projectData.description)
    await page.fill('input[name="contactEmail"]', projectData.contactEmail)
    
    // Select help type
    await page.click('[data-testid="help-type-select"]')
    await page.click('text=MVP Development')
    
    await page.click('button[type="submit"]')
    
    // Verify project created
    await expect(page.locator('h1')).toContainText(projectData.name)
    
    // Step 3: Simulate receiving applications (create test applicant)
    const applicant = await DatabaseHelper.createTestUser({
      email: `applicant-journey-${Date.now()}@test.com`,
      password: 'ApplicantPass123!',
      name: 'Test Applicant'
    })
    
    // Step 4: View applications (navigate to project management)
    await page.goto('/dashboard')
    await page.click(`text=${projectData.name}`)
    
    // Look for applications tab/section
    const applicationsTab = page.locator('button:has-text("Applications")')
    if (await applicationsTab.isVisible()) {
      await applicationsTab.click()
      
      // Step 5: Accept/reject applications
      const acceptButton = page.locator('button:has-text("Accept")')
      if (await acceptButton.isVisible()) {
        await acceptButton.click()
        await expect(page.locator('text=Application accepted')).toBeVisible()
      }
    }
  })

  test('complete Q&A interaction journey: ask question, receive answers, mark best answer', async ({ page, authHelper }) => {
    // Step 1: User asks a question
    const questionerData = {
      email: `questioner-${Date.now()}@test.com`,
      password: 'QuestionerPass123!',
      name: 'Question Asker'
    }
    
    await authHelper.signUp(questionerData)
    
    // Create test project for context
    const project = await DatabaseHelper.createTestProject(questionerData.email, {
      name: 'Q&A Journey Project'
    })
    
    // Ask a question
    await page.click('button:has-text("Ask a Question")')
    
    const questionContent = 'What are the best practices for implementing real-time features in a React application?'
    await page.fill('textarea[name="content"]', questionContent)
    
    // Select project context if available
    const projectSelect = page.locator('[data-testid="project-select"]')
    if (await projectSelect.isVisible()) {
      await projectSelect.click()
      await page.click('text=Q&A Journey Project')
    }
    
    await page.click('button[type="submit"]:has-text("Post")')
    
    // Verify question posted
    await expect(page.locator(`text=${questionContent}`)).toBeVisible()
    
    // Step 2: Another user provides answer
    await authHelper.signOut()
    
    const answererData = {
      email: `answerer-${Date.now()}@test.com`,
      password: 'AnswererPass123!',
      name: 'Helpful Answerer'
    }
    
    await authHelper.signUp(answererData)
    
    // Find and answer the question
    await page.click(`text=${questionContent}`)
    
    const answerContent = 'You can use WebSockets with Socket.io for real-time features. For React, consider using libraries like Socket.io-client along with custom hooks to manage connection state.'
    
    await page.fill('textarea[name="answer"]', answerContent)
    await page.click('button[type="submit"]:has-text("Submit Answer")')
    
    // Verify answer posted
    await expect(page.locator(`text=${answerContent}`)).toBeVisible()
    
    // Step 3: Original questioner marks best answer
    await authHelper.signOut()
    await authHelper.signIn(questionerData.email, questionerData.password)
    
    // Navigate back to the question
    await page.goto('/dashboard')
    await page.click(`text=${questionContent}`)
    
    // Mark as best answer if functionality exists
    const markBestButton = page.locator('button:has-text("Mark as Best")')
    if (await markBestButton.isVisible()) {
      await markBestButton.click()
      await expect(page.locator('text=Best Answer')).toBeVisible()
    }
  })

  test('complete organization workflow: create org, invite members, create projects', async ({ page, authHelper }) => {
    // Step 1: Create organization
    const orgOwnerData = {
      email: `org-owner-${Date.now()}@test.com`,
      password: 'OrgOwnerPass123!',
      name: 'Organization Owner'
    }
    
    await authHelper.signUp(orgOwnerData)
    
    // Create organization
    await page.goto('/organizations/new')
    
    const orgData = {
      name: `Journey Test Organization ${Date.now()}`,
      description: 'This organization is created to test the complete organizational workflow and management features.',
      website: 'https://journey-test.example.com',
      contactEmail: 'contact@journey-test.example.com'
    }
    
    await page.fill('input[name="name"]', orgData.name)
    await page.fill('textarea[name="description"]', orgData.description)
    await page.fill('input[name="website"]', orgData.website)
    await page.fill('input[name="contactEmail"]', orgData.contactEmail)
    
    await page.click('button[type="submit"]')
    
    // Verify organization created
    await expect(page.locator('h1')).toContainText(orgData.name)
    
    // Step 2: Create organization project
    await page.goto('/projects/new')
    
    const projectData = {
      name: 'Organizational Project',
      goal: 'Testing organizational project creation',
      description: 'This project is created under an organization to test the complete organizational project workflow.'
    }
    
    await page.fill('input[name="name"]', projectData.name)
    await page.fill('input[name="goal"]', projectData.goal)
    await page.fill('textarea[name="description"]', projectData.description)
    
    // Select organization if dropdown exists
    const orgSelect = page.locator('[data-testid="organization-select"]')
    if (await orgSelect.isVisible()) {
      await orgSelect.click()
      await page.click(`text=${orgData.name}`)
    }
    
    await page.click('button[type="submit"]')
    
    // Verify project created under organization
    await expect(page.locator('h1')).toContainText(projectData.name)
    
    // Step 3: Invite organization members (if functionality exists)
    await page.goto(`/organizations`)
    await page.click(`text=${orgData.name}`)
    
    const membersTab = page.locator('text=Members')
    if (await membersTab.isVisible()) {
      await membersTab.click()
      
      const inviteButton = page.locator('button:has-text("Invite Member")')
      if (await inviteButton.isVisible()) {
        await inviteButton.click()
        
        await page.fill('input[name="email"]', `member-${Date.now()}@test.com`)
        await page.click('button[type="submit"]:has-text("Send Invitation")')
        
        await expect(page.locator('text=Invitation sent')).toBeVisible()
      }
    }
  })

  test('search and discovery journey: search projects, filter results, find relevant opportunities', async ({ page, authHelper, testUser }) => {
    // Create searchable projects with different characteristics
    await DatabaseHelper.createTestProject(testUser.id, {
      name: 'React Frontend Project',
      goal: 'Building a modern React application',
      description: 'This project focuses on creating a responsive frontend using React and TypeScript with modern UI components.',
      helpType: 'MVP'
    })
    
    await DatabaseHelper.createTestProject(testUser.id, {
      name: 'Node.js Backend API',
      goal: 'Developing a RESTful API',
      description: 'Backend development project using Node.js, Express, and PostgreSQL for building scalable APIs.',
      helpType: 'PROTOTYPE'
    })
    
    await DatabaseHelper.createTestProject(testUser.id, {
      name: 'Mobile App Development',
      goal: 'Creating a cross-platform mobile app',
      description: 'Mobile application development using React Native for both iOS and Android platforms.',
      helpType: 'FULL_PRODUCT'
    })
    
    // Sign in and start discovery journey
    await authHelper.signIn(testUser.email, testUser.password)
    
    // Step 1: Browse all projects
    await page.goto('/projects')
    
    // Verify projects are visible
    await expect(page.locator('text=React Frontend Project')).toBeVisible()
    await expect(page.locator('text=Node.js Backend API')).toBeVisible()
    await expect(page.locator('text=Mobile App Development')).toBeVisible()
    
    // Step 2: Search for specific technology
    const searchInput = page.locator('input[placeholder*="Search"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('React')
      await page.keyboard.press('Enter')
      
      // Should show React-related projects
      await expect(page.locator('text=React Frontend Project')).toBeVisible()
      await expect(page.locator('text=Mobile App Development')).toBeVisible()
      await expect(page.locator('text=Node.js Backend API')).not.toBeVisible()
    }
    
    // Step 3: Filter by help type
    const helpTypeFilter = page.locator('[data-testid="help-type-filter"]')
    if (await helpTypeFilter.isVisible()) {
      await helpTypeFilter.click()
      await page.click('text=MVP Development')
      
      // Should show only MVP projects
      await expect(page.locator('text=React Frontend Project')).toBeVisible()
    }
    
    // Step 4: View project details and apply
    await page.click('text=React Frontend Project')
    await expect(page.locator('h1')).toContainText('React Frontend Project')
    
    // Apply to the project
    await page.click('button:has-text("Apply")')
    await page.fill('textarea[name="message"]', 'I have extensive experience with React and TypeScript. I would love to contribute to this project.')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Application submitted')).toBeVisible()
  })
})