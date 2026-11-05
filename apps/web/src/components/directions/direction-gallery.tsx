'use client';

import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  LayoutDashboard,
  Orbit,
  Sparkles,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '../locale-switcher';
import { ThemeToggle } from '../theme-toggle';

export type DirectionId = 'a' | 'b' | 'c' | 'd';

const directions: DirectionId[] = ['a', 'b', 'c', 'd'];
const featureKeys = ['attendance', 'grades', 'finance', 'schedule'] as const;
const moduleKeys = ['attendance', 'grades', 'finance', 'schedule'] as const;
const schoolTypes = ['primary', 'college', 'lycee', 'support'] as const;
type ModuleKey = (typeof moduleKeys)[number];

const featureIcons = [ClipboardCheck, Sparkles, CircleDollarSign, LayoutDashboard];

export function DirectionGallery({ direction }: { direction: DirectionId }) {
  const t = useTranslations('directionPreview');
  const home = useTranslations('home');
  const [schoolType, setSchoolType] = useState<(typeof schoolTypes)[number]>('primary');
  const [modules, setModules] = useState<ModuleKey[]>(['attendance', 'schedule']);
  const data = {
    name: t(`${direction}.name`),
    kicker: t(`${direction}.kicker`),
    hero: t(`${direction}.hero`),
    body: t(`${direction}.body`),
    featureTitle: t(`${direction}.featureTitle`),
    featureBody: t(`${direction}.featureBody`),
  };

  const toggleModule = (module: ModuleKey) => {
    setModules((current) =>
      current.includes(module) ? current.filter((item) => item !== module) : [...current, module],
    );
  };

  return (
    <main className={`direction-shell direction-${direction}`}>
      <div className="direction-frame">
        <header className="direction-nav">
          <Link href="/design" className="direction-brand" aria-label={t('title')}>
            <span className="direction-brand-mark" aria-hidden>
              <Orbit size={17} strokeWidth={2.4} />
            </span>
            <span>{t('brand')}</span>
          </Link>
          <div className="direction-nav-actions">
            <nav aria-label={t('title')} className="direction-switcher">
              {directions.map((item) => (
                <Link
                  key={item}
                  href={`/design/directions/${item}`}
                  className={item === direction ? 'is-active' : undefined}
                >
                  {t(`${item}.name`)}
                </Link>
              ))}
            </nav>
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <section className="direction-intro" aria-labelledby="direction-title">
          <div className="direction-intro-copy">
            <p className="direction-eyebrow">{t('eyebrow')}</p>
            <h1 id="direction-title" className="direction-title">
              {t('title')}
            </h1>
            <p className="direction-intro-text">{t('intro')}</p>
          </div>
          <div className="direction-choice-note">
            <span className="direction-choice-dot" aria-hidden />
            <span>{t('prototype')}</span>
          </div>
        </section>

        <section className="direction-hero direction-card" aria-labelledby="direction-hero-title">
          <div className="direction-hero-copy">
            <p className="direction-eyebrow">{data.kicker}</p>
            <h2 id="direction-hero-title" className="direction-hero-title">
              {data.hero}
            </h2>
            <p className="direction-lede">{data.body}</p>
            <div className="direction-hero-actions">
              <a href="#direction-choice" className="direction-button direction-button-primary">
                {t('choose')}
                <ArrowUpRight size={16} aria-hidden />
              </a>
              <span className="direction-meta">{t(`${direction}.name`)}</span>
            </div>
          </div>
          <HeroSpecimen direction={direction} t={t} home={home} />
        </section>

        <section className="direction-section" aria-labelledby="feature-title">
          <div className="direction-section-heading">
            <div>
              <p className="direction-eyebrow">{t('feature')}</p>
              <h2 id="feature-title" className="direction-section-title">
                {data.featureTitle}
              </h2>
            </div>
            <p className="direction-section-body">{data.featureBody}</p>
          </div>
          <div className="direction-features">
            {featureKeys.map((key, index) => {
              const Icon = featureIcons[index] ?? Sparkles;
              return (
                <article key={key} className={`direction-feature direction-feature-${key}`}>
                  <span className="direction-feature-icon" aria-hidden>
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                  <h3>{home(`features.items.${key}.title`)}</h3>
                  <p>{home(`features.items.${key}.body`)}</p>
                  <ChevronRight className="direction-feature-arrow" size={17} aria-hidden />
                </article>
              );
            })}
          </div>
        </section>

        <section className="direction-product-grid" aria-label={t('preview')}>
          <LoginSpecimen t={t} />
          <DashboardSpecimen t={t} />
        </section>

        {direction === 'd' ? (
          <Configurator
            t={t}
            home={home}
            schoolType={schoolType}
            modules={modules}
            onSchoolTypeChange={setSchoolType}
            onToggleModule={toggleModule}
          />
        ) : null}

        <section id="direction-choice" className="direction-decision-grid">
          <div className="direction-rationale direction-card">
            <p className="direction-eyebrow">{data.name}</p>
            <h2 className="direction-section-title">{t('tokens')}</h2>
            <ul className="direction-rationale-list">
              <li>{t(`${direction}.rationale.one`)}</li>
              <li>{t(`${direction}.rationale.two`)}</li>
              <li>{t(`${direction}.rationale.three`)}</li>
            </ul>
          </div>
          <TokenSheet direction={direction} t={t} />
        </section>
      </div>
    </main>
  );
}

