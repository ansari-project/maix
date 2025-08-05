const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restoreCausemon() {
  try {
    console.log('Starting Causemon data restoration...');
    
    const backupContent = fs.readFileSync('/Users/mwk/Downloads/real_data_20250803_001600.sql', 'utf8');
    
    // 1. Restore Public Figures
    const publicFiguresMatch = backupContent.match(/COPY public\.public_figures \([^)]+\) FROM stdin;\n([\s\S]*?)\n\\\./);
    if (publicFiguresMatch) {
      const lines = publicFiguresMatch[1].split('\n').filter(line => line.trim() && !line.startsWith('\\') && line !== '.');
      
      console.log(`Restoring ${lines.length} public figures...`);
      for (const line of lines) {
        const parts = line.split('\t');
        const [id, name, title, imageUrl, aliasesStr, createdAt, updatedAt] = parts;
        
        // Parse aliases array
        let aliases = [];
        if (aliasesStr && aliasesStr !== '\\N') {
          aliases = aliasesStr.replace(/^{|}$/g, '').split(',').map(s => s.replace(/^"|"$/g, ''));
        }
        
        await prisma.publicFigure.create({
          data: {
            id,
            name,
            title: title === '\\N' ? null : title,
            imageUrl: imageUrl === '\\N' ? null : imageUrl,
            aliases,
            createdAt: new Date(createdAt),
            updatedAt: new Date(updatedAt)
          }
        });
        
        console.log(`  ✅ ${name}`);
      }
    }
    
    // 2. Restore Topics
    const topicsMatch = backupContent.match(/COPY public\.topics \([^)]+\) FROM stdin;\n([\s\S]*?)\n\\\./);
    if (topicsMatch) {
      const lines = topicsMatch[1].split('\n').filter(line => line.trim() && !line.startsWith('\\') && line !== '.');
      
      console.log(`Restoring ${lines.length} topics...`);
      for (const line of lines) {
        const parts = line.split('\t');
        const [id, name, keywordsStr, createdAt, updatedAt] = parts;
        
        // Parse keywords array
        let keywords = [];
        if (keywordsStr && keywordsStr !== '\\N' && keywordsStr !== '{}') {
          keywords = keywordsStr.replace(/^{|}$/g, '').split(',').map(s => s.replace(/^"|"$/g, ''));
        }
        
        await prisma.topic.create({
          data: {
            id,
            name,
            keywords,
            createdAt: new Date(createdAt),
            updatedAt: new Date(updatedAt)
          }
        });
        
        console.log(`  ✅ ${name}`);
      }
    }
    
    // 3. Restore Monitors
    const monitorsMatch = backupContent.match(/COPY public\.monitors \([^)]+\) FROM stdin;\n([\s\S]*?)\n\\\./);
    if (monitorsMatch) {
      const lines = monitorsMatch[1].split('\n').filter(line => line.trim() && !line.startsWith('\\') && line !== '.');
      
      console.log(`Restoring ${lines.length} monitors...`);
      for (const line of lines) {
        const parts = line.split('\t');
        const [id, userId, publicFigureId, topicId, isActive, emailFrequency, lastSearchedAt, createdAt, updatedAt] = parts;
        
        await prisma.monitor.create({
          data: {
            id,
            userId,
            publicFigureId,
            topicId,
            isActive: isActive === 't',
            emailFrequency,
            lastSearchedAt: lastSearchedAt === '\\N' ? null : new Date(lastSearchedAt),
            createdAt: new Date(createdAt),
            updatedAt: new Date(updatedAt)
          }
        });
        
        console.log(`  ✅ Monitor ${id.slice(-8)}`);
      }
    }
    
    console.log('Causemon data restoration completed!');
    
  } catch (error) {
    console.error('Error during Causemon restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreCausemon();