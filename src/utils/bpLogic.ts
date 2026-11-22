import type {
  ArmSide,
  BloodPressureReading,
  BodyPosture,
  BPCategoryInfo,
  BPCategoryKey,
  DateRangeKey,
  MeasurementContext,
  PatientProfile,
} from '../types';

export const BP_CATEGORIES: Record<BPCategoryKey, BPCategoryInfo> = {
  low: {
    key: 'low',
    label: 'ضغط منخفض',
    shortLabel: 'منخفض',
    rangeText: '< 90 / < 60',
    textColor: 'text-blue-700',
    dotColor: '#2563EB',
    chartColor: '#2563EB',
    guidance: 'قراءة أقل من المعدل الطبيعي؛ يُنصح بشرب السوائل ومراقبة أي دوار.',
  },
  normal: {
    key: 'normal',
    label: 'طبيعي مثالي',
    shortLabel: 'طبيعي',
    rangeText: '< 120 و < 80',
    textColor: 'text-emerald-700',
    dotColor: '#16A34A',
    chartColor: '#16A34A',
    guidance: 'قراءة ضمن النطاق الصحي الموصى به طبياً.',
  },
  elevated: {
    key: 'elevated',
    label: 'مرتفع قليلاً',
    shortLabel: 'مرتفع قليلاً',
    rangeText: '120–129 و < 80',
    textColor: 'text-amber-700',
    dotColor: '#D97706',
    chartColor: '#D97706',
    guidance: 'قراءة حدّية؛ يُفضّل متابعة القياسات وتقليل الصوديوم.',
  },
  stage1: {
    key: 'stage1',
    label: 'ارتفاع — المرحلة 1',
    shortLabel: 'مرحلة 1',
    rangeText: '130–139 أو 80–89',
    textColor: 'text-orange-700',
    dotColor: '#EA580C',
    chartColor: '#EA580C',
    guidance: 'ارتفاع من الدرجة الأولى؛ يُنصح بمشاركة السجل مع الطبيب.',
  },
  stage2: {
    key: 'stage2',
    label: 'ارتفاع — المرحلة 2',
    shortLabel: 'مرحلة 2',
    rangeText: '≥ 140 أو ≥ 90',
    textColor: 'text-red-700',
    dotColor: '#DC2626',
    chartColor: '#DC2626',
    guidance: 'ارتفاع ملحوظ يتطلب متابعة طبية ومراجعة خطة العلاج.',
  },
  crisis: {
    key: 'crisis',
    label: 'أزمة ارتفاع ضغط',
    shortLabel: 'أزمة ضغط',
    rangeText: '≥ 180 أو ≥ 120',
    textColor: 'text-rose-900',
    dotColor: '#991B1B',
    chartColor: '#991B1B',
    guidance: 'قراءة حرجة جداً؛ أعد القياس بعد 5 دقائق واطلب رعاية طبية فورية إذا استمرت.',
  },
};

export function classifyBP(systolic: number, diastolic: number): BPCategoryInfo {
  if (systolic >= 180 || diastolic >= 120) {
    return BP_CATEGORIES.crisis;
  }
  if (systolic >= 140 || diastolic >= 90) {
    return BP_CATEGORIES.stage2;
  }
  if (systolic >= 130 || diastolic >= 80) {
    return BP_CATEGORIES.stage1;
  }
  if (systolic >= 120 && diastolic < 80) {
    return BP_CATEGORIES.elevated;
  }
  if (systolic < 90 || diastolic < 60) {
    return BP_CATEGORIES.low;
  }
  return BP_CATEGORIES.normal;
}

export function calcPulsePressure(systolic: number, diastolic: number): number {
  return Math.max(0, Math.round(systolic - diastolic));
}

export function calcMAP(systolic: number, diastolic: number): number {
  return Math.round(diastolic + (systolic - diastolic) / 3);
}

export const ARM_LABELS: Record<ArmSide, string> = {
  left: 'الذراع اليسرى',
  right: 'الذراع اليمنى',
};

