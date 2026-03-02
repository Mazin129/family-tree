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
        descriptionAr: 'التوب السوداني هو الزي التقليدي للمرأة، عبارة عن قطعة قماش طويلة تُلف حول الجسد وتعبّر ألوانه وزخارفه عن الذوق والهوية المحلية.',
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
        descriptionAr: 'يُعد العود من أهم الآلات الوترية في الموسيقى السودانية، يرافق الغناء في المدن والقرى ويستخدم في المناسبات الاجتماعية والاحتفالات.',
        category: 'MUSIC' as any,
        isVerified: true,
        isPublic: true,
        tags: ['oud', 'music', 'traditional', 'nile'],
      },
      {
        uploaderId: admin.id,
        title: 'Sudanese Pentatonic Music',
        titleArabic: 'الموسيقى السودانية والسلم الخماسي',
        description: 'Sudanese music is known for its pentatonic scale, which gives it a distinctive sound within the region.',
        descriptionAr: 'تتميز الموسيقى السودانية باستخدام السلم الخماسي الذي يمنحها طابعاً لحناً مميزاً، وتمتزج فيه التأثيرات العربية والإفريقية في الحقيبة والغناء الحديث.',
        category: 'MUSIC' as any,
        isVerified: true,
        isPublic: true,
        tags: ['music', 'pentatonic', 'heritage'],
      },
      {
        uploaderId: admin.id,
        title: 'Dalooka Drum in Sudanese Weddings',
        titleArabic: 'الدلوكة في الأعراس السودانية',
        description: 'The dalooka is a traditional drum widely used in Sudanese wedding ceremonies.',
        descriptionAr: 'الدلوكة آلة إيقاعية شعبية تُصنع من الفخار أو الخشب المشدود عليه الجلد، وتُستخدم في حفلات الزواج والختان حيث ترافق الأغاني والرقصات النسائية.',
        category: 'MUSIC' as any,
        isVerified: true,
        isPublic: true,
        tags: ['dalooka', 'drum', 'wedding', 'music'],
      },
      {
        uploaderId: admin.id,
        title: 'Sudanese Folk Dances of the West',
        titleArabic: 'الرقصات الشعبية في غرب السودان',
        description: 'Western Sudan is home to distinctive folk dances associated with rites of passage and community celebrations.',
        descriptionAr: 'تزخر مناطق غرب السودان برقصات شعبية مثل الكمبلا المرتبطة بمراحل البلوغ وتحمل المسؤولية، وتُؤدى بملابس وأقنعة ترمز للقوة والشجاعة في المجتمع.',
        category: 'DANCE' as any,
        region: Region.DARFUR,
        isVerified: true,
        isPublic: true,
        tags: ['dance', 'kambala', 'folk'],
      },
      {
        uploaderId: admin.id,
        title: 'Al-Jertiq Wedding Ritual',
        titleArabic: 'طقس الجرتيق في الزواج السوداني',
        description: 'Al-Jertiq is a Sudanese ritual recently inscribed on UNESCO’s Intangible Cultural Heritage list.',
        descriptionAr: 'يُعد الجرتيق من أهم طقوس الزواج في السودان، يستخدم فيه القماش الأحمر والزينة الذهبية والعطور والحناء رمزاً للحماية والبركة والخصوبة، وقد أدرجته اليونسكو ضمن قوائم التراث غير المادي.',
        category: 'CEREMONY' as any,
        isVerified: true,
        isPublic: true,
        tags: ['jertiq', 'wedding', 'unesco', 'ceremony'],
      },
      {
        uploaderId: admin.id,
        title: 'Henna in Sudanese Celebrations',
        titleArabic: 'الحناء في الاحتفالات السودانية',
        description: 'Henna plays a central role in Sudanese beauty and celebration rituals.',
        descriptionAr: 'تُستخدم الحناء في الأعراس والأعياد لتزيين الأيدي والأقدام بنقوش دقيقة، وترمز ألوانها للفرح والبركة وتشكل جزءاً أساسياً من طقوس الجمال في المجتمع السوداني.',
        category: 'CEREMONY' as any,
        isVerified: true,
        isPublic: true,
        tags: ['henna', 'ceremony', 'beauty'],
      },
      {
        uploaderId: admin.id,
        title: 'Oral History Traditions in Sudan',
        titleArabic: 'التاريخ الشفهي في السودان',
        description: 'Sudanese communities preserve their history through oral storytelling, songs and proverbs.',
        descriptionAr: 'يعتمد السودانيون على التاريخ الشفهي لنقل خبراتهم الجماعية عبر الحكايات والأمثال والأغاني، مما يجعل المجالس الشعبية سجلاً حياً للذاكرة والهوية المحلية.',
        category: 'OTHER' as any,
        isVerified: true,
        isPublic: true,
        tags: ['oral-history', 'proverbs', 'memory'],
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
