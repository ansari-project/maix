const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restorePostsCarefully() {
  try {
    console.log('Starting careful posts restoration...');
    
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
    
    // Get existing products
    const existingProducts = await prisma.product.findMany({ select: { id: true } });
    const productIds = new Set(existingProducts.map(p => p.id));
    
    // Get existing posts
    const existingPosts = await prisma.post.findMany({ select: { id: true } });
    const existingPostIds = new Set(existingPosts.map(p => p.id));
    
    console.log(`Existing posts: ${existingPostIds.size}, Available products: ${productIds.size}`);
    
    // Parse all posts
    const postsData = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split('\t');
      if (parts.length < 13) continue;
      
      const [id, createdAt, updatedAt, type, content, authorId, projectId, projectDiscussionThreadId, productId, productDiscussionThreadId, parentId, isResolved, bestAnswerId] = parts;
      
      // Skip if already exists
      if (existingPostIds.has(id)) {
        console.log(`  ✓ Already exists: ${type} ${id.slice(-8)}`);
        continue;
      }
      
      // Validate references
      const productRefExists = productDiscussionThreadId === '\\N' || productIds.has(productDiscussionThreadId);
      
      if (!productRefExists) {
        console.log(`  ⚠️  Skipping ${type} ${id.slice(-8)} - references missing product`);
        continue;
      }
      
      postsData.push({
        id,
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt),
        type,
        content: content.replace(/\\\\n/g, '\\n'), // Fix escaped newlines
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
    
    // Sort posts by dependencies (questions before answers)
    postsData.sort((a, b) => {
      if (a.type === 'QUESTION' && b.type === 'ANSWER') return -1;
      if (a.type === 'ANSWER' && b.type === 'QUESTION') return 1;
      return 0;
    });
    
    // Create posts without references first
    console.log('Creating posts...');
    for (const postData of postsData) {
      const { bestAnswerId, ...postWithoutBestAnswer } = postData;
      
      try {
        await prisma.post.create({
          data: postWithoutBestAnswer
        });
        
        console.log(`  ✅ Created ${postData.type}: ${postData.id.slice(-8)}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to create ${postData.type} ${postData.id.slice(-8)}:`, error.message);
      }
    }
    
    // Update best answer references
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

restorePostsCarefully();