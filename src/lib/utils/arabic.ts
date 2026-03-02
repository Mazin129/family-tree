// Arabic / RTL / Sudanese Name utilities for Heritage Platform

// ─────────────────────────────────────────────
// TASK 1: NAME INTELLIGENCE & DECOMPOSITION
// ─────────────────────────────────────────────

/** Decomposed Sudanese name components */
export interface NameComponents {
  givenName:    string | null   // الاسم الأول
  patronymic:   string | null   // اسم الأب
  grandPatron:  string | null   // اسم الجد
  lineageChain: string[]        // سلسلة الأجداد
  nisba:        string | null   // النسبة (القبيلة / المنطقة)
  laqab:        string | null   // اللقب
  prefix:       string | null   // ود / أبو / أم
  tribeSignal:  string | null   // إشارة القبيلة المحتملة
  confidence:   'HIGH' | 'MEDIUM' | 'LOW'
}

// Sudanese connectors that indicate patronymic chains
const PATRONYMIC_TOKENS = ['بن', 'ابن', 'بنت', 'وَد', 'ود', 'wad', 'ibn', 'bin', 'bint']
const PREFIX_TOKENS      = ['أبو', 'أبا', 'أم', 'أبّ', 'abu', 'um', 'ab']
const ARTICLE_RE         = /^(ال|الـ|al-?|el-?)/i
const LAQAB_TOKENS       = ['الحاج', 'الشيخ', 'السيد', 'المك', 'الناظر', 'العمدة', 'الملك', 'الأمير']

// Known tribal nisba patterns (suffix → tribe mapping for high confidence)
const TRIBE_NISBA_MAP: Record<string, string> = {
  'الجعلي':   'الجعليين',
  'الشايقي':  'الشايقية',
  'الدنقلاوي':'الدناقلة',
  'البطحاني': 'البطاحين',
  'الشكري':   'الشكرية',
  'الكبابيشي':'الكبابيش',
  'الكواهلي': 'الكواهلة',
  'المريفابي':'المريفاب',
  'الرباطابي':'الربطاب',
  'المناصيري':'المناصير',
  'البجاوي':  'البجا',
  'الهدندوي': 'الهدندوة',
  'الفوراوي': 'الفور',
  'الزغاوي':  'الزغاوة',
  'المساليتي':'المساليت',
  'الرشيدي':  'الرشايدة',
  'النوباوي': 'النوبة',
}

/**
 * Decompose an Arabic/Sudanese name into structured components.
 * Handles: "أحمد بن إبراهيم بن علي الجعلي"
 *          "محمد ود الأمين"
 *          "فاطمة بنت عبدالله الشايقي"
 */