type Translation = ReturnType<typeof useTranslations>;
type HomeTranslation = ReturnType<typeof useTranslations>;

function HeroSpecimen({
  direction,
  t,
  home,
}: {
  direction: DirectionId;
  t: Translation;
  home: HomeTranslation;
}) {
  return (
    <div className={`direction-hero-specimen direction-hero-specimen-${direction}`} aria-hidden>
      <div className="direction-specimen-topline">
        <span className="direction-specimen-brand">
          {t('brand')} / {home('preview.school')}
        </span>
        <span className="direction-specimen-status">
          <span className="direction-status-dot" /> {t('today')}
        </span>
      </div>
      <div className="direction-specimen-main">
        <div className="direction-specimen-sidebar">
          <span className="direction-specimen-line is-wide" />
          <span className="direction-specimen-line" />
          <span className="direction-specimen-line" />
          <span className="direction-specimen-line is-short" />
        </div>
        <div className="direction-specimen-board">
          <div className="direction-specimen-board-head">
            <span>{t('dashboard')}</span>
            <span className="direction-chip">{t('illustrative')}</span>
          </div>
          <div className="direction-specimen-stat-grid">
            <span>
              <strong>{24}</strong>
              <small>{t('students')}</small>
            </span>
            <span>
              <strong>{String(8).padStart(2, '0')}</strong>
              <small>{t('classes')}</small>
            </span>
            <span>
              <strong>{t('rate')}</strong>
              <small>{t('attendance')}</small>
            </span>
          </div>
          <div className="direction-specimen-bars">
            {[72, 48, 88, 60, 76].map((width, index) => (
              <span key={index} style={{ '--bar-width': `${String(width)}%` } as CSSProperties} />
            ))}
          </div>
        </div>
      </div>
      <span className="direction-specimen-orbit direction-orbit-one" />
      <span className="direction-specimen-orbit direction-orbit-two" />
    </div>
  );
}

function LoginSpecimen({ t }: { t: Translation }) {
  return (
    <article className="direction-product-card direction-login-card">
      <div className="direction-product-heading">
        <div>
          <p className="direction-eyebrow">{t('login')}</p>
          <h2>{t('signIn')}</h2>
        </div>
        <span className="direction-product-index">{t('indexOne')}</span>
      </div>
      <form
        className="direction-login-form"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label>
          <span>{t('email')}</span>
          <input type="email" autoComplete="email" />
        </label>
        <label>
          <span>{t('password')}</span>
          <input type="password" autoComplete="current-password" />
        </label>
        <div className="direction-form-row">
          <label className="direction-check-label">
            <input type="checkbox" />
            <span>{t('remember')}</span>
          </label>
          <a href="#direction-choice">{t('forgot')}</a>
        </div>
        <button type="submit" className="direction-button direction-button-primary">
          {t('signIn')}
          <ArrowUpRight size={16} aria-hidden />
        </button>
      </form>
    </article>
  );
}

