const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restorePosts() {
  try {
    console.log('Starting posts restoration...');
    
    const backupContent = fs.readFileSync('/Users/mwk/Downloads/real_data_20250803_001600.sql', 'utf8');
    
    // Find the posts section
    const postsMatch = backupContent.match(/COPY public\.posts \([^)]+\) FROM stdin;\n([\s\S]*?)\n\\\./);
    if (!postsMatch) {
      console.log('No posts section found in backup');
      return;
    }
    
    const postsSection = postsMatch[1];
    const lines = postsSection.split('\n').filter(line => line.trim() && !line.startsWith('\\') && line !== '.');
    
    console.log(`Found ${lines.length} posts to restore...`);
    
    // First pass: collect all posts to handle references
    const postsData = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Posts structure: id, createdAt, updatedAt, type, content, authorId, projectId, projectDiscussionThreadId, productId, productDiscussionThreadId, parentId, isResolved, bestAnswerId
      const parts = line.split('\t');
      
      if (parts.length < 13) {
        console.log(`Skipping malformed post line with ${parts.length} parts`);
        continue;
      }
      
      const [id, createdAt, updatedAt, type, content, authorId, projectId, projectDiscussionThreadId, productId, productDiscussionThreadId, parentId, isResolved, bestAnswerId] = parts;
      
      postsData.push({
        id,
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt),
        type,
        content: content.replace(/\\n/g, '\n'), // Fix newlines
        authorId: authorId === '\\N' ? null : authorId,
        projectId: projectId === '\\N' ? null : projectId,
        projectDiscussionThreadId: projectDiscussionThreadId === '\\N' ? null : projectDiscussionThreadId,
        productId: productId === '\\N' ? null : productId,
        productDiscussionThreadId: productDiscussionThreadId === '\\N' ? null : productDiscussionThreadId,
        parentId: parentId === '\\N' ? null : parentId,
        isResolved: isResolved === 't',
        bestAnswerId: bestAnswerId === '\\N' ? null : bestAnswerId
      });
    }
    
    // Create posts without bestAnswerId first (to avoid foreign key issues)
    console.log('Creating posts...');
    for (const postData of postsData) {
      const { bestAnswerId, ...postWithoutBestAnswer } = postData;
      
      try {
        await prisma.post.create({
          data: postWithoutBestAnswer
        });
        
        console.log(`  ✅ Created ${postData.type}: ${postData.id.slice(-8)}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to create post ${postData.id.slice(-8)}:`, error.message);
      }
    }
    
    // Second pass: update bestAnswerId references
    console.log('Updating best answer references...');
    for (const postData of postsData) {
      if (postData.bestAnswerId) {
        try {
          await prisma.post.update({
            where: { id: postData.id },
            data: { bestAnswerId: postData.bestAnswerId }
          });
          
          console.log(`  ✅ Updated best answer for ${postData.id.slice(-8)}`);
          
        } catch (error) {
          console.error(`  ❌ Failed to update best answer for ${postData.id.slice(-8)}:`, error.message);
        }
      }
    }
    
    console.log('Posts restoration completed!');
    
  } catch (error) {
    console.error('Error during posts restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restorePosts();