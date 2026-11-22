import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BellRing,
  Camera,
  Clock,
  FileText,
  Menu,
  Plus,
  X,
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import ReadingModal from './components/ReadingModal';
import DashboardView from './components/DashboardView';
import ImageScannerView from './components/ImageScannerView';
import RemindersView from './components/RemindersView';
import ChartsView from './components/ChartsView';
import ReadingsTableView from './components/ReadingsTableView';
import ReportExportView from './components/ReportExportView';
import { OfflineIndicator } from './components/PWAInstallButton';
import type {
  ActiveReminderAlert,
  BloodPressureReading,
  BPReminder,
  MeasurementContext,
  NavSection,
  PatientProfile,
} from './types';
import {
  CONTEXT_LABELS,
  createSampleReadings,
  DEFAULT_PATIENT_PROFILE,
} from './utils/bpLogic';
import {
  createDefaultReminders,
  playGentleChime,
  triggerSystemNotification,
} from './utils/reminders';

const STORAGE_KEY_READINGS = 'nabd_bp_readings_v1';
const STORAGE_KEY_PROFILE = 'nabd_bp_profile_v1';
const STORAGE_KEY_INITIALIZED = 'nabd_bp_initialized_v1';
const STORAGE_KEY_REMINDERS = 'nabd_bp_reminders_v1';

const SECTION_TITLES: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'لوحة المتابعة',
    subtitle: 'نظرة عامة على مؤشرات ضغط الدم والنبض',
  },
  scanner: {
    title: 'استخراج من صورة',
    subtitle: 'قراءة أرقام شاشة جهاز الضغط تلقائياً وحفظها',
  },
  reminders: {
    title: 'التذكيرات',
    subtitle: 'جدولة تذكيرات يومية وأسبوعية وإشعارات الهاتف',
  },
  charts: {
    title: 'الرسوم البيانية',
    subtitle: 'تحليل المنحنيات والتصنيفات ومقارنة الصباح والمساء',
  },
  history: {
    title: 'سجل القياسات',
    subtitle: 'البحث والتصفية وإدارة جميع القراءات المسجّلة',
  },
  report: {
    title: 'تقرير PDF',
    subtitle: 'معاينة وتصدير التقرير الطبي والنسخ الاحتياطي',
  },
};

const MOBILE_BOTTOM_TABS: Array<{
  id: NavSection;
  label: string;
  icon: typeof Activity;
}> = [
  { id: 'dashboard', label: 'المتابعة', icon: Activity },
  { id: 'scanner', label: 'صورة', icon: Camera },
  { id: 'reminders', label: 'التذكيرات', icon: Bell },
  { id: 'charts', label: 'الرسوم', icon: BarChart3 },
  { id: 'report', label: 'PDF', icon: FileText },
];

function loadInitialReadings(): BloodPressureReading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    const alreadyInitialized = localStorage.getItem(STORAGE_KEY_INITIALIZED);
    if (!alreadyInitialized) {
      const samples = createSampleReadings();
      localStorage.setItem(STORAGE_KEY_READINGS, JSON.stringify(samples));
      localStorage.setItem(STORAGE_KEY_INITIALIZED, '1');
      return samples;
    }
  } catch {
    // Fallback if storage is unavailable
  }
  return [];
}

function loadInitialProfile(): PatientProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) {
      return { ...DEFAULT_PATIENT_PROFILE, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore storage error
  }
  return DEFAULT_PATIENT_PROFILE;
}

function loadInitialReminders(): BPReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REMINDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage error
  }
  return createDefaultReminders();
}

function getInitialNotificationPermission():
  | NotificationPermission
  | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [readings, setReadings] =
    useState<BloodPressureReading[]>(loadInitialReadings);
  const [profile, setProfile] = useState<PatientProfile>(loadInitialProfile);
  const [reminders, setReminders] =
    useState<BPReminder[]>(loadInitialReminders);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingReading, setEditingReading] =
    useState<BloodPressureReading | null>(null);
  const [modalInitialContext, setModalInitialContext] =
    useState<MeasurementContext>('routine');

  // Notification permission & active reminder alert state
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(getInitialNotificationPermission);
  const [activeAlert, setActiveAlert] = useState<ActiveReminderAlert | null>(
    null
  );
  const lastFiredMapRef = useRef<Record<string, string>>({});
  const snoozeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_READINGS, JSON.stringify(readings));
    } catch {
      // Ignore storage quota errors
    }
  }, [readings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(reminders));
    } catch {
      // Ignore storage quota errors
    }
  }, [reminders]);

  const fireReminder = useCallback(async (reminder: BPReminder) => {
    const body = [
      CONTEXT_LABELS[reminder.context],
      reminder.notes || 'حان موعد تسجيل قياس ضغط الدم والنبض.',
    ].join(' — ');

    setActiveAlert({
      reminderId: reminder.id,
      label: reminder.label,
      time: reminder.time,
      context: reminder.context,
      notes: reminder.notes,
      triggeredAt: new Date().toISOString(),
    });

    if (reminder.soundEnabled) {
      playGentleChime();
    }

    await triggerSystemNotification(
      `نبض: ${reminder.label}`,
      body,
      `nabd-reminder-${reminder.id}`
    );
  }, []);

  // Live minute-accurate scheduler checking every 15 seconds
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const currentHHMM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const currentDay = now.getDay();
      const dateMinuteKey = `${now.getFullYear()}-${pad(
        now.getMonth() + 1
      )}-${pad(now.getDate())}-${currentHHMM}`;

      for (const rem of reminders) {
        if (!rem.enabled) continue;
        if (rem.time !== currentHHMM) continue;
        if (rem.frequency === 'weekly' && !rem.daysOfWeek.includes(currentDay)) {
          continue;
        }
        if (lastFiredMapRef.current[rem.id] === dateMinuteKey) {
          continue;
        }
        lastFiredMapRef.current[rem.id] = dateMinuteKey;
        fireReminder(rem);
      }
    };

    checkReminders();
    const intervalId = window.setInterval(checkReminders, 15000);
    return () => window.clearInterval(intervalId);
  }, [reminders, fireReminder]);

  useEffect(() => {
    return () => {
      if (snoozeTimeoutRef.current !== null) {
        window.clearTimeout(snoozeTimeoutRef.current);
      }
    };
  }, []);

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
    } catch {
      // Ignore permission prompt errors
    }
  };

  const handleSaveReminder = (
    data: Omit<BPReminder, 'id'>,
    existingId?: string
  ) => {
    setReminders((prev) => {
      if (existingId) {
        return prev.map((item) =>
          item.id === existingId ? { ...data, id: existingId } : item
        );
      }
      const next: BPReminder = {
        ...data,
        id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      return [...prev, next].sort((a, b) => a.time.localeCompare(b.time));
    });
  };

  const handleToggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSnoozeAlert = () => {
    if (!activeAlert) return;
    const snoozedReminder = reminders.find(
      (r) => r.id === activeAlert.reminderId
    ) ?? {
      id: activeAlert.reminderId,
      label: activeAlert.label,
      time: activeAlert.time,
      frequency: 'daily' as const,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      context: activeAlert.context,
      enabled: true,
      soundEnabled: true,
      notes: activeAlert.notes,
    };

    setActiveAlert(null);
    if (snoozeTimeoutRef.current !== null) {
      window.clearTimeout(snoozeTimeoutRef.current);
    }
    snoozeTimeoutRef.current = window.setTimeout(() => {
      fireReminder(snoozedReminder);
    }, 10 * 60 * 1000);
  };

  const sortReadings = (list: BloodPressureReading[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
    );

  const handleSaveReading = (
    data: Omit<BloodPressureReading, 'id'>,
    existingId?: string
  ) => {
    setReadings((prev) => {
      if (existingId) {
        return sortReadings(
          prev.map((item) =>
            item.id === existingId
              ? { ...data, id: existingId, isSample: false }
              : item
          )
        );
      }
      const newEntry: BloodPressureReading = {
        ...data,
        id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        isSample: false,
      };
      return sortReadings([newEntry, ...prev]);
    });
  };

  const handleDeleteReading = (id: string) => {
    setReadings((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearSampleData = () => {
    setReadings((prev) => prev.filter((item) => !item.isSample));
  };

  const handleImportReadings = (imported: BloodPressureReading[]) => {
    setReadings((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const merged = [
        ...prev,
        ...imported.filter((r) => !existingIds.has(r.id)),
      ];
      return sortReadings(merged);
    });
  };

  const openNewReadingModal = (context: MeasurementContext = 'routine') => {
    setEditingReading(null);
    setModalInitialContext(context);
    setModalOpen(true);
  };

  const openEditReadingModal = (reading: BloodPressureReading) => {
    setEditingReading(reading);
    setModalOpen(true);
  };

  const hasSampleData = readings.some((r) => r.isSample);
  const activeRemindersCount = reminders.filter((r) => r.enabled).length;
  const currentMeta = SECTION_TITLES[activeSection];

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        totalReadings={readings.length}
        activeRemindersCount={activeRemindersCount}
        profile={profile}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb/section title on right, 1 primary CTA on left */}
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="فتح القائمة"
              className="lg:hidden p-2 -mr-2 text-slate-600 hover:text-slate-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                نبض
              </span>
              <span
                aria-hidden="true"
                className="text-slate-300 hidden sm:inline"
              >
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">
                {currentMeta.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => openNewReadingModal('routine')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل قياس</span>
            </button>
          </div>
        </header>

        {/* Active Scheduled Reminder Alert Banner */}
        {activeAlert && (
          <div
            role="alert"
            className="bg-teal-800 text-white px-4 sm:px-6 lg:px-8 py-3.5 no-print"
          >
            <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <BellRing className="w-5 h-5 text-teal-200 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    حان موعد القياس: {activeAlert.label}
                  </div>
                  <div className="text-xs text-teal-100 mt-0.5">
                    {CONTEXT_LABELS[activeAlert.context]}
                    {activeAlert.notes ? ` · ${activeAlert.notes}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const ctx = activeAlert.context;
                    setActiveAlert(null);
                    openNewReadingModal(ctx);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-teal-900 bg-white rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap"
                >
                  تسجيل القياس الآن
                </button>
                <button
                  type="button"
                  onClick={handleSnoozeAlert}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-50 bg-teal-700 rounded-lg hover:bg-teal-600 transition-colors whitespace-nowrap"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>تأجيل 10 د</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAlert(null)}
                  aria-label="إغلاق التنبيه"
                  className="p-1.5 text-teal-200 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Canvas (extra bottom padding on mobile for compact thumb nav bar) */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-8 max-w-[1280px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              readings={readings}
              hasSampleData={hasSampleData}
              onClearSampleData={handleClearSampleData}
              onOpenNewReading={() => openNewReadingModal('routine')}
              onEditReading={openEditReadingModal}
              onDeleteReading={handleDeleteReading}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'scanner' && (
            <ImageScannerView
              onSaveReading={(data) => handleSaveReading(data)}
              onGoToHistory={() => setActiveSection('history')}
            />
          )}

          {activeSection === 'reminders' && (
            <RemindersView
              reminders={reminders}
              notificationPermission={notificationPermission}
              onRequestPermission={handleRequestNotificationPermission}
              onSaveReminder={handleSaveReminder}
              onToggleReminder={handleToggleReminder}
              onDeleteReminder={handleDeleteReminder}
              onTestReminder={fireReminder}
            />
          )}

          {activeSection === 'charts' && (
            <ChartsView
              readings={readings}
              onOpenNewReading={() => openNewReadingModal('routine')}
            />
          )}

          {activeSection === 'history' && (
            <ReadingsTableView
              readings={readings}
              onOpenNewReading={() => openNewReadingModal('routine')}
              onEditReading={openEditReadingModal}
              onDeleteReading={handleDeleteReading}
            />
          )}

          {activeSection === 'report' && (
            <ReportExportView
              readings={readings}
              profile={profile}
              onUpdateProfile={setProfile}
              onImportReadings={handleImportReadings}
            />
          )}
        </main>
      </div>

      {/* Compact Android Mobile Thumb Navigation Bar (56px height, < lg only) */}
      <nav
        aria-label="التنقل السريع للجوال"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white border-t border-slate-200 grid grid-cols-5 no-print"
      >
        {MOBILE_BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-teal-700' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <OfflineIndicator />

      <ReadingModal
        isOpen={modalOpen}
        editingReading={editingReading}
        initialContext={modalInitialContext}
        onClose={() => {
          setModalOpen(false);
          setEditingReading(null);
        }}
        onSave={handleSaveReading}
      />
    </div>
  );
}
