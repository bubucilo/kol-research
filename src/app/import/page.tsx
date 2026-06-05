'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertTriangle, Download } from 'lucide-react'

type ImportResult = {
  total: number
  imported: number
  updated: number
  skipped: number
  errors: { row: number; reason: string }[]
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (f: File | null) => {
    if (!f) return
    if (!f.name.match(/\.(csv|tsv|txt)$/i)) {
      setError('Please upload a .csv, .tsv, or .txt file')
      return
    }
    setFile(f)
    setError(null)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import/kol-csv', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error?.message || 'Import failed')
        return
      }

      setResult(data.data)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = () => {
    const template = `No\tName\tLink Profile\tChannel\tCategories\tFollowers\tTier\tER %\tAVG Views\tGMV\tScope Qty\tScope of Work\tRate\tRemarks\tDomisili\tContact
1\tSample Name\thttps://www.instagram.com/sampleusername/\tInstagram\tLifestyle\t10,500\tNano\t5.2\t15,000\t\t1\tIG Reels\t500,000\t\tJakarta\t6281234567890`
    const blob = new Blob([template], { type: 'text/tab-separated-values' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kol-import-template.tsv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Import KOL Database</h1>
        <p className="text-sm text-white/60">
          Bulk import your KOL CRM data. Supports tab-separated or comma-separated files.
          Engagement data stays as baseline until you lookup a profile to refresh.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFileSelect(e.dataTransfer.files[0] || null)
        }}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-2xl p-12 text-center cursor-pointer transition-all"
        style={{
          background: dragOver ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
          border: `2px dashed ${dragOver ? '#3B82F6' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          className="hidden"
        />
        <Upload className="w-12 h-12 mx-auto mb-4 text-white/40" />
        {file ? (
          <div className="flex items-center justify-center gap-2 text-white">
            <FileText className="w-5 h-5 text-[#3B82F6]" />
            <span className="font-medium">{file.name}</span>
            <span className="text-white/40 text-sm">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
        ) : (
          <>
            <p className="text-white font-medium mb-1">
              Drop your CSV/TSV here, or click to browse
            </p>
            <p className="text-sm text-white/50">
              Up to 10,000 rows. First row should be column headers.
            </p>
          </>
        )}
      </div>

      {file && !result && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #0066FF, #00AAFF)',
              boxShadow: '0 4px 16px rgba(0, 102, 255, 0.3)',
            }}
          >
            {uploading ? 'Importing...' : `Import ${file.name}`}
          </button>
          <button
            onClick={() => {
              setFile(null)
              setResult(null)
              setError(null)
            }}
            className="px-6 py-3 rounded-xl font-medium text-white/70 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div
          className="mt-4 p-4 rounded-xl flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Import failed</p>
            <p className="text-sm text-red-200/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div
          className="mt-6 p-6 rounded-2xl"
          style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <h2 className="text-lg font-bold text-white">Import complete</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-2xl font-bold text-white">{result.total}</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Total rows</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <div className="text-2xl font-bold text-green-400">{result.imported}</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">New</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <div className="text-2xl font-bold text-blue-400">{result.updated}</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Updated</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: result.skipped > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)' }}>
              <div className={`text-2xl font-bold ${result.skipped > 0 ? 'text-red-400' : 'text-white/40'}`}>
                {result.skipped}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Skipped</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-white/70 hover:text-white">
                Show {result.errors.length} error{result.errors.length === 1 ? '' : 's'}
              </summary>
              <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
                {result.errors.slice(0, 50).map((e, i) => (
                  <div key={i} className="text-xs text-red-300/80 font-mono">
                    Row {e.row}: {e.reason}
                  </div>
                ))}
                {result.errors.length > 50 && (
                  <div className="text-xs text-white/50 mt-2">
                    ... and {result.errors.length - 50} more
                  </div>
                )}
              </div>
            </details>
          )}

          <a
            href="/discover"
            className="mt-4 inline-block px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #0066FF, #00AAFF)' }}
          >
            View in Discovery →
          </a>
        </div>
      )}

      <div className="mt-8 p-5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Expected columns</h3>
          <button
            onClick={handleDownloadTemplate}
            className="text-xs text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download template
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-white/60">
          <div><code className="text-[#3B82F6]">No</code> — row number</div>
          <div><code className="text-[#3B82F6]">Name</code> — display name</div>
          <div><code className="text-[#3B82F6]">Link Profile</code> — required, full URL</div>
          <div><code className="text-[#3B82F6]">Channel</code> — Instagram or TikTok</div>
          <div><code className="text-[#3B82F6]">Categories</code> — niche</div>
          <div><code className="text-[#3B82F6]">Followers</code> — number, no commas</div>
          <div><code className="text-[#3B82F6]">Tier</code> — Nano / Micro / Mid / Macro / Mega</div>
          <div><code className="text-[#3B82F6]">ER %</code> — engagement rate</div>
          <div><code className="text-[#3B82F6]">AVG Views</code> — average views</div>
          <div><code className="text-[#3B82F6]">Rate</code> — rate in IDR (no commas)</div>
          <div><code className="text-[#3B82F6]">Contact</code> — phone / WhatsApp</div>
          <div><code className="text-[#3B82F6]">Domisili</code> — city / location</div>
        </div>
        <p className="text-xs text-white/40 mt-3">
          Header names are fuzzy-matched (e.g. "Link Profile", "Profile URL", "URL" all work).
          Numbers with commas ("3,292") are auto-parsed.
        </p>
      </div>
    </div>
  )
}
