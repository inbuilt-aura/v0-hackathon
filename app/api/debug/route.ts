import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'

const apiKey = process.env.GROQ_API_KEY

const groq = createGroq({
  apiKey,
})

export async function POST(request: Request) {
  try {
    const { error, code } = await request.json()

    if (!error) {
      return new Response('Error message required', { status: 400 })
    }

    const stream = streamText({
      model: groq('llama-3.3-70b-versatile'),
      maxSteps: 5,
      system: `You are DebugDuck, an AI debugging assistant. Analyze errors and provide solutions.

When responding, format your output EXACTLY like this with no other text:

ROOT_CAUSE: [Clear explanation of what went wrong]

FIXED_CODE: [The corrected code in markdown code block with language]

SOURCES: [JSON array of relevant links like {"title": "GitHub", "url": "https://..."}]`,
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

            // Only emit ROOT_CAUSE once FIXED_CODE: has appeared (guarantees root cause text is complete)
            if (!rootCauseEmitted && fullText.includes('FIXED_CODE:')) {
              const match = fullText.match(/ROOT_CAUSE:\s*([\s\S]*?)\n\s*\nFIXED_CODE:/m)
              const rootCause = match ? match[1].trim() : fullText.split('FIXED_CODE:')[0].replace('ROOT_CAUSE:', '').trim()
              if (rootCause) {
                controller.enqueue(encoder.encode(`ROOT_CAUSE: ${rootCause}\n`))
                rootCauseEmitted = true
              }
            }

            // Only emit FIXED_CODE once SOURCES: has appeared (guarantees code block is complete)
            if (!fixedCodeEmitted && fullText.includes('SOURCES:')) {
              const codeMatch = fullText.match(/FIXED_CODE:\s*```[\w]*\n?([\s\S]*?)\n?```/m)
              if (codeMatch) {
                controller.enqueue(encoder.encode(`FIXED_CODE: ${codeMatch[1].trim()}\n`))
                fixedCodeEmitted = true
              }
            }

            // Only emit SOURCES once the closing bracket ] is present
            if (!sourcesEmitted && fullText.includes('SOURCES:')) {
              const sourceMatch = fullText.match(/SOURCES:\s*(\[[\s\S]*?\])/m)
              if (sourceMatch) {
                controller.enqueue(encoder.encode(`SOURCES: ${sourceMatch[1]}\n`))
                sourcesEmitted = true
              }
            }
          }

          // Emit any remaining sections after stream ends
          if (!rootCauseEmitted) {
            const match = fullText.match(/ROOT_CAUSE:\s*([\s\S]*?)(?:\n\s*\nFIXED_CODE:|$)/m)
            const rootCause = match ? match[1].trim() : 'Check the error message carefully'
            controller.enqueue(encoder.encode(`ROOT_CAUSE: ${rootCause}\n`))
          }
          if (!fixedCodeEmitted) {
            const codeMatch = fullText.match(/FIXED_CODE:\s*```[\w]*\n?([\s\S]*?)\n?```/m)
            controller.enqueue(encoder.encode(`FIXED_CODE: ${codeMatch ? codeMatch[1].trim() : code}\n`))
          }
          if (!sourcesEmitted) {
            const sourceMatch = fullText.match(/SOURCES:\s*(\[[\s\S]*?\])/m)
            controller.enqueue(encoder.encode(`SOURCES: ${sourceMatch ? sourceMatch[1] : '[]'}\n`))
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
