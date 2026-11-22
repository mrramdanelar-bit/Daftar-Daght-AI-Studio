import {
  Activity,
  BarChart3,
  Bell,
  Camera,
  ClipboardList,
  FileText,
  X,
} from 'lucide-react';
import type { NavSection, PatientProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  totalReadings: number;
  activeRemindersCount: number;
  profile: PatientProfile;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: typeof Activity;
}> = [
  { id: 'dashboard', label: 'لوحة المتابعة', icon: Activity },
  { id: 'scanner', label: 'استخراج من صورة', icon: Camera },
  { id: 'reminders', label: 'التذكيرات', icon: Bell },
  { id: 'charts', label: 'الرسوم البيانية', icon: BarChart3 },
  { id: 'history', label: 'سجل القياسات', icon: ClipboardList },
  { id: 'report', label: 'تقرير PDF', icon: FileText },
];

export default function Sidebar({
  activeSection,
  onSelectSection,
  totalReadings,
  activeRemindersCount,
  profile,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleSelect = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col bg-white border-l border-slate-200">
      {/* Brand Zone: clean single wordmark */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded"
        >
          نبض
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="إغلاق القائمة"
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="التنقل الرئيسي">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                isActive
                  ? 'bg-teal-50 text-teal-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-teal-700' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'history' && totalReadings > 0 && (
                <span className="font-mono-tabular text-xs text-slate-400">
                  {totalReadings}
                </span>
              )}
              {item.id === 'reminders' && activeRemindersCount > 0 && (
                <span className="font-mono-tabular text-xs text-teal-700">
                  {activeRemindersCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quiet Clinical Reference Footer & Android PWA Install Prompt */}
      <div className="px-5 py-4 border-t border-slate-200 space-y-3 text-xs text-slate-500">
        <PWAInstallButton compact />
        <div>
          <div className="text-slate-400 mb-0.5">الهدف العلاجي اليومي</div>
          <div className="font-mono-tabular text-sm font-semibold text-slate-800">
            {profile.targetSystolic}/{profile.targetDiastolic} mmHg
          </div>
        </div>
        {profile.fullName && (
          <div className="pt-2 border-t border-slate-100 truncate text-slate-600">
            الملف: {profile.fullName}
          </div>
        )}
        <p className="leading-relaxed text-[11px] text-slate-400">
          تُحفظ قراءاتك محلياً على جهازك. لا يغني التطبيق عن استشارة الطبيب.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 no-print">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 w-72 max-w-[85vw] z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
