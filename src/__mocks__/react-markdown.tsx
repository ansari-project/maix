import React from 'react'

interface ReactMarkdownProps {
  children: string
  className?: string
}

export default function ReactMarkdown({ children, className }: ReactMarkdownProps) {
  return (
    <div className={className} data-testid="react-markdown">
      {children}
    </div>
  )
}