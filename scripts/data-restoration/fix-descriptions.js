const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixProjectDescriptions() {
  try {
    console.log('Fixing newlines in project descriptions...');
    
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, description: true }
    });
    
    for (const project of projects) {
      // Replace \\n with actual newlines
      const fixedDescription = project.description.replace(/\\n/g, '\n');
      
      if (fixedDescription !== project.description) {
        await prisma.project.update({
          where: { id: project.id },
          data: { description: fixedDescription }
        });
        
        console.log(`✅ Fixed: ${project.name}`);
      } else {
        console.log(`✓ Already correct: ${project.name}`);
      }
    }
    
    console.log('Project descriptions fixed!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixProjectDescriptions();