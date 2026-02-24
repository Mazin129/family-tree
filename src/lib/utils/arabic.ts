// Arabic / RTL utilities for Sudanese Heritage Platform

/**
 * Format a Sudanese name with Arabic honorifics
 * E.g. "Ahmed Ibrahim Ali" → shows lineage correctly
 */
export function formatArabicName(
  firstName: string,
  fatherName?: string | null,
  grandfatherName?: string | null
): string {
  const parts = [firstName, fatherName, grandfatherName].filter(Boolean)
  return parts.join(' ')
}

/**
 * Determine text direction based on content
 */
export function getTextDirection(text: string): 'rtl' | 'ltr' {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/
  return arabicPattern.test(text) ? 'rtl' : 'ltr'
}

/**
 * Convert Western digits to Arabic-Indic numerals
 */
export function toArabicNumerals(num: number | string): string {
  return String(num).replace(/[0-9]/g, d =>
    String.fromCharCode(d.charCodeAt(0) + 0x0660 - 48)
  )
}

/**
 * Transliterate common Sudanese name patterns
 * Basic romanization for display
 */
export const ARABIC_MONTHS: Record<number, string> = {
  1:  'يناير',  2:  'فبراير', 3:  'مارس',
  4:  'أبريل', 5:  'مايو',    6:  'يونيو',
  7:  'يوليو', 8:  'أغسطس',  9:  'سبتمبر',
  10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر',
}

export function formatArabicDate(date: Date): string {
  const day   = date.getDate()
  const month = ARABIC_MONTHS[date.getMonth() + 1]
  const year  = date.getFullYear()
  return `${toArabicNumerals(day)} ${month} ${toArabicNumerals(year)}`
}

/**
 * Relationship labels in Arabic
 */
export const RELATIONSHIP_LABELS_AR: Record<string, string> = {
  PARENT_OF:       'والد/والدة',
  CHILD_OF:        'ابن/ابنة',
  SPOUSE_OF:       'زوج/زوجة',
  SIBLING_OF:      'أخ/أخت',
  HALF_SIBLING_OF: 'أخ/أخت من طرف واحد',
  ADOPTED_CHILD_OF:'ابن/ابنة بالتبني',
  GUARDIAN_OF:     'وصي',
  EXTENDED_KIN:    'قريب',
}

export const RELATIONSHIP_LABELS_EN: Record<string, string> = {
  PARENT_OF:       'Parent of',
  CHILD_OF:        'Child of',
  SPOUSE_OF:       'Spouse of',
  SIBLING_OF:      'Sibling of',
  HALF_SIBLING_OF: 'Half-sibling of',
  ADOPTED_CHILD_OF:'Adopted child of',
  GUARDIAN_OF:     'Guardian of',
  EXTENDED_KIN:    'Extended kin',
}

/**
 * Gender labels
 */
export const GENDER_LABELS = {
  MALE:        { ar: 'ذكر',    en: 'Male'        },
  FEMALE:      { ar: 'أنثى',   en: 'Female'      },
  UNSPECIFIED: { ar: 'غير محدد', en: 'Unspecified' },
}