export const POSTURE_LABELS: Record<BodyPosture, string> = {
  sitting: 'جالس',
  lying: 'مستلقٍ',
  standing: 'واقف',
};

export const CONTEXT_LABELS: Record<MeasurementContext, string> = {
  morning_before_meds: 'صباحاً قبل الدواء',
  morning_after_meds: 'صباحاً بعد الدواء',
  evening: 'مساءً قبل النوم',
  after_activity: 'بعد مجهود بدني',
  symptomatic: 'عند الشعور بأعراض',
  routine: 'قياس اعتيادي',
};

export function formatDateTimeAr(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDateAr(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatTimeAr(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function filterReadingsByRange(
  readings: BloodPressureReading[],
  range: DateRangeKey
): BloodPressureReading[] {
  if (range === 'all') return readings;
  const now = Date.now();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return readings.filter((r) => new Date(r.measuredAt).getTime() >= cutoff);
}

export interface BPStatsSummary {
  count: number;
  avgSys: number;
  avgDia: number;
  avgPulse: number;
  avgMAP: number;
  avgPulsePressure: number;
  minSys: number;
  maxSys: number;
  minDia: number;
  maxDia: number;
  minPulse: number;
  maxPulse: number;
  normalCount: number;
  normalRatio: number;
  irregularCount: number;
  morningAvg: { sys: number; dia: number; pulse: number; count: number };
  eveningAvg: { sys: number; dia: number; pulse: number; count: number };
  categoryCounts: Record<BPCategoryKey, number>;
}

export function computeStats(readings: BloodPressureReading[]): BPStatsSummary {
  const categoryCounts: Record<BPCategoryKey, number> = {
    low: 0,
    normal: 0,
    elevated: 0,
    stage1: 0,
    stage2: 0,
    crisis: 0,
  };

  if (readings.length === 0) {
    return {
      count: 0,
      avgSys: 0,
      avgDia: 0,
      avgPulse: 0,
      avgMAP: 0,
      avgPulsePressure: 0,
      minSys: 0,
      maxSys: 0,
      minDia: 0,
      maxDia: 0,
      minPulse: 0,
      maxPulse: 0,
      normalCount: 0,
      normalRatio: 0,
      irregularCount: 0,
      morningAvg: { sys: 0, dia: 0, pulse: 0, count: 0 },
      eveningAvg: { sys: 0, dia: 0, pulse: 0, count: 0 },
      categoryCounts,
    };
  }

  let sumSys = 0;
  let sumDia = 0;
  let sumPulse = 0;
  let sumMAP = 0;
  let sumPP = 0;
  let minSys = Infinity;
  let maxSys = -Infinity;
  let minDia = Infinity;
  let maxDia = -Infinity;
  let minPulse = Infinity;
  let maxPulse = -Infinity;
  let irregularCount = 0;

  let mSys = 0;
  let mDia = 0;
  let mPulse = 0;
  let mCount = 0;

  let eSys = 0;
  let eDia = 0;
  let ePulse = 0;
  let eCount = 0;

  for (const r of readings) {
    sumSys += r.systolic;
    sumDia += r.diastolic;
    sumPulse += r.pulse;
    sumMAP += calcMAP(r.systolic, r.diastolic);
    sumPP += calcPulsePressure(r.systolic, r.diastolic);

    if (r.systolic < minSys) minSys = r.systolic;
    if (r.systolic > maxSys) maxSys = r.systolic;
    if (r.diastolic < minDia) minDia = r.diastolic;
    if (r.diastolic > maxDia) maxDia = r.diastolic;
    if (r.pulse < minPulse) minPulse = r.pulse;
    if (r.pulse > maxPulse) maxPulse = r.pulse;
    if (r.irregularHeartbeat) irregularCount += 1;

    const cat = classifyBP(r.systolic, r.diastolic);
    categoryCounts[cat.key] += 1;

    const hour = new Date(r.measuredAt).getHours();
    if (
      hour < 14 ||
      r.context === 'morning_before_meds' ||
      r.context === 'morning_after_meds'
    ) {
      mSys += r.systolic;
      mDia += r.diastolic;
      mPulse += r.pulse;
      mCount += 1;
    } else {
      eSys += r.systolic;
      eDia += r.diastolic;
      ePulse += r.pulse;
      eCount += 1;
    }
  }

  const count = readings.length;
  const normalCount = categoryCounts.normal;

  return {
    count,
    avgSys: Math.round(sumSys / count),
    avgDia: Math.round(sumDia / count),
    avgPulse: Math.round(sumPulse / count),
    avgMAP: Math.round(sumMAP / count),
    avgPulsePressure: Math.round(sumPP / count),
    minSys,
    maxSys,
    minDia,
    maxDia,
    minPulse,
    maxPulse,
    normalCount,
    normalRatio: Math.round((normalCount / count) * 100),
    irregularCount,
    morningAvg: {
      sys: mCount ? Math.round(mSys / mCount) : 0,
      dia: mCount ? Math.round(mDia / mCount) : 0,
      pulse: mCount ? Math.round(mPulse / mCount) : 0,
      count: mCount,
    },
    eveningAvg: {
      sys: eCount ? Math.round(eSys / eCount) : 0,
      dia: eCount ? Math.round(eDia / eCount) : 0,
      pulse: eCount ? Math.round(ePulse / eCount) : 0,
      count: eCount,
    },
    categoryCounts,
  };
}

export const DEFAULT_PATIENT_PROFILE: PatientProfile = {
  fullName: '',
  age: '',
  doctorName: '',
  medications: '',
  targetSystolic: 120,
  targetDiastolic: 80,
};

export function createSampleReadings(): BloodPressureReading[] {
  const now = new Date();
  const makeDate = (daysAgo: number, hour: number, minute: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const samples: Array<Omit<BloodPressureReading, 'id' | 'isSample'>> = [
    {
      systolic: 136,
      diastolic: 86,
      pulse: 76,
      measuredAt: makeDate(13, 8, 15),
      arm: 'left',
      posture: 'sitting',
      context: 'morning_before_meds',
      irregularHeartbeat: false,
      notes: 'قبل تناول جرعة الصباح، راحة لمدة 5 دقائق',
      source: 'manual',
    },
    {
      systolic: 128,
      diastolic: 82,
      pulse: 72,
      measuredAt: makeDate(12, 20, 30),
      arm: 'left',
      posture: 'sitting',
      context: 'evening',
      irregularHeartbeat: false,
      notes: 'قراءة مسائية هادئة',
      source: 'manual',
    },
    {
      systolic: 142,
      diastolic: 91,
      pulse: 84,
      measuredAt: makeDate(11, 9, 5),
      arm: 'left',
      posture: 'sitting',
      context: 'symptomatic',
      irregularHeartbeat: false,
      notes: 'شعور بصداع خفيف بعد قلة النوم',
      source: 'image',
    },
    {
      systolic: 131,
      diastolic: 83,
      pulse: 74,
      measuredAt: makeDate(10, 8, 20),
      arm: 'left',
      posture: 'sitting',
      context: 'morning_after_meds',
      irregularHeartbeat: false,
      notes: 'بعد ساعة من تناول الدواء',
      source: 'manual',
    },
    {
      systolic: 124,
      diastolic: 79,
      pulse: 70,
      measuredAt: makeDate(9, 21, 10),
      arm: 'left',
      posture: 'sitting',
      context: 'evening',
      irregularHeartbeat: false,
      notes: 'بعد المشي لمدة 30 دقيقة',
      source: 'manual',
    },
    {
      systolic: 119,
      diastolic: 77,
      pulse: 68,
      measuredAt: makeDate(7, 8, 10),
      arm: 'left',
      posture: 'sitting',
      context: 'morning_after_meds',
      irregularHeartbeat: false,
      notes: 'التزام جيد بالنظام قليل الملح',
      source: 'image',
    },
    {
      systolic: 126,
      diastolic: 80,
      pulse: 73,
      measuredAt: makeDate(6, 20, 45),
      arm: 'right',
      posture: 'sitting',
      context: 'evening',
      irregularHeartbeat: false,
      notes: 'قياس مقارنة على الذراع اليمنى',
      source: 'manual',
    },
    {
      systolic: 134,
      diastolic: 85,
      pulse: 79,
      measuredAt: makeDate(5, 8, 40),
      arm: 'left',
      posture: 'sitting',
      context: 'morning_before_meds',
      irregularHeartbeat: false,
      notes: 'بعد شرب القهوة مباشرة',
      source: 'image',
    },
    {
      systolic: 121,
      diastolic: 78,
      pulse: 69,
      measuredAt: makeDate(4, 21, 0),
      arm: 'left',
      posture: 'sitting',
      context: 'evening',
      irregularHeartbeat: false,
      notes: 'مستقر وجيد',
      source: 'manual',
    },
    {
      systolic: 118,
      diastolic: 76,
      pulse: 67,
      measuredAt: makeDate(3, 8, 15),
      arm: 'left',
      posture: 'sitting',
      context: 'morning_after_meds',
      irregularHeartbeat: false,
      notes: 'قراءة صباحية مثالية',
      source: 'manual',
    },
    {
      systolic: 125,
      diastolic: 79,
      pulse: 71,
      measuredAt: makeDate(2, 20, 15),
      arm: 'left',
      posture: 'sitting',
      context: 'evening',
      irregularHeartbeat: false,
      notes: 'بعد العشاء بساعتين',
      source: 'manual',
    },
    {
      systolic: 122,
      diastolic: 78,
      pulse: 70,
      measuredAt: makeDate(1, 8, 30),
      arm: 'left',
      posture: 'sitting',
      context: 'morning_after_meds',
      irregularHeartbeat: false,
      notes: 'نشاط طبيعي طوال اليوم',
      source: 'image',
    },
    {
      systolic: 117,
      diastolic: 75,
      pulse: 66,
      measuredAt: makeDate(0, 9, 0),
      arm: 'left',
      posture: 'sitting',
      context: 'morning_after_meds',
      irregularHeartbeat: false,
      notes: 'أفضل قراءة خلال الأسبوعين الماضيين',
      source: 'manual',
    },
  ];

  return samples
    .map((item, idx) => ({
      ...item,
      id: `sample-${idx + 1}`,
      isSample: true,
    }))
    .sort(
      (a, b) =>
        new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
    );
}

export function exportReadingsToCSV(readings: BloodPressureReading[]): void {
  const headers = [
    'التاريخ والوقت',
    'الانقباضي (mmHg)',
    'الانبساطي (mmHg)',
    'النبض (نبضة/دقيقة)',
    'متوسط الضغط الشرياني (MAP)',
    'ضغط النبض',
    'التصنيف الطبي',
    'الذراع',
    'الوضعية',
    'توقيت القياس',
    'عدم انتظام النبض',
    'المصدر',
    'ملاحظات',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = readings.map((r) => {
    const cat = classifyBP(r.systolic, r.diastolic);
    return [
      formatDateTimeAr(r.measuredAt),
      r.systolic,
      r.diastolic,
      r.pulse,
      calcMAP(r.systolic, r.diastolic),
      calcPulsePressure(r.systolic, r.diastolic),
      cat.label,
      ARM_LABELS[r.arm],
      POSTURE_LABELS[r.posture],
      CONTEXT_LABELS[r.context],
      r.irregularHeartbeat ? 'نعم' : 'لا',
      r.source === 'image' ? 'استخراج من صورة' : 'إدخال يدوي',
      r.notes,
    ]
      .map(escapeCsv)
      .join(',');
  });

  // Add UTF-8 BOM so Microsoft Excel opens Arabic characters cleanly
  const csvContent = `\uFEFF${headers.join(',')}\n${rows.join('\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `سجل-ضغط-الدم-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
