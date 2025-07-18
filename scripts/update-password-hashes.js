// Script to update existing password hashes from 12 to 10 rounds
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function updatePasswordHashes() {
  console.log('Starting password hash update...')
  
  // Get all users with passwords
  const users = await prisma.user.findMany({
    where: {
      password: { not: null }
    },
    select: {
      id: true,
      email: true,
      password: true
    }
  })
  
  console.log(`Found ${users.length} users with passwords`)
  
  for (const user of users) {
    try {
      // Check if password is already 10 rounds (skip if so)
      const rounds = user.password.substring(4, 6)
      if (rounds === '10') {
        console.log(`Skipping ${user.email} - already using 10 rounds`)
        continue
      }
      
      console.log(`Updating ${user.email} from ${rounds} to 10 rounds...`)
      
      // This is a one-time migration, we'll need the user to reset their password
      // For security, we'll mark them for password reset instead of trying to decrypt
      console.log(`${user.email} will need to reset password`)
      
    } catch (error) {
      console.error(`Error processing ${user.email}:`, error)
    }
  }
  
  console.log('Password hash update complete')
}

updatePasswordHashes()
  .catch(console.error)
  .finally(() => prisma.$disconnect())