/**
 * NIBRAS CLOUD SYNC
 * Single source of truth for all Supabase read/write operations.
 * The Zustand store is the UI source of truth.
 * This service keeps Supabase in sync silently — never blocks the UI.
 */
import { supabase } from '@/lib/supabase'
import type { Exam, QuizSession, ChatSession, StudyPlanItem, UploadedFile } from '@/store'

// ── Load all user data after login ────────────────────────────────────────────
export async function loadUserData(userId: string) {
  const [exams, quizzes, chats, plan, files] = await Promise.allSettled([
    supabase.from('exams').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('quiz_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('chat_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('study_plan').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('files').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false }),
  ])

  return {
    exams:      exams.status === 'fulfilled' && !exams.value.error ? mapExams(exams.value.data || []) : [],
    quizSessions: quizzes.status === 'fulfilled' && !quizzes.value.error ? mapQuizSessions(quizzes.value.data || []) : [],
    chatSessions: chats.status === 'fulfilled' && !chats.value.error ? mapChatSessions(chats.value.data || []) : [],
    studyPlan:  plan.status === 'fulfilled' && !plan.value.error ? mapStudyPlan(plan.value.data || []) : [],
    files:      files.status === 'fulfilled' && !files.value.error ? mapFiles(files.value.data || []) : [],
  }
}

// ── Exam CRUD ──────────────────────────────────────────────────────────────────
export async function upsertExam(userId: string, exam: Exam) {
  return supabase.from('exams').upsert({
    id: exam.id, user_id: userId,
    subject: exam.subject, exam_date: exam.date,
    exam_time: exam.time, location: exam.location,
    seat_code: exam.seatCode, notes: exam.notes || '',
    color: exam.color,
  }, { onConflict: 'id' })
}

export async function deleteExamRemote(examId: string) {
  return supabase.from('exams').delete().eq('id', examId)
}

// ── Quiz CRUD ──────────────────────────────────────────────────────────────────
export async function upsertQuizSession(userId: string, quiz: QuizSession) {
  return supabase.from('quiz_sessions').upsert({
    id: quiz.id, user_id: userId,
    title: quiz.title, format: quiz.format,
    questions: quiz.questions, attempts: quiz.attempts,
    score: quiz.score, completed: quiz.completed,
  }, { onConflict: 'id' })
}

export async function deleteQuizRemote(quizId: string) {
  return supabase.from('quiz_sessions').delete().eq('id', quizId)
}

// ── Chat CRUD ──────────────────────────────────────────────────────────────────
export async function upsertChatSession(userId: string, chat: ChatSession) {
  return supabase.from('chat_sessions').upsert({
    id: chat.id, user_id: userId,
    title: chat.title, file_ids: chat.fileIds,
    messages: chat.messages,
  }, { onConflict: 'id' })
}

export async function deleteChatRemote(chatId: string) {
  return supabase.from('chat_sessions').delete().eq('id', chatId)
}

// ── Study plan CRUD ────────────────────────────────────────────────────────────
export async function upsertStudyPlanItem(userId: string, item: StudyPlanItem) {
  return supabase.from('study_plan').upsert({
    id: item.id, user_id: userId,
    subject: item.subject, goal: item.goal,
    due_date: item.dueDate, done: item.done,
  }, { onConflict: 'id' })
}

export async function deleteStudyPlanItemRemote(itemId: string) {
  return supabase.from('study_plan').delete().eq('id', itemId)
}

// ── Profile update ─────────────────────────────────────────────────────────────
export async function updateProfileXP(userId: string, xp: number, level: number, streak: number) {
  return supabase.from('profiles').update({
    xp, level, study_streak: streak,
    last_active_date: new Date().toDateString(),
  }).eq('id', userId)
}

// ── Row mappers (DB snake_case -> app camelCase) ───────────────────────────────
function mapExams(rows: any[]): Exam[] {
  return rows.map(r => ({
    id: r.id, subject: r.subject,
    date: r.exam_date, time: r.exam_time || '',
    location: r.location || '', seatCode: r.seat_code || '',
    notes: r.notes || '', color: r.color || '#2D7A84',
  }))
}

function mapQuizSessions(rows: any[]): QuizSession[] {
  return rows.map(r => ({
    id: r.id, title: r.title, format: r.format,
    questions: r.questions || [], attempts: r.attempts || [],
    score: r.score || 0, completed: r.completed || false,
    createdAt: r.created_at,
  }))
}

function mapChatSessions(rows: any[]): ChatSession[] {
  return rows.map(r => ({
    id: r.id, title: r.title,
    messages: r.messages || [], fileIds: r.file_ids || [],
    createdAt: r.created_at,
  }))
}

function mapStudyPlan(rows: any[]): StudyPlanItem[] {
  return rows.map(r => ({
    id: r.id, subject: r.subject, goal: r.goal || '',
    dueDate: r.due_date || '', done: r.done || false,
    createdAt: r.created_at,
  }))
}

function mapFiles(rows: any[]): UploadedFile[] {
  return rows.map(r => ({
    id: r.id, name: r.name, type: r.type,
    size: r.size || 0, uploadedAt: r.uploaded_at,
    content: r.content, driveFileId: r.drive_file_id,
    source: 'gdrive' as const,
  }))
}
