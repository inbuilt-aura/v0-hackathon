import { streamText, tool } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

console.log('[v0] Groq API Key loaded:', process.env.GROQ_API_KEY ? 'YES' : 'NO')

const tools = {
  searchWeb: tool({
    description: 'Search for error fixes and solutions',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
    }),
    execute: async ({ query }) => {
      return {
        results: [
          {
            title: 'GitHub Issue',
            url: `https://github.com/search?q=${encodeURIComponent(query)}`,
          },
          {
            title: 'Stack Overflow',
            url: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
          },
        ],
      }
    },
  }),

  searchGitHubIssues: tool({
    description: 'Search GitHub issues',
    inputSchema: z.object({
      errorMessage: z.string().describe('Error to search for'),
    }),
    execute: async ({ errorMessage }) => {
      return {
        issues: [
          {
            title: 'Related Issue',
            url: `https://github.com/search?q=${encodeURIComponent(errorMessage)}&type=issues`,
          },
        ],
      }
    },
  }),
}

export async function POST(request: Request) {
  try {
    const { error, code } = await request.json()

    if (!error) {
      return new Response('Error message required', { status: 400 })
    }

    const stream = streamText({
      model: groq('llama-3.3-70b-versatile'),
      tools,
      maxSteps: 5,
      system: `You are DebugDuck, an AI debugging assistant. Analyze errors and provide solutions.

When responding, format your output EXACTLY like this with no other text:

ROOT_CAUSE: [Clear explanation of what went wrong]

FIXED_CODE: [The corrected code in markdown code block with language]

SOURCES: [JSON array of {"title": "...", "url": "..."} objects]`,
      prompt: `Debug this error:

Error: ${error}

Code: ${code}

Provide root cause, fixed code, and relevant sources.`,
    })

    // Convert AI SDK stream to our custom format
    const encoder = new TextEncoder()
    let fullText = ''
    let rootCauseEmitted = false
    let fixedCodeEmitted = false
    let sourcesEmitted = false

    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream.textStream) {
            fullText += chunk

            // Parse ROOT_CAUSE section
            if (!rootCauseEmitted && fullText.includes('ROOT_CAUSE:')) {
              const match = fullText.match(/ROOT_CAUSE:\s*([^\n]+(?:\n(?!FIXED_CODE:|SOURCES:)[^\n]*)*)/m)
              if (match) {
                const rootCause = match[1].trim()
                controller.enqueue(encoder.encode(`ROOT_CAUSE: ${rootCause}\n`))
                rootCauseEmitted = true
              }
            }

            // Parse FIXED_CODE section
            if (!fixedCodeEmitted && fullText.includes('FIXED_CODE:')) {
              const codeMatch = fullText.match(/FIXED_CODE:\s*```[\w]*\n?([\s\S]*?)\n?```/m)
              if (codeMatch) {
                controller.enqueue(encoder.encode(`FIXED_CODE: ${codeMatch[1].trim()}\n`))
                fixedCodeEmitted = true
              }
            }

            // Parse SOURCES section
            if (!sourcesEmitted && fullText.includes('SOURCES:')) {
              const sourceMatch = fullText.match(/SOURCES:\s*(\[[\s\S]*?\])/m)
              if (sourceMatch) {
                try {
                  JSON.parse(sourceMatch[1])
                  controller.enqueue(encoder.encode(`SOURCES: ${sourceMatch[1]}\n`))
                  sourcesEmitted = true
                } catch (e) {
                  // Invalid JSON, skip
                }
              }
            }
          }

          // Emit fallback if needed
          if (!rootCauseEmitted) {
            controller.enqueue(encoder.encode(`ROOT_CAUSE: Check the error message carefully\n`))
          }
          if (!fixedCodeEmitted) {
            controller.enqueue(encoder.encode(`FIXED_CODE: ${code}\n`))
          }
          if (!sourcesEmitted) {
            controller.enqueue(encoder.encode(`SOURCES: []\n`))
          }

          controller.close()
        } catch (error) {
          controller.error(error)
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
  } catch (error) {
    console.error('Debug error:', error)
    return new Response(
      `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    )
  }
}
