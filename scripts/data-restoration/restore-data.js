const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restoreData() {
  try {
    console.log('Starting data restoration...');
    
    const backupContent = fs.readFileSync('/Users/mwk/Downloads/real_data_20250803_001600.sql', 'utf8');
    
    // Skip users - they're already restored
    console.log('Skipping users (already restored)...');
    
    /*
    // Extract users data
    const usersMatch = backupContent.match(/COPY public\.users \([^)]+\) FROM stdin;\n([\s\S]*?)\n\\\./);
    if (usersMatch) {
      const usersData = usersMatch[1].split('\n').filter(line => line.trim() && !line.startsWith('\\'));
      
      console.log(`Restoring ${usersData.length} users...`);
      for (const line of usersData) {
        const parts = line.split('\t');
        const [id, email, username, name, image, password, specialty, experienceLevel, bio, linkedinUrl, githubUrl, portfolioUrl, skillsStr, availability, timezone, isActive, createdAt, updatedAt, lastDigestSentAt] = parts;
        
        // Parse skills array
        let skills = [];
        if (skillsStr && skillsStr !== '\\N') {
          const skillsArray = skillsStr.replace(/^{|}$/g, '').split(',');
          skills = skillsArray.map(s => s.replace(/^"|"$/g, ''));
        }
        
        await prisma.user.create({
          data: {
            id,
            email,
            username,
            name: name === '\\N' ? null : name,
            image: image === '\\N' ? null : image,
            password: password === '\\N' ? null : password,
            specialty: specialty === '\\N' ? null : specialty,
            experienceLevel: experienceLevel === '\\N' ? null : experienceLevel,
            bio: bio === '\\N' ? null : bio,
            linkedinUrl: linkedinUrl === '\\N' ? null : linkedinUrl,
            githubUrl: githubUrl === '\\N' ? null : githubUrl,
            portfolioUrl: portfolioUrl === '\\N' ? null : portfolioUrl,
            skills,
            availability: availability === '\\N' ? null : availability,
            timezone: timezone === '\\N' ? null : timezone,
            isActive: isActive === 't',
            createdAt: new Date(createdAt),
            updatedAt: new Date(updatedAt),
            lastDigestSentAt: lastDigestSentAt === '\\N' ? null : new Date(lastDigestSentAt)
          }
        });
      }
    }
    */
    
    // Skip organizations - they're empty in the backup
    console.log('Skipping organizations (empty in backup)...');
    
    // Skip products - already restored
    console.log('Skipping products (already restored)...');
    
    // Extract projects data
    const projectMatch = backupContent.match(/COPY public\.projects \([^)]+\) FROM stdin;\n([\s\S]*?)\n\\\./);
    if (projectMatch) {
      const projectData = projectMatch[1].split('\n').filter(line => line.trim() && !line.startsWith('\\') && line !== '.');
      
      console.log(`Restoring ${projectData.length} projects...`);
      for (const line of projectData) {
        if (line.trim()) {
          // Parse tab-separated values, handling embedded tabs in description
          const parts = [];
          let current = '';
          let inDescription = false;
          let tabCount = 0;
          
          for (let i = 0; i < line.length; i++) {
            if (line[i] === '\t') {
              tabCount++;
              if (tabCount <= 2 || tabCount >= 4) { // Not in description field
                parts.push(current);
                current = '';
              } else {
                current += '\t'; // Keep tabs in description
              }
            } else {
              current += line[i];
            }
          }
          parts.push(current); // Add the last part
          
          const [id, name, goal, description, contactEmail, helpType, status, targetCompletionDate, isActive, createdAt, updatedAt, ownerId, productId, organizationId, visibility] = parts;
          
          // Create project
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
              productId: productId === '\\N' ? null : productId,
              organizationId: organizationId === '\\N' ? null : organizationId,
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
        }
      }
    }
    
    // Extract applications data
    const appMatch = backupContent.match(/COPY public\.applications \([^)]+\) FROM stdin;\n([\s\S]*?)\n\\\./);
    if (appMatch) {
      const appData = appMatch[1].split('\n').filter(line => line.trim() && !line.startsWith('\\') && line !== '.');
      
      console.log(`Restoring ${appData.length} applications...`);
      for (const line of appData) {
        if (line.trim()) {
          const parts = line.split('\t');
          const [id, message, status, appliedAt, respondedAt, userId, projectId] = parts;
          
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
        }
      }
    }
    
    console.log('Data restoration completed successfully!');
    
  } catch (error) {
    console.error('Error during data restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreData();