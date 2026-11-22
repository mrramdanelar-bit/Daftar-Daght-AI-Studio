import { useMemo } from 'react';
import {
  ArrowLeft,
  Bell,
  Camera,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BloodPressureReading, NavSection } from '../types';
import {
  ARM_LABELS,
  calcMAP,
  classifyBP,
  computeStats,
  CONTEXT_LABELS,
  formatDateTimeAr,
  formatShortDateAr,
} from '../utils/bpLogic';

interface DashboardViewProps {
  readings: BloodPressureReading[];
  hasSampleData: boolean;
  onClearSampleData: () => void;
  onOpenNewReading: () => void;
  onEditReading: (reading: BloodPressureReading) => void;
  onDeleteReading: (id: string) => void;
  onNavigate: (section: NavSection) => void;
}

export default function DashboardView({
  readings,
  hasSampleData,
  onClearSampleData,
  onOpenNewReading,
  onEditReading,
  onDeleteReading,
  onNavigate,
}: DashboardViewProps) {
  const stats = useMemo(() => computeStats(readings), [readings]);
  const latest = readings[0] ?? null;
  const latestCategory = latest
    ? classifyBP(latest.systolic, latest.diastolic)
    : null;
  const avgCategory =
    stats.count > 0 ? classifyBP(stats.avgSys, stats.avgDia) : null;

  const chartData = useMemo(() => {
    return [...readings]
      .slice(0, 14)
      .reverse()
      .map((r) => ({
        id: r.id,
        label: formatShortDateAr(r.measuredAt),
        fullDate: formatDateTimeAr(r.measuredAt),
        systolic: r.systolic,
        diastolic: r.diastolic,
        pulse: r.pulse,
        category: classifyBP(r.systolic, r.diastolic).label,
      }));
  }, [readings]);

  if (readings.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-2xl mx-auto mt-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          ابدأ بتسجيل أول قياس لضغط الدم
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-md mx-auto">
          يمكنك إدخال القراءة يدوياً أو تصوير شاشة جهاز قياس الضغط لاستخراج
          الأرقام تلقائياً وبناء رسومك البيانية وتقاريرك الطبية بصيغة PDF.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('scanner')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
          >
            <Camera className="w-4 h-4" />
            <span>استخراج من صورة الجهاز</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewReading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل قياس يدوياً</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subtle sample notice bar if sample data is active */}
      {hasSampleData && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
          <span>
            يعرض التطبيق حالياً بيانات تجريبية لآخر أسبوعين لتوضيح الرسوم
            البيانية والتقارير. يمكنك البدء بتسجيل قياساتك الفعلية أو مسح
            البيانات التجريبية.
          </span>
          <button
            type="button"
            onClick={onClearSampleData}
            className="font-medium text-teal-700 hover:text-teal-900 underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            مسح البيانات التجريبية
          </button>
        </div>
      )}

      {/* 4-column flat KPI strip */}
      <section
        aria-label="ملخص المؤشرات"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-2">آخر قياس مسجّل</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tabular text-3xl font-semibold text-slate-900">
              {latest.systolic}/{latest.diastolic}
            </span>
            <span className="text-xs text-slate-400">mmHg</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            <span className={`font-semibold ${latestCategory?.textColor}`}>
              {latestCategory?.label}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono-tabular text-slate-500">
              نبض {latest.pulse}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-2">
            متوسط الضغط ({stats.count} قياس)
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tabular text-3xl font-semibold text-slate-900">
              {stats.avgSys}/{stats.avgDia}
            </span>
            <span className="text-xs text-slate-400">mmHg</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            <span className={`font-semibold ${avgCategory?.textColor}`}>
              {avgCategory?.shortLabel}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono-tabular text-slate-500">
              MAP {stats.avgMAP}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-2">متوسط معدل النبض</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tabular text-3xl font-semibold text-slate-900">
              {stats.avgPulse}
            </span>
            <span className="text-xs text-slate-400">نبضة/دقيقة</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 font-mono-tabular">
            النطاق: {stats.minPulse} – {stats.maxPulse} نبضة/د
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-2">
            نسبة القراءات الطبيعية
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tabular text-3xl font-semibold text-slate-900">
              {stats.normalRatio}%
            </span>
            <span className="text-xs text-slate-400">من الإجمالي</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 font-mono-tabular">
            {stats.normalCount} طبيعي · ضغط النبض {stats.avgPulsePressure}
          </div>
        </div>
      </section>

      {/* Main focal anchor: Trend chart + Quick workflow column */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <section className="xl:col-span-8 bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                تطوّر الضغط الانقباضي والانبساطي
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                آخر {chartData.length} قراءات مسجّلة مقارنة بالعتبة الطبيعية
                (120/80 mmHg)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('charts')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap"
            >
              <span>عرض كل التحليلات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 16, left: -12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[50, 175]}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }
                    const item = payload[0].payload as (typeof chartData)[0];
                    return (
                      <div
                        dir="rtl"
                        className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs shadow-sm"
                      >
                        <div className="text-slate-500 mb-1">
                          {item.fullDate}
                        </div>
                        <div className="font-mono-tabular text-sm font-semibold text-slate-900">
                          {item.systolic}/{item.diastolic} mmHg
                        </div>
                        <div className="mt-1 text-slate-600">
                          النبض:{' '}
                          <span className="font-mono-tabular font-medium">
                            {item.pulse}
                          </span>{' '}
                          · {item.category}
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={120}
                  stroke="#16A34A"
                  strokeDasharray="4 4"
                  strokeOpacity={0.65}
                />
                <ReferenceLine
                  y={80}
                  stroke="#0F766E"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  y={140}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  name="الانقباضي"
                  stroke="#0F766E"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#0F766E', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  name="الانبساطي"
                  stroke="#64748B"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#64748B', strokeWidth: 0 }}
                  activeDot={{ r: 4.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-teal-700 inline-block" />
              الانقباضي (SYS)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-slate-500 inline-block" />
              الانبساطي (DIA)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-0 border-t border-dashed border-emerald-600 inline-block" />
              الحد الطبيعي 120 / 80
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-0 border-t border-dashed border-red-600 inline-block" />
              عتبة المرحلة الثانية 140
            </span>
          </div>
        </section>

        {/* Side workflow actions & Morning/Evening quick split */}
        <section className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              أدوات سريعة
            </h2>
            <div className="divide-y divide-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('scanner')}
                className="w-full py-3.5 first:pt-1 flex items-start justify-between gap-3 text-right group"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900 group-hover:text-teal-700 transition-colors">
                    قراءة صورة جهاز الضغط
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ارفع صورة شاشة الجهاز لاستخراج الانقباضي والانبساطي والنبض
                    تلقائياً
                  </p>
                </div>
                <Camera className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('reminders')}
                className="w-full py-3.5 flex items-start justify-between gap-3 text-right group"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900 group-hover:text-teal-700 transition-colors">
                    التذكيرات وإشعارات القياس
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    جدولة تذكيرات يومية وأسبوعية مع إشعارات فورية لهاتفك
                  </p>
                </div>
                <Bell className="w-4 h-4 text-slate-500 group-hover:text-teal-700 shrink-0 mt-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('report')}
                className="w-full py-3.5 flex items-start justify-between gap-3 text-right group"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900 group-hover:text-teal-700 transition-colors">
                    إنشاء تقرير طبي PDF
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تقرير A4 عربي منسّق بالرسم البياني والجدول جاهز لطبيبك
                  </p>
                </div>
                <FileText className="w-4 h-4 text-slate-500 group-hover:text-teal-700 shrink-0 mt-0.5" />
              </button>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200 space-y-3">
            <div className="text-xs font-medium text-slate-500">
              مقارنة الصباح والمساء
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400">متوسط الصباح</div>
                <div className="font-mono-tabular text-lg font-semibold text-slate-900 mt-0.5">
                  {stats.morningAvg.count > 0
                    ? `${stats.morningAvg.sys}/${stats.morningAvg.dia}`
                    : '—'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono-tabular">
                  {stats.morningAvg.count} قياس
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">متوسط المساء</div>
                <div className="font-mono-tabular text-lg font-semibold text-slate-900 mt-0.5">
                  {stats.eveningAvg.count > 0
                    ? `${stats.eveningAvg.sys}/${stats.eveningAvg.dia}`
                    : '—'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono-tabular">
                  {stats.eveningAvg.count} قياس
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent readings table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            أحدث القراءات المسجّلة
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap"
          >
            عرض السجل الكامل ({readings.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 px-6">التاريخ والوقت</th>
                <th className="py-3 px-4">الضغط (mmHg)</th>
                <th className="py-3 px-4">النبض</th>
                <th className="py-3 px-4">MAP</th>
                <th className="py-3 px-4">التصنيف الطبي</th>
                <th className="py-3 px-4">الظرف</th>
                <th className="py-3 px-6 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {readings.slice(0, 6).map((reading) => {
                const cat = classifyBP(reading.systolic, reading.diastolic);
                return (
                  <tr
                    key={reading.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-6 font-mono-tabular text-xs text-slate-600 whitespace-nowrap">
                      {formatDateTimeAr(reading.measuredAt)}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                      {reading.systolic}/{reading.diastolic}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {reading.pulse}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                      {calcMAP(reading.systolic, reading.diastolic)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${cat.textColor}`}>
                        {cat.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {CONTEXT_LABELS[reading.context]} ·{' '}
                      {ARM_LABELS[reading.arm]}
                    </td>
                    <td className="py-3 px-6 text-left whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditReading(reading)}
                          aria-label="تعديل القياس"
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteReading(reading.id)}
                          aria-label="حذف القياس"
                          className="p-1.5 text-slate-400 hover:text-red-700 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
