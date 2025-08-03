import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Setting up Ansari Project organization...')
  
  try {
    // First check if organization already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: 'ansari-project' }
    })
    
    let organization
    
    if (existingOrg) {
      console.log('✓ Organization already exists:', existingOrg.name)
      organization = existingOrg
    } else {
      // Create the organization
      organization = await prisma.organization.create({
        data: {
          name: 'Ansari Project LLC',
          slug: 'ansari-project'
        }
      })
      console.log('✓ Organization created:', organization.name)
    }
    
    // Find projects to move
    console.log('\nLooking for projects to move...')
    
    // Find ansari.chat project
    const ansariChatProject = await prisma.project.findFirst({
      where: {
        OR: [
          { name: { equals: 'ansari.chat' } },
          { name: { contains: 'ansari.chat', mode: 'insensitive' } }
        ]
      }
    })
    
    if (ansariChatProject) {
      console.log(`Found project: ${ansariChatProject.name}`)
      
      // Add current owner as org member if needed
      if (ansariChatProject.ownerId) {
        const member = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: organization.id,
              userId: ansariChatProject.ownerId
            }
          }
        })
        
        if (!member) {
          await prisma.organizationMember.create({
            data: {
              organizationId: organization.id,
              userId: ansariChatProject.ownerId,
              role: 'OWNER'
            }
          })
          console.log('  ✓ Added project owner as organization admin')
        }
      }
      
      // Move project to organization
      await prisma.project.update({
        where: { id: ansariChatProject.id },
        data: {
          organizationId: organization.id,
          ownerId: null
        }
      })
      console.log('  ✓ Moved ansari.chat to organization')
    } else {
      console.log('  - ansari.chat project not found')
    }
    
    // Find maix project
    const maixProject = await prisma.project.findFirst({
      where: {
        OR: [
          { name: { equals: 'Maix' } },
          { name: { equals: 'maix' } },
          { name: { equals: 'MAIX' } }
        ]
      }
    })
    
    if (maixProject) {
      console.log(`Found project: ${maixProject.name}`)
      
      // Add current owner as org member if needed
      if (maixProject.ownerId && maixProject.ownerId !== ansariChatProject?.ownerId) {
        const member = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: organization.id,
              userId: maixProject.ownerId
            }
          }
        })
        
        if (!member) {
          await prisma.organizationMember.create({
            data: {
              organizationId: organization.id,
              userId: maixProject.ownerId,
              role: 'OWNER'
            }
          })
          console.log('  ✓ Added project owner as organization admin')
        }
      }
      
      // Move project to organization
      await prisma.project.update({
        where: { id: maixProject.id },
        data: {
          organizationId: organization.id,
          ownerId: null
        }
      })
      console.log('  ✓ Moved Maix to organization')
    } else {
      console.log('  - Maix project not found')
    }
    
    // Show final state
    console.log('\n=== Final Organization State ===')
    const finalOrg = await prisma.organization.findUnique({
      where: { id: organization.id },
      include: {
        members: {
          include: {
            user: {
              select: { email: true, name: true }
            }
          }
        },
        projects: {
          select: { name: true, goal: true }
        },
        products: {
          select: { name: true }
        }
      }
    })
    
    console.log(`Organization: ${finalOrg?.name} (@${finalOrg?.slug})`)
    console.log(`\nMembers (${finalOrg?.members.length || 0}):`)
    finalOrg?.members.forEach(m => {
      console.log(`  - ${m.user.name || m.user.email} (${m.role})`)
    })
    
    console.log(`\nProjects (${finalOrg?.projects.length || 0}):`)
    finalOrg?.projects.forEach(p => {
      console.log(`  - ${p.name}: ${p.goal}`)
    })
    
    if (finalOrg?.products.length) {
      console.log(`\nProducts (${finalOrg.products.length}):`)
      finalOrg.products.forEach(p => {
        console.log(`  - ${p.name}`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })