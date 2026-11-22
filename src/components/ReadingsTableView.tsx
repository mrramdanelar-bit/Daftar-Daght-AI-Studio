import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  BloodPressureReading,
  BPCategoryKey,
  DateRangeKey,
} from '../types';
import {
  ARM_LABELS,
  BP_CATEGORIES,
  calcMAP,
  calcPulsePressure,
  classifyBP,
  CONTEXT_LABELS,
  exportReadingsToCSV,
  filterReadingsByRange,
  formatDateTimeAr,
  POSTURE_LABELS,
} from '../utils/bpLogic';

interface ReadingsTableViewProps {
  readings: BloodPressureReading[];
  onOpenNewReading: () => void;
  onEditReading: (reading: BloodPressureReading) => void;
  onDeleteReading: (id: string) => void;
}

const CATEGORY_FILTERS: Array<{ key: 'all' | BPCategoryKey; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'normal', label: 'طبيعي' },
  { key: 'elevated', label: 'مرتفع قليلاً' },
  { key: 'stage1', label: 'مرحلة 1' },
  { key: 'stage2', label: 'مرحلة 2' },
  { key: 'low', label: 'منخفض' },
];

export default function ReadingsTableView({
  readings,
  onOpenNewReading,
  onEditReading,
  onDeleteReading,
}: ReadingsTableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | BPCategoryKey>(
    'all'
  );
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredReadings = useMemo(() => {
    const byDate = filterReadingsByRange(readings, dateRange);
    const query = searchQuery.trim().toLowerCase();

    const matched = byDate.filter((r) => {
      const cat = classifyBP(r.systolic, r.diastolic);
      if (categoryFilter !== 'all' && cat.key !== categoryFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        `${r.systolic}/${r.diastolic}`,
        String(r.pulse),
        r.notes,
        CONTEXT_LABELS[r.context],
        ARM_LABELS[r.arm],
        cat.label,
        formatDateTimeAr(r.measuredAt),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    return [...matched].sort((a, b) => {
      const diff =
        new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime();
      return sortAsc ? -diff : diff;
    });
  }, [readings, dateRange, categoryFilter, searchQuery, sortAsc]);

  if (readings.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          السجل فارغ حالياً
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          أضف قياساتك اليومية لمتابعة تطور ضغط الدم والبحث فيها وتصديرها للطبيب.
        </p>
        <button
          type="button"
          onClick={onOpenNewReading}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل أول قياس</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search, range & CSV toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الملاحظات، القيم (مثلاً 120/80)، أو التوقيت..."
              className="w-full pr-10 pl-3.5 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="الفترة الزمنية"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeKey)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            >
              <option value="all">كل الفترات</option>
              <option value="7d">آخر 7 أيام</option>
              <option value="30d">آخر 30 يوماً</option>
              <option value="90d">آخر 90 يوماً</option>
            </select>

            <button
              type="button"
              onClick={() => setSortAsc((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{sortAsc ? 'الأقدم أولاً' : 'الأحدث أولاً'}</span>
            </button>

            <button
              type="button"
              onClick={() => exportReadingsToCSV(filteredReadings)}
              disabled={filteredReadings.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {/* Interactive segmented category filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setCategoryFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  categoryFilter === f.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500 font-mono-tabular">
            عرض {filteredReadings.length} من أصل {readings.length} قياس
          </div>
        </div>
      </div>

      {/* High-density clinical table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredReadings.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            لا توجد نتائج مطابقة لمعايير التصفية الحالية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-5">التاريخ والوقت</th>
                  <th className="py-3 px-4">الضغط (mmHg)</th>
                  <th className="py-3 px-4">النبض</th>
                  <th className="py-3 px-4">MAP / ضغط النبض</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4">الظرف والذراع</th>
                  <th className="py-3 px-4">ملاحظات</th>
                  <th className="py-3 px-5 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredReadings.map((r) => {
                  const cat = BP_CATEGORIES[classifyBP(r.systolic, r.diastolic).key];
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-5 font-mono-tabular text-xs text-slate-600 whitespace-nowrap">
                        <div>{formatDateTimeAr(r.measuredAt)}</div>
                        <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                          {r.source === 'image'
                            ? 'مستخرج من صورة'
                            : 'إدخال يدوي'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                        {r.systolic}/{r.diastolic}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">
                        {r.pulse}
                        {r.irregularHeartbeat && (
                          <span className="block text-[11px] font-sans font-medium text-amber-700">
                            نبض غير منتظم
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-xs text-slate-500 whitespace-nowrap">
                        {calcMAP(r.systolic, r.diastolic)} /{' '}
                        {calcPulsePressure(r.systolic, r.diastolic)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-xs font-semibold ${cat.textColor}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <div>{CONTEXT_LABELS[r.context]}</div>
                        <div className="text-[11px] text-slate-400">
                          {ARM_LABELS[r.arm]} · {POSTURE_LABELS[r.posture]}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-[220px] truncate">
                        {r.notes || '—'}
                      </td>
                      <td className="py-3 px-5 text-left whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditReading(r)}
                            aria-label="تعديل القياس"
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteReading(r.id)}
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
        )}
      </div>
    </div>
  );
}
