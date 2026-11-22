import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { BloodPressureReading, BPCategoryKey, DateRangeKey } from '../types';
import {
  BP_CATEGORIES,
  calcMAP,
  classifyBP,
  computeStats,
  filterReadingsByRange,
  formatDateTimeAr,
  formatShortDateAr,
} from '../utils/bpLogic';

interface ChartsViewProps {
  readings: BloodPressureReading[];
  onOpenNewReading: () => void;
}

const RANGE_OPTIONS: Array<{ key: DateRangeKey; label: string }> = [
  { key: '7d', label: '7 أيام' },
  { key: '30d', label: '30 يوماً' },
  { key: '90d', label: '90 يوماً' },
  { key: 'all', label: 'الكل' },
];

export default function ChartsView({
  readings,
  onOpenNewReading,
}: ChartsViewProps) {
  const [range, setRange] = useState<DateRangeKey>('30d');
  const [showPulse, setShowPulse] = useState(true);

  const filtered = useMemo(
    () => filterReadingsByRange(readings, range),
    [readings, range]
  );

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  const trendData = useMemo(() => {
    return [...filtered]
      .sort(
        (a, b) =>
          new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
      )
      .map((r) => ({
        label: formatShortDateAr(r.measuredAt),
        fullDate: formatDateTimeAr(r.measuredAt),
        systolic: r.systolic,
        diastolic: r.diastolic,
        pulse: r.pulse,
        map: calcMAP(r.systolic, r.diastolic),
        category: classifyBP(r.systolic, r.diastolic).label,
      }));
  }, [filtered]);

  const categoryChartData = useMemo(() => {
    const order: BPCategoryKey[] = [
      'low',
      'normal',
      'elevated',
      'stage1',
      'stage2',
      'crisis',
    ];
    return order.map((key) => ({
      key,
      name: BP_CATEGORIES[key].shortLabel,
      fullName: BP_CATEGORIES[key].label,
      count: stats.categoryCounts[key],
      percent:
        stats.count > 0
          ? Math.round((stats.categoryCounts[key] / stats.count) * 100)
          : 0,
      color: BP_CATEGORIES[key].chartColor,
    }));
  }, [stats]);

  const timeOfDayData = useMemo(
    () => [
      {
        period: 'الصباح',
        systolic: stats.morningAvg.sys,
        diastolic: stats.morningAvg.dia,
        pulse: stats.morningAvg.pulse,
        count: stats.morningAvg.count,
      },
      {
        period: 'المساء',
        systolic: stats.eveningAvg.sys,
        diastolic: stats.eveningAvg.dia,
        pulse: stats.eveningAvg.pulse,
        count: stats.eveningAvg.count,
      },
    ],
    [stats]
  );

  const scatterData = useMemo(
    () =>
      filtered.map((r) => {
        const cat = classifyBP(r.systolic, r.diastolic);
        return {
          systolic: r.systolic,
          diastolic: r.diastolic,
          pulse: r.pulse,
          fullDate: formatDateTimeAr(r.measuredAt),
          category: cat.label,
          color: cat.chartColor,
        };
      }),
    [filtered]
  );

  if (readings.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          لا توجد بيانات كافية للرسوم البيانية
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          سجّل قراءاتك الأولى ليتم رسم منحنيات التطور ومقارنة الصباح والمساء
          وتوزيع التصنيفات الطبية تلقائياً.
        </p>
        <button
          type="button"
          onClick={onOpenNewReading}
          className="px-5 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800"
        >
          تسجيل أول قياس
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar: Time-range segmented filter & Pulse overlay toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRange(opt.key)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                range === opt.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPulse}
            onChange={(e) => setShowPulse(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
          />
          <span>إظهار منحنى النبض على الرسم الرئيسي</span>
        </label>
      </div>

      {/* Period numeric summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">عدد القراءات</div>
          <div className="font-mono-tabular text-2xl font-semibold text-slate-900 mt-1">
            {stats.count}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">المتوسط العام</div>
          <div className="font-mono-tabular text-2xl font-semibold text-slate-900 mt-1">
            {stats.count ? `${stats.avgSys}/${stats.avgDia}` : '—'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">أعلى / أدنى انقباضي</div>
          <div className="font-mono-tabular text-2xl font-semibold text-slate-900 mt-1">
            {stats.count ? `${stats.maxSys} / ${stats.minSys}` : '—'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">أعلى / أدنى انبساطي</div>
          <div className="font-mono-tabular text-2xl font-semibold text-slate-900 mt-1">
            {stats.count ? `${stats.maxDia} / ${stats.minDia}` : '—'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-2 lg:col-span-1">
          <div className="text-xs text-slate-500">متوسط الشرياني MAP</div>
          <div className="font-mono-tabular text-2xl font-semibold text-slate-900 mt-1">
            {stats.count ? `${stats.avgMAP} mmHg` : '—'}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          لا توجد قياسات مسجّلة ضمن الفترة المحددة. جرّب اختيار فترة زمنية أطول.
        </div>
      ) : (
        <>
          {/* Full Trend Composed Chart */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-900">
                المنحنى الزمني لضغط الدم والنبض
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                توزيع الانقباضي (SYS) والانبساطي (DIA) ومعدل النبض عبر الزمن مع
                خطوط العتبات الطبية
              </p>
            </div>

            <div className="w-full h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={trendData}
                  margin={{ top: 10, right: 16, left: -10, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="sysFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[45, 185]}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) {
                        return null;
                      }
                      const d = payload[0].payload as (typeof trendData)[0];
                      return (
                        <div
                          dir="rtl"
                          className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs shadow-sm space-y-1"
                        >
                          <div className="text-slate-500">{d.fullDate}</div>
                          <div className="font-mono-tabular text-sm font-semibold text-slate-900">
                            {d.systolic}/{d.diastolic} mmHg
                          </div>
                          <div className="text-slate-600 font-mono-tabular">
                            النبض: {d.pulse} · MAP: {d.map}
                          </div>
                          <div className="text-teal-800 font-medium">
                            {d.category}
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
                    stroke="#16A34A"
                    strokeDasharray="4 4"
                    strokeOpacity={0.45}
                  />
                  <ReferenceLine
                    y={140}
                    stroke="#DC2626"
                    strokeDasharray="4 4"
                    strokeOpacity={0.55}
                  />
                  <Area
                    type="monotone"
                    dataKey="systolic"
                    stroke="#0F766E"
                    strokeWidth={2.5}
                    fill="url(#sysFill)"
                    dot={{ r: 3.5, fill: '#0F766E', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    stroke="#475569"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#475569', strokeWidth: 0 }}
                    activeDot={{ r: 4.5 }}
                  />
                  {showPulse && (
                    <Line
                      type="monotone"
                      dataKey="pulse"
                      stroke="#D97706"
                      strokeWidth={1.75}
                      strokeDasharray="5 3"
                      dot={{ r: 2.5, fill: '#D97706', strokeWidth: 0 }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-5 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-teal-700 inline-block" />
                الانقباضي (SYS)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-slate-600 inline-block" />
                الانبساطي (DIA)
              </span>
              {showPulse && (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-0 border-t-2 border-dashed border-amber-600 inline-block" />
                  النبض (نبضة/د)
                </span>
              )}
              <span className="flex items-center gap-2">
                <span className="w-3 h-0 border-t border-dashed border-emerald-600 inline-block" />
                العتبة المثالية 120/80
              </span>
            </div>
          </section>

          {/* 2-Column Analytical Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category distribution bar chart */}
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-slate-900">
                  توزيع القراءات حسب التصنيف الطبي
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  عدد القياسات في كل فئة وفق تصنيف جمعية القلب الأمريكية (AHA)
                </p>
              </div>
              <div className="w-full h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryChartData}
                    margin={{ top: 8, right: 16, left: -16, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) {
                          return null;
                        }
                        const d = payload[0]
                          .payload as (typeof categoryChartData)[0];
                        return (
                          <div
                            dir="rtl"
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-sm"
                          >
                            <div className="font-semibold text-slate-900">
                              {d.fullName}
                            </div>
                            <div className="font-mono-tabular text-slate-600 mt-0.5">
                              {d.count} قياس ({d.percent}%)
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={42}>
                      {categoryChartData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Morning vs Evening grouped bar chart */}
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-slate-900">
                  مقارنة قراءات الصباح والمساء
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  متوسط الضغط الانقباضي والانبساطي لرصد الارتفاع الصباحي أو
                  المسائي
                </p>
              </div>
              <div className="w-full h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={timeOfDayData}
                    margin={{ top: 8, right: 16, left: -14, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12, fill: '#334155' }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 170]}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) {
                          return null;
                        }
                        const d = payload[0]
                          .payload as (typeof timeOfDayData)[0];
                        return (
                          <div
                            dir="rtl"
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-sm space-y-0.5"
                          >
                            <div className="font-semibold text-slate-900">
                              فترة {d.period} ({d.count} قياس)
                            </div>
                            <div className="font-mono-tabular text-slate-700">
                              المتوسط: {d.systolic}/{d.diastolic} mmHg
                            </div>
                            <div className="font-mono-tabular text-slate-500">
                              متوسط النبض: {d.pulse} نبضة/د
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="systolic"
                      name="الانقباضي"
                      fill="#0F766E"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                    <Bar
                      dataKey="diastolic"
                      name="الانبساطي"
                      fill="#64748B"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-5 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-teal-700 inline-block" />
                  الانقباضي
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-500 inline-block" />
                  الانبساطي
                </span>
              </div>
            </section>
          </div>

          {/* Scatter Correlation Plot SYS vs DIA */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-900">
                خريطة انتشار القراءات (الانقباضي مقابل الانبساطي)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تمثّل كل نقطة قياساً واحداً؛ التركز أسفل ويسار خطوط 120/80 يشير
                إلى تحكم مثالي بضغط الدم
              </p>
            </div>
            <div className="w-full h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 12, right: 20, bottom: 16, left: -4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    dataKey="diastolic"
                    name="الانبساطي"
                    domain={[50, 120]}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    label={{
                      value: 'DIA (mmHg)',
                      position: 'insideBottom',
                      offset: -8,
                      fontSize: 11,
                      fill: '#64748B',
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="systolic"
                    name="الانقباضي"
                    domain={[85, 185]}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    label={{
                      value: 'SYS',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 14,
                      fontSize: 11,
                      fill: '#64748B',
                    }}
                  />
                  <ZAxis range={[65, 65]} />
                  <ReferenceLine
                    x={80}
                    stroke="#16A34A"
                    strokeDasharray="4 4"
                  />
                  <ReferenceLine
                    y={120}
                    stroke="#16A34A"
                    strokeDasharray="4 4"
                  />
                  <ReferenceLine
                    x={90}
                    stroke="#DC2626"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <ReferenceLine
                    y={140}
                    stroke="#DC2626"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) {
                        return null;
                      }
                      const d = payload[0].payload as (typeof scatterData)[0];
                      return (
                        <div
                          dir="rtl"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-sm"
                        >
                          <div className="text-slate-500">{d.fullDate}</div>
                          <div className="font-mono-tabular font-semibold text-slate-900 mt-0.5">
                            {d.systolic}/{d.diastolic} mmHg
                          </div>
                          <div className="text-slate-600 mt-0.5">
                            {d.category} · نبض {d.pulse}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, idx) => (
                      <Cell key={`pt-${idx}`} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
