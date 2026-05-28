import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BrainCircuit, Play, ChevronRight, CheckCircle2, XCircle,
  RotateCcw, Loader2, AlertCircle, Lightbulb, BarChart3,
  RefreshCw, Layers, BookOpen, Sparkles
} from 'lucide-react'
import { useStore, QuizFormat, QuizSession, QuizQuestion, QuizAttempt } from '@/store'
import { useT } from '@/hooks/useT'
import { generateQuizQuestions, evaluateSemanticAnswer } from '@/lib/ai'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

// ─── Sounds ───────────────────────────────────────────────────────────────────
function playSound(type: 'correct' | 'incorrect' | 'complete') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'correct') {
      osc.frequency.setValueAtTime(523, ctx.currentTime)
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
    } else if (type === 'incorrect') {
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      osc.type = 'sawtooth'
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.start(); osc.stop(ctx.currentTime + 0.25)
    } else {
      ;[523, 659, 784, 1047].forEach((freq, i) => {
        const o2 = ctx.createOscillator()
        const g2 = ctx.createGain()
        o2.connect(g2); g2.connect(ctx.destination)
        o2.frequency.value = freq
        g2.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
        g2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.05)
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3)
        o2.start(ctx.currentTime + i * 0.12)
        o2.stop(ctx.currentTime + i * 0.12 + 0.3)
      })
    }
  } catch {}
}