export function decomposeArabicName(fullName: string): NameComponents {
  if (!fullName?.trim()) {
    return { givenName: null, patronymic: null, grandPatron: null, lineageChain: [], nisba: null, laqab: null, prefix: null, tribeSignal: null, confidence: 'LOW' }
  }

  const cleaned = normalizeArabicSpelling(fullName.trim())
  const tokens  = cleaned.split(/\s+/)

  let givenName:    string | null = null
  let patronymic:   string | null = null
  let grandPatron:  string | null = null
  let nisba:        string | null = null
  let laqab:        string | null = null
  let prefix:       string | null = null
  let tribeSignal:  string | null = null
  const lineageChain: string[] = []

  // Pass 1: extract laqab (title) from beginning
  let startIdx = 0
  if (LAQAB_TOKENS.some(t => tokens[0]?.startsWith(t))) {
    laqab = tokens[0]
    startIdx = 1
  }

  // Pass 2: extract prefix (أبو / ود)
  if (PREFIX_TOKENS.includes(tokens[startIdx]?.toLowerCase())) {
    prefix = tokens[startIdx]
    startIdx++
  }

  // Pass 3: walk tokens and separate name parts from patronymic connectors
  const nameParts: string[] = []
  for (let i = startIdx; i < tokens.length; i++) {
    const tok     = tokens[i]
    const tokLow  = tok.toLowerCase()

    // Skip patronymic connectors
    if (PATRONYMIC_TOKENS.includes(tokLow)) continue

    // Check for tribal nisba (last token with "ال" prefix)
    if (i === tokens.length - 1 && ARTICLE_RE.test(tok)) {
      nisba = tok
      // Try to identify tribe from nisba
      const cleaned_nisba = tok.replace(ARTICLE_RE, '')
      for (const [pattern, tribe] of Object.entries(TRIBE_NISBA_MAP)) {
        if (pattern.replace(ARTICLE_RE, '') === cleaned_nisba || tok === pattern) {
          tribeSignal = tribe
          break
        }
      }
      continue
    }

    nameParts.push(tok)
  }

  // Assign name parts
  if (nameParts.length >= 1) givenName   = nameParts[0]
  if (nameParts.length >= 2) patronymic  = nameParts[1]
  if (nameParts.length >= 3) grandPatron = nameParts[2]
  lineageChain.push(...nameParts)

  // Confidence calculation
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
  if (givenName && patronymic && (nisba || grandPatron)) confidence = 'HIGH'
  else if (givenName && patronymic) confidence = 'MEDIUM'

  return { givenName, patronymic, grandPatron, lineageChain, nisba, laqab, prefix, tribeSignal, confidence }
}

// ─────────────────────────────────────────────
// TASK 2: NORMALIZATION
// ─────────────────────────────────────────────

/** Normalize common Arabic spelling variants */
export function normalizeArabicSpelling(text: string): string {
  return text
    // Normalize alef variants → أ
    .replace(/[آإأٱ]/g, 'ا')
    // Normalize taa marbuta → ة
    .replace(/ه$/g, 'ة')
    // Normalize yaa → ي
    .replace(/ى/g, 'ي')
    // Remove tatweel (kashida)
    .replace(/ـ/g, '')
    // Remove diacritics (tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/** Detect likely duplicate names using normalization + Dice coefficient */
export function areNamesSimilar(name1: string, name2: string, threshold = 0.80): boolean {
  const n1 = normalizeArabicSpelling(name1).toLowerCase()
  const n2 = normalizeArabicSpelling(name2).toLowerCase()
  if (n1 === n2) return true
  return diceCoefficient(n1, n2) >= threshold
}

function diceCoefficient(s1: string, s2: string): number {
  if (s1 === s2) return 1
  if (s1.length < 2 || s2.length < 2) return 0
  const bigrams1 = new Map<string, number>()
  for (let i = 0; i < s1.length - 1; i++) {
    const b = s1.substring(i, i + 2)
    bigrams1.set(b, (bigrams1.get(b) || 0) + 1)
  }
  let intersection = 0
  for (let i = 0; i < s2.length - 1; i++) {
    const b = s2.substring(i, i + 2)
    const c = bigrams1.get(b) || 0
    if (c > 0) { bigrams1.set(b, c - 1); intersection++ }
  }
  return (2 * intersection) / (s1.length + s2.length - 2)
}

// ─────────────────────────────────────────────
// TASK 4: LINEAGE CHAIN PARSER
// ─────────────────────────────────────────────

export interface LineageEntry {
  name:     string
  position: 'self' | 'father' | 'grandfather' | 'ancestor'
  depth:    number   // 0 = self, 1 = father, 2 = grandfather, ...
}

/**
 * Parse a lineage string like "أحمد بن إبراهيم بن علي بن محمد" into structured chain
 */
export function parseLineageChain(lineage: string): LineageEntry[] {
  if (!lineage?.trim()) return []

  const cleaned = normalizeArabicSpelling(lineage.trim())
  // Split on patronymic connectors
  const parts = cleaned.split(/\s*(?:بن|ابن|بنت|ود|wad|ibn|bin|bint)\s*/i).filter(Boolean)

  return parts.map((name, i) => ({
    name: name.trim(),
    position: i === 0 ? 'self' : i === 1 ? 'father' : i === 2 ? 'grandfather' : 'ancestor',
    depth: i,
  }))
}

/**
 * Extract fatherName and grandfatherName from a lineage string.
 * Used to auto-fill fields in AddMemberModal.
 */
export function extractParentsFromLineage(lineage: string): {
  fatherName:      string | null
  grandfatherName: string | null
} {
  const chain = parseLineageChain(lineage)
  return {
    fatherName:      chain.find(e => e.position === 'father')?.name      ?? null,
    grandfatherName: chain.find(e => e.position === 'grandfather')?.name ?? null,
  }
}

// ─────────────────────────────────────────────
// TATWEEL (KASHIDA) — Sudanese heritage display
// ─────────────────────────────────────────────

// U+0640 ARABIC TATWEEL (kashida) — stretches connected letters
const TATWEEL = '\u0640'

// Arabic letters that do NOT connect on their LEFT side.
// Inserting tatweel AFTER these produces incorrect rendering.
const NON_LEFT_JOINING = new Set('اأإآءوردذةىؤئ')

// Matches any character in the Arabic Unicode blocks
const IS_ARABIC = /[\u0600-\u06FF]/

/**
 * Insert tatweel (ـ) between Arabic letters for a heritage display style,
 * e.g.  محمد → مـمـمـد  (count=1)
 *        محمد → مـ ـحـ ـمـ ـد  (count=2)
 *        محمد → مـ ـ ـحـ ـ ـمـ ـ ـد  (count=3)
 *
 * Only applied between connected letter pairs inside each word.
 * Spaces, numbers and Latin characters are left untouched.
 *
 * @param text  The raw Arabic name
 * @param count Number of tatweel chars to insert per gap (default 3)
 */
export function tatweelName(text: string, count = 3): string {
  if (!text) return text
  const pad = TATWEEL.repeat(count)
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const ch   = text[i]
    const next = text[i + 1]
    result += ch
    // Add tatweel after ch when:
    //   • ch is an Arabic letter that connects on the left
    //   • next is also an Arabic letter (same word)
    if (
      IS_ARABIC.test(ch)   &&
      !NON_LEFT_JOINING.has(ch) &&
      next !== undefined   &&
      IS_ARABIC.test(next)
    ) {
      result += pad
    }
  }
  return result
}



/**
 * Format a Sudanese name with patronymic chain
 */
export function formatArabicName(
  firstName: string,
  fatherName?: string | null,
  grandfatherName?: string | null
): string {
  const parts = [firstName, fatherName, grandfatherName].filter(Boolean)
  return parts.join(' ')
}

/** Determine text direction from content */
export function getTextDirection(text: string): 'rtl' | 'ltr' {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/
  return arabicPattern.test(text) ? 'rtl' : 'ltr'
}

/** Convert Western digits to Arabic-Indic numerals */
export function toArabicNumerals(num: number | string): string {
  return String(num).replace(/[0-9]/g, d =>
    String.fromCharCode(d.charCodeAt(0) + 0x0660 - 48)
  )
}

export const ARABIC_MONTHS: Record<number, string> = {
  1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل',
  5: 'مايو', 6: 'يونيو', 7: 'يوليو', 8: 'أغسطس',
  9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر',
}

export function formatArabicDate(date: Date): string {
  const day   = date.getDate()
  const month = ARABIC_MONTHS[date.getMonth() + 1]
  const year  = date.getFullYear()
  return `${toArabicNumerals(day)} ${month} ${toArabicNumerals(year)}`
}

// ─────────────────────────────────────────────
// LABELS
// ─────────────────────────────────────────────

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

export const GENDER_LABELS = {
  MALE:   { ar: 'ذكر',  en: 'Male'   },
  FEMALE: { ar: 'أنثى', en: 'Female' },
}
