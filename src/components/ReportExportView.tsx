import { useMemo, useRef, useState } from 'react';
import {
  Download,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Printer,
  Upload,
} from 'lucide-react';
import type {
  BloodPressureReading,
  PatientProfile,
} from '../types';
import {
  ARM_LABELS,
  calcMAP,
  classifyBP,
  CONTEXT_LABELS,
  exportReadingsToCSV,
  formatDateTimeAr,
  formatShortDateAr,
} from '../utils/bpLogic';
import { exportReportElementToPDF } from '../utils/pdfExport';

interface ReportExportViewProps {
  readings: BloodPressureReading[];
  profile: PatientProfile;
  onUpdateProfile: (profile: PatientProfile) => void;
  onImportReadings: (imported: BloodPressureReading[]) => void;
}

function ReportSvgTrendChart({
  readings,
}: {
  readings: BloodPressureReading[];
}) {
  const ordered = useMemo(
    () =>
      [...readings]
        .sort(
          (a, b) =>
            new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
        )
        .slice(-24),
    [readings]
  );

  if (ordered.length < 2) {
    return (
      <div className="border border-slate-200 rounded-lg p-5 text-center text-xs text-slate-500">
        يلزم وجود قياسين على الأقل لرسم منحنى التطور في التقرير.
      </div>
    );
  }

  const width = 720;
  const height = 210;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allVals = ordered.flatMap((r) => [r.systolic, r.diastolic]);
  const minVal = Math.min(55, Math.floor((Math.min(...allVals) - 10) / 10) * 10);
  const maxVal = Math.max(160, Math.ceil((Math.max(...allVals) + 10) / 10) * 10);

  const getX = (idx: number) =>
    padLeft + (idx / Math.max(1, ordered.length - 1)) * plotW;
  const getY = (val: number) =>
    padTop + ((maxVal - val) / Math.max(1, maxVal - minVal)) * plotH;

  const sysPoints = ordered
    .map((r, i) => `${getX(i).toFixed(1)},${getY(r.systolic).toFixed(1)}`)
    .join(' ');
  const diaPoints = ordered
    .map((r, i) => `${getX(i).toFixed(1)},${getY(r.diastolic).toFixed(1)}`)
    .join(' ');

  const yTicks = [60, 80, 100, 120, 140, 160, 180].filter(
    (v) => v >= minVal && v <= maxVal
  );

  const labelStep = Math.max(1, Math.ceil(ordered.length / 7));

  return (
    <div className="border border-slate-200 rounded-lg p-3.5 bg-white" dir="ltr">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block"
        role="img"
        aria-label="منحنى الضغط الانقباضي والانبساطي للتقرير الطبي"
      >
        {/* Horizontal gridlines */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          const isNormalRef = tick === 120 || tick === 80;
          const isHighRef = tick === 140;
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke={
                  isHighRef ? '#DC2626' : isNormalRef ? '#16A34A' : '#E2E8F0'
                }
                strokeWidth={isNormalRef || isHighRef ? 1 : 0.8}
                strokeDasharray={isNormalRef || isHighRef ? '4 3' : undefined}
                strokeOpacity={isNormalRef || isHighRef ? 0.6 : 1}
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="#64748B"
                fontFamily="IBM Plex Mono, monospace"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Systolic polyline */}
        <polyline
          fill="none"
          stroke="#0F766E"
          strokeWidth="2.2"
          points={sysPoints}
        />

        {/* Diastolic polyline */}
        <polyline
          fill="none"
          stroke="#64748B"
          strokeWidth="1.8"
          points={diaPoints}
        />

        {/* Data points & date ticks */}
        {ordered.map((r, idx) => {
          const cx = getX(idx);
          const cySys = getY(r.systolic);
          const cyDia = getY(r.diastolic);
          const showLabel = idx % labelStep === 0 || idx === ordered.length - 1;
          return (
            <g key={r.id}>
              <circle cx={cx} cy={cySys} r="3" fill="#0F766E" />
              <circle cx={cx} cy={cyDia} r="2.6" fill="#64748B" />
              {showLabel && (
                <text
                  x={cx}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#64748B"
                  fontFamily="IBM Plex Sans Arabic, sans-serif"
                >
                  {formatShortDateAr(r.measuredAt)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div
        dir="rtl"
        className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-teal-700 inline-block" />
          الانقباضي (SYS)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-slate-500 inline-block" />
          الانبساطي (DIA)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0 border-t border-dashed border-emerald-600 inline-block" />
          العتبة الطبيعية 120 / 80
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0 border-t border-dashed border-red-600 inline-block" />
          حد الارتفاع 140
        </span>
      </div>
    </div>
  );
}

export default function ReportExportView({
  readings,
  profile,
  onUpdateProfile,
  onImportReadings,
}: ReportExportViewProps) {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');

  const filteredReadings = readings;

  const handlePdfAction = async (action: 'download' | 'print') => {
    if (!reportRef.current || isExportingPdf) return;
    setExportError('');
    setExportMessage('');
    setIsExportingPdf(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await exportReportElementToPDF(
        reportRef.current,
        `تقرير-ضغط-الدم-${stamp}.pdf`,
        action
      );
      setExportMessage(
        action === 'print'
          ? 'تم تجهيز التقرير. اختر الطباعة أو حفظ PDF من نافذة المشاركة.'
          : 'تم تجهيز ملف PDF. اختر مكان الحفظ أو التطبيق المناسب من نافذة المشاركة.'
      );
    } catch (err: unknown) {
      setExportError(
        err instanceof Error
          ? `تعذر تجهيز PDF: ${err.message}`
          : 'تعذر تجهيز ملف PDF. حاول مرة أخرى.'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadPdf = () => handlePdfAction('download');
  const handlePrint = () => handlePdfAction('print');

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      readings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `نسخة-احتياطية-نبض-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMessage('تم تصدير النسخة الاحتياطية بصيغة JSON.');
  };

  const handleImportJson = (file: File | undefined) => {
    if (!file) return;
    setExportError('');
    setExportMessage('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incomingReadings = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.readings)
          ? parsed.readings
          : null;

        if (!incomingReadings) {
          throw new Error('بنية الملف غير متوافقة مع سجلات التطبيق.');
        }

        const sanitized: BloodPressureReading[] = incomingReadings
          .filter(
            (r: Record<string, unknown>) =>
              typeof r.systolic === 'number' &&
              typeof r.diastolic === 'number' &&
              typeof r.measuredAt === 'string'
          )
          .map((r: Record<string, unknown>, i: number) => ({
            id: typeof r.id === 'string' ? r.id : `imported-${Date.now()}-${i}`,
            systolic: Number(r.systolic),
            diastolic: Number(r.diastolic),
            pulse: typeof r.pulse === 'number' ? r.pulse : 72,
            measuredAt: String(r.measuredAt),
            arm: r.arm === 'right' ? 'right' : 'left',
            posture:
              r.posture === 'lying' || r.posture === 'standing'
                ? r.posture
                : 'sitting',
            context:
              typeof r.context === 'string' && r.context in CONTEXT_LABELS
                ? (r.context as BloodPressureReading['context'])
                : 'routine',
            irregularHeartbeat: Boolean(r.irregularHeartbeat),
            notes: typeof r.notes === 'string' ? r.notes : '',
            source: r.source === 'image' ? 'image' : 'manual',
          }));

        if (parsed.profile && typeof parsed.profile === 'object') {
          onUpdateProfile({
            ...profile,
            ...parsed.profile,
          });
        }
        onImportReadings(sanitized);
        setExportMessage(`تم استيراد ${sanitized.length} قياساً بنجاح.`);
      } catch (err: unknown) {
        setExportError(
          err instanceof Error
            ? err.message
            : 'تعذر قراءة ملف النسخة الاحتياطية.'
        );
      } finally {
        if (jsonInputRef.current) jsonInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Actions panel (hidden during print) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 no-print">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              إعداد التقرير الطبي وتصدير البيانات
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              أضف بيانات المريض والطبيب (اختياري) ثم حمّل تقرير A4 جاهز للطباعة
              بصيغة PDF
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf || filteredReadings.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>
                {isExportingPdf ? 'جارٍ تجهيز PDF...' : 'تحميل ملف PDF'}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isExportingPdf || filteredReadings.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>{isExportingPdf ? 'جارٍ تجهيز PDF...' : 'طباعة / حفظ PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => exportReadingsToCSV(filteredReadings)}
              disabled={filteredReadings.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label
              htmlFor="patient-name"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              اسم المريض
            </label>
            <input
              id="patient-name"
              type="text"
              value={profile.fullName}
              onChange={(e) =>
                onUpdateProfile({ ...profile, fullName: e.target.value })
              }
              placeholder="مثال: أحمد محمد"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div>
            <label
              htmlFor="patient-age"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              العمر
            </label>
            <input
              id="patient-age"
              type="text"
              value={profile.age}
              onChange={(e) =>
                onUpdateProfile({ ...profile, age: e.target.value })
              }
              placeholder="مثال: 48 سنة"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div>
            <label
              htmlFor="doctor-name"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              الطبيب المعالج
            </label>
            <input
              id="doctor-name"
              type="text"
              value={profile.doctorName}
              onChange={(e) =>
                onUpdateProfile({ ...profile, doctorName: e.target.value })
              }
              placeholder="مثال: د. سارة العلي"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <label
              htmlFor="patient-meds"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              الأدوية الحالية والجرعات (اختياري)
            </label>
            <input
              id="patient-meds"
              type="text"
              value={profile.medications}
              onChange={(e) =>
                onUpdateProfile({ ...profile, medications: e.target.value })
              }
              placeholder="مثال: أملوديبين 5 ملغ صباحاً"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div>
            <label
              htmlFor="target-sys"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              الهدف الانقباضي (mmHg)
            </label>
            <input
              id="target-sys"
              type="number"
              value={profile.targetSystolic}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  targetSystolic: Number(e.target.value) || 120,
                })
              }
              className="w-full px-3 py-2 font-mono-tabular text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div>
            <label
              htmlFor="target-dia"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              الهدف الانبساطي (mmHg)
            </label>
            <input
              id="target-dia"
              type="number"
              value={profile.targetDiastolic}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  targetDiastolic: Number(e.target.value) || 80,
                })
              }
              className="w-full px-3 py-2 font-mono-tabular text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>
        </div>

        {/* Backup & Restore row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="text-slate-500">
            حفظ نسخة احتياطية كاملة من سجلاتك أو استعادتها على جهاز آخر:
          </div>
          <div className="flex items-center gap-2.5">
            <input
              ref={jsonInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => handleImportJson(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>نسخ احتياطي JSON</span>
            </button>
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>استيراد JSON</span>
            </button>
          </div>
        </div>

        {exportMessage && (
          <p className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
            {exportMessage}
          </p>
        )}
        {exportError && (
          <p
            role="alert"
            className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
          >
            {exportError}
          </p>
        )}
      </section>

      {/* Live A4 Printable Clinical Report Preview */}
      <div className="overflow-x-auto pb-4">
        <div
          id="printable-medical-report"
          ref={reportRef}
          className="print-only-container bg-white border border-slate-200 rounded-xl p-8 max-w-[820px] mx-auto space-y-6 text-slate-900"
        >
          {/* Report Masthead */}
          <header className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="text-xs font-medium text-teal-700 mb-1">
                نبض — سجل المتابعة المنزلية لضغط الدم
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                تقرير قياسات الضغط الدموي والنبض
              </h1>
              <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-2">
                <span>الفترة: كامل السجل المسجّل</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">
                  تاريخ الإصدار: {formatDateTimeAr(new Date().toISOString())}
                </span>
              </div>
            </div>
            <div className="text-left text-xs text-slate-500 space-y-1">
              <div>الهدف العلاجي</div>
              <div className="font-mono-tabular text-base font-semibold text-slate-900">
                {profile.targetSystolic}/{profile.targetDiastolic} mmHg
              </div>
            </div>
          </header>

          {/* Patient Metadata Grid */}
          {(profile.fullName ||
            profile.age ||
            profile.doctorName ||
            profile.medications) && (
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-200 text-xs">
              <div>
                <div className="text-slate-400 mb-0.5">اسم المريض</div>
                <div className="font-semibold text-slate-900">
                  {profile.fullName || 'غير محدد'}
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-0.5">العمر</div>
                <div className="font-semibold text-slate-900">
                  {profile.age || 'غير محدد'}
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-0.5">الطبيب المعالج</div>
                <div className="font-semibold text-slate-900">
                  {profile.doctorName || 'غير محدد'}
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-0.5">الأدوية الحالية</div>
                <div className="font-semibold text-slate-900">
                  {profile.medications || 'لا يوجد'}
                </div>
              </div>
            </section>
          )}

          {/* Complete readings first; charts are deliberately placed last */}
          {filteredReadings.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              لا توجد قياسات ضمن الفترة المحددة لتضمينها في التقرير.
            </div>
          ) : (
            <>
              <section className="space-y-2.5">
                <h2 className="text-sm font-semibold text-slate-900 border-r-4 border-teal-700 pr-2">
                  السجل الكامل للقياسات ({filteredReadings.length} قياس)
                </h2>
                <table className="w-full text-right border-collapse border border-slate-200 text-[10px] leading-5">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-300">
                      <th className="py-2 px-2 font-semibold">التاريخ والوقت</th>
                      <th className="py-2 px-2 font-semibold">الضغط (SYS/DIA)</th>
                      <th className="py-2 px-2 font-semibold">النبض</th>
                      <th className="py-2 px-2 font-semibold">MAP</th>
                      <th className="py-2 px-2 font-semibold">التصنيف</th>
                      <th className="py-2 px-2 font-semibold">الذراع / الظرف</th>
                      <th className="py-2 px-2 font-semibold">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[...filteredReadings]
                      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
                      .map((r, index) => {
                        const cat = classifyBP(r.systolic, r.diastolic);
                        return (
                          <tr key={r.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="py-1.5 px-2 font-mono-tabular text-slate-700 whitespace-nowrap">
                              {formatDateTimeAr(r.measuredAt)}
                            </td>
                            <td className="py-1.5 px-2 font-mono-tabular font-bold text-slate-900 whitespace-nowrap">
                              {r.systolic}/{r.diastolic}
                            </td>
                            <td className="py-1.5 px-2 font-mono-tabular text-slate-700 whitespace-nowrap">
                              {r.pulse}{r.irregularHeartbeat ? ' (IHB)' : ''}
                            </td>
                            <td className="py-1.5 px-2 font-mono-tabular text-slate-700 whitespace-nowrap">
                              {calcMAP(r.systolic, r.diastolic)}
                            </td>
                            <td className="py-1.5 px-2 whitespace-nowrap">
                              <span className={`font-semibold ${cat.textColor}`}>{cat.shortLabel}</span>
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">
                              {ARM_LABELS[r.arm]} · {CONTEXT_LABELS[r.context]}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600">{r.notes || '—'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </section>

              <section className="avoid-break space-y-2.5 pt-3">
                <h2 className="text-sm font-semibold text-slate-900 border-r-4 border-teal-700 pr-2">
                  المنحنى البياني لتطور ضغط الدم
                </h2>
                <ReportSvgTrendChart readings={filteredReadings} />
              </section>
            </>
          )}

          {/* Report Clinical Footer */}
          <footer className="pt-4 border-t border-slate-200 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span>
              أُعد هذا التقرير من قراءات القياس المنزلي الموثّقة بواسطة المستخدم
              ويُعرض على الطبيب المختص للتقييم العلاجي.
            </span>
            <span className="font-mono-tabular">
              التصنيف المرجعي: AHA / ACC
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
