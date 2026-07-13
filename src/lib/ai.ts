import type { ApiConfig } from '@/store'
import { supabase } from '@/lib/supabase'

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: { promptTokens?: number; completionTokens?: number }
  quota?: { limit: number; used: number; remaining: number; reset: string }
  provider?: string
  model?: string
  mock?: boolean
}

export function buildChatSystemPrompt(context: string, lang: string): string {
  const langNote = lang === 'ar'
    ? 'تحدث دائماً بالعربية إلا إذا كتب المستخدم بالإنجليزية.'
    : 'Respond in clear English unless the user writes in Arabic.'

  return `You are Nibras (نِبْرَاس) — an elite academic tutor, mentor, and Socratic guide with years of teaching experience.

${langNote}

## Your Teaching Philosophy
You do NOT simply answer questions. You TEACH deeply.

### How you tutor:
- **Socratic Method**: Ask guiding questions before giving final answers. Let the student think first.
- **Layered Explanation**: Start with the big picture, then zoom into details.
- **Detect confusion**: If the student seems lost, simplify automatically — use analogies, metaphors, and real-world examples.
- **Active Recall**: After explaining a concept, ask the student to restate it in their own words.
- **Connect ideas**: Link new concepts to things the student already knows.
- **Encourage thinking**: Never just give the answer. Guide them to discover it.

### Your tone:
Passionate, patient, curious, and genuinely excited about ideas. Like a world-class professor who truly loves their subject.

### Visual Learning:
When helpful, suggest: "أريك مخططاً؟ / Want me to draw a diagram?" then generate a simple ASCII or Markdown diagram.

### Markdown:
Always use Markdown — headings, bold, code blocks, tables, bullet points — to make answers visually clear and structured.

### Context from uploaded materials:
${context || 'No materials uploaded. Answer from deep academic knowledge.'}

### Important rules:
- If the answer isn't in the context, say so honestly — but still teach the concept from general knowledge.
- Never expose raw API errors.
- Short answers for simple questions, rich structured answers for complex ones.
- End complex explanations with: "هل تريد أن أشرح أي جزء أكثر؟ / Want me to go deeper on any part?"`
}

export function detectVisualCommand(text: string): 'mindmap' | 'diagram' | 'timeline' | 'table' | null {
  const normalized = text.toLowerCase()
  if (normalized.includes('mind map') || normalized.includes('خريطة ذهنية') || normalized.includes('مخطط ذهني')) return 'mindmap'
  if (normalized.includes('diagram') || normalized.includes('مخطط') || normalized.includes('رسم') || normalized.includes('اشرح بصرياً') || normalized.includes('explain visually')) return 'diagram'
  if (normalized.includes('timeline') || normalized.includes('جدول زمني')) return 'timeline'
  if (normalized.includes('table') || normalized.includes('جدول') || normalized.includes('قارن')) return 'table'
  return null
}

export function buildSemanticGradingPrompt(question: string, modelAnswer: string, studentAnswer: string, format: 'shortanswer' | 'longanswer'): string {
  const wordLimit = format === 'shortanswer' ? '1-3 sentences' : 'an essay/paragraph'
  return `You are an expert academic evaluator. Assess based on CONCEPTUAL UNDERSTANDING only.

QUESTION: ${question}
MODEL ANSWER: ${modelAnswer}
STUDENT ANSWER (${wordLimit}): ${studentAnswer}

Respond ONLY with valid JSON:
{
  "score": 0,
  "isCorrect": false,
  "feedback": "2-3 sentences on what was correct, missing, and how to improve.",
  "conceptsIdentified": ["concept1"],
  "conceptsMissing": ["missing1"]
}

Rules: score 0-100. isCorrect = true if score >= 60. Reward understanding over exact wording.`
}

