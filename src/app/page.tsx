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
    <div className="min-h-screen bg-desert-50 texture-sand" dir={dir}>

      {/* ── Navigation (Nubian pyramid–inspired) ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-nubian-200/50 shadow-sm">
        <div className="page-container flex items-center justify-between h-16">
          <Logo locale={locale} />
          <div className="hidden md:flex items-center gap-1">
            <Link href="#features"  className="btn-ghost text-sm text-nubian-800 hover:text-desert-600">{t('nav_features')}</Link>
            <Link href="#community" className="btn-ghost text-sm text-nubian-800 hover:text-desert-600">{t('nav_community')}</Link>
            <Link href="#about"     className="btn-ghost text-sm text-nubian-800 hover:text-desert-600">{t('nav_about')}</Link>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/login"    className="btn-secondary text-sm border-nubian-300 text-nubian-800 hover:bg-nubian-50">{t('nav_login')}</Link>
            <Link href="/register" className="btn-primary text-sm bg-gradient-heritage hover:opacity-95 text-white border-0 shadow-pyramid">{t('nav_register')}</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero: desert + pyramid silhouette (Meroe / Jebel Barkal) ── */}
      <section className="relative overflow-hidden min-h-[85vh] flex flex-col justify-center">
        {/* Base gradient (sandstone → bronze) */}
        <div className="absolute inset-0 bg-gradient-hero" />
        {/* Sand texture + drift */}
        <div className="absolute inset-0 texture-sand opacity-30 animate-sand-drift" aria-hidden />
        {/* Nubian pattern */}
        <div className="absolute inset-0 pattern-overlay opacity-40" />
        {/* Pyramid silhouette (simplified Meroe-style triangles) */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none" aria-hidden>
          <svg className="w-full h-full object-cover opacity-20" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path d="M0 200 L0 120 L120 0 L240 200 Z" fill="currentColor" className="text-nubian-900" />
            <path d="M180 200 L180 100 L320 0 L460 200 Z" fill="currentColor" className="text-nubian-800" />
            <path d="M400 200 L400 80 L600 0 L800 80 L800 200 Z" fill="currentColor" className="text-nubian-900" />
            <path d="M740 200 L740 100 L880 0 L1020 200 Z" fill="currentColor" className="text-nubian-800" />
            <path d="M960 200 L960 120 L1080 0 L1200 200 Z" fill="currentColor" className="text-nubian-900" />
          </svg>
        </div>
        {/* Nile flow strip (bottom of hero) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-nile-500/40" aria-hidden />
        {/* Soft glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-desert-400 rounded-full blur-[140px] opacity-15 animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-nile-500 rounded-full blur-[120px] opacity-10 animate-pulse-slow" />

        <div className="relative page-container py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-desert-400/25 border border-desert-400/40 text-desert-100 text-sm mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-desert-300" />
              <span>{t('hero_badge')}</span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight mb-6 animate-slide-up">
              {t('hero_title_1')}<br />
              <span className="text-desert-300">{t('hero_title_2')}</span>
            </h1>

            <p className="text-lg md:text-xl text-desert-100/95 mb-10 leading-relaxed max-w-2xl mx-auto animate-slide-up">
              {t('hero_subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-gradient-heritage hover:opacity-95 text-white font-semibold px-8 py-4 rounded-2xl transition-all shadow-pyramid hover:shadow-lg hover:-translate-y-0.5"
              >
                <TreePine className="w-5 h-5" />
                {t('hero_cta_build')}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-2xl transition-all border border-white/25 backdrop-blur-sm"
              >
                <ArrowLeft className="w-5 h-5" />
                {t('hero_cta_explore')}
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-4 pt-8 border-t border-white/15">
              {[
                { num: locale === 'ar' ? '٥٠+' : '50+', label: t('stat_tribes')  },
                { num: locale === 'ar' ? '١٨'  : '18',  label: t('stat_regions') },
                { num: locale === 'ar' ? '٣'   : '3',   label: t('stat_ai')      },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl font-bold text-desert-300">{s.num}</div>
                  <div className="text-desert-200/80 text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Nile divider */}
      <div className="divider-nile" aria-hidden />

      {/* ── Features (temple column–inspired cards) ── */}
      <section id="features" className="py-20 bg-white pattern-overlay">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-nubian-900">{t('features_title')}</h2>
            <p className="section-subtitle text-nubian-600 text-lg mt-2">{t('features_subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: TreePine,  title: t('feat_tree_title'),      desc: t('feat_tree_desc'),      color: 'bg-nubian-500'  },
              { icon: Sparkles,  title: t('feat_ai_title'),        desc: t('feat_ai_desc'),        color: 'bg-nile-500'    },
              { icon: Users,     title: t('feat_community_title'), desc: t('feat_community_desc'), color: 'bg-palm-500'    },
              { icon: BookOpen,  title: t('feat_oral_title'),      desc: t('feat_oral_desc'),      color: 'bg-bronze-500'  },
              { icon: Globe,     title: t('feat_bilingual_title'), desc: t('feat_bilingual_desc'), color: 'bg-nubian-700' },
              { icon: Shield,    title: t('feat_privacy_title'),   desc: t('feat_privacy_desc'),   color: 'bg-coral-500'   },
            ].map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      <div className="divider-nile" aria-hidden />

      {/* ── How it works ── */}
      <section className="py-20 bg-desert-50 texture-sand">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-nubian-900">{t('how_title')}</h2>
            <p className="section-subtitle text-nubian-600">{t('how_subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { title: t('step1_title'), desc: t('step1_desc') },
              { title: t('step2_title'), desc: t('step2_desc') },
              { title: t('step3_title'), desc: t('step3_desc') },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-gradient-heritage rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-pyramid">
                  <span className="text-2xl font-bold text-white">{i + 1}</span>
                </div>
                <h3 className="font-semibold text-nubian-900 mb-2">{step.title}</h3>
                <p className="text-nubian-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider-nile" aria-hidden />

      {/* ── Community (cultural avatars / tribe symbols) ── */}
      <section id="community" className="py-20 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay opacity-30" />
        <div className="relative page-container text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">{t('community_title')}</h2>
          <p className="text-desert-200 text-lg mb-10 max-w-2xl mx-auto">{t('community_subtitle')}</p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              { icon: '🏛️', title: t('comm_tribes_title'), desc: t('comm_tribes_desc') },
              { icon: '🎵', title: t('comm_arts_title'),   desc: t('comm_arts_desc')   },
              { icon: '🗣️', title: t('comm_oral_title'),   desc: t('comm_oral_desc')   },
            ].map(cf => (
              <div key={cf.title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-desert-400/20 text-start hover:border-desert-400/40 transition-colors">
                <div className="text-3xl mb-3">{cf.icon}</div>
                <h3 className="font-semibold text-white mb-2">{cf.title}</h3>
                <p className="text-desert-200/90 text-sm">{cf.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/register" className="btn-primary text-base px-8 py-4 rounded-2xl bg-gradient-heritage shadow-pyramid">
            {t('community_join')}
          </Link>
        </div>
      </section>

      {/* ── Privacy pledge ── */}
      <section id="about" className="py-16 bg-white">
        <div className="page-container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start gap-6 p-8 rounded-2xl bg-palm-50 border border-palm-200 card-column-accent">
              <div className="w-12 h-12 bg-palm-500 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-nubian-900 mb-2">{t('privacy_title')}</h3>
                <p className="text-nubian-700 leading-relaxed">{t('privacy_desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-nubian-950 text-nubian-300 py-12">
        <div className="page-container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Logo locale={locale} light />
              <p className="text-nubian-400 text-sm mt-3 leading-relaxed max-w-xs">
                {t('footer_tagline')}
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer_platform')}</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-nubian-400 hover:text-desert-400 text-sm transition-colors">{t('footer_features')}</Link></li>
                <li><Link href="/pricing"  className="text-nubian-400 hover:text-desert-400 text-sm transition-colors">{t('footer_pricing')}</Link></li>
                <li><Link href="/faq"      className="text-nubian-400 hover:text-desert-400 text-sm transition-colors">{t('footer_faq')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer_legal')}</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-nubian-400 hover:text-desert-400 text-sm transition-colors">{t('footer_privacy')}</Link></li>
                <li><Link href="/terms"   className="text-nubian-400 hover:text-desert-400 text-sm transition-colors">{t('footer_terms')}</Link></li>
                <li><Link href="/data"    className="text-nubian-400 hover:text-desert-400 text-sm transition-colors">{t('footer_data')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-nubian-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-nubian-500">{t('footer_copy')}</p>
            <div className="flex items-center gap-1 text-xs text-nubian-500">
              <Star className="w-3 h-3 text-desert-400" />
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
      <div className="w-9 h-9 bg-gradient-heritage rounded-xl flex items-center justify-center shadow-pyramid">
        <TreePine className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className={`font-display font-bold text-lg leading-tight ${light ? 'text-white' : 'text-nubian-900'}`}>
          {isArabic ? 'التراث السوداني' : 'Sudanese Heritage'}
        </div>
        <div className={`text-xs leading-tight ${light ? 'text-desert-200' : 'text-nubian-500'}`}>
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
    <div className="card-hover card-column-accent p-6 text-start group bg-white">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold text-nubian-900 mb-2">{title}</h3>
      <p className="text-nubian-600 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}
