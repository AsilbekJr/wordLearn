import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { uz } from '../i18n/uz';
import {
  BookOpen,
  Calendar,
  Dumbbell,
  Sparkles,
  BookMarked,
  AlertCircle,
  BarChart3,
  Settings,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

export const Layout: React.FC = () => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close dropdowns on route changes
  useEffect(() => {
    setIsToolsOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Click outside listener for "Boʻlimlar" dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  interface NavItem {
    to: string;
    label: string;
    desc?: string;
    icon: React.ComponentType<{ className?: string }>;
    end?: boolean;
  }

  // Core daily study loop (always visible on desktop md+)
  const primaryItems: NavItem[] = [
    { to: '/', label: uz.nav.today, icon: Calendar, end: true },
    { to: '/study', label: uz.nav.study, icon: Dumbbell },
    { to: '/library', label: uz.nav.library, icon: BookOpen }
  ];

  // Additional learning tools (inside Boʻlimlar dropdown on desktop)
  const toolItems: NavItem[] = [
    { to: '/lab', label: uz.nav.productionLab, desc: uz.nav.productionLabDesc, icon: Sparkles },
    { to: '/grammar', label: uz.nav.grammar, desc: uz.nav.grammarDesc, icon: BookMarked },
    { to: '/errors', label: uz.nav.errorLog, desc: uz.nav.errorLogDesc, icon: AlertCircle },
    { to: '/stats', label: uz.nav.stats, desc: uz.nav.statsDesc, icon: BarChart3 }
  ];

  const activeTool = toolItems.find((item) => location.pathname === item.to);
  const isToolActive = Boolean(activeTool);

  const allNavItems: NavItem[] = [...primaryItems, ...toolItems, { to: '/settings', label: uz.nav.settings, icon: Settings }];

  return (
    <div className="min-h-screen bg-[#F6F1E7] text-[#1B1A17] flex flex-col font-sans selection:bg-[#F9EBE7] selection:text-[#D9482B]">
      {/* Top Navbar */}
      <header className="border-b border-[#E2DBD0] bg-[#F6F1E7]/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="w-7 h-7 rounded-[2px] bg-[#1B1A17] text-[#F6F1E7] flex items-center justify-center font-serif text-lg font-bold group-hover:bg-[#D9482B] transition-colors">
              L
            </span>
            <div className="flex flex-col">
              <span className="font-serif text-xl tracking-tight font-bold text-[#1B1A17] leading-none">
                {uz.appName}
              </span>
              <span className="hidden sm:inline-block text-[9px] text-[#646059] font-mono tracking-wider uppercase mt-0.5">
                Spaced Repetition
              </span>
            </div>
          </NavLink>

          {/* Desktop Navigation (md+: 768px and up) - Compact & Elegant */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-mono font-medium">
            {/* Primary items */}
            {primaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-[2px] flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#1B1A17] text-[#F6F1E7]'
                        : 'text-[#646059] hover:text-[#1B1A17] hover:bg-[#EAE4D9]'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {/* "Boʻlimlar" Dropdown with active section hint */}
            <div className="relative" ref={toolsRef}>
              <button
                type="button"
                onClick={() => setIsToolsOpen((prev) => !prev)}
                className={`px-3 py-1.5 rounded-[2px] flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  isToolActive || isToolsOpen
                    ? 'bg-[#1B1A17] text-[#F6F1E7]'
                    : 'text-[#646059] hover:text-[#1B1A17] hover:bg-[#EAE4D9]'
                }`}
                title="Qoʻshimcha boʻlimlar"
              >
                <span>{activeTool ? activeTool.label : uz.nav.tools}</span>
                {isToolActive && !activeTool && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D9482B]" />
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolsOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] border border-[#E2DBD0] rounded-[3px] shadow-xl py-1.5 z-50">
                  <div className="px-3 py-1.5 border-b border-[#E2DBD0] text-[10px] font-mono text-[#646059] uppercase tracking-wider">
                    Qoʻshimcha boʻlimlar
                  </div>
                  {toolItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={`px-3 py-2 flex items-start gap-2.5 transition-colors ${
                          isActive
                            ? 'bg-[#FAF7F2] text-[#D9482B]'
                            : 'text-[#1B1A17] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-[#D9482B]' : 'text-[#646059]'}`} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs">{item.label}</span>
                          {item.desc && (
                            <span className="text-[10px] text-[#646059] font-sans leading-tight mt-0.5">
                              {item.desc}
                            </span>
                          )}
                        </div>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subtle separator */}
            <div className="h-4 w-px bg-[#E2DBD0] mx-1" />

            {/* Settings Link */}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `px-2.5 py-1.5 rounded-[2px] flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1B1A17] text-[#F6F1E7]'
                    : 'text-[#646059] hover:text-[#1B1A17] hover:bg-[#EAE4D9]'
                }`
              }
              title={uz.nav.settings}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{uz.nav.settings}</span>
            </NavLink>
          </nav>

          {/* Mobile & Small Tablet Hamburger Button (< 768px) */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Menyu"
              className="p-2 text-[#1B1A17] hover:bg-[#EAE4D9] rounded-[2px] transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Drawer Menu (< 768px) */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#E2DBD0] bg-[#FFFFFF] px-4 py-4 space-y-2 shadow-lg">
            <div className="text-[10px] font-mono text-[#646059] uppercase tracking-wider px-1">
              Barcha boʻlimlar
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-[2px] flex items-center gap-2.5 text-xs font-mono transition-colors ${
                        isActive
                          ? 'bg-[#1B1A17] text-[#F6F1E7]'
                          : 'text-[#1B1A17] hover:bg-[#FAF7F2]'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 text-[#646059]" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (< 768px): 4 key touch targets */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#E2DBD0] bg-[#F6F1E7]/95 backdrop-blur-sm z-40 px-2 py-1 flex items-center justify-around safe-bottom">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-[11px] font-mono transition-colors ${
              isActive ? 'text-[#D9482B] font-semibold' : 'text-[#646059] hover:text-[#1B1A17]'
            }`
          }
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          <span>{uz.nav.today}</span>
        </NavLink>

        <NavLink
          to="/study"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-[11px] font-mono transition-colors ${
              isActive ? 'text-[#D9482B] font-semibold' : 'text-[#646059] hover:text-[#1B1A17]'
            }`
          }
        >
          <Dumbbell className="w-4 h-4 mb-0.5" />
          <span>{uz.nav.study}</span>
        </NavLink>

        <NavLink
          to="/library"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-[11px] font-mono transition-colors ${
              isActive ? 'text-[#D9482B] font-semibold' : 'text-[#646059] hover:text-[#1B1A17]'
            }`
          }
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span>{uz.nav.library}</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className={`flex flex-col items-center py-1 px-3 text-[11px] font-mono transition-colors ${
            isMobileMenuOpen ? 'text-[#D9482B] font-semibold' : 'text-[#646059] hover:text-[#1B1A17]'
          }`}
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>{uz.nav.menu}</span>
        </button>
      </nav>
    </div>
  );
};
