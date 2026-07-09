import type { AnchorHTMLAttributes } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownPreviewProps {
  markdown: string
}

function ExternalLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} target="_blank" rel="noreferrer" />
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline prose-li:my-1 prose-blockquote:border-l-orange-300 prose-blockquote:text-slate-600">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ExternalLink }}>
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  )
}
