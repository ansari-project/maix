import React from 'react'

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={className} data-testid="markdown-content">
      {content}
    </div>
  )
}