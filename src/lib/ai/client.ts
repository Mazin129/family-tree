// AI/ML Service Client
// Communicates with the Python FastAPI microservice

import axios from 'axios'
import type { TreeMember, AIInsight, DuplicateAlert, MissingLinkSuggestion } from '@/types'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001'

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.AI_SERVICE_API_KEY || '',
  },
})

// ─────────────────────────────────────────────
// PHASE 1: Practical & Safe AI
// ─────────────────────────────────────────────

export async function detectDuplicates(
  members: Partial<TreeMember>[]
): Promise<Array<{ member1Id: string; member2Id: string; score: number; reasons: string[] }>> {
  try {
    const { data } = await aiClient.post('/api/v1/detect-duplicates', { members })
    return data.duplicates || []
  } catch {
    // Fallback: simple name comparison
    return simpleDuplicateCheck(members)
  }
}

export async function validateRelationship(
  person1: Partial<TreeMember>,
  person2: Partial<TreeMember>,
  relationshipType: string
): Promise<{ isValid: boolean; warnings: string[]; confidence: number }> {
  try {
    const { data } = await aiClient.post('/api/v1/validate-relationship', {
      person1, person2, relationshipType
    })
    return data
  } catch {
    return { isValid: true, warnings: [], confidence: 0.5 }
  }
}

export async function suggestMissingLinks(
  member: Partial<TreeMember>,
  treeContext: Partial<TreeMember>[]
): Promise<MissingLinkSuggestion[]> {
  try {
    const { data } = await aiClient.post('/api/v1/suggest-links', {
      member, treeContext
    })
    return data.suggestions || []
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────
// PHASE 2: Advanced Intelligence
// ─────────────────────────────────────────────

export async function analyzeLineagePatterns(
  treeId: string,
  members: Partial<TreeMember>[]
): Promise<{
  patterns: Array<{ type: string; description: string; confidence: number }>
  migrationRoute: Array<{ region: string; period: string; population: number }>
  tribeDistribution: Record<string, number>
}> {
  try {
    const { data } = await aiClient.post('/api/v1/analyze-lineage', {
      treeId, members
    })
    return data
  } catch {
    return { patterns: [], migrationRoute: [], tribeDistribution: {} }
  }
}

export async function inferTribeFromName(
  fullName: string,
  fatherName?: string,
  region?: string
): Promise<{ tribe: string; confidence: number; alternatives: string[] } | null> {
  try {
    const { data } = await aiClient.post('/api/v1/infer-tribe', {
      fullName, fatherName, region
    })
    return data
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────
// PHASE 3: Visionary
// ─────────────────────────────────────────────

export async function generateFamilyNarrative(
  treeId: string,
  language: 'ar' | 'en' = 'ar'
): Promise<{ narrative: string; highlights: string[] }> {
  try {
    const { data } = await aiClient.post('/api/v1/generate-narrative', {
      treeId, language
    })
    return data
  } catch {
    return {
      narrative: language === 'ar'
        ? 'لا يمكن إنشاء السرد الآن. يرجى المحاولة لاحقاً.'
        : 'Unable to generate narrative at this time. Please try again later.',
      highlights: []
    }
  }
}

export async function generateHeritageReport(
  treeId: string,
  language: 'ar' | 'en' = 'ar'
): Promise<{ report: string; sections: Record<string, string> }> {
  try {
    const { data } = await aiClient.post('/api/v1/heritage-report', {
      treeId, language
    })
    return data
  } catch {
    return { report: '', sections: {} }
  }
}

// ─────────────────────────────────────────────
// FALLBACK: Simple local implementations
// ─────────────────────────────────────────────

function simpleDuplicateCheck(
  members: Partial<TreeMember>[]
): Array<{ member1Id: string; member2Id: string; score: number; reasons: string[] }> {
  const results = []
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const m1 = members[i]
      const m2 = members[j]
      const reasons: string[] = []
      let score = 0

      // Name similarity (Dice coefficient)
      if (m1.fullName && m2.fullName) {
        const sim = diceCoefficient(
          m1.fullName.toLowerCase(),
          m2.fullName.toLowerCase()
        )
        if (sim > 0.8) {
          score += sim * 0.5
          reasons.push(`Similar names (${Math.round(sim * 100)}% match)`)
        }
      }

      // Same birth year
      if (m1.birthYear && m2.birthYear && m1.birthYear === m2.birthYear) {
        score += 0.3
        reasons.push(`Same birth year (${m1.birthYear})`)
      }

      // Same gender
      if (m1.gender && m2.gender && m1.gender === m2.gender) {
        score += 0.1
      }

      if (score > 0.7 && m1.id && m2.id) {
        results.push({
          member1Id: m1.id,
          member2Id: m2.id,
          score: Math.min(score, 1),
          reasons,
        })
      }
    }
  }
  return results
}

function diceCoefficient(s1: string, s2: string): number {
  if (s1 === s2) return 1
  if (s1.length < 2 || s2.length < 2) return 0

  const bigrams1 = new Map<string, number>()
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.substring(i, i + 2)
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1)
  }

  let intersectionSize = 0
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substring(i, i + 2)
    const count = bigrams1.get(bigram) || 0
    if (count > 0) {
      bigrams1.set(bigram, count - 1)
      intersectionSize++
    }
  }

  return (2.0 * intersectionSize) / (s1.length + s2.length - 2)
}
