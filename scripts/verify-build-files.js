#!/usr/bin/env node
/**
 * Run on the server before build: node scripts/verify-build-files.js
 * Exits 0 if all required files exist, 1 and lists missing paths otherwise.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const required = [
  'src/types/index.ts',
  'src/lib/utils/cn.ts',
  'src/lib/i18n/store.ts',
  'src/lib/i18n/translations.ts',
  'src/components/family-tree/index.ts',
  'src/components/family-tree/FamilyTreeCanvas.tsx',
  'src/components/family-tree/MemberCard.tsx',
  'src/components/family-tree/AddMemberModal.tsx',
  'src/components/family-tree/EditMemberModal.tsx',
  'src/components/family-tree/BulkAddMembersModal.tsx',
  'src/components/family-tree/ShareModal.tsx',
  'src/components/ai/AIInsightsPanel.tsx',
  'src/components/ui/LanguageSwitcher.tsx',
  'src/components/ui/LanguageProvider.tsx',
  'prisma/schema.prisma',
  'next.config.js',
]

const missing = required.filter((p) => !fs.existsSync(path.join(ROOT, p)))
if (missing.length) {
  console.error('Missing files (push from your dev machine then pull on server):')
  missing.forEach((p) => console.error('  -', p))
  process.exit(1)
}
console.log('All required build files present.')
process.exit(0)