// ─── Format selector badge ─────────────────────────────────────────────────────
const FORMAT_META: { format: QuizFormat; icon: string; color: string }[] = [
  { format: 'mcq', icon: '🔘', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  { format: 'truefalse', icon: '⚖️', color: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30' },
  { format: 'flashcard', icon: '🃏', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  { format: 'fillblank', icon: '✏️', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  { format: 'shortanswer', icon: '📝', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' },
  { format: 'longanswer', icon: '📄', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
]

// ─── QUIZ SETUP ───────────────────────────────────────────────────────────────
function QuizSetup({ onStart }: { onStart: (session: QuizSession) => void }) {
  const { t, lang } = useT()
  const { files, apiConfig, addQuizSession } = useStore()
  const [format, setFormat] = useState<QuizFormat>('mcq')
  const [count, setCount] = useState(5)
  const [fileId, setFileId] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    const source = files.find(f => f.id === fileId)?.name || topic
    if (!source.trim()) { setError('Please select a file or enter a topic.'); return }
    if (!apiConfig.apiKey) { setError(t('apiKeyRequired')); return }
    setLoading(true); setError('')
    try {
      const questions = await generateQuizQuestions(source, format, count, apiConfig, lang)
      const session: QuizSession = {
        id: `quiz-${Date.now()}`,
        title: `${t(format)} — ${source.slice(0, 30)}`,
        format,
        questions: questions.map((q: any, i: number) => ({ ...q, id: q.id || `q${i}` })),
        attempts: [],
        score: 0,
        completed: false,
        createdAt: new Date().toISOString(),
      }
      addQuizSession(session)
      onStart(session)
    } catch (e: any) {
      setError(e.message || t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section-wrapper max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-foreground">{t('quizTitle')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('poweredBy')}</p>
      </div>

      <div className="space-y-5">
        {/* Format selector */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">{t('quizFormat')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FORMAT_META.map(({ format: f, icon, color }) => (
              <button key={f} onClick={() => setFormat(f)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  format === f ? color + ' ring-2 ring-offset-1 ring-current/30' : 'border-border/60 hover:bg-muted'
                )}
              >
                <span>{icon}</span><span>{t(f)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Source */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('selectTopicFile')}</h3>
          {files.length > 0 && (
            <select value={fileId} onChange={e => { setFileId(e.target.value); if (e.target.value) setTopic('') }}
              className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border">
              <option value="">{t('selectTopicFile')}</option>
              {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-xs text-muted-foreground">{t('orEnterTopic')}</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          <input type="text" value={topic} onChange={e => { setTopic(e.target.value); if (e.target.value) setFileId('') }}
            placeholder={t('topicPlaceholder')} dir="auto"
            className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border" />
        </div>

        {/* Count */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('numQuestions')}</h3>
            <span className="badge-gold">{count}</span>
          </div>
          <input type="range" min={3} max={20} value={count} onChange={e => setCount(+e.target.value)}
            className="w-full accent-teal-500" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>3</span><span>20</span></div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            {error.includes('API') && (
              <Link to="/settings" className="ms-auto text-xs underline font-medium shrink-0">{t('settings')}</Link>
            )}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={generate}
          disabled={loading}
          className={cn('btn-teal w-full py-3 text-base', loading && 'opacity-70 cursor-wait')}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" />{t('loading')}</>
          ) : (
            <><Play className="w-5 h-5" />{t('generateQuiz')}</>
          )}
        </motion.button>
      </div>
    </div>
  )
}

// ─── FLASHCARD ────────────────────────────────────────────────────────────────
function FlashCard({ q, onResult }: { q: QuizQuestion; onResult: (correct: boolean) => void }) {
  const { t } = useT()
  const [flipped, setFlipped] = useState(false)
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="perspective w-full max-w-md cursor-pointer" onClick={() => setFlipped(!flipped)}>
        <div className={cn('card-inner w-full relative', flipped && 'flipped')} style={{ height: '240px' }}>
          {/* Front */}
          <div className="card-face absolute inset-0 glass-card rounded-2xl flex flex-col items-center justify-center p-8 text-center">
            <BookOpen className="w-8 h-8 text-primary/50 mb-4" />
            <p className="text-lg font-semibold" dir="auto">{q.question}</p>
            <p className="text-xs text-muted-foreground mt-4">{t('flipCard')} ↕</p>
          </div>
          {/* Back */}
          <div className="card-face card-back absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8 text-center"
            style={{ background: 'linear-gradient(135deg, #1A4D53, #2D7A84)' }}>
            <Lightbulb className="w-8 h-8 text-gold-light/70 mb-4" />
            <p className="text-lg font-semibold text-white" dir="auto">{q.correctAnswer}</p>
          </div>
        </div>
      </div>

      {flipped && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
          <button onClick={() => onResult(false)} className="px-6 py-2.5 rounded-xl bg-destructive/15 text-destructive font-semibold hover:bg-destructive/25 transition-colors">
            {t('markIncorrect')}
          </button>
          <button onClick={() => onResult(true)} className="px-6 py-2.5 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 font-semibold hover:bg-teal-500/25 transition-colors">
            {t('markCorrect')}
          </button>
        </motion.div>
      )}
    </div>
  )
}

// ─── QUIZ PLAYER ──────────────────────────────────────────────────────────────
function QuizPlayer({ session, onComplete }: { session: QuizSession; onComplete: () => void }) {
  const { t, lang } = useT()
  const { apiConfig, updateQuizSession } = useStore()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [attempts, setAttempts] = useState<QuizAttempt[]>([...session.attempts])
  const [feedback, setFeedback] = useState<{ correct: boolean; feedback: string; score?: number } | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState('')

  const q = session.questions[currentIdx]
  const isLastQ = currentIdx === session.questions.length - 1
  const isOpenAnswer = q.format === 'shortanswer' || q.format === 'longanswer'
  const isFlashcard = q.format === 'flashcard'
  const progress = ((currentIdx) / session.questions.length) * 100

  const submitAnswer = async () => {
    if (!answer.trim() && !isFlashcard) return
    setError('')

    if (isOpenAnswer) {
      setEvaluating(true)
      try {
        const result = await evaluateSemanticAnswer(
          q.question, q.correctAnswer, answer,
          q.format as 'shortanswer' | 'longanswer', apiConfig
        )
        setFeedback({ correct: result.isCorrect, feedback: result.feedback, score: result.score })
        const attempt: QuizAttempt = {
          questionId: q.id, userAnswer: answer,
          isCorrect: result.isCorrect, score: result.score,
          feedback: result.feedback, evaluatedAt: new Date().toISOString(),
        }
        const newAttempts = [...attempts, attempt]
        setAttempts(newAttempts)
        updateQuizSession(session.id, { attempts: newAttempts })
        if (result.isCorrect) playSound('correct'); else playSound('incorrect')
      } catch (e: any) {
        setError(e.message || t('error'))
      } finally {
        setEvaluating(false)
      }
      return
    }

    // Objective grading
    const correct = answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
    setFeedback({ correct, feedback: q.explanation || '' })
    const attempt: QuizAttempt = {
      questionId: q.id, userAnswer: answer,
      isCorrect: correct, evaluatedAt: new Date().toISOString(),
    }
    const newAttempts = [...attempts, attempt]
    setAttempts(newAttempts)
    updateQuizSession(session.id, { attempts: newAttempts })
    if (correct) playSound('correct'); else playSound('incorrect')
  }

  const handleFlashcard = (correct: boolean) => {
    const attempt: QuizAttempt = {
      questionId: q.id, userAnswer: correct ? 'correct' : 'incorrect',
      isCorrect: correct, evaluatedAt: new Date().toISOString(),
    }
    const newAttempts = [...attempts, attempt]
    setAttempts(newAttempts)
    updateQuizSession(session.id, { attempts: newAttempts })
    if (correct) playSound('correct')
    nextQuestion(newAttempts)
  }

  const nextQuestion = (currentAttempts = attempts) => {
    setAnswer('')
    setFeedback(null)
    setError('')
    if (isLastQ) {
      const score = Math.round((currentAttempts.filter(a => a.isCorrect).length / session.questions.length) * 100)
      updateQuizSession(session.id, { attempts: currentAttempts, score, completed: true })
      playSound('complete')
      onComplete()
    } else {
      setCurrentIdx(i => i + 1)
    }
  }

  return (
    <div className="section-wrapper max-w-2xl space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-muted-foreground">{t('session')} {currentIdx + 1} / {session.questions.length}</span>
        <span className="badge-gold">{session.title.split('—')[0].trim()}</span>
      </div>
      <div className="quiz-progress"><div className="quiz-progress-fill" style={{ width: `${progress}%` }} /></div>

      {/* Question card */}
      <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className="glass-card rounded-2xl p-6 space-y-5">
        <p className="text-base font-semibold leading-relaxed" dir="auto">{q.question}</p>

        {/* MCQ */}
        {q.format === 'mcq' && q.options && (
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const isSelected = answer === opt
              const showResult = !!feedback
              const isCorrectOpt = opt.toLowerCase() === q.correctAnswer.toLowerCase() || q.correctAnswer.toLowerCase().includes(opt[0]?.toLowerCase() ?? '')
              return (
                <button key={i} onClick={() => !feedback && setAnswer(opt)}
                  disabled={!!feedback}
                  className={cn(
                    'w-full text-start px-4 py-3 rounded-xl border text-sm transition-all',
                    !showResult && isSelected && 'border-primary bg-primary/10',
                    !showResult && !isSelected && 'border-border/60 hover:border-primary/40 hover:bg-muted',
                    showResult && isCorrectOpt && 'border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300',
                    showResult && isSelected && !isCorrectOpt && 'border-destructive bg-destructive/15 text-destructive',
                    showResult && !isSelected && !isCorrectOpt && 'border-border/40 opacity-50',
                  )}
                  dir="auto"
                >{opt}</button>
              )
            })}
          </div>
        )}

        {/* True/False */}
        {q.format === 'truefalse' && (
          <div className="flex gap-3">
            {['true', 'false'].map(v => {
              const label = v === 'true' ? '✓ True / صح' : '✗ False / خطأ'
              const isSelected = answer === v
              const showResult = !!feedback
              const isCorrectOpt = q.correctAnswer.toLowerCase() === v
              return (
                <button key={v} onClick={() => !feedback && setAnswer(v)}
                  disabled={!!feedback}
                  className={cn(
                    'flex-1 py-3 rounded-xl border font-semibold text-sm transition-all',
                    !showResult && isSelected && 'border-primary bg-primary/10',
                    !showResult && !isSelected && 'border-border/60 hover:border-primary/40 hover:bg-muted',
                    showResult && isCorrectOpt && 'border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300',
                    showResult && isSelected && !isCorrectOpt && 'border-destructive bg-destructive/15 text-destructive',
                  )}
                >{label}</button>
              )
            })}
          </div>
        )}

        {/* Fill blank */}
        {q.format === 'fillblank' && (
          <input type="text" value={answer} onChange={e => !feedback && setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !feedback && submitAnswer()}
            placeholder="Type the missing word..." disabled={!!feedback} dir="auto"
            className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm" />
        )}

        {/* Short/Long answer */}
        {isOpenAnswer && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('semanticGrading')}</span>
            </div>
            <textarea
              value={answer}
              onChange={e => !feedback && setAnswer(e.target.value)}
              placeholder={q.format === 'shortanswer' ? 'Write 1-3 sentences...' : 'Write a detailed answer...'}
              disabled={!!feedback || evaluating}
              rows={q.format === 'longanswer' ? 6 : 3}
              dir="auto"
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm resize-none"
            />
          </div>
        )}

        {/* Flashcard */}
        {isFlashcard && <FlashCard q={q} onResult={handleFlashcard} />}

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl p-4 space-y-2 border',
                feedback.correct
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
              )}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                {feedback.correct
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <XCircle className="w-4 h-4" />}
                {feedback.correct ? t('correctAnswer') : t('yourAnswer')}
                {feedback.score !== undefined && (
                  <span className="ms-auto badge-gold">{feedback.score}/100</span>
                )}
              </div>
              {feedback.feedback && (
                <p className="text-sm opacity-90" dir="auto">{feedback.feedback}</p>
              )}
              {!feedback.correct && (
                <p className="text-sm font-medium" dir="auto">
                  {t('correctAnswer')}: {q.correctAnswer}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}
      </motion.div>

      {/* Actions */}
      {!isFlashcard && (
        <div className="flex gap-3">
          {!feedback ? (
            <button onClick={submitAnswer} disabled={!answer.trim() || evaluating}
              className={cn('btn-teal flex-1 py-2.5', (!answer.trim() || evaluating) && 'opacity-50 cursor-not-allowed')}>
              {evaluating ? <><Loader2 className="w-4 h-4 animate-spin" />{t('loading')}</> : <>{t('checkAnswer')}</>}
            </button>
          ) : (
            <button onClick={() => nextQuestion()} className="btn-teal flex-1 py-2.5">
              {isLastQ ? t('seeResult') : t('nextQuestion')}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── RESULTS ──────────────────────────────────────────────────────────────────
function QuizResults({ session, onNew, onRetry }: { session: QuizSession; onNew: () => void; onRetry: () => void }) {
  const { t } = useT()
  const score = session.score
  const correct = session.attempts.filter(a => a.isCorrect).length
  const total = session.questions.length

  const emoji = score >= 80 ? '🏆' : score >= 60 ? '⭐' : '📚'
  const color = score >= 80 ? 'text-teal-500' : score >= 60 ? 'text-gold' : 'text-destructive'

  return (
    <div className="section-wrapper max-w-xl text-center space-y-6">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
        <div className="text-6xl mb-4">{emoji}</div>
        <h2 className="font-display text-3xl">{t('quizComplete')}</h2>
        <p className={cn('text-6xl font-display mt-4', color)}>{score}%</p>
        <p className="text-muted-foreground mt-2">{correct} / {total} correct</p>
      </motion.div>

      {/* Breakdown */}
      <div className="glass-card rounded-2xl p-5 space-y-3 text-start">
        {session.questions.map((q, i) => {
          const attempt = session.attempts.find(a => a.questionId === q.id)
          return (
            <div key={q.id} className="flex items-start gap-3 text-sm">
              {attempt?.isCorrect
                ? <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
              <span className="flex-1 text-muted-foreground" dir="auto">{q.question.slice(0, 80)}…</span>
              {attempt?.score !== undefined && (
                <span className="text-xs badge-gold shrink-0">{attempt.score}</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={onRetry} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 font-medium text-sm hover:bg-muted transition-colors">
          <RotateCcw className="w-4 h-4" />{t('reset')}
        </button>
        <button onClick={onNew} className="btn-teal flex-1 py-2.5">
          <RefreshCw className="w-4 h-4" />{t('startNewQuiz')}
        </button>
      </div>
    </div>
  )
}

// ─── MAIN QuizEngine ──────────────────────────────────────────────────────────
export function QuizEngine() {
  type View = 'setup' | 'playing' | 'results'
  const [view, setView] = useState<View>('setup')
  const [currentSession, setCurrentSession] = useState<QuizSession | null>(null)
  const { quizSessions } = useStore()
  const { t } = useT()

  const handleStart = (s: QuizSession) => { setCurrentSession(s); setView('playing') }
  const handleComplete = () => setView('results')
  const handleNew = () => { setCurrentSession(null); setView('setup') }

  // Also show past sessions on setup page
  return (
    <div>
      <AnimatePresence mode="wait">
        {view === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <QuizSetup onStart={handleStart} />
            {/* Past sessions */}
            {quizSessions.filter(s => s.completed).length > 0 && (
              <div className="section-wrapper max-w-2xl pt-0">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Past Quizzes
                </h3>
                <div className="space-y-2">
                  {quizSessions.filter(s => s.completed).slice(0, 5).map(s => (
                    <div key={s.id} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{s.title}</span>
                      <span className={cn('font-bold', s.score >= 80 ? 'text-teal-500' : s.score >= 60 ? 'text-gold' : 'text-destructive')}>
                        {s.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
        {view === 'playing' && currentSession && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <QuizPlayer session={currentSession} onComplete={handleComplete} />
          </motion.div>
        )}
        {view === 'results' && currentSession && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <QuizResults
              session={quizSessions.find(s => s.id === currentSession.id) ?? currentSession}
              onNew={handleNew}
              onRetry={() => { setView('playing') }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


