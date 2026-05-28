import { ApiConfig } from '@/store'

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: { promptTokens: number; completionTokens: number }
}

// ─── Semantic Grading Prompt ──────────────────────────────────────────────────
// This is the core of the anti-keyword-matching grading system.
// The LLM evaluates MEANING, not exact words.
export function buildSemanticGradingPrompt(
  question: string,
  modelAnswer: string,
  studentAnswer: string,
  format: 'shortanswer' | 'longanswer'
): string {
  const wordLimit = format === 'shortanswer' ? '1-3 sentences' : 'an essay/paragraph'
  return `You are an expert academic evaluator. Your task is to assess a student's answer based on CONCEPTUAL UNDERSTANDING and SEMANTIC MEANING only. Do NOT check for exact keywords or phrasing.

EVALUATION CRITERIA:
1. Does the student demonstrate genuine comprehension of the core concept?
2. Is the reasoning logically sound, even if expressed in different words?
3. Are the key ideas present, regardless of vocabulary used?
4. For long answers: Is the argument coherent and well-supported?

QUESTION: ${question}

MODEL ANSWER (use as reference for correct concepts, not exact wording):
${modelAnswer}

STUDENT ANSWER (${wordLimit}):
${studentAnswer}

Respond ONLY with valid JSON in this exact format:
{
  "score": <integer 0-100>,
  "isCorrect": <boolean, true if score >= 60>,
  "feedback": "<2-3 sentences explaining what was correct, what was missing, and how to improve. Be encouraging but honest.>",
  "conceptsIdentified": ["<concept1>", "<concept2>"],
  "conceptsMissing": ["<missing1>"]
}

IMPORTANT: A student who explains the right idea in completely different words should score well. A student who copies keywords without understanding should score low.`
}

// ─── Quiz Generation Prompt ───────────────────────────────────────────────────
export function buildQuizGenerationPrompt(
  topic: string,
  format: string,
  count: number,
  lang: string
): string {
  const langNote = lang === 'ar' ? 'Generate all questions and answers IN ARABIC.' : 'Generate all content in English.'
  const formatGuide: Record<string, string> = {
    mcq: 'Multiple choice with exactly 4 options (A, B, C, D). Mark correct option.',
    truefalse: 'True/False statements. correctAnswer must be "true" or "false".',
    flashcard: 'Front (question/term) and back (answer/definition). No options needed.',
    fillblank: 'Sentence with ONE blank marked as ___. correctAnswer is the missing word/phrase.',
    shortanswer: 'Open-ended question requiring 1-3 sentence answer. Provide a model answer.',
    longanswer: 'Essay-style question. Provide a comprehensive model answer (150-300 words).',
  }

  return `You are an expert educational content generator. Create ${count} ${format} quiz questions about: "${topic}".
${langNote}
Format: ${formatGuide[format] || format}

Respond ONLY with valid JSON array. No markdown, no explanation, just the JSON.
[
  {
    "id": "q1",
    "format": "${format}",
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],  // only for MCQ
    "correctAnswer": "...",
    "explanation": "Brief explanation of why this is correct",
    "topic": "${topic}"
  }
]
For non-MCQ formats, omit the "options" field or set it to null.
Generate exactly ${count} questions. Vary difficulty (easy, medium, hard).`
}

// ─── Chat System Prompt ───────────────────────────────────────────────────────
export function buildChatSystemPrompt(context: string, lang: string): string {
  const langNote = lang === 'ar'
    ? 'ALWAYS respond in Arabic unless the user writes in English.'
    : 'Respond in clear English.'
  return `You are Nibras (نبراس), an intelligent academic study assistant. You help students understand their study materials through clear explanations, analogies, and guided questions.

${langNote}

Your teaching approach:
- Use the Socratic method when appropriate — ask guiding questions
- Give concrete examples and analogies
- Break down complex concepts step by step
- Be encouraging and patient
- If asked to quiz the student, do it conversationally

Study Material Context:
${context || 'No specific material provided. Answer from general knowledge.'}

Guidelines:
- Stay focused on academic topics
- If the context doesn't contain the answer, say so honestly
- Use LaTeX notation for math when needed: $formula$
- Keep responses concise unless a detailed explanation is needed`
}

