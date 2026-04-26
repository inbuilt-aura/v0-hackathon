'use client'

import { useState, useRef } from 'react'
import { detectLanguage } from '@/lib/language-detector'

interface Source {
  title: string
  url: string
}

interface StreamedOutput {
  rootCause?: string
  fixedCode?: string
  sources?: Source[]
  isLoading?: boolean
}

export default function Home() {
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('typescript')
  const [output, setOutput] = useState<StreamedOutput>({ isLoading: false })
  const [isLoading, setIsLoading] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  const handleCodeChange = (value: string) => {
    setCode(value)
    const detected = detectLanguage(value)
    setLanguage(detected)
  }

  const handleDebug = async () => {
    if (!error.trim()) return

    setIsLoading(true)
    setOutput({ isLoading: true, sources: [] })

    try {
      const response = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error, code, stack: error }),
      })

      if (!response.ok) throw new Error('Debug request failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')

      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
      }

      // Parse sections from the complete response
      const rootCauseMatch = fullText.match(/ROOT_CAUSE:\s*([\s\S]*?)(?=\nFIXED_CODE:|\nSOURCES:|$)/m)
      const fixedCodeMatch = fullText.match(/FIXED_CODE:\s*([\s\S]*?)(?=\nSOURCES:|$)/m)
      const sourcesMatch = fullText.match(/SOURCES:\s*(\[[\s\S]*?\])/m)

      const rootCause = rootCauseMatch ? rootCauseMatch[1].trim() : undefined
      const fixedCode = fixedCodeMatch ? fixedCodeMatch[1].trim() : undefined

      let sources: Source[] = []
      if (sourcesMatch) {
        try {
          const parsed = JSON.parse(sourcesMatch[1])
          if (Array.isArray(parsed)) {
            sources = parsed.filter(
              (s): s is Source => s && typeof s.title === 'string' && typeof s.url === 'string'
            )
          }
        } catch {
          sources = []
        }
      }

      setOutput({ rootCause, fixedCode, sources, isLoading: false })
    } catch (err) {
      console.error('Debug error:', err)
      setOutput({
        rootCause: 'Failed to debug. Please try again.',
        isLoading: false,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1f1f1f', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🦆</span>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.5px' }}>DebugDuck</h1>
            <p style={{ fontSize: '0.75rem', color: '#909090', marginTop: '0.25rem' }}>AI-powered error debugging</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '2rem', height: 'calc(100vh - 180px)' }}>
          {/* Left Panel - Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Error Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#e5e5e5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Error Output
              </label>
              <textarea
                value={error}
                onChange={(e) => setError(e.target.value)}
                placeholder="Paste your terminal or console error here..."
                style={{
                  width: '100%',
                  height: '140px',
                  backgroundColor: '#1a1a1a',
                  color: '#f5f5f5',
                  fontFamily: '"Fira Code", "Courier New", monospace',
                  fontSize: '0.85rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #2a2a2a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  resize: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#ff8833'
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255, 136, 51, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#2a2a2a'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Code Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#e5e5e5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Relevant Code
                </label>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                  backgroundColor: '#1f1f1f',
                  borderRadius: '0.375rem',
                  color: '#ff8833',
                  fontWeight: '600',
                  border: '1px solid #2a2a2a',
                }}>
                  {language}
                </span>
              </div>
              <textarea
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Paste your code snippet here..."
                style={{
                  width: '100%',
                  flex: 1,
                  backgroundColor: '#1a1a1a',
                  color: '#f5f5f5',
                  fontFamily: '"Fira Code", "Courier New", monospace',
                  fontSize: '0.85rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #2a2a2a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  resize: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#ff8833'
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255, 136, 51, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#2a2a2a'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Debug Button */}
            <button
              onClick={handleDebug}
              disabled={isLoading || !error.trim()}
              style={{
                width: '100%',
                backgroundColor: error.trim() && !isLoading ? '#ff8833' : '#ff8833',
                color: 'white',
                fontWeight: '700',
                fontSize: '0.95rem',
                padding: '0.875rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: error.trim() && !isLoading ? 'pointer' : 'not-allowed',
                opacity: error.trim() && !isLoading ? 1 : 0.6,
                transition: 'all 0.2s ease',
                letterSpacing: '0.5px',
              }}
              onMouseEnter={(e) => {
                if (error.trim() && !isLoading) {
                  e.currentTarget.style.backgroundColor = '#f57c2b'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                if (error.trim() && !isLoading) {
                  e.currentTarget.style.backgroundColor = '#ff8833'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {isLoading ? '🦆 Debugging...' : 'Debug it'}
            </button>
          </div>

          {/* Right Panel - Output */}
          <div
            ref={outputRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              backgroundColor: '#151515',
              border: '1px solid #2a2a2a',
              borderRadius: '0.625rem',
              padding: '1.75rem',
              overflowY: 'auto',
            }}
          >
            {output.isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ff8833', fontSize: '0.95rem', animation: 'pulse 2s infinite' }}>
                <span>🦆 Duck is thinking</span>
                <span style={{ letterSpacing: '2px' }}>...</span>
              </div>
            )}

            {output.rootCause && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ff8833', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Root Cause
                </h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#d4d4d4' }}>
                  {output.rootCause}
                </p>
              </div>
            )}

            {output.fixedCode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ff8833', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Fixed Code
                </h3>
                <textarea
                  value={output.fixedCode}
                  readOnly
                  style={{
                    width: '100%',
                    height: '200px',
                    backgroundColor: '#0f0f0f',
                    color: '#f5f5f5',
                    fontFamily: '"Fira Code", "Courier New", monospace',
                    fontSize: '0.85rem',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #2a2a2a',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>
            )}

            {output.sources && output.sources.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ff8833', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Reference Sources
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {output.sources.map((source, i) => (
                    <li key={i} style={{ fontSize: '0.85rem', color: '#b4b4b4', paddingLeft: '1.25rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#ff8833' }}>→</span>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#b4b4b4', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                      >
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!output.isLoading && !output.rootCause && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#606060', fontSize: '0.9rem', textAlign: 'center' }}>
                Paste an error and code snippet to get started
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
