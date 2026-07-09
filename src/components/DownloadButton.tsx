interface DownloadButtonProps {
  filename: string
  contents: string
  label?: string
}

export function DownloadButton({ filename, contents, label = `Download ${filename}` }: DownloadButtonProps) {
  function handleDownload() {
    const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
    >
      {label}
    </button>
  )
}
