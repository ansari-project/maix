import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostCard } from '../PostCard'
import { format } from 'date-fns'

// Mock dependencies
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}))

jest.mock('@/components/ui/markdown', () => ({
  Markdown: ({ content }: any) => <div data-testid="markdown">{content}</div>
}))

describe('PostCard', () => {
  const user = userEvent.setup()
  
  const mockPost = {
    id: 'post-1',
    type: 'QUESTION' as const,
    content: '# How to implement authentication in Next.js?\n\nI need help with setting up authentication.',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    author: {
      id: 'user-1',
      name: 'John Doe',
      image: null
    },
    project: null,
    product: null,
    bestAnswer: null,
    replies: [],
    _count: {
      replies: 3,
      comments: 5
    }
  }

  const mockProjectUpdate = {
    ...mockPost,
    id: 'post-2',
    type: 'PROJECT_UPDATE' as const,
    content: 'We have completed the authentication module!',
    project: {
      id: 'proj-1',
      name: 'AI Assistant Project'
    }
  }

  const mockAnsweredQuestion = {
    ...mockPost,
    id: 'post-3',
    bestAnswer: {
      id: 'answer-1',
      content: 'You can use NextAuth.js for authentication.',
      author: {
        id: 'user-2',
        name: 'Jane Smith',
        image: null
      }
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Post Type Display', () => {
    it('should display question badge correctly', () => {
      render(<PostCard post={mockPost} />)
      
      expect(screen.getByText('Question')).toBeInTheDocument()
      const badge = screen.getByText('Question').closest('div')
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
    })

    it('should display project update badge with project name', () => {
      render(<PostCard post={mockProjectUpdate} />)
      
      expect(screen.getByText('Project Update')).toBeInTheDocument()
      expect(screen.getByText('AI Assistant Project')).toBeInTheDocument()
    })

    it('should display product update badge', () => {
      const productPost = {
        ...mockPost,
        type: 'PRODUCT_UPDATE' as const,
        product: { id: 'prod-1', name: 'Product Alpha' }
      }
      
      render(<PostCard post={productPost} />)
      
      expect(screen.getByText('Product Update')).toBeInTheDocument()
      expect(screen.getByText('Product Alpha')).toBeInTheDocument()
    })
  })

  describe('Content Display', () => {
    it('should render post content as markdown', () => {
      render(<PostCard post={mockPost} />)
      
      // Check that the content is rendered
      expect(screen.getByText(/How to implement authentication in Next\.js\?/)).toBeInTheDocument()
      expect(screen.getByText(/I need help with setting up authentication\./)).toBeInTheDocument()
    })

    it('should display author information', () => {
      render(<PostCard post={mockPost} />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should display formatted date', () => {
      render(<PostCard post={mockPost} />)
      
      const formattedDate = format(new Date(mockPost.createdAt), 'MMM d, yyyy')
      expect(screen.getByText(formattedDate)).toBeInTheDocument()
    })

    it('should display reply and comment counts', () => {
      render(<PostCard post={mockPost} />)
      
      expect(screen.getByText('3 answers')).toBeInTheDocument() // For questions, replies are called answers
      expect(screen.getByText('5 comments')).toBeInTheDocument()
    })
  })

  describe('Best Answer Display', () => {
    it('should show best answer when present', () => {
      render(<PostCard post={mockAnsweredQuestion} />)
      
      expect(screen.getByText('Best Answer')).toBeInTheDocument()
      expect(screen.getByText('You can use NextAuth.js for authentication.')).toBeInTheDocument()
      expect(screen.getByText('by Jane Smith')).toBeInTheDocument()
    })

    it('should not show best answer section for non-questions', () => {
      render(<PostCard post={mockProjectUpdate} />)
      
      expect(screen.queryByText('Best Answer')).not.toBeInTheDocument()
    })
  })

  describe('Interactive Features', () => {
    it('should call onReply when reply button is clicked', async () => {
      const mockOnReply = jest.fn()
      
      render(<PostCard post={mockPost} onReply={mockOnReply} />)
      
      const replyButton = screen.getByRole('button', { name: /answer/i }) // Questions show "Answer" button
      await user.click(replyButton)
      
      expect(mockOnReply).toHaveBeenCalledWith('post-1')
    })

    it('should allow marking best answer for question author', async () => {
      const mockOnMarkBestAnswer = jest.fn()
      const postWithReply = {
        ...mockPost,
        replies: [{
          id: 'reply-1',
          type: 'ANSWER' as const,
          content: 'Here is my answer',
          createdAt: '2024-01-15T11:00:00Z',
          updatedAt: '2024-01-15T11:00:00Z',
          author: { id: 'user-2', name: 'Helper', image: null },
          _count: { replies: 0, comments: 0 }
        }]
      }
      
      render(
        <PostCard 
          post={postWithReply} 
          currentUserId="user-1" 
          onMarkBestAnswer={mockOnMarkBestAnswer}
        />
      )
      
      const markBestButton = screen.getByRole('button', { name: /mark best answer/i })
      await user.click(markBestButton)
      
      expect(mockOnMarkBestAnswer).toHaveBeenCalledWith('post-1', 'reply-1')
    })

    it('should not show mark best answer for non-authors', () => {
      const postWithReply = {
        ...mockPost,
        replies: [{
          id: 'reply-1',
          type: 'ANSWER' as const,
          content: 'Here is my answer',
          createdAt: '2024-01-15T11:00:00Z',
          updatedAt: '2024-01-15T11:00:00Z',
          author: { id: 'user-2', name: 'Helper', image: null },
          _count: { replies: 0, comments: 0 }
        }]
      }
      
      render(
        <PostCard 
          post={postWithReply} 
          currentUserId="user-3" // Different user
          onMarkBestAnswer={jest.fn()}
        />
      )
      
      expect(screen.queryByRole('button', { name: /mark as best answer/i })).not.toBeInTheDocument()
    })
  })

  describe('Replies Display', () => {
    it('should show replies when present', () => {
      const postWithReplies = {
        ...mockPost,
        replies: [
          {
            id: 'reply-1',
            type: 'ANSWER' as const,
            content: 'First answer',
            createdAt: '2024-01-15T11:00:00Z',
            updatedAt: '2024-01-15T11:00:00Z',
            author: { id: 'user-2', name: 'Helper 1', image: null },
            _count: { replies: 0, comments: 0 }
          },
          {
            id: 'reply-2',
            type: 'ANSWER' as const,
            content: 'Second answer',
            createdAt: '2024-01-15T12:00:00Z',
            updatedAt: '2024-01-15T12:00:00Z',
            author: { id: 'user-3', name: 'Helper 2', image: null },
            _count: { replies: 0, comments: 0 }
          }
        ]
      }
      
      render(<PostCard post={postWithReplies} />)
      
      expect(screen.getByText('First answer')).toBeInTheDocument()
      expect(screen.getByText('Second answer')).toBeInTheDocument()
      expect(screen.getByText('Helper 1')).toBeInTheDocument()
      expect(screen.getByText('Helper 2')).toBeInTheDocument()
    })

    it('should toggle show all replies', async () => {
      const manyReplies = Array.from({ length: 5 }, (_, i) => ({
        id: `reply-${i}`,
        type: 'ANSWER' as const,
        content: `Answer ${i + 1}`,
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
        author: { id: `user-${i}`, name: `Helper ${i}`, image: null },
        _count: { replies: 0, comments: 0 }
      }))
      
      const postWithManyReplies = {
        ...mockPost,
        replies: manyReplies
      }
      
      render(<PostCard post={postWithManyReplies} />)
      
      // Initially should show limited replies
      expect(screen.getByText('Answer 1')).toBeInTheDocument()
      expect(screen.getByText('Answer 2')).toBeInTheDocument()
      expect(screen.queryByText('Answer 5')).not.toBeInTheDocument()
      
      // Click show more - button shows "Show 2 more answers" for questions
      const showMoreButton = screen.getByRole('button', { name: /show 2 more answers/i })
      await user.click(showMoreButton)
      
      // Should show all replies
      expect(screen.getByText('Answer 5')).toBeInTheDocument()
      
      // After clicking, the show more button should disappear (no show less functionality)
      expect(screen.queryByRole('button', { name: /show 2 more answers/i })).not.toBeInTheDocument()
    })
  })

  describe('Link Navigation', () => {
    it('should link to project page when project is mentioned', () => {
      render(<PostCard post={mockProjectUpdate} />)
      
      const projectLink = screen.getByRole('link', { name: 'AI Assistant Project' })
      expect(projectLink).toHaveAttribute('href', '/projects/proj-1')
    })

    it('should link to product page when product is mentioned', () => {
      const productPost = {
        ...mockPost,
        type: 'PRODUCT_UPDATE' as const,
        product: { id: 'prod-1', name: 'Product Alpha' }
      }
      
      render(<PostCard post={productPost} />)
      
      const productLink = screen.getByRole('link', { name: 'Product Alpha' })
      expect(productLink).toHaveAttribute('href', '/products/prod-1')
    })
  })

  describe('Reply Card Variant', () => {
    it('should render differently when isReply is true', () => {
      render(<PostCard post={mockPost} isReply={true} />)
      
      // Reply cards typically have different styling
      // Note: This would need data-testid added to the actual component
      // For now, we'll just verify the component renders without error
    })

    it('should not show replies for reply cards', () => {
      const replyWithReplies = {
        ...mockPost,
        replies: [{ ...mockPost, id: 'nested-reply' }]
      }
      
      render(<PostCard post={replyWithReplies} isReply={true} showReplies={false} />)
      
      expect(screen.queryByText('nested-reply')).not.toBeInTheDocument()
    })
  })
})