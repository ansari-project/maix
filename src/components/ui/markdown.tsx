import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
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
      rehypePlugins={[rehypeSanitize]}
      className={cn(
        "max-w-none",
        "[&>h1]:text-xl [&>h1]:font-semibold [&>h1]:mb-2",
        "[&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2", 
        "[&>h3]:text-base [&>h3]:font-semibold [&>h3]:mb-2",
        "[&>p]:leading-relaxed",
        "[&>a]:text-blue-600 [&>a]:underline hover:[&>a]:text-blue-800",
        "[&>strong]:font-semibold",
        "[&>code]:bg-gray-100 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm",
        "[&>pre]:bg-gray-100 [&>pre]:p-2 [&>pre]:rounded [&>pre]:overflow-x-auto",
        "[&>ul]:list-disc [&>ul]:ml-4",
        "[&>ol]:list-decimal [&>ol]:ml-4", 
        "[&>li]:mb-1",
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