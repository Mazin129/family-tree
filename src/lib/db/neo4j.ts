// Neo4j Graph Database Driver
// Manages all family relationship graph operations

import neo4j, { Driver, Session, QueryResult } from 'neo4j-driver'
import type { GraphPerson, GraphRelationship, RelationshipType, TreeNode, Gender } from '@/types'

let driver: Driver | null = null

export function getNeo4jDriver(): Driver {
  if (!driver) {
    const uri  = process.env.NEO4J_URI      || 'bolt://localhost:7687'
    const user = process.env.NEO4J_USERNAME || 'neo4j'
    const pass = process.env.NEO4J_PASSWORD || 'password'

    driver = neo4j.driver(uri, neo4j.auth.basic(user, pass), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 10000,
    })
  }
  return driver
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close()
    driver = null
  }
}

export async function runQuery<T = unknown>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const d = getNeo4jDriver()
  const session: Session = d.session()
  try {
    const result: QueryResult = await session.run(cypher, params)
    return result.records.map(r => r.toObject() as T)
  } finally {
    await session.close()
  }
}

// ─────────────────────────────────────────────
// PERSON CRUD
// ─────────────────────────────────────────────

export async function createPerson(person: Omit<GraphPerson, 'id'>): Promise<GraphPerson> {
  const [record] = await runQuery<{ p: GraphPerson }>(
    `CREATE (p:Person {
       postgresId:      $postgresId,
       fullName:        $fullName,
       fullNameArabic:  $fullNameArabic,
       gender:          $gender,
       birthYear:       $birthYear,
       isAlive:         $isAlive,
       photo:           $photo,
       tribe:           $tribe,
       createdAt:       datetime()
     })
     RETURN p`,
    person
  )
  return record.p
}

export async function updatePerson(postgresId: string, data: Partial<GraphPerson>): Promise<void> {
  const setClauses = Object.keys(data)
    .map(key => `p.${key} = $${key}`)
    .join(', ')

  await runQuery(
    `MATCH (p:Person {postgresId: $postgresId})
     SET ${setClauses}
     RETURN p`,
    { postgresId, ...data }
  )
}

export async function deletePerson(postgresId: string): Promise<void> {
  await runQuery(
    `MATCH (p:Person {postgresId: $postgresId})
     DETACH DELETE p`,
    { postgresId }
  )
}

// ─────────────────────────────────────────────
// RELATIONSHIP CRUD
// ─────────────────────────────────────────────

