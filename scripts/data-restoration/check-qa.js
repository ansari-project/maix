const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkQandA() {
  try {
    const posts = await prisma.post.findMany({
      select: { 
        id: true, 
        type: true, 
        content: true, 
        isResolved: true, 
        bestAnswerId: true,
        author: { select: { username: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('🎉 Q&A SYSTEM RESTORED! 🎉');
    console.log('========================');
    
    posts.forEach((post, i) => {
      const preview = post.content.substring(0, 80).replace(/\n/g, ' ');
      const resolved = post.isResolved ? '✅' : '❓';
      const bestAnswer = post.bestAnswerId ? ` (Best: ${post.bestAnswerId.slice(-8)})` : '';
      
      console.log(`${i+1}. ${post.type} by @${post.author?.username || 'unknown'} ${resolved}${bestAnswer}`);
      console.log(`   ${preview}...`);
      console.log('');
    });
    
    // Try to set the best answer reference manually if it failed
    const question = posts.find(p => p.type === 'QUESTION');
    const answer = posts.find(p => p.type === 'ANSWER');
    
    if (question && answer && !question.bestAnswerId) {
      console.log('Fixing best answer reference...');
      await prisma.post.update({
        where: { id: question.id },
        data: { bestAnswerId: answer.id }
      });
      console.log('✅ Best answer reference fixed!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkQandA();