// ─────────────────────────────────────────────────────────────────────────────
// Sudanese Heritage Platform – Core TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

export type Language = 'ar' | 'en'
export type Gender = 'MALE' | 'FEMALE'
export type PrivacyLevel = 'PUBLIC' | 'COMMUNITY' | 'FAMILY' | 'PRIVATE'
export type UserRole = 'ADMIN' | 'MODERATOR' | 'MEMBER' | 'GUEST'
export type CollaboratorRole = 'VIEWER' | 'EDITOR' | 'ADMIN'

export type SudaneseRegion =
  | 'KHARTOUM' | 'NORTHERN' | 'NILE' | 'RED_SEA' | 'KASSALA'
  | 'GEDAREF'  | 'BLUE_NILE'| 'SINNAR' | 'WHITE_NILE'
  | 'NORTH_KORDOFAN' | 'SOUTH_KORDOFAN' | 'WEST_KORDOFAN'
  | 'NORTH_DARFUR'   | 'SOUTH_DARFUR'   | 'EAST_DARFUR'
  | 'CENTRAL_DARFUR' | 'WEST_DARFUR'    | 'RIVER_NILE'
  | 'GEZIRA' | 'SENNAR' | 'OTHER'

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────

export interface User {
  id: string
  name: string | null
  nameArabic: string | null
  email: string | null
  image: string | null
  role: UserRole
  preferredLanguage: Language
  profile?: UserProfile | null
  createdAt: Date
}

export interface UserProfile {
  id: string
  bio: string | null
  bioArabic: string | null
  tribe: string | null
  region: SudaneseRegion | null
  country: string | null
  diasporaCity: string | null
  diasporaCountry: string | null
  isPublic: boolean
}

// ─────────────────────────────────────────────
// FAMILY TREE (PostgreSQL)
// ─────────────────────────────────────────────

export interface FamilyTree {
  id: string
  ownerId: string
  name: string
  nameArabic: string | null
  description: string | null
  descriptionAr: string | null
  tribe: string | null
  clan: string | null
  region: SudaneseRegion | null
  isPublic: boolean
  neo4jTreeId: string | null
  coverImage: string | null
  createdAt: Date
  updatedAt: Date
  memberCount?: number
  owner?: Partial<User>
}

export interface TreeMember {
  id: string
  treeId: string
  userId: string | null
  neo4jPersonId: string

  fullName: string
  fullNameArabic: string | null
  nickname: string | null
  nicknameArabic: string | null
  fatherName: string | null
  grandfatherName: string | null
  tribe: string | null
  clan: string | null
  lineage: string | null  // النسب
  gender: Gender
  isAlive: boolean

  birthYear: number | null
  birthDate: Date | null
  deathYear: number | null
  birthPlace: string | null
  birthRegion: SudaneseRegion | null
  photo: string | null

  bio: string | null
  bioArabic: string | null
  occupation: string | null
  occupationArabic: string | null

  privacyLevel: PrivacyLevel
  createdAt: Date
}

// ─────────────────────────────────────────────
// NEO4J GRAPH NODES & RELATIONSHIPS
// ─────────────────────────────────────────────

export interface GraphPerson {
  id: string            // Neo4j internal or UUID
  postgresId: string    // References TreeMember.id
  fullName: string
  fullNameArabic: string | null
  gender: Gender
  birthYear: number | null
  isAlive: boolean
  photo: string | null
  tribe: string | null
}

export type RelationshipType =
  | 'PARENT_OF'
  | 'CHILD_OF'
  | 'SPOUSE_OF'
  | 'SIBLING_OF'
  | 'HALF_SIBLING_OF'
  | 'ADOPTED_CHILD_OF'
  | 'GUARDIAN_OF'
  | 'EXTENDED_KIN'

export interface GraphRelationship {
  id: string
  type: RelationshipType
  fromId: string
  toId: string
  properties?: {
    marriageYear?: number
    divorceYear?: number
    isApproximate?: boolean
    notes?: string
  }
}

// Tree node for D3 visualization
export interface TreeNode {
  id: string
  name: string           // display name (respects language)
  nameArabic: string | null
  gender: Gender
  birthYear: number | null
  deathYear: number | null
  isAlive: boolean
  photo: string | null
  tribe: string | null
  privacyLevel: PrivacyLevel
  children?: TreeNode[]
  spouses?: TreeNode[]
  parents?: TreeNode[]
  siblings?: TreeNode[]
  _collapsed?: boolean
  _childCount?: number
  _depth?: number
  postgresId?: string
}

// ─────────────────────────────────────────────
// COMMUNITY
// ─────────────────────────────────────────────

export type PostCategory =
  | 'HISTORY' | 'CULTURE' | 'TRADITION' | 'FOLKLORE'
  | 'POETRY'  | 'MUSIC'   | 'FOOD'      | 'LANGUAGE'
  | 'GENEALOGY' | 'NEWS'  | 'GENERAL'

export interface CommunityPost {
  id: string
  authorId: string
  title: string
  titleArabic: string | null
  content: string
  contentAr: string | null
  category: PostCategory
  tribe: string | null
  region: SudaneseRegion | null
  tags: string[]
  images: string[]
  isPublished: boolean
  isPinned: boolean
  viewCount: number
  createdAt: Date
  author: Partial<User>
  _count?: { comments: number; likes: number }
}

export interface OralHistory {
  id: string
  title: string
  titleArabic: string | null
  description: string | null
  narrator: string | null
  region: SudaneseRegion | null
  tribe: string | null
  year: number | null
  duration: number | null
  mediaUrl: string
  mediaType: 'AUDIO' | 'VIDEO' | 'IMAGE' | 'DOCUMENT'
  transcript: string | null
  language: Language
  tags: string[]
  createdAt: Date
}

export interface HeritageItem {
  id: string
  title: string
  titleArabic: string | null
  description: string | null
  descriptionAr: string | null
  category: string
  region: SudaneseRegion | null
  tribe: string | null
  period: string | null
  imageUrl: string | null
  isVerified: boolean
  tags: string[]
  createdAt: Date
}

// ─────────────────────────────────────────────
// AI / ML
// ─────────────────────────────────────────────

export type AIInsightType =
  | 'DUPLICATE_DETECTION'
  | 'MISSING_LINK_SUGGESTION'
  | 'RELATIONSHIP_VALIDATION'
  | 'LINEAGE_PATTERN'
  | 'HISTORICAL_INSIGHT'
  | 'TRIBE_INFERENCE'
  | 'MIGRATION_PATTERN'

export interface AIInsight {
  id: string
  treeId: string | null
  memberId: string | null
  insightType: AIInsightType
  confidence: number
  data: Record<string, unknown>
  isAccepted: boolean | null
  createdAt: Date
}

export interface DuplicateAlert {
  id: string
  treeId: string
  member1: Partial<TreeMember>
  member2: Partial<TreeMember>
  similarityScore: number
  isResolved: boolean
  createdAt: Date
}

export interface MissingLinkSuggestion {
  type: 'POTENTIAL_PARENT' | 'POTENTIAL_SIBLING' | 'POTENTIAL_SPOUSE'
  person: Partial<TreeMember>
  confidence: number
  reasoning: string
}

// ─────────────────────────────────────────────
// API RESPONSE
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ─────────────────────────────────────────────
// SUDANESE TRIBES (reference data)
// ─────────────────────────────────────────────

export const SUDANESE_TRIBES = [
  "الجعليين", "الشايقية", "جعلي وشايقي", "الدناقلة", "الربطاب", "المناصير", "المريفاب",
  "البرتد", "الحسينات", "البجا", "البشارية", "العبابدة", "الهدندوة",
  "البطاحين", "الشكرية", "البطانة", "الكنانة", "الهماج", "الإنقسنا",
  "الفور", "المساليت", "الزغاوة", "التامة", "الميدوب", "البرتي",
  "النوبة", "الدينكا", "النوير", "الشلك", "الباري", "الأزاندي",
  "الرشايدة", "الكواهلة", "الحواوير", "الكبابيش",
] as const

export const REGION_LABELS: Record<SudaneseRegion, { en: string; ar: string }> = {
  KHARTOUM:       { en: 'Khartoum',        ar: 'الخرطوم' },
  NORTHERN:       { en: 'Northern',         ar: 'الشمالية' },
  NILE:           { en: 'Nile',             ar: 'نهر النيل' },
  RED_SEA:        { en: 'Red Sea',          ar: 'البحر الأحمر' },
  KASSALA:        { en: 'Kassala',          ar: 'كسلا' },
  GEDAREF:        { en: 'Al Qadarif',       ar: 'القضارف' },
  BLUE_NILE:      { en: 'Blue Nile',        ar: 'النيل الأزرق' },
  SINNAR:         { en: 'Sennar',           ar: 'سنار' },
  WHITE_NILE:     { en: 'White Nile',       ar: 'النيل الأبيض' },
  NORTH_KORDOFAN: { en: 'North Kordofan',   ar: 'شمال كردفان' },
  SOUTH_KORDOFAN: { en: 'South Kordofan',   ar: 'جنوب كردفان' },
  WEST_KORDOFAN:  { en: 'West Kordofan',    ar: 'غرب كردفان' },
  NORTH_DARFUR:   { en: 'North Darfur',     ar: 'شمال دارفور' },
  SOUTH_DARFUR:   { en: 'South Darfur',     ar: 'جنوب دارفور' },
  EAST_DARFUR:    { en: 'East Darfur',      ar: 'شرق دارفور' },
  CENTRAL_DARFUR: { en: 'Central Darfur',   ar: 'وسط دارفور' },
  WEST_DARFUR:    { en: 'West Darfur',      ar: 'غرب دارفور' },
  RIVER_NILE:     { en: 'River Nile',       ar: 'نهر النيل' },
  GEZIRA:         { en: 'Al Jazirah',       ar: 'الجزيرة' },
  SENNAR:         { en: 'Sennar',           ar: 'سنار' },
  OTHER:          { en: 'Other',            ar: 'أخرى' },
}
