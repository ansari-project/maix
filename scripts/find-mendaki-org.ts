import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findMendakiOrganization() {
  try {
    // Search for Mendaki organization by name or slug
    const organizations = await prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: 'MENDAKI', mode: 'insensitive' } },
          { slug: { contains: 'mendaki', mode: 'insensitive' } }
        ]
      }
    })

    if (organizations.length === 0) {
      console.log('No MENDAKI organization found in the database')
      
      // Let's create it
      console.log('\nCreating Yayasan MENDAKI organization...')
      const newOrg = await prisma.organization.create({
        data: {
          name: 'Yayasan MENDAKI',
          slug: 'yayasan-mendaki',
          mission: 'To Empower & Navigate the Malay/Muslim Community towards Success',
          description: `Yayasan MENDAKI (Council for the Development of Singapore Malay/Muslim Community) is a pioneering Self-Help Group founded in 1982 dedicated to empowering the Malay/Muslim community through excellence in education.

**Vision:** "Community of Success"

**Three Strategic Focus Areas:**
1. **School Ready** - Supporting parents with preschoolers through early childhood development programs
2. **Perform in School** - Comprehensive support for primary and secondary students including tuition, mentorship, and enrichment programs
3. **Future Ready** - Career development and skills upgrading for youth and young professionals

**Key Programs:**
- MENDAKI Tuition Scheme (MTS) - Subsidized tuition support
- Various scholarships and bursaries across all educational levels
- Career guidance and skills development workshops
- MyMENDAKI Portal (launched Nov 2023) - One-stop digital service platform

**Community Impact (2023-2024):**
- Disbursed $42.9 million to over 10,000 students
- Awarded scholarships to more than 1,600 individuals`,
          url: 'https://www.mendaki.org.sg/',
          aiEngagement: `MENDAKI is actively pursuing digital transformation with the recent launch of MyMENDAKI portal and integration of emerging technologies in educational programs. The organization features AI, VR, drones, and robotics in their Raikan Ilmu events and collaborates with tech industry leaders for community upskilling. Partnership opportunities exist for AI-powered career navigation systems, grant management platforms, and digital learning tools.`
        }
      })
      
      console.log('Successfully created Yayasan MENDAKI organization!')
      console.log('Organization ID:', newOrg.id)
      console.log('Slug:', newOrg.slug)
    } else {
      console.log('Found MENDAKI organization(s):')
      organizations.forEach(org => {
        console.log(`- ID: ${org.id}`)
        console.log(`  Name: ${org.name}`)
        console.log(`  Slug: ${org.slug}`)
        console.log(`  Has mission: ${!!org.mission}`)
        console.log(`  Has description: ${!!org.description}`)
        console.log(`  Has AI engagement: ${!!org.aiEngagement}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findMendakiOrganization()