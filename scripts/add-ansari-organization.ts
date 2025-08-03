import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating Ansari Project LLC organization...')
  
  try {
    // Create the organization
    const organization = await prisma.organization.create({
      data: {
        name: 'Ansari Project LLC',
        slug: 'ansari-project-llc'
      }
    })
    
    console.log('✓ Organization created:', organization)
    
    // Find projects to move
    const projectsToMove = ['ansari.chat', 'maix', 'Maix']
    
    for (const projectName of projectsToMove) {
      const projects = await prisma.project.findMany({
        where: {
          name: {
            contains: projectName,
            mode: 'insensitive'
          }
        }
      })
      
      if (projects.length > 0) {
        console.log(`\nFound ${projects.length} project(s) matching "${projectName}"`)
        
        for (const project of projects) {
          console.log(`  Moving project: ${project.name} (${project.id})`)
          
          // Get the current owner to add as a member if not already
          if (project.ownerId) {
            const existingMember = await prisma.organizationMember.findUnique({
              where: {
                organizationId_userId: {
                  organizationId: organization.id,
                  userId: project.ownerId
                }
              }
            })
            
            if (!existingMember) {
              await prisma.organizationMember.create({
                data: {
                  organizationId: organization.id,
                  userId: project.ownerId,
                  role: 'OWNER'
                }
              })
              console.log(`  ✓ Added user ${project.ownerId} as organization admin`)
            }
          }
          
          // Update the project ownership
          await prisma.project.update({
            where: { id: project.id },
            data: {
              organizationId: organization.id,
              ownerId: null // Organization-owned projects don't have individual owners
            }
          })
          
          console.log(`  ✓ Project moved to organization`)
        }
      } else {
        console.log(`\nNo projects found matching "${projectName}"`)
      }
    }
    
    // Also check for products that might need to be moved
    console.log('\nChecking for products to move...')
    const productsToMove = ['ansari.chat', 'maix', 'Maix']
    
    for (const productName of productsToMove) {
      const products = await prisma.product.findMany({
        where: {
          name: {
            contains: productName,
            mode: 'insensitive'
          }
        }
      })
      
      if (products.length > 0) {
        console.log(`\nFound ${products.length} product(s) matching "${productName}"`)
        
        for (const product of products) {
          console.log(`  Moving product: ${product.name} (${product.id})`)
          
          await prisma.product.update({
            where: { id: product.id },
            data: {
              organizationId: organization.id,
              ownerId: null
            }
          })
          
          console.log(`  ✓ Product moved to organization`)
        }
      }
    }
    
    console.log('\n✓ Migration complete!')
    
    // Show final organization state
    const finalOrg = await prisma.organization.findUnique({
      where: { id: organization.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                email: true,
                name: true
              }
            }
          }
        },
        projects: {
          select: {
            id: true,
            name: true
          }
        },
        products: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    console.log('\nFinal organization state:')
    console.log('- Members:', finalOrg?.members.length)
    finalOrg?.members.forEach(m => {
      console.log(`  - ${m.user.name || m.user.email} (${m.role})`)
    })
    console.log('- Projects:', finalOrg?.projects.length)
    finalOrg?.projects.forEach(p => {
      console.log(`  - ${p.name}`)
    })
    console.log('- Products:', finalOrg?.products.length)
    finalOrg?.products.forEach(p => {
      console.log(`  - ${p.name}`)
    })
    
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