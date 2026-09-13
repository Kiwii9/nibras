/**
 * NIBRAS MASCOT MANIFEST
 * Single source of truth for all mascot file paths.
 * Drop finished art into /public/mascot/ - no code changes needed.
 * Naming rule: mascot-[expression].svg (lowercase, hyphenated, no spaces).
 */
export const MASCOT = {
  idle:        '/mascot/mascot-idle.svg',
  thinking:    '/mascot/mascot-thinking.svg',
  happy:       '/mascot/mascot-happy.svg',
  celebrating: '/mascot/mascot-celebrating.svg',
  concerned:   '/mascot/mascot-concerned.svg',
  confused:    '/mascot/mascot-confused.svg',
  sleepy:      '/mascot/mascot-sleepy.svg',
  alert:       '/mascot/mascot-alert.svg',
  apologetic:  '/mascot/mascot-apologetic.svg',
  waving:      '/mascot/mascot-waving.svg',
} as const

export type MascotExpression = keyof typeof MASCOT

/** Tooltip text for each mascot expression (accessible + in-character) */
export const MASCOT_TOOLTIP: Record<MascotExpression, string> = {
  idle:        'نِبراس - مساعدك الدراسي / Nibras - your study companion',
  thinking:    'أفكّر… / Thinking…',
  happy:       'أحسنت! / Well done!',
  celebrating: 'رائع! أنجزت الهدف / Amazing! Goal achieved',
  concerned:   'لا بأس، حاول مجدداً / No worries, try again',
  confused:    'هذه الصفحة غير موجودة / This page does not exist',
  sleepy:      'وقت الراحة / Break time',
  alert:       'تذكير مهم / Important reminder',
  apologetic:  'حدث خطأ، نعتذر / Something went wrong',
  waving:      'أهلاً! ابدأ رحلتك الدراسية / Welcome! Start your journey',
}
