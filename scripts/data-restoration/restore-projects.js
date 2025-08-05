const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restoreProjectsOnly() {
  try {
    console.log('Starting projects restoration...');
    
    const backupContent = fs.readFileSync('/Users/mwk/Downloads/real_data_20250803_001600.sql', 'utf8');
    
    // Find the projects section
    const projectMatch = backupContent.match(/COPY public\.projects \([^)]+\) FROM stdin;\n([\s\S]*?)\n\\\./);
    if (!projectMatch) {
      console.log('No projects section found in backup');
      return;
    }
    
    const projectsSection = projectMatch[1];
    const lines = projectsSection.split('\n');
    
    console.log(`Found ${lines.length} project lines to process...`);
    
    for (const line of lines) {
      if (!line.trim() || line.startsWith('\\')) continue;
      
      // More robust parsing: split by tabs, but handle the fact that description can contain tabs
      const parts = line.split('\t');
      
      if (parts.length < 15) {
        console.log(`Skipping malformed line with ${parts.length} parts`);
        continue;
      }
      
      // Extract fields in the correct order based on the schema
      // COPY public.projects (id, name, goal, description, "contactEmail", "helpType", status, "targetCompletionDate", "isActive", "createdAt", "updatedAt", "ownerId", "productId", "organizationId", visibility)
      const id = parts[0];
      const name = parts[1];
      const goal = parts[2];
      
      // For description, we need to reconstruct it from potentially multiple parts
      // Find where contactEmail starts (should be an email)
      let contactEmailIndex = -1;
      for (let i = 3; i < parts.length; i++) {
        if (parts[i].includes('@') && parts[i].includes('.')) {
          contactEmailIndex = i;
          break;
        }
      }
      
      if (contactEmailIndex === -1) {
        console.log(`Could not find contactEmail in line starting with: ${id}`);
        continue;
      }
      
      // Reconstruct description from parts[3] to parts[contactEmailIndex-1]
      const description = parts.slice(3, contactEmailIndex).join('\t');
      const contactEmail = parts[contactEmailIndex];
      const helpType = parts[contactEmailIndex + 1];
      const status = parts[contactEmailIndex + 2];
      const targetCompletionDate = parts[contactEmailIndex + 3];
      const isActive = parts[contactEmailIndex + 4];
      const createdAt = parts[contactEmailIndex + 5];
      const updatedAt = parts[contactEmailIndex + 6];
      const ownerId = parts[contactEmailIndex + 7];
      const productId = parts[contactEmailIndex + 8];
      const organizationId = parts[contactEmailIndex + 9];
      const visibility = parts[contactEmailIndex + 10];
      
      console.log(`Processing project: ${name}`);
      console.log(`  Fields: contactEmail=${contactEmail}, helpType=${helpType}, status=${status}`);
      
      try {
        // Create project - set missing foreign keys to null
        await prisma.project.create({
          data: {
            id,
            name,
            goal,
            description,
            contactEmail,
            helpType,
            status,
            targetCompletionDate: targetCompletionDate === '\\N' ? null : new Date(targetCompletionDate),
            isActive: isActive === 't',
            createdAt: new Date(createdAt),
            updatedAt: new Date(updatedAt),
            ownerId: ownerId === '\\N' ? null : ownerId,
            productId: null, // Set to null since referenced products don't exist
            organizationId: null, // Set to null since no organizations exist
            visibility: visibility || 'PUBLIC'
          }
        });
        
        // Create ProjectMember for the owner if exists
        if (ownerId && ownerId !== '\\N') {
          await prisma.projectMember.create({
            data: {
              projectId: id,
              userId: ownerId,
              role: 'OWNER'
            }
          });
        }
        
        console.log(`  ✅ Created: ${name}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to create ${name}:`, error.message);
      }
    }
    
    console.log('Projects restoration completed!');
    
  } catch (error) {
    console.error('Error during projects restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreProjectsOnly();