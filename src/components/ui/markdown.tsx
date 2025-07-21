import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  // Trim the content to remove leading/trailing whitespace
  const trimmedContent = content?.trim() || ''
  
  return (
    <ReactMarkdown
      className={cn(
        "prose prose-sm max-w-none",
        "prose-headings:font-semibold prose-headings:text-foreground",
        "prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:my-4",
        "prose-blockquote:text-muted-foreground prose-blockquote:border-l-primary prose-blockquote:my-4",
        "prose-ul:text-muted-foreground prose-li:text-muted-foreground prose-ul:my-4",
        "prose-ol:text-muted-foreground prose-ol:my-4",
        "[&>*:last-child]:mb-0",
        className
      )}
      components={{
        // Customize link rendering to open external links in new tab
        a: ({ href, children }) => (
          <a
            href={href}
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
      }}
    >
      {trimmedContent}
    </ReactMarkdown>
  )
}