// ─── API Call ─────────────────────────────────────────────────────────────────
/*export async function callLLM(
  messages: LLMMessage[],
  config: ApiConfig,
  options?: { maxTokens?: number; temperature?: number }
): Promise<LLMResponse> {
  const { apiKey, provider, model } = config
  const maxTokens = options?.maxTokens ?? 1000
  const temperature = options?.temperature ?? 0.7

  if (!apiKey) {
    throw new Error('API key not configured. Please add your API key in Settings.')
  }

  // OpenRouter (supports many free models including Mistral, Llama, Gemma)
  if (provider === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nibras-study.app',
        'X-Title': 'Nibras Study App',
      },
      body: JSON.stringify({
        model: model || 'mistralai/mistral-7b-instruct',
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenRouter error: ${err}`)
    }
    const data = await res.json()
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      },
    }
  }

  // Gemini (free tier via Google AI Studio)
  if (provider === 'gemini') {
    const geminiModel = model || 'gemini-1.5-flash'
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    const systemInstruction = messages.find((m) => m.role === 'system')?.content
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemInstruction && { system_instruction: { parts: [{ text: systemInstruction }] } }),
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
      }
    )
    if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`)
    const data = await res.json()
    return { content: data.candidates[0].content.parts[0].text }
  }

  // OpenAI-compatible (default)
  const baseURL = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.openai.com/v1'
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || 'gpt-3.5-turbo', messages, max_tokens: maxTokens, temperature }),
  })
  if (!res.ok) throw new Error(`API error: ${await res.text()}`)
  const data = await res.json()
  return { content: data.choices[0].message.content }
}
*/
export async function callLLM(
  messages: LLMMessage[],
  config: ApiConfig,
  options?: { maxTokens?: number; temperature?: number }
): Promise<LLMResponse> {
  const { apiKey, provider, model } = config
  const maxTokens = options?.maxTokens ?? 1000
  const temperature = options?.temperature ?? 0.7

  if (!apiKey) {
    throw new Error('API key not configured. Please add your API key in Settings.')
  }

  // ── OpenRouter ──────────────────────────────────────────────────────────────
  if (provider === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nibras-study.app',
        'X-Title': 'Nibras Study App',
      },
      body: JSON.stringify({
        model: model || 'meta-llama/llama-3.1-8b-instruct:free',
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenRouter error: ${err}`)
    }
    const data = await res.json()
    return { content: data.choices[0].message.content }
  }

  // ── Gemini ──────────────────────────────────────────────────────────────────
  if (provider === 'gemini') {
    const geminiModel = model || 'gemini-1.5-flash'
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    const systemInstruction = messages.find(m => m.role === 'system')?.content
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemInstruction && { system_instruction: { parts: [{ text: systemInstruction }] } }),
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
      }
    )
    if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`)
    const data = await res.json()
    return { content: data.candidates[0].content.parts[0].text }
  }

  // ── OpenAI ──────────────────────────────────────────────────────────────────
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-3.5-turbo',
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`)
  const data = await res.json()
  return { content: data.choices[0].message.content }
}
// ─── Semantic Grading ─────────────────────────────────────────────────────────
export async function evaluateSemanticAnswer(
  question: string,
  modelAnswer: string,
  studentAnswer: string,
  format: 'shortanswer' | 'longanswer',
  config: ApiConfig
): Promise<{ score: number; isCorrect: boolean; feedback: string; conceptsIdentified: string[]; conceptsMissing: string[] }> {
  const prompt = buildSemanticGradingPrompt(question, modelAnswer, studentAnswer, format)
  const response = await callLLM(
    [{ role: 'user', content: prompt }],
    config,
    { maxTokens: 500, temperature: 0.2 }
  )

  try {
    const clean = response.content.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    // Fallback: attempt to extract score from text
    const scoreMatch = response.content.match(/"score":\s*(\d+)/)
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50
    return {
      score,
      isCorrect: score >= 60,
      feedback: response.content.replace(/```json|```|\{|\}/g, '').trim() || 'Could not parse feedback.',
      conceptsIdentified: [],
      conceptsMissing: [],
    }
  }
}

// ─── Quiz Generation ──────────────────────────────────────────────────────────
export async function generateQuizQuestions(
  topic: string,
  format: string,
  count: number,
  config: ApiConfig,
  lang: string
): Promise<any[]> {
  const prompt = buildQuizGenerationPrompt(topic, format, count, lang)
  const response = await callLLM(
    [{ role: 'user', content: prompt }],
    config,
    { maxTokens: 2000, temperature: 0.6 }
  )

  try {
    const clean = response.content.replace(/```json|```/g, '').trim()
    const questions = JSON.parse(clean)
    return Array.isArray(questions) ? questions : [questions]
  } catch {
    throw new Error('Failed to parse quiz questions from AI response.')
  }
}