export async function createRelationship(
  fromPostgresId: string,
  toPostgresId: string,
  type: RelationshipType,
  properties: Record<string, unknown> = {}
): Promise<void> {
  // We use dynamic relationship type via APOC or manual approach
  // Using parameterized approach with explicit types for safety
  const validTypes: RelationshipType[] = [
    'PARENT_OF', 'CHILD_OF', 'SPOUSE_OF', 'SIBLING_OF',
    'HALF_SIBLING_OF', 'ADOPTED_CHILD_OF', 'GUARDIAN_OF', 'EXTENDED_KIN'
  ]
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid relationship type: ${type}`)
  }

  // Build bidirectional relationships properly
  if (type === 'PARENT_OF') {
    await runQuery(
      `MATCH (a:Person {postgresId: $fromId}), (b:Person {postgresId: $toId})
       MERGE (a)-[r:PARENT_OF]->(b)
       SET r += $props, r.createdAt = datetime()
       WITH a, b
       MERGE (b)-[r2:CHILD_OF]->(a)
       SET r2 += $props, r2.createdAt = datetime()`,
      { fromId: fromPostgresId, toId: toPostgresId, props: properties }
    )
  } else if (type === 'SPOUSE_OF') {
    await runQuery(
      `MATCH (a:Person {postgresId: $fromId}), (b:Person {postgresId: $toId})
       MERGE (a)-[r:SPOUSE_OF]-(b)
       SET r += $props, r.createdAt = datetime()`,
      { fromId: fromPostgresId, toId: toPostgresId, props: properties }
    )
  } else if (type === 'SIBLING_OF') {
    await runQuery(
      `MATCH (a:Person {postgresId: $fromId}), (b:Person {postgresId: $toId})
       MERGE (a)-[r:SIBLING_OF]-(b)
       SET r += $props, r.createdAt = datetime()`,
      { fromId: fromPostgresId, toId: toPostgresId, props: properties }
    )
  } else {
    await runQuery(
      `MATCH (a:Person {postgresId: $fromId}), (b:Person {postgresId: $toId})
       CALL apoc.merge.relationship(a, $type, {}, $props, b) YIELD rel
       RETURN rel`,
      { fromId: fromPostgresId, toId: toPostgresId, type, props: properties }
    )
  }
}

export async function deleteRelationship(
  fromPostgresId: string,
  toPostgresId: string,
  type: RelationshipType
): Promise<void> {
  await runQuery(
    `MATCH (a:Person {postgresId: $fromId})-[r]-(b:Person {postgresId: $toId})
     WHERE type(r) = $type
     DELETE r`,
    { fromId: fromPostgresId, toId: toPostgresId, type }
  )
}

// ─────────────────────────────────────────────
// TREE QUERIES
// ─────────────────────────────────────────────

export async function getTreeForVisualization(
  rootPostgresId: string,
  maxDepth: number = 6
): Promise<TreeNode | null> {
  const records = await runQuery<{
    nodes: GraphPerson[]
    relationships: { type: string; start: string; end: string }[]
  }>(
    `MATCH path = (root:Person {postgresId: $rootId})-[*0..${maxDepth}]->(descendant:Person)
     WITH collect(DISTINCT nodes(path)) AS allNodes,
          collect(DISTINCT relationships(path)) AS allRels
     RETURN allNodes, allRels`,
    { rootId: rootPostgresId }
  )

  if (!records.length) return null

  // Build tree structure from flat node/relationship lists
  return buildTreeFromGraph(records, rootPostgresId)
}

export async function getAncestors(
  postgresId: string,
  maxDepth: number = 5
): Promise<GraphPerson[]> {
  const records = await runQuery<{ ancestor: GraphPerson }>(
    `MATCH (p:Person {postgresId: $id})<-[:PARENT_OF*1..${maxDepth}]-(ancestor:Person)
     RETURN DISTINCT ancestor`,
    { id: postgresId }
  )
  return records.map(r => r.ancestor)
}

export async function getDescendants(
  postgresId: string,
  maxDepth: number = 5
): Promise<GraphPerson[]> {
  const records = await runQuery<{ descendant: GraphPerson }>(
    `MATCH (p:Person {postgresId: $id})-[:PARENT_OF*1..${maxDepth}]->(descendant:Person)
     RETURN DISTINCT descendant`,
    { id: postgresId }
  )
  return records.map(r => r.descendant)
}

export async function getImmediateFamily(postgresId: string): Promise<{
  parents: GraphPerson[]
  children: GraphPerson[]
  siblings: GraphPerson[]
  spouses: GraphPerson[]
}> {
  const records = await runQuery<{
    parents: GraphPerson[]
    children: GraphPerson[]
    siblings: GraphPerson[]
    spouses: GraphPerson[]
  }>(
    `MATCH (p:Person {postgresId: $id})
     OPTIONAL MATCH (p)<-[:PARENT_OF]-(parent:Person)
     OPTIONAL MATCH (p)-[:PARENT_OF]->(child:Person)
     OPTIONAL MATCH (p)-[:SIBLING_OF]-(sibling:Person)
     OPTIONAL MATCH (p)-[:SPOUSE_OF]-(spouse:Person)
     RETURN
       collect(DISTINCT parent)  AS parents,
       collect(DISTINCT child)   AS children,
       collect(DISTINCT sibling) AS siblings,
       collect(DISTINCT spouse)  AS spouses`,
    { id: postgresId }
  )
  return records[0] || { parents: [], children: [], siblings: [], spouses: [] }
}

export async function findShortestPath(
  fromPostgresId: string,
  toPostgresId: string
): Promise<{ nodes: GraphPerson[]; length: number } | null> {
  const records = await runQuery<{ path: unknown; length: number }>(
    `MATCH (a:Person {postgresId: $fromId}), (b:Person {postgresId: $toId})
     MATCH path = shortestPath((a)-[*]-(b))
     RETURN path, length(path) AS length`,
    { fromId: fromPostgresId, toId: toPostgresId }
  )
  if (!records.length) return null
  return { nodes: [], length: records[0].length }
}

// ─────────────────────────────────────────────
// AI HELPER QUERIES
// ─────────────────────────────────────────────

export async function findPotentialDuplicates(
  treeId: string,
  threshold: number = 0.85
): Promise<Array<{ person1Id: string; person2Id: string; score: number }>> {
  // Find persons with similar names in the same tree context
  const records = await runQuery<{
    person1Id: string
    person2Id: string
    nameSimilarity: number
  }>(
    `MATCH (a:Person {treeId: $treeId}), (b:Person {treeId: $treeId})
     WHERE a.postgresId < b.postgresId
       AND a.birthYear = b.birthYear
       AND apoc.text.sorensenDiceSimilarity(a.fullName, b.fullName) >= $threshold
     RETURN
       a.postgresId AS person1Id,
       b.postgresId AS person2Id,
       apoc.text.sorensenDiceSimilarity(a.fullName, b.fullName) AS nameSimilarity`,
    { treeId, threshold }
  )
  return records.map(r => ({
    person1Id: r.person1Id,
    person2Id: r.person2Id,
    score: r.nameSimilarity,
  }))
}

export async function suggestMissingLinks(postgresId: string): Promise<{
  potentialSiblings: GraphPerson[]
  potentialParents: GraphPerson[]
}> {
  // Find people with shared parents (potential siblings not yet connected)
  const potentialSiblings = await runQuery<{ candidate: GraphPerson }>(
    `MATCH (p:Person {postgresId: $id})<-[:PARENT_OF]-(parent:Person)-[:PARENT_OF]->(candidate:Person)
     WHERE candidate.postgresId <> $id
       AND NOT (p)-[:SIBLING_OF]-(candidate)
     RETURN DISTINCT candidate
     LIMIT 10`,
    { id: postgresId }
  )

  // Find people who might be parents (same tribe, earlier birth year, already have children)
  const potentialParents = await runQuery<{ candidate: GraphPerson }>(
    `MATCH (p:Person {postgresId: $id})
     MATCH (candidate:Person)
     WHERE candidate.tribe = p.tribe
       AND candidate.birthYear < p.birthYear - 15
       AND candidate.birthYear > p.birthYear - 50
       AND NOT (candidate)-[:PARENT_OF]->(p)
       AND NOT EXISTS { MATCH (p)<-[:PARENT_OF]-() }
     RETURN candidate
     LIMIT 5`,
    { id: postgresId }
  )

  return {
    potentialSiblings: potentialSiblings.map(r => r.candidate),
    potentialParents:  potentialParents.map(r => r.candidate),
  }
}

// ─────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────

/**
 * Count existing parents of a child node that have the given gender.
 * Used to prevent adding a second father or second mother.
 */
export async function countParentsByGender(
  childPostgresId: string,
  gender: string
): Promise<number> {
  try {
    const records = await runQuery<{ cnt: unknown }>(
      `MATCH (parent:Person)-[:PARENT_OF]->(child:Person {postgresId: $childId})
       WHERE parent.gender = $gender
       RETURN count(parent) AS cnt`,
      { childId: childPostgresId, gender }
    )
    const cnt = records[0]?.cnt
    if (typeof cnt === 'number') return cnt
    // Neo4j driver returns integers as { low, high } objects
    if (cnt !== null && typeof cnt === 'object' && 'low' in (cnt as object)) {
      return (cnt as { low: number }).low
    }
    return 0
  } catch {
    return 0
  }
}

// ─────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────

function buildTreeFromGraph(
  records: Array<{ nodes: GraphPerson[]; relationships: { type: string; start: string; end: string }[] }>,
  rootId: string
): TreeNode | null {
  // Flatten all nodes and rels
  const nodeMap = new Map<string, GraphPerson>()
  const childMap = new Map<string, string[]>() // parentId -> [childId]
  const spouseMap = new Map<string, string[]>()

  for (const record of records) {
    for (const node of record.nodes) {
      if (node?.postgresId) nodeMap.set(node.postgresId, node)
    }
    for (const rel of record.relationships) {
      if (rel.type === 'PARENT_OF') {
        const children = childMap.get(rel.start) || []
        children.push(rel.end)
        childMap.set(rel.start, children)
      } else if (rel.type === 'SPOUSE_OF') {
        const spouses = spouseMap.get(rel.start) || []
        spouses.push(rel.end)
        spouseMap.set(rel.start, spouses)
      }
    }
  }

  function toTreeNode(id: string, visited = new Set<string>()): TreeNode | null {
    if (visited.has(id)) return null
    visited.add(id)

    const person = nodeMap.get(id)
    if (!person) return null

    const childIds = childMap.get(id) || []
    const spouseIds = spouseMap.get(id) || []

    return {
      id: person.postgresId,
      name: person.fullName,
      nameArabic: person.fullNameArabic,
      gender: person.gender as Gender,
      birthYear: person.birthYear ? Number(person.birthYear) : null,
      deathYear: null,
      isAlive: person.isAlive,
      photo: person.photo,
      tribe: person.tribe,
      privacyLevel: 'FAMILY',
      postgresId: person.postgresId,
      children: childIds
        .map(cid => toTreeNode(cid, new Set(visited)))
        .filter((n): n is TreeNode => n !== null),
      spouses: spouseIds
        .map(sid => toTreeNode(sid, new Set(visited)))
        .filter((n): n is TreeNode => n !== null),
    }
  }

  return toTreeNode(rootId)
}
