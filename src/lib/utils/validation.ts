// ─────────────────────────────────────────────
// Genealogical Validation Utilities
// Task 3: Consistency & Error Detection
// ─────────────────────────────────────────────

export interface ValidationResult {
  isValid:    boolean
  errors:     ValidationError[]
  warnings:   ValidationWarning[]
}

export interface ValidationError {
  field:   string
  code:    string
  message: string   // Arabic error message
}

export interface ValidationWarning {
  field:   string
  code:    string
  message: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

const CURRENT_YEAR = new Date().getFullYear()

// ─────────────────────────────────────────────
// TIMELINE VALIDATION
// ─────────────────────────────────────────────

/** Validate birth/death year consistency for a single person */
export function validateTimeline(
  birthYear?: number | null,
  deathYear?: number | null,
  isAlive?: boolean
): ValidationResult {
  const errors:   ValidationError[]   = []
  const warnings: ValidationWarning[] = []

  if (birthYear != null) {
    if (birthYear < 1600) {
      errors.push({ field: 'birthYear', code: 'BIRTH_TOO_OLD', message: 'سنة الميلاد قبل ١٦٠٠ غير مقبولة' })
    }
    if (birthYear > CURRENT_YEAR) {
      errors.push({ field: 'birthYear', code: 'BIRTH_FUTURE', message: 'سنة الميلاد لا يمكن أن تكون في المستقبل' })
    }
    // Very old person warning
    if (isAlive && CURRENT_YEAR - birthYear > 120) {
      warnings.push({ field: 'birthYear', code: 'VERY_OLD', message: 'العمر يتجاوز ١٢٠ سنة — تحقق من التاريخ', confidence: 'MEDIUM' })
    }
  }

  if (deathYear != null) {
    if (deathYear > CURRENT_YEAR) {
      errors.push({ field: 'deathYear', code: 'DEATH_FUTURE', message: 'سنة الوفاة لا يمكن أن تكون في المستقبل' })
    }
    if (birthYear != null && deathYear < birthYear) {
      errors.push({ field: 'deathYear', code: 'DEATH_BEFORE_BIRTH', message: 'سنة الوفاة قبل سنة الميلاد' })
    }
    if (birthYear != null && deathYear - birthYear > 130) {
      warnings.push({ field: 'deathYear', code: 'LIVED_TOO_LONG', message: 'عاش أكثر من ١٣٠ سنة — تحقق من التاريخ', confidence: 'LOW' })
    }
    if (isAlive) {
      errors.push({ field: 'deathYear', code: 'ALIVE_WITH_DEATH', message: 'لا يمكن تحديد سنة وفاة لشخص لا يزال على قيد الحياة' })
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}

// ─────────────────────────────────────────────
// PARENT-CHILD VALIDATION
// ─────────────────────────────────────────────

const MIN_PARENT_AGE_GAP = 12   // minimum years between parent and child
const MAX_PARENT_AGE_GAP = 80   // maximum reasonable age gap

/** Validate that parent-child age gap is biologically plausible */
export function validateParentChildAge(
  parentBirthYear?: number | null,
  childBirthYear?:  number | null
): ValidationResult {
  const errors:   ValidationError[]   = []
  const warnings: ValidationWarning[] = []

  if (parentBirthYear != null && childBirthYear != null) {
    const gap = childBirthYear - parentBirthYear

    if (gap < 0) {
      errors.push({
        field: 'birthYear',
        code:  'CHILD_OLDER_THAN_PARENT',
        message: 'الابن/البنت أكبر سناً من الوالد/الوالدة — تحقق من التواريخ',
      })
    } else if (gap < MIN_PARENT_AGE_GAP) {
      errors.push({
        field: 'birthYear',
        code:  'PARENT_TOO_YOUNG',
        message: `فرق السن بين الوالد والابن أقل من ${MIN_PARENT_AGE_GAP} سنة`,
      })
    } else if (gap > MAX_PARENT_AGE_GAP) {
      warnings.push({
        field: 'birthYear',
        code:  'PARENT_VERY_OLD',
        message: `فرق السن بين الوالد والابن يتجاوز ${MAX_PARENT_AGE_GAP} سنة — تحقق`,
        confidence: 'LOW',
      })
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}

// ─────────────────────────────────────────────
// RELATIONSHIP VALIDATION
// ─────────────────────────────────────────────

/** Validate that a person isn't being linked to themselves */
export function validateNoSelfRelation(id1: string, id2: string): ValidationResult {
  const errors: ValidationError[] = []
  if (id1 === id2) {
    errors.push({
      field: 'relativeOfId',
      code:  'SELF_RELATION',
      message: 'لا يمكن ربط شخص بنفسه',
    })
  }
  return { isValid: errors.length === 0, errors, warnings: [] }
}

/** Validate spouse age gap (warn if very large) */
export function validateSpouseAge(
  spouse1BirthYear?: number | null,
  spouse2BirthYear?: number | null
): ValidationResult {
  const warnings: ValidationWarning[] = []

  if (spouse1BirthYear != null && spouse2BirthYear != null) {
    const gap = Math.abs(spouse1BirthYear - spouse2BirthYear)
    if (gap > 40) {
      warnings.push({
        field: 'birthYear',
        code:  'LARGE_SPOUSE_AGE_GAP',
        message: `فرق السن بين الزوجين ${gap} سنة — تحقق`,
        confidence: 'LOW',
      })
    }
  }

  return { isValid: true, errors: [], warnings }
}

// ─────────────────────────────────────────────
// NAME VALIDATION
// ─────────────────────────────────────────────

/** Validate that at least one name is provided */
export function validateRequiredName(
  fullName?: string | null,
  fullNameArabic?: string | null
): ValidationResult {
  const errors: ValidationError[] = []
  if (!fullName?.trim() && !fullNameArabic?.trim()) {
    errors.push({
      field: 'fullName',
      code:  'NAME_REQUIRED',
      message: 'يجب إدخال الاسم بالعربية أو بالإنجليزية على الأقل',
    })
  }
  return { isValid: errors.length === 0, errors, warnings: [] }
}

// ─────────────────────────────────────────────
// COMPOSITE VALIDATION
// ─────────────────────────────────────────────

/** Run all member validation rules at once */
export function validateMember(data: {
  fullName?:       string | null
  fullNameArabic?: string | null
  birthYear?:      number | null
  deathYear?:      number | null
  isAlive?:        boolean
}): ValidationResult {
  const allErrors:   ValidationError[]   = []
  const allWarnings: ValidationWarning[] = []

  const nameResult     = validateRequiredName(data.fullName, data.fullNameArabic)
  const timelineResult = validateTimeline(data.birthYear, data.deathYear, data.isAlive)

  allErrors.push(...nameResult.errors, ...timelineResult.errors)
  allWarnings.push(...nameResult.warnings, ...timelineResult.warnings)

  return {
    isValid:  allErrors.length === 0,
    errors:   allErrors,
    warnings: allWarnings,
  }
}
