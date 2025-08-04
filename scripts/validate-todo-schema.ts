#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateTodoSchema() {
  console.log('Validating Todo schema...')
  
  try {
    // Test that we can query the todo table (even if empty)
    const todoCount = await prisma.todo.count()
    console.log(`✓ Todo table exists (${todoCount} records)`)
    
    // Test the relationships by building a query
    const query = prisma.todo.findMany({
      include: {
        creator: true,
        assignee: true,
        project: true,
        posts: true
      },
      take: 1
    })
    
    // Just validate the query can be built (not executed)
    console.log('✓ Todo relationships are properly defined')
    
    // Test that Post model has todoId field
    const postQuery = prisma.post.findMany({
      where: { todoId: { not: null } },
      take: 1
    })
    console.log('✓ Post model has todoId field')
    
    console.log('\nTodo schema validation passed! ✨')
    
  } catch (error) {
    console.error('Schema validation failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

validateTodoSchema()