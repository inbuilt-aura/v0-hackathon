import { streamText, tool } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

// Real Exa search function
async function exaSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) return []

  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: 5,
        useAutoprompt: true,
        type: 'neural',
        contents: { text: { maxCharacters: 500 } },
      }),
    })

    const data = await response.json()
    return (data.results || []).map((r: any) => ({
      title: r.title || 'Source',
      url: r.url,
      snippet: r.text?.slice(0, 200) || '',
    }))
  } catch {
    return []
  }
}

// Real GitHub issues search
async function githubSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  try {
    const encoded = encodeURIComponent(query)
    const response = await fetch(
      `https://api.github.com/search/issues?q=${encoded}&sort=relevance&per_page=5`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
      }
    )
    const data = await response.json()
    return (data.items || []).map((item: any) => ({
      title: item.title,
      url: item.html_url,
      snippet: item.body?.slice(0, 200) || '',
    }))
  } catch {
    return []
  }
}

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { error, code, stack } = await request.json()

    if (!error) {
      return new Response('Error message required', { status: 400 })
    }

    // Run real searches in parallel BEFORE calling the LLM
    const searchQuery = `${error} fix ${stack || ''}`
    const [webResults, githubResults] = await Promise.all([
      exaSearch(searchQuery),
      githubSearch(`${error} ${stack || ''}`),
    ])

    const allSources = [...githubResults, ...webResults].slice(0, 6)

    const sourcesContext = allSources.length > 0
      ? allSources.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet}`).join('\n\n')
      : 'No external sources found.'

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `You are DebugDuck. Always use the provided search results first before answering. Format your final response EXACTLY as shown below — no extra text, no deviation:

ROOT_CAUSE: [Clear explanation of why this error occurs]

FIXED_CODE:
\`\`\`
[Complete corrected code]
\`\`\`

SOURCES: [{"title":"...","url":"..."}]`,
      prompt: `Error:
${error}

User's code:
${code || 'No code provided'}

Stack: ${stack || 'Not specified'}

Real search results found for this error:
${sourcesContext}

Using the search results above, identify the root cause, provide the fixed code, and cite the most relevant sources from the results.`,
    })

    const encoder = new TextEncoder()
    let fullText = ''
    let rootCauseEmitted = false
    let fixedCodeEmitted = false
    let sourcesEmitted = false

    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullText += chunk

            if (!rootCauseEmitted && fullText.includes('FIXED_CODE:')) {
              const match = fullText.match(/ROOT_CAUSE:\s*([\s\S]*?)(?:\n\s*FIXED_CODE:)/m)
              const rootCause = match ? match[1].trim() : fullText.split('FIXED_CODE:')[0].replace('ROOT_CAUSE:', '').trim()
              if (rootCause) {
                controller.enqueue(encoder.encode(`ROOT_CAUSE: ${rootCause}\n`))
                rootCauseEmitted = true
              }
            }

            if (!fixedCodeEmitted && fullText.includes('SOURCES:')) {
              const codeMatch = fullText.match(/FIXED_CODE:\s*```[\w]*\n?([\s\S]*?)\n?```/m)
              if (codeMatch) {
                controller.enqueue(encoder.encode(`FIXED_CODE: ${codeMatch[1].trim()}\n`))
                fixedCodeEmitted = true
              }
            }

            if (!sourcesEmitted && fullText.includes('SOURCES:')) {
              // Use real sources from our search, not hallucinated ones
              const sourcesJson = JSON.stringify(
                allSources.map(s => ({ title: s.title, url: s.url }))
              )
              controller.enqueue(encoder.encode(`SOURCES: ${sourcesJson}\n`))
              sourcesEmitted = true
            }
          }

          // Fallback emits after stream ends
          if (!rootCauseEmitted) {
            const match = fullText.match(/ROOT_CAUSE:\s*([\s\S]*?)(?:\nFIXED_CODE:|$)/m)
            controller.enqueue(encoder.encode(`ROOT_CAUSE: ${match ? match[1].trim() : 'Could not determine root cause'}\n`))
          }
          if (!fixedCodeEmitted) {
            const codeMatch = fullText.match(/FIXED_CODE:\s*```[\w]*\n?([\s\S]*?)\n?```/m)
            controller.enqueue(encoder.encode(`FIXED_CODE: ${codeMatch ? codeMatch[1].trim() : code}\n`))
          }
          if (!sourcesEmitted) {
            controller.enqueue(encoder.encode(`SOURCES: ${JSON.stringify(allSources.map(s => ({ title: s.title, url: s.url })))}\n`))
          }

          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Debug error:', err)
    return new Response(
      `ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`,
      { status: 500 }
    )
  }
}
