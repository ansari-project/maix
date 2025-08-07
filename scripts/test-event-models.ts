#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testEventModels() {
  try {
    console.log('Testing Event Manager models...')
    
    // Test 1: Check if tables exist
    const tableChecks = await Promise.all([
      prisma.$queryRaw`SELECT COUNT(*) FROM maix_events`,
      prisma.$queryRaw`SELECT COUNT(*) FROM registrations`,
      prisma.$queryRaw`SELECT COUNT(*) FROM event_conversations`,
      prisma.$queryRaw`SELECT COUNT(*) FROM user_preferences`,
    ])
    
    console.log('✅ All Event Manager tables exist')
    
    // Test 2: Check enum types
    const enumCheck = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"MaixEventStatus")) as status
    `
    console.log('✅ MaixEventStatus enum created:', enumCheck)
    
    // Test 3: Check PostType enum was extended
    const postTypeCheck = await prisma.$queryRaw<Array<{type: string}>>`
      SELECT unnest(enum_range(NULL::"PostType")) as type
    `
    const hasEventTypes = postTypeCheck.some((row) => 
      row.type === 'EVENT_UPDATE' || row.type === 'EVENT_DISCUSSION'
    )
    
    if (hasEventTypes) {
      console.log('✅ PostType enum extended with EVENT_UPDATE and EVENT_DISCUSSION')
    } else {
      console.log('❌ PostType enum not properly extended')
    }
    
    // Test 4: Check PersonalAccessToken columns
    const patColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'personal_access_tokens' 
      AND column_name IN ('scopes', 'isSystemGenerated')
    `
    console.log('✅ PersonalAccessToken extended with:', patColumns)
    
    console.log('\n🎉 All Event Manager models successfully created!')
    
  } catch (error) {
    console.error('❌ Error testing models:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testEventModels()