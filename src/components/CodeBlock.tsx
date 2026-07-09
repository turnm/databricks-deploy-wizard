import { useState } from 'react'

interface CodeBlockProps {
  filename: string
  contents: string
}

export function CodeBlock({ filename, contents }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(contents)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center justify-between bg-slate-100 px-4 py-2">
        <span className="font-mono text-sm text-slate-600">{filename}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="max-h-96 overflow-auto bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
        <code>{contents}</code>
      </pre>
    </div>
  )
}
