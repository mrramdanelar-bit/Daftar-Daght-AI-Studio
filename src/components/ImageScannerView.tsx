import { useRef, useState } from 'react';
import {
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Upload,
  Video,
  X,
} from 'lucide-react';
import type {
  ArmSide,
  BloodPressureReading,
  BodyPosture,
  ExtractedBPResult,
  MeasurementContext,
} from '../types';
import {
  ARM_LABELS,
  calcMAP,
  calcPulsePressure,
  classifyBP,
  CONTEXT_LABELS,
  POSTURE_LABELS,
  toLocalDateTimeInputValue,
} from '../utils/bpLogic';

const SAMPLE_MONITOR_IMG =
  '/src/assets/images/sample_bp_monitor_1795378008226.jpg';

interface ImageScannerViewProps {
  onSaveReading: (reading: Omit<BloodPressureReading, 'id'>) => void;
  onGoToHistory: () => void;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'ثقة عالية',
  medium: 'ثقة متوسطة — يُرجى مراجعة الأرقام',
  low: 'ثقة منخفضة — يُنصح بالتحقق اليدوي',
};

export default function ImageScannerView({
  onSaveReading,
  onGoToHistory,
}: ImageScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageErrorFallback, setImageErrorFallback] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractedMeta, setExtractedMeta] = useState<ExtractedBPResult | null>(
    null
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live webcam modal state
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [webcamError, setWebcamError] = useState('');

  // Editable form state populated from extraction
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() =>
    toLocalDateTimeInputValue(new Date())
  );
  const [arm, setArm] = useState<ArmSide>('left');
  const [posture, setPosture] = useState<BodyPosture>('sitting');
  const [context, setContext] = useState<MeasurementContext>('routine');
  const [irregularHeartbeat, setIrregularHeartbeat] = useState(false);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setWebcamOpen(false);
  };

  const openWebcam = async () => {
    setWebcamError('');
    setExtractError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setWebcamOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setWebcamError(
        'تعذر فتح الكاميرا مباشرة. يمكنك رفع صورة من جهازك أو استخدام زر الكاميرا في الهاتف.'
      );
    }
  };

  const captureFromWebcam = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopWebcam();
    analyzeImageDataUrl(dataUrl, 'image/jpeg');
  };

  const analyzeImageDataUrl = async (dataUrl: string, mimeType: string) => {
    setPreviewUrl(dataUrl);
    setImageErrorFallback(false);
    setExtractError('');
    setFormError('');
    setSavedSuccess(false);
    setExtractedMeta(null);
    setIsExtracting(true);

    try {
      const response = await fetch('/api/extract-bp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType,
        }),
      });

      const payload = (await response.json()) as {
        extracted?: ExtractedBPResult;
        error?: string;
      };

      if (!response.ok || !payload.extracted) {
        throw new Error(
          payload.error || 'تعذر قراءة البيانات من الصورة. يرجى المحاولة مجدداً.'
        );
      }

      const data = payload.extracted;
      setExtractedMeta(data);
      setSystolic(data.systolic != null ? String(data.systolic) : '');
      setDiastolic(data.diastolic != null ? String(data.diastolic) : '');
      setPulse(data.pulse != null ? String(data.pulse) : '');
      setIrregularHeartbeat(Boolean(data.irregularHeartbeat));

      if (data.measuredAt) {
        const parsed = new Date(data.measuredAt);
        if (!Number.isNaN(parsed.getTime())) {
          setMeasuredAt(toLocalDateTimeInputValue(parsed));
        } else {
          setMeasuredAt(toLocalDateTimeInputValue(new Date()));
        }
      } else {
        setMeasuredAt(toLocalDateTimeInputValue(new Date()));
      }

      setNotes(data.notes ? data.notes : '');
    } catch (err: unknown) {
      setExtractError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء الاتصال بخدمة قراءة الصور.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setExtractError('يرجى اختيار ملف صورة صالح (JPG، PNG، WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        analyzeImageDataUrl(result, file.type || 'image/jpeg');
      }
    };
    reader.onerror = () => {
      setExtractError('تعذر قراءة ملف الصورة المختار.');
    };
    reader.readAsDataURL(file);
  };

  const handleTestSampleImage = async () => {
    setExtractError('');
    setIsExtracting(true);
    setPreviewUrl(SAMPLE_MONITOR_IMG);
    setImageErrorFallback(false);
    setSavedSuccess(false);
    try {
      const res = await fetch(SAMPLE_MONITOR_IMG);
      if (!res.ok) {
        throw new Error('تعذر تحميل الصورة النموذجية.');
      }
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          analyzeImageDataUrl(reader.result, blob.type || 'image/jpeg');
        }
      };
      reader.readAsDataURL(blob);
    } catch (err: unknown) {
      setIsExtracting(false);
      setExtractError(
        err instanceof Error ? err.message : 'تعذر تحميل الصورة النموذجية.'
      );
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setExtractedMeta(null);
    setExtractError('');
    setFormError('');
    setSavedSuccess(false);
    setSystolic('');
    setDiastolic('');
    setPulse('');
    setNotes('');
    setIrregularHeartbeat(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const numSys = Number(systolic);
  const numDia = Number(diastolic);
  const numPulse = Number(pulse);
  const canPreviewCat =
    systolic !== '' &&
    diastolic !== '' &&
    Number.isFinite(numSys) &&
    Number.isFinite(numDia) &&
    numSys >= 50 &&
    numSys <= 280 &&
    numDia >= 30 &&
    numDia <= 180 &&
    numSys > numDia;

  const liveCategory = canPreviewCat ? classifyBP(numSys, numDia) : null;

  const handleSaveExtracted = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!Number.isFinite(numSys) || numSys < 50 || numSys > 280) {
      setFormError('يرجى التحقق من قيمة الضغط الانقباضي (بين 50 و 280).');
      return;
    }
    if (!Number.isFinite(numDia) || numDia < 30 || numDia > 180) {
      setFormError('يرجى التحقق من قيمة الضغط الانبساطي (بين 30 و 180).');
      return;
    }
    if (numDia >= numSys) {
      setFormError('يجب أن يكون الضغط الانقباضي أكبر من الانبساطي.');
      return;
    }
    if (!Number.isFinite(numPulse) || numPulse < 30 || numPulse > 220) {
      setFormError('يرجى التحقق من معدل النبض (بين 30 و 220).');
      return;
    }

    const parsedDate = new Date(measuredAt);
    const isoDate = Number.isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

    onSaveReading({
      systolic: Math.round(numSys),
      diastolic: Math.round(numDia),
      pulse: Math.round(numPulse),
      measuredAt: isoDate,
      arm,
      posture,
      context,
      irregularHeartbeat,
      notes: notes.trim(),
      source: 'image',
    });

    setSavedSuccess(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Right column (in RTL): Upload / Camera dropzone & photo preview */}
        <section className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                صورة جهاز قياس الضغط
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                صوّر شاشة الجهاز الرقمي أو ورقة القياسات بوضوح لاستخراج الأرقام
                تلقائياً
              </p>
            </div>
            {previewUrl && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>صورة جديدة</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />

          {!previewUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileSelected(e.dataTransfer.files?.[0]);
              }}
              className={`flex-1 min-h-[320px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center transition-colors ${
                isDragging
                  ? 'border-teal-600 bg-teal-50/40'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-teal-700 mb-4">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-800 mb-1">
                اسحب صورة شاشة الجهاز وأفلتها هنا
              </p>
              <p className="text-xs text-slate-500 mb-6">
                يدعم صور أجهزة العضد والمعصم الرقمية والقياسات المكتوبة (JPG،
                PNG، WEBP)
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>اختيار صورة</span>
                </button>
                <button
                  type="button"
                  onClick={openWebcam}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Camera className="w-4 h-4" />
                  <span>التقاط بالكاميرا</span>
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200/80 w-full max-w-sm">
                <button
                  type="button"
                  onClick={handleTestSampleImage}
                  className="text-xs font-medium text-teal-700 hover:text-teal-900 underline underline-offset-4"
                >
                  تجربة الاستخراج الفوري بصورة جهاز قياس نموذجية
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3] w-full flex items-center justify-center">
                {!imageErrorFallback ? (
                  <img
                    src={previewUrl}
                    alt="صورة جهاز قياس ضغط الدم المرفوعة للتحليل"
                    referrerPolicy="no-referrer"
                    onError={() => setImageErrorFallback(true)}
                    className="w-full h-full object-contain bg-slate-950/5"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-slate-500 text-xs">
                    <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                    <span>معاينة الصورة المحددة</span>
                  </div>
                )}

                {isExtracting && (
                  <div className="absolute inset-0 bg-slate-900/55 flex flex-col items-center justify-center text-white px-4 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    <p className="text-sm font-medium">
                      جارٍ قراءة الأرقام من شاشة الجهاز...
                    </p>
                    <p className="text-xs text-slate-200 mt-1">
                      يتم استخراج الانقباضي والانبساطي والنبض والوقت تلقائياً
                    </p>
                  </div>
                )}
              </div>

              {extractedMeta && !isExtracting && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 pt-1">
                  <span className="font-medium text-slate-700">
                    {extractedMeta.deviceDescription || 'تم تحليل الصورة'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {CONFIDENCE_LABELS[extractedMeta.confidence] ||
                      'تم الاستخراج بنجاح'}
                  </span>
                </div>
              )}
            </div>
          )}

          {webcamError && (
            <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5">
              {webcamError}
            </p>
          )}

          {extractError && (
            <p
              role="alert"
              className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
            >
              {extractError}
            </p>
          )}
        </section>

        {/* Left column (in RTL): Extracted confirmation & Save form */}
        <section className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900">
              مراجعة وحفظ البيانات المستخرجة
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تحقق من الأرقام المستخرجة وعدّلها عند الحاجة ثم احفظها في سجلك
            </p>
          </div>

          {savedSuccess ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                تم حفظ القراءة في سجلك بنجاح
              </h3>
              <p className="text-xs text-slate-500 mb-6 font-mono-tabular">
                {systolic}/{diastolic} mmHg · النبض {pulse} نبضة/د
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
                >
                  استخراج صورة أخرى
                </button>
                <button
                  type="button"
                  onClick={onGoToHistory}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  عرض سجل القياسات
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSaveExtracted}
              className="flex-1 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="scan-sys"
                      className="block text-xs font-medium text-slate-600 mb-1.5"
                    >
                      الانقباضي SYS
                    </label>
                    <input
                      id="scan-sys"
                      type="number"
                      inputMode="numeric"
                      placeholder="120"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      disabled={isExtracting}
                      className="w-full px-3.5 py-2.5 font-mono-tabular text-xl font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="scan-dia"
                      className="block text-xs font-medium text-slate-600 mb-1.5"
                    >
                      الانبساطي DIA
                    </label>
                    <input
                      id="scan-dia"
                      type="number"
                      inputMode="numeric"
                      placeholder="80"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      disabled={isExtracting}
                      className="w-full px-3.5 py-2.5 font-mono-tabular text-xl font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="scan-pulse"
                      className="block text-xs font-medium text-slate-600 mb-1.5"
                    >
                      النبض PUL
                    </label>
                    <input
                      id="scan-pulse"
                      type="number"
                      inputMode="numeric"
                      placeholder="72"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      disabled={isExtracting}
                      className="w-full px-3.5 py-2.5 font-mono-tabular text-xl font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 disabled:opacity-60"
                    />
                  </div>
                </div>

                {liveCategory && (
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">التصنيف: </span>
                      <span
                        className={`font-semibold ${liveCategory.textColor}`}
                      >
                        {liveCategory.label}
                      </span>
                    </div>
                    <div className="font-mono-tabular text-slate-600">
                      MAP {calcMAP(numSys, numDia)} · ضغط النبض{' '}
                      {calcPulsePressure(numSys, numDia)}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="scan-date"
                      className="block text-xs font-medium text-slate-600 mb-1.5"
                    >
                      التاريخ والوقت
                    </label>
                    <input
                      id="scan-date"
                      type="datetime-local"
                      value={measuredAt}
                      onChange={(e) => setMeasuredAt(e.target.value)}
                      className="w-full px-3.5 py-2 font-mono-tabular text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="scan-context"
                      className="block text-xs font-medium text-slate-600 mb-1.5"
                    >
                      توقيت القياس
                    </label>
                    <select
                      id="scan-context"
                      value={context}
                      onChange={(e) =>
                        setContext(e.target.value as MeasurementContext)
                      }
                      className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-medium text-slate-600 mb-1.5">
                      الذراع
                    </span>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                      {(['left', 'right'] as ArmSide[]).map((side) => (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setArm(side)}
                          className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            arm === side
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {ARM_LABELS[side]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-slate-600 mb-1.5">
                      الوضعية
                    </span>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                      {(['sitting', 'lying', 'standing'] as BodyPosture[]).map(
                        (pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setPosture(pos)}
                            className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                              posture === pos
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {POSTURE_LABELS[pos]}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={irregularHeartbeat}
                    onChange={(e) => setIrregularHeartbeat(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  <span>تم رصد رمز عدم انتظام ضربات القلب (IHB) على الشاشة</span>
                </label>

                <div>
                  <label
                    htmlFor="scan-notes"
                    className="block text-xs font-medium text-slate-600 mb-1.5"
                  >
                    ملاحظات القراءة
                  </label>
                  <textarea
                    id="scan-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أضف ملاحظة اختيارية أو عدّل الملاحظة المستخرجة..."
                    className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 resize-none"
                  />
                </div>

                {formError && (
                  <p
                    role="alert"
                    className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
                  >
                    {formError}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={isExtracting || !systolic || !diastolic}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  حفظ القياس في السجل
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Live Webcam Modal */}
      {webcamOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="التقاط صورة من الكاميرا"
        >
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Video className="w-4 h-4 text-teal-700" />
                <span>توجيه الكاميرا نحو شاشة جهاز الضغط</span>
              </div>
              <button
                type="button"
                onClick={stopWebcam}
                aria-label="إغلاق الكاميرا"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black aspect-[4/3] w-full">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200">
              <button
                type="button"
                onClick={stopWebcam}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={captureFromWebcam}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800"
              >
                <Camera className="w-4 h-4" />
                <span>التقاط وتحليل الصورة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
