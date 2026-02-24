import { PrismaClient, UserRole, Language, Gender, Region, PrivacyLevel, PostCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sudaneseheritagе.com' },
    update: {},
    create: {
      email: 'admin@sudaneseheritagе.com',
      name: 'Platform Admin',
      nameArabic: 'مدير المنصة',
      password: hashedPassword,
      role: UserRole.ADMIN,
      preferredLanguage: Language.ARABIC,
      emailVerified: new Date(),
      profile: {
        create: {
          bio: 'Platform administrator dedicated to preserving Sudanese heritage',
          bioArabic: 'مدير المنصة المكرس للحفاظ على التراث السوداني',
          country: 'Sudan',
          isPublic: true,
        }
      },
      privacySettings: {
        create: {
          consentGiven: true,
          consentDate: new Date(),
        }
      }
    }
  })

  // Demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Ahmed Al-Nile',
      nameArabic: 'أحمد النيل',
      password: await bcrypt.hash('Demo@123!', 12),
      role: UserRole.MEMBER,
      preferredLanguage: Language.ARABIC,
      emailVerified: new Date(),
      profile: {
        create: {
          bio: 'Sudanese heritage enthusiast from Khartoum',
          bioArabic: 'متحمس للتراث السوداني من الخرطوم',
          tribe: 'Ja\'alin',
          region: Region.KHARTOUM,
          country: 'Sudan',
          isPublic: true,
        }
      },
      privacySettings: {
        create: {
          consentGiven: true,
          consentDate: new Date(),
        }
      }
    }
  })

  // Create a demo family tree
  const tree = await prisma.familyTree.upsert({
    where: { neo4jTreeId: 'demo-tree-001' },
    update: {},
    create: {
      ownerId: demoUser.id,
      name: 'Al-Nile Family Tree',
      nameArabic: 'شجرة عائلة النيل',
      description: 'The lineage of the Al-Nile family from Northern Sudan',
      descriptionAr: 'نسب عائلة النيل من شمال السودان',
      tribe: "Ja'alin",
      region: Region.NORTHERN,
      isPublic: true,
      neo4jTreeId: 'demo-tree-001',
    }
  })

  // Seed community posts
  const posts = [
    {
      authorId: admin.id,
      title: 'Welcome to the Sudanese Heritage Platform',
      titleArabic: 'مرحباً بكم في منصة التراث السوداني',
      content: 'We are thrilled to launch this platform dedicated to preserving and celebrating Sudanese cultural heritage...',
      contentAr: 'يسعدنا إطلاق هذه المنصة المكرسة للحفاظ على التراث الثقافي السوداني والاحتفاء به...',
      category: PostCategory.GENERAL,
      isPinned: true,
      tags: ['welcome', 'heritage', 'platform'],
    },
    {
      authorId: demoUser.id,
      title: 'The Ja\'alin Tribe: History and Origins',
      titleArabic: 'قبيلة الجعليين: التاريخ والأصول',
      content: 'The Ja\'alin are one of the prominent tribes of northern Sudan, descended from Abbas ibn Abd al-Muttalib...',
      contentAr: 'الجعليون من أبرز قبائل شمال السودان، ينحدرون من العباس بن عبد المطلب...',
      category: PostCategory.HISTORY,
      tags: ['jaalin', 'tribe', 'history', 'northern-sudan'],
    },
  ]

  for (const post of posts) {
    await prisma.communityPost.create({ data: post })
  }

  // Heritage items
  await prisma.heritageItem.createMany({
    data: [
      {
        uploaderId: admin.id,
        title: 'Sudanese Toub - Traditional Dress',
        titleArabic: 'التوب السوداني - الزي التقليدي',
        description: 'The Sudanese toub is a traditional garment worn by women, consisting of a long piece of fabric wrapped around the body.',
        category: 'CLOTHING' as any,
        region: Region.KHARTOUM,
        isVerified: true,
        isPublic: true,
        tags: ['toub', 'dress', 'traditional', 'women'],
      },
      {
        uploaderId: admin.id,
        title: 'Oud Music of the Nile Valley',
        titleArabic: 'موسيقى العود في وادي النيل',
        description: 'The oud has been a central instrument in Sudanese music for centuries, often used in traditional ceremonies.',
        category: 'MUSIC' as any,
        isVerified: true,
        isPublic: true,
        tags: ['oud', 'music', 'traditional', 'nile'],
      },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Seeding complete!')
  console.log(`   Admin: admin@sudaneseheritagе.com / Admin@123!`)
  console.log(`   Demo:  demo@example.com / Demo@123!`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
