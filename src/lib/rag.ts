interface RagSource {
  id: string
  name: string
  content?: string
}

interface RankedChunk {
  sourceName: string
  text: string
  score: number
  index: number
}

const PLACEHOLDER_PREFIXES = ['[Local file:', '[Google Drive:']
const MAX_SOURCE_CHARS = 120_000
const CHUNK_SIZE = 1_000
const CHUNK_OVERLAP = 160
const MAX_CONTEXT_CHARS = 7_000

function normalizeText(value: string) {
  return value
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isRealExtractedContent(content?: string) {
  if (!content?.trim()) return false
  return !PLACEHOLDER_PREFIXES.some(prefix => content.trim().startsWith(prefix))
}

function tokens(value: string) {
  return Array.from(new Set(
    value
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]{2,}/gu) ?? []
  )).slice(0, 40)
}

function chunkText(value: string) {
  const text = normalizeText(value).slice(0, MAX_SOURCE_CHARS)
  if (!text) return []
  if (text.length <= CHUNK_SIZE) return [text]

  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length)
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end)
      const sentenceBreak = Math.max(text.lastIndexOf('. ', end), text.lastIndexOf('؟ ', end), text.lastIndexOf('! ', end))
      const preferredBreak = Math.max(paragraphBreak, sentenceBreak)
      if (preferredBreak > start + CHUNK_SIZE * 0.55) end = preferredBreak + 1
    }
    const chunk = text.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    if (end >= text.length) break
    start = Math.max(end - CHUNK_OVERLAP, start + 1)
  }
  return chunks
}

function scoreChunk(queryTokens: string[], sourceName: string, text: string) {
  const haystack = `${sourceName}\n${text}`.toLocaleLowerCase()
  let score = 0
  for (const token of queryTokens) {
    const occurrences = haystack.split(token).length - 1
    if (occurrences > 0) score += 1 + Math.min(occurrences, 6) * 0.35
    if (sourceName.toLocaleLowerCase().includes(token)) score += 1.5
  }
  return score
}

export function retrieveStudyContext(query: string, sources: RagSource[], selectedSourceId?: string) {
  const usableSources = sources.filter(source => isRealExtractedContent(source.content))
  const scopedSources = selectedSourceId
    ? usableSources.filter(source => source.id === selectedSourceId)
    : usableSources

  if (!scopedSources.length) return ''

  const queryTokens = tokens(query)
  const ranked: RankedChunk[] = []

  for (const source of scopedSources) {
    chunkText(source.content ?? '').forEach((text, index) => {
      ranked.push({
        sourceName: source.name.slice(0, 180),
        text,
        index,
        score: queryTokens.length ? scoreChunk(queryTokens, source.name, text) : 1,
      })
    })
  }

  ranked.sort((a, b) => b.score - a.score || a.index - b.index)
  const selected = ranked.filter(chunk => chunk.score > 0).slice(0, 6)
  if (!selected.length) return ''

  let output = ''
  for (const chunk of selected) {
    const block = `\n[Source: ${chunk.sourceName} · chunk ${chunk.index + 1}]\n${chunk.text}\n`
    if (output.length + block.length > MAX_CONTEXT_CHARS) break
    output += block
  }
  return output.trim()
}

export function hasExtractedStudyText(sources: RagSource[]) {
  return sources.some(source => isRealExtractedContent(source.content))
}