function DashboardSpecimen({ t }: { t: Translation }) {
  return (
    <article className="direction-product-card direction-dashboard-card">
      <div className="direction-product-heading">
        <div>
          <p className="direction-eyebrow">{t('dashboard')}</p>
          <h2>{t('school')}</h2>
        </div>
        <span className="direction-product-index">{t('indexTwo')}</span>
      </div>
      <div className="direction-dashboard-topline">
        <span>{t('today')}</span>
        <span className="direction-chip">{t('illustrative')}</span>
      </div>
      <div className="direction-dashboard-stats">
        <div>
          <Users size={16} aria-hidden />
          <strong>{24}</strong>
          <span>{t('students')}</span>
        </div>
        <div>
          <ClipboardCheck size={16} aria-hidden />
          <strong>{t('rate')}</strong>
          <span>{t('attendance')}</span>
        </div>
        <div>
          <LayoutDashboard size={16} aria-hidden />
          <strong>{String(8).padStart(2, '0')}</strong>
          <span>{t('classes')}</span>
        </div>
      </div>
      <div className="direction-dashboard-list">
        <div>
          <span className="direction-list-marker is-primary" />
          <span>{t('schedule')}</span>
          <Check size={15} aria-hidden />
        </div>
        <div>
          <span className="direction-list-marker is-accent" />
          <span>{t('payment')}</span>
          <span>{t('amount')}</span>
        </div>
        <div>
          <span className="direction-list-marker is-muted" />
          <span>{t('roles')}</span>
          <span>{t('teachers')}</span>
        </div>
      </div>
    </article>
  );
}

function Configurator({
  t,
  home,
  schoolType,
  modules,
  onSchoolTypeChange,
  onToggleModule,
}: {
  t: Translation;
  home: HomeTranslation;
  schoolType: (typeof schoolTypes)[number];
  modules: ModuleKey[];
  onSchoolTypeChange: (value: (typeof schoolTypes)[number]) => void;
  onToggleModule: (value: ModuleKey) => void;
}) {
  return (
    <section className="direction-configurator direction-card" aria-labelledby="configurator-title">
      <div className="direction-config-copy">
        <p className="direction-eyebrow">{t('preview')}</p>
        <h2 id="configurator-title" className="direction-section-title">
          {t('build')}
        </h2>
        <p>{t('d.featureBody')}</p>
      </div>
      <div className={`direction-config-scene direction-config-${schoolType}`} aria-live="polite">
        <div className="direction-config-panel direction-config-panel-main">
          <div className="direction-config-panel-topline">
            <span>{t('brand')}</span>
            <span>{t(schoolType)}</span>
          </div>
          <strong>{t('preview')}</strong>
          <div className="direction-config-panel-lines">
            <span />
            <span />
            <span />
          </div>
          <div className="direction-config-panel-modules">
            {modules.map((module) => (
              <span key={module}>{home(`features.items.${module}.title`)}</span>
            ))}
          </div>
        </div>
        <div className="direction-config-panel direction-config-panel-float">
          <Orbit size={18} aria-hidden />
          <span>{t('illustrative')}</span>
        </div>
      </div>
      <div className="direction-config-controls">
        <fieldset>
          <legend>{t('schoolType')}</legend>
          <div className="direction-radio-grid">
            {schoolTypes.map((type) => (
              <label key={type} className={schoolType === type ? 'is-selected' : undefined}>
                <input
                  type="radio"
                  name="school-type"
                  checked={schoolType === type}
                  onChange={() => {
                    onSchoolTypeChange(type);
                  }}
                />
                <span>{t(type)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('modules')}</legend>
          <div className="direction-module-grid">
            {moduleKeys.map((module) => (
              <label key={module} className={modules.includes(module) ? 'is-selected' : undefined}>
                <input
                  type="checkbox"
                  checked={modules.includes(module)}
                  onChange={() => {
                    onToggleModule(module);
                  }}
                />
                <span>{home(`features.items.${module}.title`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}

function TokenSheet({ direction, t }: { direction: DirectionId; t: Translation }) {
  const rows = [
    ['type', `${direction}.typeValue`],
    ['colour', `${direction}.colourValue`],
    ['radius', `${direction}.radiusValue`],
    ['shadow', `${direction}.shadowValue`],
    ['motion', `${direction}.motionValue`],
  ] as const;
  return (
    <aside className="direction-token-sheet direction-card">
      <div className="direction-token-heading">
        <p className="direction-eyebrow">{t('tokens')}</p>
        <span className="direction-token-swatch" aria-hidden />
      </div>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{t(label)}</dt>
            <dd>{t(value)}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
