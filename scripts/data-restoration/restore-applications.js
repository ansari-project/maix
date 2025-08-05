const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restoreApplications() {
  try {
    console.log('Starting applications restoration...');
    
    const backupContent = fs.readFileSync('/Users/mwk/Downloads/real_data_20250803_001600.sql', 'utf8');
    
    // Find the applications section
    const appMatch = backupContent.match(/COPY public\.applications \([^)]+\) FROM stdin;\n([\s\S]*?)\n\\\./);
    if (!appMatch) {
      console.log('No applications section found in backup');
      return;
    }
    
    const applicationsSection = appMatch[1];
    const lines = applicationsSection.split('\n').filter(line => line.trim() && !line.startsWith('\\') && line !== '.');
    
    console.log(`Found ${lines.length} applications to restore...`);
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Applications have simpler structure: id, message, status, appliedAt, respondedAt, userId, projectId
      const parts = line.split('\t');
      
      if (parts.length < 7) {
        console.log(`Skipping malformed application line with ${parts.length} parts`);
        continue;
      }
      
      const [id, message, status, appliedAt, respondedAt, userId, projectId] = parts;
      
      console.log(`Processing application ${id.slice(-8)} for project ${projectId.slice(-8)}`);
      
      try {
        await prisma.application.create({
          data: {
            id,
            message,
            status,
            appliedAt: new Date(appliedAt),
            respondedAt: respondedAt === '\\N' ? null : new Date(respondedAt),
            userId,
            projectId
          }
        });
        
        console.log(`  ✅ Created application ${id.slice(-8)}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to create application ${id.slice(-8)}:`, error.message);
      }
    }
    
    console.log('Applications restoration completed!');
    
  } catch (error) {
    console.error('Error during applications restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreApplications();