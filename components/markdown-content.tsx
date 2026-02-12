"use client"

import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"

type MarkdownContentProps = {
  content: string
  className?: string
}

export default function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content.trim()) return null

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        skipHtml
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside text-sm space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-sm space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-slate-900 dark:text-white">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{children}</h4>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
