import Link from 'next/link'
import { TreePine, Users, Globe, BookOpen, Sparkles, Shield, ArrowLeft, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-sand-50" dir="rtl">

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sand-200">
        <div className="page-container flex items-center justify-between h-16">
          <Logo />
          <div className="hidden md:flex items-center gap-1">
            <Link href="#features"  className="btn-ghost text-sm">المميزات</Link>
            <Link href="#community" className="btn-ghost text-sm">المجتمع</Link>
            <Link href="#about"     className="btn-ghost text-sm">عن المنصة</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"    className="btn-secondary text-sm">تسجيل الدخول</Link>
            <Link href="/register" className="btn-primary  text-sm">ابدأ الآن</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Desert gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-sand-900 via-sand-800 to-khartoum-900" />
        <div className="absolute inset-0 pattern-overlay opacity-30" />

        {/* Decorative circles */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sand-500 rounded-full blur-[120px] opacity-10 animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-nile-500 rounded-full blur-[100px] opacity-10 animate-pulse-slow" />

        <div className="relative page-container py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sand-500/20 border border-sand-400/30 text-sand-200 text-sm mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span>منصة التراث السوداني</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6 animate-slide-up">
              اكتشف جذورك<br />
              <span className="text-sand-300">وحافظ على تراثك السوداني</span>
            </h1>

            <p className="text-lg md:text-xl text-sand-200 mb-10 leading-relaxed max-w-2xl mx-auto animate-slide-up">
              منصة شاملة تجمع شجرة العائلة والتراث الثقافي والمجتمع السوداني —
              بذكاء اصطناعي، ودعم كامل للغة العربية، وخصوصية تامة.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-sand-500 hover:bg-sand-400 text-white font-semibold px-8 py-4 rounded-2xl transition-all shadow-heritage hover:shadow-lg hover:-translate-y-0.5"
              >
                <TreePine className="w-5 h-5" />
                ابنِ شجرتك العائلية
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-2xl transition-all border border-white/20 backdrop-blur-sm"
              >
                <ArrowLeft className="w-5 h-5" />
                استكشف المنصة
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
              {[
                { num: '٥٠+',   label: 'قبيلة سودانية' },
                { num: '١٨',    label: 'ولاية وإقليم' },
                { num: '٣',     label: 'مراحل ذكاء اصطناعي' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl font-bold text-sand-300">{s.num}</div>
                  <div className="text-sand-400 text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 bg-white">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="section-title">كل ما تحتاجه في مكان واحد</h2>
            <p className="section-subtitle text-lg mt-2">مصمَّم خصيصاً للعائلات السودانية في كل مكان</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-sand-50">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="section-title">كيف يعمل؟</h2>
            <p className="section-subtitle">ثلاث خطوات بسيطة للبدء</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {STEPS.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-gradient-heritage rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-heritage">
                  <span className="text-2xl font-bold text-white">{i + 1}</span>
                </div>
                <h3 className="font-semibold text-khartoum-900 mb-2">{step.title}</h3>
                <p className="text-khartoum-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community Section ── */}
      <section id="community" className="py-20 bg-gradient-to-br from-sand-900 to-khartoum-900 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay opacity-20" />
        <div className="relative page-container text-center">
          <h2 className="text-3xl font-bold text-white mb-4">انضم إلى المجتمع السوداني</h2>
          <p className="text-sand-200 text-lg mb-10 max-w-2xl mx-auto">
            تواصل مع عائلات من جميع أنحاء السودان والمهجر، وشارك قصصك وتراثك
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {COMMUNITY_FEATURES.map(cf => (
              <div key={cf.title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-right">
                <div className="text-3xl mb-3">{cf.icon}</div>
                <h3 className="font-semibold text-white mb-2">{cf.title}</h3>
                <p className="text-sand-300 text-sm">{cf.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/register" className="btn-primary text-base px-8 py-4 rounded-2xl">
            انضم مجاناً الآن
          </Link>
        </div>
      </section>

      {/* ── Privacy pledge ── */}
      <section id="about" className="py-16 bg-white">
        <div className="page-container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start gap-6 p-8 rounded-2xl bg-acacia-50 border border-acacia-200">
              <div className="w-12 h-12 bg-acacia-500 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-khartoum-900 mb-2">خصوصيتك أولويتنا</h3>
                <p className="text-khartoum-600 leading-relaxed">
                  نحن ملتزمون بحماية بياناتك الشخصية وبيانات عائلتك. لك التحكم الكامل في
                  من يرى شجرتك العائلية — سواء كانت عامة للمجتمع، أو خاصة بالعائلة فقط،
                  أو سرية تماماً. يمكنك تصدير أو حذف بياناتك في أي وقت.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-khartoum-950 text-khartoum-400 py-12">
        <div className="page-container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Logo light />
              <p className="text-khartoum-500 text-sm mt-3 leading-relaxed max-w-xs">
                منصة مخصصة للحفاظ على الهوية والتراث السوداني للأجيال القادمة
              </p>
            </div>
            {FOOTER_LINKS.map(col => (
              <div key={col.title}>
                <h4 className="text-white font-semibold mb-3 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-khartoum-500 hover:text-sand-400 text-sm transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-khartoum-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-khartoum-600">
              © ٢٠٢٥ منصة التراث السوداني. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center gap-1 text-xs text-khartoum-600">
              <Star className="w-3 h-3 text-gold-500" />
              <span>مصنوع بحب للسودان وشعبه</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="w-9 h-9 bg-gradient-heritage rounded-xl flex items-center justify-center shadow-heritage">
        <TreePine className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className={`font-bold text-lg leading-tight ${light ? 'text-white' : 'text-khartoum-900'}`}>
          التراث السوداني
        </div>
        <div className={`text-xs leading-tight ${light ? 'text-sand-300' : 'text-khartoum-400'}`}>
          Sudanese Heritage
        </div>
      </div>
    </Link>
  )
}

function FeatureCard({
  icon: Icon, title, desc, color,
}: {
  icon: React.ElementType
  title: string
  desc: string
  color: string
}) {
  return (
    <div className="card-hover p-6 text-right group">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold text-khartoum-900 mb-2">{title}</h3>
      <p className="text-khartoum-500 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: TreePine,
    title: 'شجرة العائلة التفاعلية',
    desc: 'ابنِ شجرتك العائلية عبر أجيال متعددة مع دعم الأسماء العربية والأنساب السودانية وتصنيف القبائل والأقاليم.',
    color: 'bg-sand-500',
  },
  {
    icon: Sparkles,
    title: 'ذكاء اصطناعي متقدم',
    desc: 'اكتشاف التكرار، اقتراح الروابط المفقودة، التحقق من العلاقات، وإنشاء سرديات تراثية تلقائياً.',
    color: 'bg-nile-600',
  },
  {
    icon: Users,
    title: 'مجتمع وتعاون',
    desc: 'تعاون مع أفراد العائلة في بناء الشجرة، شارك القصص، وتواصل مع المجتمع السوداني في المهجر.',
    color: 'bg-sahara-500',
  },
  {
    icon: BookOpen,
    title: 'أرشيف التاريخ الشفهي',
    desc: 'احتفظ بالقصص والروايات الصوتية والمرئية من كبار السن قبل أن تضيع في طيات الزمن.',
    color: 'bg-acacia-600',
  },
  {
    icon: Globe,
    title: 'ثنائية اللغة',
    desc: 'واجهة كاملة بالعربية والإنجليزية مع دعم RTL/LTR، ونظام أسماء يراعي التقاليد السودانية.',
    color: 'bg-sand-700',
  },
  {
    icon: Shield,
    title: 'خصوصية وأمان',
    desc: 'تحكم كامل في من يرى بياناتك. تشفير من طرف لطرف، إدارة الموافقة، وامتثال GDPR.',
    color: 'bg-khartoum-700',
  },
]

const STEPS = [
  {
    title: 'أنشئ حسابك',
    desc:  'سجّل بالبريد الإلكتروني أو بحساب Google في ثوانٍ',
  },
  {
    title: 'أضف أفراد عائلتك',
    desc:  'ابدأ بنفسك وأضف الآباء والأجداد والأبناء بسهولة',
  },
  {
    title: 'شارك واحتفظ',
    desc:  'دعوة أفراد العائلة للتعاون وحفظ التراث للأجيال القادمة',
  },
]

const COMMUNITY_FEATURES = [
  {
    icon: '🏛️',
    title: 'تاريخ القبائل',
    desc: 'موسوعة شاملة لتاريخ القبائل السودانية وأنسابها وموروثاتها',
  },
  {
    icon: '🎵',
    title: 'الفنون والموروث',
    desc: 'موسيقى، أشعار، رقصات وملابس تقليدية من كل أنحاء السودان',
  },
  {
    icon: '🗣️',
    title: 'الروايات الشفهية',
    desc: 'أرشيف صوتي ومرئي للحكايات والأمثال والأغاني الشعبية',
  },
]

const FOOTER_LINKS = [
  {
    title: 'المنصة',
    links: [
      { label: 'المميزات',    href: '#features'  },
      { label: 'الأسعار',     href: '/pricing'   },
      { label: 'الأسئلة الشائعة', href: '/faq'  },
    ],
  },
  {
    title: 'قانوني',
    links: [
      { label: 'سياسة الخصوصية', href: '/privacy' },
      { label: 'شروط الاستخدام', href: '/terms'   },
      { label: 'سياسة البيانات', href: '/data'    },
    ],
  },
]
