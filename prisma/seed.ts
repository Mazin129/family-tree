import { PrismaClient, UserRole, Language, Gender, Region, PrivacyLevel, PostCategory } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

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

  // Seed community posts (Wikipedia & heritage-based content)
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
      authorId: admin.id,
      title: 'Kingdom of Kush and Ancient Meroë',
      titleArabic: 'مملكة كوش ومدينة مروي القديمة',
      content: `The Kingdom of Kush was an ancient kingdom in Nubia centered along the Nile Valley in what is now northern Sudan and southern Egypt. It existed from approximately the 8th century BCE until around 350 CE, representing one of the earliest and most advanced states on the African continent.

The city-state of Kerma emerged as the dominant political force between 2450 and 1450 BCE. In the 8th century BCE, King Piye invaded Lower Egypt, establishing the Kushite-ruled Twenty-fifth Dynasty. Kushite monarchs ruled Egypt for over a century.

After the capital moved to Meroë (around 591 BCE), the city became the heart of the kingdom. Meroë is marked by more than 200 pyramids in three groups, with distinctive Nubian proportions. The Pyramids of Meroë date to the 3rd century BCE–4th century CE and served as burial places for Kushite monarchs and royal family members.

Sources: Wikipedia – Kingdom of Kush, Meroë, Pyramids of Meroë`,
      contentAr: `مملكة كوش مملكة قديمة في النوبة، تركزت على طول وادي النيل في ما يعرف الآن بشمال السودان وجنوب مصر. وُجدت من القرن الثامن قبل الميلاد حتى حوالي 350 ميلادية، وتمثل إحدى أقدم وأكثر الدول تقدماً في القارة الإفريقية.

ظهرت مدينة كرمة كقوة سياسية مهيمنة بين 2450 و1450 قبل الميلاد. في القرن الثامن قبل الميلاد، غزا الملك بعانخي مصر السفلى وأسس الأسرة الخامسة والعشرين الكوشية. حكم الكوشيون مصر لأكثر من قرن.

بعد انتقال العاصمة إلى مروي (حوالي 591 ق.م)، أصبحت المدينة قلب المملكة. تُعرف مروي بأكثر من 200 هرم في ثلاث مجموعات، بنسب نوبية مميزة. أهرامات مروي تعود إلى القرن الثالث قبل الميلاد–الرابع الميلادي وكانت مكان دفن الملوك الكوشيين وأفراد العائلة المالكة.

المصادر: ويكيبيديا – مملكة كوش، مروي، أهرامات مروي`,
      category: PostCategory.HISTORY,
      tags: ['kush', 'meroe', 'nubia', 'pyramids', 'ancient-sudan'],
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
    {
      authorId: admin.id,
      title: 'Sudanese Music: Pentatonic Scale and Haqiba',
      titleArabic: 'الموسيقى السودانية: السلم الخماسي والحقيبة',
      content: `Sudanese music has deep historical roots shaped by diverse cultural influences. The musical landscape reflects ancient Nubian traditions, Islamic influences introduced through Arab traders, and indigenous African heritage. Sudan's location as a cultural crossroads has created a rich and varied musical tradition.

Sudanese music is fundamentally based on the pentatonic scale—a five-note scale, similar to the black notes on a piano. This characteristic scale is shared with Scottish, Chinese, and Puerto Rican music, as well as Celtic folk music and American blues. The pentatonic scale gives Sudanese music its distinctive melodic sweetness.

Modern Sudanese popular music emerged from Madeeh (Muslim Sufi gospel chants praising the Prophet Muhammad), which evolved into the secular genre Haqiba in the 1930s–1940s. Haqiba is a predominantly vocal art form featuring a lead singer with backing singers who clap rhythmically, often inducing trance-like responses in audiences. The genre influenced neighboring countries including Ethiopia, Somalia, Chad, and Eritrea.

Sources: Wikipedia – Music of Sudan`,
      contentAr: `للموسيقى السودانية جذور تاريخية عميقة تشكلت بتأثيرات ثقافية متنوعة. يعكس المشهد الموسيقي التقاليد النوبية القديمة، والتأثيرات الإسلامية التي جاءت عبر التجار العرب، والتراث الإفريقي الأصيل. موقع السودان كملتقى ثقافي أنشأ تقليداً موسيقياً غنياً ومتنوعاً.

تعتمد الموسيقى السودانية أساساً على السلم الخماسي—مقياس من خمس نغمات، يشبه المفاتيح السوداء على البيانو. هذا السلم يشترك فيه مع الموسيقى الاسكتلندية والصينية والبورتوريكية، وكذلك فولكلور الكلت والبلوز الأمريكي. يمنح السلم الخماسي الموسيقى السودانية حلاوتها اللحنية المميزة.

الموسيقى الشعبية السودانية الحديثة انبثقت من المديح (أناشيد صوفية في مدح النبي محمد)، التي تطورت إلى فن الحقيبة الدنيوي في ثلاثينيات وأربعينيات القرن العشرين. الحقيبة فن غنائي صوتي بامتياز، بمغني رئيسي ومغنين ثانويين يصفقون إيقاعياً، وغالباً ما يثيرون استجابات شبيهة بالتنويم. أثّر الفن على دول الجوار مثل إثيوبيا والصومال وتشاد وإريتريا.

المصادر: ويكيبيديا – موسيقى السودان`,
      category: PostCategory.MUSIC,
      tags: ['music', 'pentatonic', 'haqiba', 'madeeh', 'sudanese-heritage'],
    },
    {
      authorId: admin.id,
      title: 'UNESCO Heritage: Al-Jertiq and Sudanese Rituals',
      titleArabic: 'تراث اليونسكو: الجرتيق والطقوس السودانية',
      content: `In 2025, UNESCO inscribed Al-Jertiq (Al-Jertiq) on the List of Intangible Cultural Heritage in Need of Urgent Safeguarding. This ancient ritual is practiced primarily among Nubian tribes in central and northern Sudan, associated with marriage ceremonies and circumcisions, with roots in the coronation rituals of ancient Sudanese kingdoms.

Sudan has five elements on UNESCO's Representative List of Intangible Cultural Heritage: Al-Jertiq (2025), Henna rituals (2024), Procession and celebrations of Prophet Mohammed's birthday (2023), Arts of engraving on metals (2023), Date palm knowledge and practices (2022), and Arabic calligraphy (2021).

Sources: UNESCO ICH, Wikipedia`,
      contentAr: `أدرجت اليونسكو عام 2025 طقس الجرتيق في قائمة التراث الثقافي غير المادي المحتاج إلى صون عاجل. يُمارس هذا الطقس القديم خصوصاً في قبائل النوبة بوسط وشمال السودان، ويرتبط باحتفالات الزواج والختان، وجذوره في طقوس التتويج للممالك السودانية القديمة.

يملك السودان خمسة عناصر في القائمة التمثيلية للتراث الثقافي غير المادي لليونسكو: الجرتيق (2025)، طقوس الحناء (2024)، موكب واحتفالات المولد النبوي (2023)، فنون النقش على المعادن (2023)، معرفة وممارسات نخيل التمر (2022)، والخط العربي (2021).

المصادر: اليونسكو، ويكيبيديا`,
      category: PostCategory.CULTURE,
      tags: ['unesco', 'jertiq', 'heritage', 'rituals'],
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
        region: Region.WEST_DARFUR,
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
