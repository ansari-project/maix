const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function deleteAllUsers() {
  try {
    console.log('Checking existing users...')
    
    // First, get count of users
    const userCount = await prisma.user.count()
    console.log(`Found ${userCount} users`)
    
    if (userCount === 0) {
      console.log('No users to delete')
      return
    }
    
    // Delete related data first (due to foreign key constraints)
    console.log('Deleting personal access tokens...')
    await prisma.personalAccessToken.deleteMany()
    
    console.log('Deleting applications...')
    await prisma.application.deleteMany()
    
    console.log('Deleting messages...')
    await prisma.message.deleteMany()
    
    console.log('Deleting projects...')
    await prisma.project.deleteMany()
    
    console.log('Deleting users...')
    const deletedUsers = await prisma.user.deleteMany()
    
    console.log(`Successfully deleted ${deletedUsers.count} users and all related data`)
    
  } catch (error) {
    console.error('Error deleting users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteAllUsers()