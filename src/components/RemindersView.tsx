import { useEffect, useState } from 'react';
import {
  Bell,
  BellRing,
  Calendar,
  Check,
  Copy,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  BPReminder,
  MeasurementContext,
  ReminderFrequency,
} from '../types';
import { CONTEXT_LABELS } from '../utils/bpLogic';
import {
  exportRemindersToICS,
  formatNextOccurrenceAr,
  formatReminderDaysAr,
  WEEKDAYS_AR,
} from '../utils/reminders';
import { PWAInstallButton } from './PWAInstallButton';

interface RemindersViewProps {
  reminders: BPReminder[];
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestPermission: () => Promise<void>;
  onSaveReminder: (data: Omit<BPReminder, 'id'>, existingId?: string) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onTestReminder: (reminder: BPReminder) => Promise<void>;
}

const APK_BUILD_COMMANDS = `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/local-notifications
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug`;

export default function RemindersView({
  reminders,
  notificationPermission,
  onRequestPermission,
  onSaveReminder,
  onToggleReminder,
  onDeleteReminder,
  onTestReminder,
}: RemindersViewProps) {
  const [nowTick, setNowTick] = useState(() => new Date());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [label, setLabel] = useState('قياس ضغط الدم');
  const [time, setTime] = useState('08:30');
  const [frequency, setFrequency] = useState<ReminderFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 3]);
  const [context, setContext] = useState<MeasurementContext>('morning_before_meds');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const [feedback, setFeedback] = useState('');
  const [copiedApkCmd, setCopiedApkCmd] = useState(false);

  // Refresh countdown text every 30s
  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setLabel('قياس الصباح');
    setTime('08:30');
    setFrequency('daily');
    setDaysOfWeek([0, 3]);
    setContext('morning_before_meds');
    setSoundEnabled(true);
    setNotes('');
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (r: BPReminder) => {
    setEditingId(r.id);
    setLabel(r.label);
    setTime(r.time);
    setFrequency(r.frequency);
    setDaysOfWeek(r.daysOfWeek.length > 0 ? r.daysOfWeek : [0, 3]);
    setContext(r.context);
    setSoundEnabled(r.soundEnabled);
    setNotes(r.notes);
    setFormError('');
    setFormOpen(true);
  };

  const toggleDay = (dayVal: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(dayVal)
        ? prev.filter((d) => d !== dayVal)
        : [...prev, dayVal]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!label.trim()) {
      setFormError('يرجى إدخال عنوان للتذكير.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setFormError('يرجى تحديد وقت صالح.');
      return;
    }
    if (frequency === 'weekly' && daysOfWeek.length === 0) {
      setFormError('يرجى اختيار يوم واحد على الأقل للتذكير الأسبوعي.');
      return;
    }

    onSaveReminder(
      {
        label: label.trim(),
        time,
        frequency,
        daysOfWeek: frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : daysOfWeek,
        context,
        enabled: true,
        soundEnabled,
        notes: notes.trim(),
      },
      editingId ?? undefined
    );

    setFormOpen(false);
    setEditingId(null);
    setFeedback(
      editingId
        ? 'تم تحديث التذكير وجدولته بنجاح.'
        : 'تمت إضافة التذكير وتفعيله بنجاح.'
    );
  };

  const handleCopyApkCommands = async () => {
    try {
      await navigator.clipboard.writeText(APK_BUILD_COMMANDS);
      setCopiedApkCmd(true);
      setTimeout(() => setCopiedApkCmd(false), 2500);
    } catch {
      // Clipboard API fallback ignored
    }
  };

  const activeCount = reminders.filter((r) => r.enabled).length;

  const permissionStatusText =
    notificationPermission === 'granted'
      ? 'إشعارات النظام مفعّلة وجاهزة للإرسال في المواعيد المجدولة'
      : notificationPermission === 'denied'
      ? 'تم حظر الإشعارات من إعدادات المتصفح — يمكنك إعادة تفعيلها من إعدادات الموقع'
      : notificationPermission === 'unsupported'
      ? 'المتصفح الحالي يدعم التنبيهات داخل التطبيق؛ صدّر ملف .ics لتنبيهات الهاتف'
      : 'فعّل إذن الإشعارات لتلقي تنبيهات أندرويد والمتصفح في الموعد المحدد';

  return (
    <div className="space-y-6">
      {/* Notification Permission & Actions Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-700 shrink-0" />
              <h2 className="text-base font-semibold text-slate-900">
                تذكيرات قياس ضغط الدم وإشعارات الهاتف
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {permissionStatusText}
            </p>
            <div className="pt-1 text-xs text-slate-500 font-mono-tabular">
              التذكيرات النشطة: {activeCount} من {reminders.length}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {notificationPermission === 'default' && (
              <button
                type="button"
                onClick={onRequestPermission}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
              >
                <BellRing className="w-4 h-4" />
                <span>تفعيل إشعارات الهاتف</span>
              </button>
            )}

            <button
              type="button"
              onClick={openCreateForm}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                notificationPermission === 'default'
                  ? 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'
                  : 'text-white bg-teal-700 hover:bg-teal-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تذكير جديد</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportRemindersToICS(reminders);
                setFeedback(
                  'تم تحميل ملف التقويم (.ics) — افتحه على هاتف أندرويد لإضافة التنبيهات المتكررة مباشرة.'
                );
              }}
              disabled={reminders.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>مزامنة تقويم الهاتف (.ics)</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 px-3.5 py-2.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback('')}
              className="text-emerald-700 hover:text-emerald-900 underline"
            >
              إغلاق
            </button>
          </div>
        )}
      </section>

      {/* Add / Edit Reminder Form */}
      {formOpen && (
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            {editingId ? 'تعديل التذكير' : 'إنشاء تذكير مجدول جديد'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="rem-label"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  عنوان التذكير
                </label>
                <input
                  id="rem-label"
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="مثال: قياس الصباح قبل الدواء"
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div>
                <label
                  htmlFor="rem-time"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  الوقت المجدول
                </label>
                <input
                  id="rem-time"
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 font-mono-tabular text-base font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-medium text-slate-600 mb-1.5">
                  تكرار التذكير
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFrequency('daily')}
                    className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      frequency === 'daily'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    يومي (كل يوم)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency('weekly')}
                    className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      frequency === 'weekly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    أسبوعي (أيام محددة)
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="rem-context"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  توقيت وظرف القياس
                </label>
                <select
                  id="rem-context"
                  value={context}
                  onChange={(e) =>
                    setContext(e.target.value as MeasurementContext)
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                >
                  {(Object.keys(CONTEXT_LABELS) as MeasurementContext[]).map(
                    (k) => (
                      <option key={k} value={k}>
                        {CONTEXT_LABELS[k]}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Weekly days selector */}
            {frequency === 'weekly' && (
              <div>
                <span className="block text-xs font-medium text-slate-600 mb-2">
                  اختر أيام الأسبوع
                </span>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS_AR.map((day) => {
                    const selected = daysOfWeek.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                          selected
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {day.full}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                <label
                  htmlFor="rem-notes"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  ملاحظة تظهر في الإشعار (اختياري)
                </label>
                <input
                  id="rem-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: الجلوس بهدوء 5 دقائق قبل القياس"
                  className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none sm:mt-7">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <span>تشغيل نغمة التنبيه والاهتزاز عند حلول الموعد</span>
              </label>
            </div>

            {formError && (
              <p
                role="alert"
                className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
              >
                {formError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800"
              >
                {editingId ? 'حفظ التغييرات' : 'حفظ التذكير'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Reminders List */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            جدول التذكيرات ({reminders.length})
          </h3>
          <span className="text-xs text-slate-400">
            يعمل تلقائياً عند الموعد المحدد
          </span>
        </div>

        {reminders.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-500">
              لم تقم بإضافة أي تذكيرات مجدولة بعد.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء أول تذكير</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 transition-colors ${
                  rem.enabled ? 'bg-white' : 'bg-slate-50/60 opacity-75'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="font-mono-tabular text-2xl font-semibold text-slate-900 leading-none pt-0.5 shrink-0">
                    {rem.time}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {rem.label}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                      <span>{formatReminderDaysAr(rem)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{CONTEXT_LABELS[rem.context]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular text-teal-700 font-medium">
                        {formatNextOccurrenceAr(rem, nowTick)}
                      </span>
                    </div>
                    {rem.notes && (
                      <p className="text-xs text-slate-400">{rem.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await onTestReminder(rem);
                      setFeedback(`تم إرسال إشعار تجريبي لـ "${rem.label}".`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                  >
                    {rem.soundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>اختبار</span>
                  </button>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={rem.enabled}
                    aria-label={rem.enabled ? 'إيقاف التذكير' : 'تفعيل التذكير'}
                    onClick={() => onToggleReminder(rem.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                      rem.enabled ? 'bg-teal-700' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rem.enabled ? '-translate-x-6' : '-translate-x-1'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditForm(rem)}
                    aria-label="تعديل التذكير"
                    className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteReminder(rem.id)}
                    aria-label="حذف التذكير"
                    className="p-1.5 text-slate-400 hover:text-red-700 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Android App Installation & APK Packaging Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-teal-700 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900">
                تثبيت التطبيق على هاتف أندرويد وبناء ملف APK
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              تطبيق نبض مهيّأ كتطبيق ويب تقدمي (PWA) قابل للتثبيت المباشر على
              أندرويد كـ WebAPK يعمل دون إنترنت، كما يحتوي المشروع على ملف
              تهيئة <span className="font-mono-tabular">capacitor.config.ts</span>{' '}
              جاهز لتصدير ملف <span className="font-mono-tabular">.apk</span>{' '}
              أصلي عبر Android Studio.
            </p>
          </div>
          <PWAInstallButton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
            <div className="text-sm font-semibold text-slate-900">
              1. التثبيت الفوري على هاتف أندرويد (موصى به)
            </div>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>افتح التطبيق من متصفح Google Chrome على هاتفك الأندرويد.</li>
              <li>
                اضغط على زر <strong>تثبيت التطبيق على الهاتف</strong> أعلاه أو
                اختر <strong>تثبيت التطبيق</strong> من قائمة المتصفح (⋮).
              </li>
              <li>
                يُنشئ نظام أندرويد حزمة WebAPK مستقلة بأيقونة نبض على الشاشة
                الرئيسية مع دعم العمل دون إنترنت وإشعارات النظام.
              </li>
            </ol>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">
                2. بناء ملف Android APK محلياً عبر Capacitor
              </div>
              <button
                type="button"
                onClick={handleCopyApkCommands}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 whitespace-nowrap"
              >
                {copiedApkCmd ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الأوامر</span>
                  </>
                )}
              </button>
            </div>
            <pre
              dir="ltr"
              className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono-tabular text-[11px] leading-relaxed overflow-x-auto"
            >
              {APK_BUILD_COMMANDS}
            </pre>
            <p className="text-[11px] text-slate-500">
              ينتج ملف APK الجاهز للتثبيت في المسار:{' '}
              <span className="font-mono-tabular" dir="ltr">
                android/app/build/outputs/apk/debug/app-debug.apk
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
