import { ReactNode, SVGProps, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { MainRoutes } from '@/router/MainRoutes';
import {
  IconSidebarAuthFiles,
  IconSidebarConfig,
  IconSidebarDashboard,
  IconSidebarLogs,
  IconSidebarOauth,
  IconSidebarProviders,
  IconSidebarQuota,
  IconSidebarSystem,
} from '@/components/ui/icons';
import { INLINE_LOGO_JPEG } from '@/assets/logoInline';
import {
  useAuthStore,
  useConfigStore,
  useLanguageStore,
  useNotificationStore,
  useThemeStore,
} from '@/stores';
import { triggerHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { LANGUAGE_LABEL_KEYS, LANGUAGE_ORDER } from '@/utils/constants';
import { isSupportedLanguage } from '@/utils/language';
import type { Theme } from '@/types';

const navIcons: Record<string, ReactNode> = {
  dashboard: <IconSidebarDashboard size={16} />,
  aiProviders: <IconSidebarProviders size={16} />,
  authFiles: <IconSidebarAuthFiles size={16} />,
  oauth: <IconSidebarOauth size={16} />,
  quota: <IconSidebarQuota size={16} />,
  config: <IconSidebarConfig size={16} />,
  logs: <IconSidebarLogs size={16} />,
  system: <IconSidebarSystem size={16} />,
};

const iconProps: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

const icons = {
  refresh: (
    <svg {...iconProps}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  ),
  menu: (
    <svg {...iconProps}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  ),
  close: (
    <svg {...iconProps}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  language: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  sun: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  moon: (
    <svg {...iconProps}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  ),
  whiteTheme: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  ),
  autoTheme: (
    <svg {...iconProps}>
      <defs>
        <clipPath id="mainLayoutAutoThemeSunLeftHalf">
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="4" clipPath="url(#mainLayoutAutoThemeSunLeftHalf)" fill="currentColor" />
      <path d="M12 2v2" /><path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  logout: (
    <svg {...iconProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
    </svg>
  ),
};

const THEME_CARDS: Array<{
  key: Theme;
  labelKey: string;
  colors: { bg: string; card: string; border: string; text: string; textMuted: string };
}> = [
  { key: 'auto', labelKey: 'theme.auto', colors: { bg: 'linear-gradient(135deg, #ffffff 0 50%, #111111 50% 100%)', card: 'linear-gradient(135deg, #ffffff 0 50%, #1a1a1a 50% 100%)', border: '#bdbdbd', text: '#2d2a26', textMuted: 'linear-gradient(135deg, #c9c9c9 0 50%, #5a5a5a 50% 100%)' } },
  { key: 'white', labelKey: 'theme.white', colors: { bg: '#ffffff', card: '#ffffff', border: '#e5e5e5', text: '#2d2a26', textMuted: '#a29c95' } },
  { key: 'light', labelKey: 'theme.light', colors: { bg: '#faf9f5', card: '#f0eee8', border: '#e3e1db', text: '#2d2a26', textMuted: '#a29c95' } },
  { key: 'dark', labelKey: 'theme.dark', colors: { bg: '#151412', card: '#1d1b18', border: '#3a3530', text: '#f6f4f1', textMuted: '#9c958d' } },
];

export function MainLayout() {
  const { t } = useTranslation();
  const { showNotification } = useNotificationStore();
  const location = useLocation();

  const logout = useAuthStore((state) => state.logout);
  const config = useConfigStore((state) => state.config);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const clearCache = useConfigStore((state) => state.clearCache);

  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  const isLogsPage = location.pathname.startsWith('/logs');

  // Content center CSS variable for floating action bars
  useLayoutEffect(() => {
    const updateContentCenter = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      document.documentElement.style.setProperty('--content-center-x', `${centerX}px`);
    };
    updateContentCenter();
    window.addEventListener('resize', updateContentCenter);
    return () => {
      window.removeEventListener('resize', updateContentCenter);
      document.documentElement.style.removeProperty('--content-center-x');
    };
  }, []);

  // Close menus on outside click
  useEffect(() => {
    if (!languageMenuOpen && !themeMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (languageMenuOpen && !languageMenuRef.current?.contains(e.target as Node)) {
        setLanguageMenuOpen(false);
      }
      if (themeMenuOpen && !themeMenuRef.current?.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLanguageMenuOpen(false);
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [languageMenuOpen, themeMenuOpen]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const toggleLanguageMenu = useCallback(() => {
    setLanguageMenuOpen((p) => !p);
    setThemeMenuOpen(false);
  }, []);

  const toggleThemeMenu = useCallback(() => {
    setThemeMenuOpen((p) => !p);
    setLanguageMenuOpen(false);
  }, []);

  const handleThemeSelect = useCallback((t: Theme) => {
    setTheme(t);
    setThemeMenuOpen(false);
  }, [setTheme]);

  const handleLanguageSelect = useCallback((lang: string) => {
    if (!isSupportedLanguage(lang)) return;
    setLanguage(lang);
    setLanguageMenuOpen(false);
  }, [setLanguage]);

  useEffect(() => {
    fetchConfig().catch(() => {});
  }, [fetchConfig]);

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: navIcons.dashboard },
    { path: '/config', label: t('nav.config_management'), icon: navIcons.config },
    { path: '/ai-providers', label: t('nav.ai_providers'), icon: navIcons.aiProviders },
    { path: '/auth-files', label: t('nav.auth_files'), icon: navIcons.authFiles },
    { path: '/oauth', label: t('nav.oauth', { defaultValue: 'OAuth' }), icon: navIcons.oauth },
    { path: '/quota', label: t('nav.quota_management'), icon: navIcons.quota },
    ...(config?.loggingToFile ? [{ path: '/logs', label: t('nav.logs'), icon: navIcons.logs }] : []),
    { path: '/system', label: t('nav.system_info'), icon: navIcons.system },
  ];

  const navOrder = navItems.map((item) => item.path);
  const getRouteOrder = (pathname: string) => {
    const trimmed = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const normalized = trimmed === '/dashboard' ? '/' : trimmed;

    const aiIdx = navOrder.indexOf('/ai-providers');
    if (aiIdx !== -1 && normalized.startsWith('/ai-providers')) {
      if (normalized === '/ai-providers') return aiIdx;
      return aiIdx + 0.1;
    }
    const authIdx = navOrder.indexOf('/auth-files');
    if (authIdx !== -1 && normalized.startsWith('/auth-files')) {
      if (normalized === '/auth-files') return authIdx;
      return authIdx + 0.1;
    }
    const exact = navOrder.indexOf(normalized);
    if (exact !== -1) return exact;
    const nested = navOrder.findIndex((p) => p !== '/' && normalized.startsWith(`${p}/`));
    return nested === -1 ? null : nested;
  };

  const getTransitionVariant = useCallback((from: string, to: string) => {
    const norm = (p: string) => {
      const t = p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
      return t === '/dashboard' ? '/' : t;
    };
    const f = norm(from), tt = norm(to);
    if (f.startsWith('/auth-files') && tt.startsWith('/auth-files')) return 'ios';
    if (f.startsWith('/ai-providers') && tt.startsWith('/ai-providers')) return 'ios';
    return 'vertical';
  }, []);

  const handleRefreshAll = async () => {
    clearCache();
    const results = await Promise.allSettled([fetchConfig(undefined, true), triggerHeaderRefresh()]);
    const rejected = results.find((r) => r.status === 'rejected');
    if (rejected && rejected.status === 'rejected') {
      const reason = rejected.reason;
      const msg = typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : '';
      showNotification(`${t('notification.refresh_failed')}${msg ? `: ${msg}` : ''}`, 'error');
      return;
    }
    showNotification(t('notification.data_refreshed'), 'success');
  };

  return (
    <div className="app-shell">
      <header className="main-header">
        <Button
          className="mobile-menu-btn"
          variant="ghost"
          size="sm"
          onClick={() => setMobileNavOpen((p) => !p)}
          aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileNavOpen ? icons.close : icons.menu}
        </Button>

        <a className="header-brand" href="#/">
          <img src={INLINE_LOGO_JPEG} alt="" className="header-brand-logo" />
        </a>

        <nav className="header-nav header-nav-desktop">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <Button variant="ghost" size="sm" onClick={handleRefreshAll} title={t('header.refresh_all')}>
            {icons.refresh}
          </Button>
          <div className={`language-menu ${languageMenuOpen ? 'open' : ''}`} ref={languageMenuRef}>
            <Button variant="ghost" size="sm" onClick={toggleLanguageMenu} title={t('language.switch')} aria-label={t('language.switch')}>
              {icons.language}
            </Button>
            {languageMenuOpen && (
              <div className="language-menu-popover" role="menu">
                {LANGUAGE_ORDER.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className={`language-menu-option ${language === lang ? 'active' : ''}`}
                    onClick={() => handleLanguageSelect(lang)}
                    role="menuitemradio"
                    aria-checked={language === lang}
                  >
                    <span>{t(LANGUAGE_LABEL_KEYS[lang])}</span>
                    {language === lang && <span className="language-menu-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={`theme-menu ${themeMenuOpen ? 'open' : ''}`} ref={themeMenuRef}>
            <Button variant="ghost" size="sm" onClick={toggleThemeMenu} title={t('theme.switch')} aria-label={t('theme.switch')}>
              {theme === 'auto' ? icons.autoTheme : theme === 'dark' ? icons.moon : theme === 'white' ? icons.whiteTheme : icons.sun}
            </Button>
            {themeMenuOpen && (
              <div className="theme-menu-popover" role="menu">
                {THEME_CARDS.map((tc) => (
                  <button
                    key={tc.key}
                    type="button"
                    className={`theme-card ${theme === tc.key ? 'active' : ''}`}
                    onClick={() => handleThemeSelect(tc.key)}
                    role="menuitemradio"
                    aria-checked={theme === tc.key}
                  >
                    <div className="theme-card-preview" style={{ background: tc.colors.bg, border: `1px solid ${tc.colors.border}` }}>
                      <div className="theme-card-header" style={{ background: tc.colors.card, borderBottom: `1px solid ${tc.colors.border}` }} />
                      <div className="theme-card-body">
                        <div className="theme-card-sidebar" style={{ background: tc.colors.card, borderRight: `1px solid ${tc.colors.border}` }} />
                        <div className="theme-card-content" style={{ background: tc.colors.bg }}>
                          <div className="theme-card-line" style={{ background: tc.colors.textMuted }} />
                          <div className="theme-card-line short" style={{ background: tc.colors.textMuted }} />
                        </div>
                      </div>
                    </div>
                    <span className="theme-card-label">{t(tc.labelKey)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={logout} title={t('header.logout')}>
            {icons.logout}
          </Button>
        </div>
      </header>

      <nav className={`header-nav-mobile ${mobileNavOpen ? 'nav-open' : ''}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {mobileNavOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`content${isLogsPage ? ' content-logs' : ''}`} ref={contentRef}>
        <main className={`main-content${isLogsPage ? ' main-content-logs' : ''}`}>
          <PageTransition
            render={(location) => <MainRoutes location={location} />}
            getRouteOrder={getRouteOrder}
            getTransitionVariant={getTransitionVariant}
            scrollContainerRef={contentRef}
          />
        </main>
      </div>
    </div>
  );
}
