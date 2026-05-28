import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://syhypibwebtfqzqlvrlh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aHlwaWJ3ZWJ0ZnF6cWx2cmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzg3MjEsImV4cCI6MjA5Mzc1NDcyMX0.luU8R76BHoxqMVgjZlO4_dJ6o5i3JQZmd-pV5SyONAk',
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
)

export interface Profile {
  id: string
  name: string
  email: string
  role: 'student' | 'admin'
  avatar_color: string
  study_streak: number
  last_active_date: string
  total_study_minutes: number
  level: number
  xp: number
  created_at: string
}

/** Fetch profile row for a given user id */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) { console.error('fetchProfile:', error.message); return null }
  return data as Profile
}
