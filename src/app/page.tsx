'use client'

import Link from 'next/link'
import { TreePine, Users, Globe, BookOpen, Sparkles, Shield, ArrowLeft, Star } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/store'
import { createT } from '@/lib/i18n/translations'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export default function LandingPage() {
  const { locale, dir } = useLanguage()
  const t = createT(locale)

  return (
    <div className="min-h-screen bg-sand-50" dir={dir}>

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sand-200">
        <div className="page-container flex items-center justify-between h-16">
          <Logo locale={locale} />
          <div className="hidden md:flex items-center gap-1">
            <Link href="#features"  className="btn-ghost text-sm">{t('nav_features')}</Link>
            <Link href="#community" className="btn-ghost text-sm">{t('nav_community')}</Link>
            <Link href="#about"     className="btn-ghost text-sm">{t('nav_about')}</Link>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/login"    className="btn-secondary text-sm">{t('nav_login')}</Link>
            <Link href="/register" className="btn-primary  text-sm">{t('nav_register')}</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sand-900 via-sand-800 to-khartoum-900" />
        <div className="absolute inset-0 pattern-overlay opacity-30" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sand-500 rounded-full blur-[120px] opacity-10 animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-nile-500 rounded-full blur-[100px] opacity-10 animate-pulse-slow" />

        <div className="relative page-container py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sand-500/20 border border-sand-400/30 text-sand-200 text-sm mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span>{t('hero_badge')}</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6 animate-slide-up">
              {t('hero_title_1')}<br />
              <span className="text-sand-300">{t('hero_title_2')}</span>
            </h1>

            <p className="text-lg md:text-xl text-sand-200 mb-10 leading-relaxed max-w-2xl mx-auto animate-slide-up">
              {t('hero_subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-sand-500 hover:bg-sand-400 text-white font-semibold px-8 py-4 rounded-2xl transition-all shadow-heritage hover:shadow-lg hover:-translate-y-0.5"
              >
                <TreePine className="w-5 h-5" />
                {t('hero_cta_build')}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-2xl transition-all border border-white/20 backdrop-blur-sm"
              >
                <ArrowLeft className="w-5 h-5" />
                {t('hero_cta_explore')}
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
              {[
                { num: locale === 'ar' ? '٥٠+' : '50+', label: t('stat_tribes')  },
                { num: locale === 'ar' ? '١٨'  : '18',  label: t('stat_regions') },
                { num: locale === 'ar' ? '٣'   : '3',   label: t('stat_ai')      },
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
            <h2 className="section-title">{t('features_title')}</h2>
            <p className="section-subtitle text-lg mt-2">{t('features_subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: TreePine,  title: t('feat_tree_title'),      desc: t('feat_tree_desc'),      color: 'bg-sand-500'    },
              { icon: Sparkles,  title: t('feat_ai_title'),        desc: t('feat_ai_desc'),        color: 'bg-nile-600'    },
              { icon: Users,     title: t('feat_community_title'), desc: t('feat_community_desc'), color: 'bg-sahara-500'  },
              { icon: BookOpen,  title: t('feat_oral_title'),      desc: t('feat_oral_desc'),      color: 'bg-acacia-600'  },
              { icon: Globe,     title: t('feat_bilingual_title'), desc: t('feat_bilingual_desc'), color: 'bg-sand-700'    },
              { icon: Shield,    title: t('feat_privacy_title'),   desc: t('feat_privacy_desc'),   color: 'bg-khartoum-700'},
            ].map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-sand-50">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="section-title">{t('how_title')}</h2>
            <p className="section-subtitle">{t('how_subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { title: t('step1_title'), desc: t('step1_desc') },
              { title: t('step2_title'), desc: t('step2_desc') },
              { title: t('step3_title'), desc: t('step3_desc') },
            ].map((step, i) => (
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
          <h2 className="text-3xl font-bold text-white mb-4">{t('community_title')}</h2>
          <p className="text-sand-200 text-lg mb-10 max-w-2xl mx-auto">{t('community_subtitle')}</p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              { icon: '🏛️', title: t('comm_tribes_title'), desc: t('comm_tribes_desc') },
              { icon: '🎵', title: t('comm_arts_title'),   desc: t('comm_arts_desc')   },
              { icon: '🗣️', title: t('comm_oral_title'),   desc: t('comm_oral_desc')   },
            ].map(cf => (
              <div key={cf.title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-start">
                <div className="text-3xl mb-3">{cf.icon}</div>
                <h3 className="font-semibold text-white mb-2">{cf.title}</h3>
                <p className="text-sand-300 text-sm">{cf.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/register" className="btn-primary text-base px-8 py-4 rounded-2xl">
            {t('community_join')}
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
                <h3 className="text-xl font-bold text-khartoum-900 mb-2">{t('privacy_title')}</h3>
                <p className="text-khartoum-600 leading-relaxed">{t('privacy_desc')}</p>
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
              <Logo locale={locale} light />
              <p className="text-khartoum-500 text-sm mt-3 leading-relaxed max-w-xs">
                {t('footer_tagline')}
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer_platform')}</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-khartoum-500 hover:text-sand-400 text-sm transition-colors">{t('footer_features')}</Link></li>
                <li><Link href="/pricing"  className="text-khartoum-500 hover:text-sand-400 text-sm transition-colors">{t('footer_pricing')}</Link></li>
                <li><Link href="/faq"      className="text-khartoum-500 hover:text-sand-400 text-sm transition-colors">{t('footer_faq')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer_legal')}</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-khartoum-500 hover:text-sand-400 text-sm transition-colors">{t('footer_privacy')}</Link></li>
                <li><Link href="/terms"   className="text-khartoum-500 hover:text-sand-400 text-sm transition-colors">{t('footer_terms')}</Link></li>
                <li><Link href="/data"    className="text-khartoum-500 hover:text-sand-400 text-sm transition-colors">{t('footer_data')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-khartoum-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-khartoum-600">{t('footer_copy')}</p>
            <div className="flex items-center gap-1 text-xs text-khartoum-600">
              <Star className="w-3 h-3 text-gold-500" />
              <span>{t('footer_love')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Logo({ light = false, locale }: { light?: boolean; locale: string }) {
  const isArabic = locale === 'ar'
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="w-9 h-9 bg-gradient-heritage rounded-xl flex items-center justify-center shadow-heritage">
        <TreePine className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className={`font-bold text-lg leading-tight ${light ? 'text-white' : 'text-khartoum-900'}`}>
          {isArabic ? 'التراث السوداني' : 'Sudanese Heritage'}
        </div>
        <div className={`text-xs leading-tight ${light ? 'text-sand-300' : 'text-khartoum-400'}`}>
          {isArabic ? 'Sudanese Heritage' : 'التراث السوداني'}
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
    <div className="card-hover p-6 text-start group">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold text-khartoum-900 mb-2">{title}</h3>
      <p className="text-khartoum-500 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}