export function buildQuizGenerationPrompt(topic: string, format: string, count: number, lang: string): string {
  const langNote = lang === 'ar'
    ? 'Generate all questions, answers, and explanations in Arabic.'
    : 'Generate all questions, answers, and explanations in English.'

  const formatGuide: Record<string, string> = {
    mcq: 'Multiple choice with exactly 4 options.',
    truefalse: 'True/False. correctAnswer must be "true" or "false".',
    flashcard: 'Flashcards. question = front, correctAnswer = back.',
    fillblank: 'Fill-in-the-blank. Use ___ for the blank.',
    shortanswer: 'Short open-ended question. Provide a model answer (1-3 sentences).',
    longanswer: 'Essay question. Provide a clear model answer.',
  }

  return `You are an expert educational content generator.
Create exactly ${count} questions about: "${topic}"
${langNote}
Format: ${formatGuide[format] || format}

Return ONLY valid JSON array. No markdown. No preamble.
[{ "id": "q1", "format": "${format}", "question": "...", "options": [...], "correctAnswer": "...", "explanation": "...", "topic": "${topic}" }]

Rules: MCQ = 4 options. truefalse correctAnswer = "true"/"false". Vary difficulty easy/medium/hard. Generate exactly ${count} items.`
}

export async function callLLM(
  messages: LLMMessage[],
  config?: ApiConfig,
  options?: {
    maxTokens?: number
    temperature?: number
    feature?: string
    mock?: boolean
    mockLatency?: number
    mockResponse?: string
    mockFail?: boolean
  }
): Promise<LLMResponse> {
  const usePlatform = !config?.apiKey || config.apiKey.trim() === ''
  const body: Record<string, unknown> = {
    messages,
    max_tokens: options?.maxTokens ?? 1200,
    temperature: options?.temperature ?? 0.7,
    feature: options?.feature ?? 'chat',
  }

  if (options?.mock) {
    Object.assign(body, {
      mock: true,
      mockLatency: options.mockLatency ?? 300,
      mockResponse: options.mockResponse,
      mockFail: options.mockFail,
    })
  }

  if (!usePlatform && config?.apiKey) {
    body.useCustomKey = true
    body.customKey = config.apiKey
    body.customProvider = config.provider
    body.customModel = config.model
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (!options?.mock) {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session?.access_token) throw new Error('auth_required')
    headers.Authorization = `Bearer ${data.session.access_token}`
  }

  const response = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let parsed: Record<string, unknown> = {}
    try { parsed = JSON.parse(text) as Record<string, unknown> } catch {}

    const errorCode = String(parsed.error || '')
    const message = String(parsed.message || '')

    if (response.status === 429) throw new Error('rate_limit')
    if (errorCode === 'auth_required' || errorCode === 'invalid_session' || errorCode === 'auth_service_unavailable') {
      throw new Error(`auth_required:${message}`)
    }
    if (response.status === 401 || errorCode === 'invalid_key') throw new Error('invalid_key')
    if (errorCode === 'platform_key_missing') throw new Error('platform_key_missing')
    if (errorCode === 'quota_service_unavailable') throw new Error(`quota_service_unavailable:${message}`)
    if (response.status === 502 || errorCode.includes('provider') || errorCode.includes('openrouter') || errorCode.includes('gemini') || errorCode.includes('groq')) {
      throw new Error(`provider_error:${message || 'The AI provider failed.'}`)
    }
    throw new Error(message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  const content = String(data?.content || '').trim()
  if (!content) throw new Error('provider_error:Empty AI response.')

  return {
    content,
    usage: data?.usage
      ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
      : undefined,
    quota: data?.quota,
    provider: data?.provider,
    model: data?.model,
    mock: data?.mock ?? false,
  }
}

export function extractJson(text: string): string {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const arrayStart = cleaned.indexOf('[')
  const arrayEnd = cleaned.lastIndexOf(']')
  if (arrayStart !== -1 && arrayEnd > arrayStart) return cleaned.slice(arrayStart, arrayEnd + 1)
  const objectStart = cleaned.indexOf('{')
  const objectEnd = cleaned.lastIndexOf('}')
  if (objectStart !== -1 && objectEnd > objectStart) return cleaned.slice(objectStart, objectEnd + 1)
  return cleaned
}

export async function evaluateSemanticAnswer(question: string, modelAnswer: string, studentAnswer: string, format: 'shortanswer' | 'longanswer', config: ApiConfig) {
  const prompt = buildSemanticGradingPrompt(question, modelAnswer, studentAnswer, format)
  const response = await callLLM([{ role: 'user', content: prompt }], config, {
    maxTokens: 600,
    temperature: 0.2,
    feature: 'semantic_grading',
  })
  try {
    const parsed = JSON.parse(extractJson(response.content))
    return {
      score: Number(parsed.score ?? 0),
      isCorrect: Boolean(parsed.isCorrect ?? Number(parsed.score ?? 0) >= 60),
      feedback: String(parsed.feedback ?? ''),
      conceptsIdentified: Array.isArray(parsed.conceptsIdentified) ? parsed.conceptsIdentified : [],
      conceptsMissing: Array.isArray(parsed.conceptsMissing) ? parsed.conceptsMissing : [],
    }
  } catch {
    const scoreMatch = response.content.match(/"score"\s*:\s*(\d+)/)
    const score = scoreMatch ? Number(scoreMatch[1]) : 50
    return { score, isCorrect: score >= 60, feedback: 'Could not parse AI feedback.', conceptsIdentified: [], conceptsMissing: [] }
  }
}

export async function generateQuizQuestions(topic: string, format: string, count: number, config: ApiConfig, lang: string): Promise<any[]> {
  const prompt = buildQuizGenerationPrompt(topic, format, count, lang)
  const response = await callLLM([{ role: 'user', content: prompt }], config, {
    maxTokens: 2200,
    temperature: 0.6,
    feature: 'quiz_generation',
  })
  try {
    const parsed = JSON.parse(extractJson(response.content))
    const questions = Array.isArray(parsed) ? parsed : [parsed]
    return questions.map((question, index) => ({
      id: question.id || `q${index + 1}`,
      format: question.format || format,
      question: question.question || '',
      options: question.options || null,
      correctAnswer: question.correctAnswer || question.answer || '',
      explanation: question.explanation || '',
      topic: question.topic || topic,
    }))
  } catch {
    throw new Error('Failed to parse quiz questions from AI response.')
  }
}

export function buildVisualPrompt(topic: string, type: 'mindmap' | 'diagram' | 'timeline' | 'table'): string {
  if (type === 'mindmap') {
    return `Generate a mind map for the topic: "${topic}"
Return ONLY valid JSON, no markdown, no explanation:
{
  "center": "Main Topic",
  "branches": [
    { "label": "Branch 1", "children": ["Sub 1", "Sub 2"] },
    { "label": "Branch 2", "children": ["Sub 3", "Sub 4"] }
  ]
}
Generate 4-6 branches, each with 2-3 children. Be specific to the topic.`
  }
  if (type === 'timeline') {
    return `Generate a timeline for: "${topic}"
Return ONLY valid JSON:
{ "title": "...", "events": [{ "year": "...", "label": "...", "detail": "..." }] }
Generate 5-7 chronological events.`
  }
  if (type === 'table') {
    return `Generate a comparison table for: "${topic}"
Return ONLY valid JSON:
{ "title": "...", "headers": ["Col1","Col2","Col3"], "rows": [["r1c1","r1c2","r1c3"]] }
Generate 4-6 rows of meaningful data.`
  }
  return `Generate a step-by-step flowchart for: "${topic}"
Return ONLY valid JSON:
{ "title": "...", "steps": [{ "id": 1, "label": "...", "detail": "..." }], "connections": [[1,2],[2,3]] }
Generate 5-7 steps.`
}
