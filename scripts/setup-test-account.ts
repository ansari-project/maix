#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_USER = {
  email: 'waleedk+ptest@gmail.com',
  name: 'Playwright Test User',
  username: 'playwright-test',
  password: 'playwright-test-123', // This is for testing only
};

async function createTestProject(userId: string) {
  console.log('📦 Creating test project...');
  
  // Check if test project already exists
  const existingProject = await prisma.project.findFirst({
    where: {
      ownerId: userId,
      name: 'Test Project for Todo Demo',
    },
  });

  if (existingProject) {
    console.log('✅ Test project already exists');
    return existingProject;
  }

  // Create test project
  const project = await prisma.project.create({
    data: {
      name: 'Test Project for Todo Demo',
      goal: 'Demonstrate the todo system functionality with realistic task management scenarios',
      description: 'This is a test project for demonstrating the todo system features. It includes task management capabilities for project owners and volunteers.',
      status: 'IN_PROGRESS',
      isActive: true,
      ownerId: userId,
      visibility: 'PUBLIC',
      contactEmail: TEST_USER.email,
      helpType: 'MVP',
    },
  });

  // Create some sample todos
  await prisma.todo.createMany({
    data: [
      {
        title: 'Setup development environment',
        description: 'Install dependencies and configure the project locally',
        status: 'COMPLETED',
        projectId: project.id,
        creatorId: userId,
      },
      {
        title: 'Review project requirements',
        description: 'Go through the project documentation and understand the scope',
        status: 'IN_PROGRESS',
        projectId: project.id,
        creatorId: userId,
        assigneeId: userId,
      },
      {
        title: 'Create initial wireframes',
        description: 'Design the basic UI layout for the main features',
        status: 'NOT_STARTED',
        projectId: project.id,
        creatorId: userId,
      },
    ],
  });

  console.log('✅ Test project created with sample todos');
  return project;
}

async function setupTestAccount() {
  try {
    console.log('🔍 Checking for existing test account...');
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
    });

    if (existingUser) {
      console.log('✅ Test account already exists:', existingUser.email);
      
      // Ensure test project exists
      await createTestProject(existingUser.id);
      
      return existingUser;
    }

    // Create new test user
    console.log('📝 Creating new test account...');
    
    const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
    
    const newUser = await prisma.user.create({
      data: {
        email: TEST_USER.email,
        name: TEST_USER.name,
        username: TEST_USER.username,
        password: hashedPassword,
      },
    });

    console.log('✅ Test account created successfully:', newUser.email);
    console.log('   Email:', TEST_USER.email);
    console.log('   Password:', TEST_USER.password);
    
    // Create a test project for the user
    await createTestProject(newUser.id);
    
    return newUser;
  } catch (error) {
    console.error('❌ Error setting up test account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  setupTestAccount()
    .then(() => {
      console.log('\n✨ Test account setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { setupTestAccount, TEST_USER };