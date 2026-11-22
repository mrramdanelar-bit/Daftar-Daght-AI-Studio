import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type {
  ArmSide,
  BloodPressureReading,
  BodyPosture,
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

interface ReadingModalProps {
  isOpen: boolean;
  editingReading: BloodPressureReading | null;
  initialContext?: MeasurementContext;
  onClose: () => void;
  onSave: (data: Omit<BloodPressureReading, 'id'>, existingId?: string) => void;
}

export default function ReadingModal({
  isOpen,
  editingReading,
  initialContext = 'routine',
  onClose,
  onSave,
}: ReadingModalProps) {
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [pulse, setPulse] = useState('72');
  const [measuredAt, setMeasuredAt] = useState(() =>
    toLocalDateTimeInputValue(new Date())
  );
  const [arm, setArm] = useState<ArmSide>('left');
  const [posture, setPosture] = useState<BodyPosture>('sitting');
  const [context, setContext] = useState<MeasurementContext>(initialContext);
  const [irregularHeartbeat, setIrregularHeartbeat] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingReading) {
      setSystolic(String(editingReading.systolic));
      setDiastolic(String(editingReading.diastolic));
      setPulse(String(editingReading.pulse));
      setMeasuredAt(toLocalDateTimeInputValue(new Date(editingReading.measuredAt)));
      setArm(editingReading.arm);
      setPosture(editingReading.posture);
      setContext(editingReading.context);
      setIrregularHeartbeat(editingReading.irregularHeartbeat);
      setNotes(editingReading.notes);
    } else {
      setSystolic('122');
      setDiastolic('78');
      setPulse('72');
      setMeasuredAt(toLocalDateTimeInputValue(new Date()));
      setArm('left');
      setPosture('sitting');
      setContext(initialContext);
      setIrregularHeartbeat(false);
      setNotes('');
    }
  }, [isOpen, editingReading, initialContext]);

  if (!isOpen) return null;

  const numSys = Number(systolic);
  const numDia = Number(diastolic);
  const numPulse = Number(pulse);
  const isValidPreview =
    Number.isFinite(numSys) &&
    Number.isFinite(numDia) &&
    numSys >= 50 &&
    numSys <= 280 &&
    numDia >= 30 &&
    numDia <= 180 &&
    numSys > numDia;

  const category = isValidPreview ? classifyBP(numSys, numDia) : null;
  const pulsePressure = isValidPreview ? calcPulsePressure(numSys, numDia) : null;
  const mapValue = isValidPreview ? calcMAP(numSys, numDia) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(numSys) || numSys < 50 || numSys > 280) {
      setError('يرجى إدخال قيمة صحيحة للضغط الانقباضي بين 50 و 280 mmHg.');
      return;
    }
    if (!Number.isFinite(numDia) || numDia < 30 || numDia > 180) {
      setError('يرجى إدخال قيمة صحيحة للضغط الانبساطي بين 30 و 180 mmHg.');
      return;
    }
    if (numDia >= numSys) {
      setError('يجب أن يكون الضغط الانقباضي أكبر من الضغط الانبساطي.');
      return;
    }
    if (!Number.isFinite(numPulse) || numPulse < 30 || numPulse > 220) {
      setError('يرجى إدخال معدل نبض صحيح بين 30 و 220 نبضة/دقيقة.');
      return;
    }

    const parsedDate = new Date(measuredAt);
    const isoDate = Number.isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

    onSave(
      {
        systolic: Math.round(numSys),
        diastolic: Math.round(numDia),
        pulse: Math.round(numPulse),
        measuredAt: isoDate,
        arm,
        posture,
        context,
        irregularHeartbeat,
        notes: notes.trim(),
        source: editingReading?.source ?? 'manual',
      },
      editingReading?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-modal-title"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2
            id="reading-modal-title"
            className="text-lg font-semibold text-slate-900"
          >
            {editingReading ? 'تعديل قياس ضغط الدم' : 'تسجيل قياس جديد'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto px-6 py-5 space-y-5"
        >
          {/* Numeric inputs row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="bp-sys"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                الانقباضي SYS (mmHg)
              </label>
              <input
                id="bp-sys"
                type="number"
                inputMode="numeric"
                min={50}
                max={280}
                required
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full px-3.5 py-2.5 font-mono-tabular text-lg font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label
                htmlFor="bp-dia"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                الانبساطي DIA (mmHg)
              </label>
              <input
                id="bp-dia"
                type="number"
                inputMode="numeric"
                min={30}
                max={180}
                required
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full px-3.5 py-2.5 font-mono-tabular text-lg font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label
                htmlFor="bp-pulse"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                النبض PUL (نبضة/د)
              </label>
              <input
                id="bp-pulse"
                type="number"
                inputMode="numeric"
                min={30}
                max={220}
                required
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                className="w-full px-3.5 py-2.5 font-mono-tabular text-lg font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>
          </div>

          {/* Live clinical preview bar (flat, subtle hairline, no thick left bar) */}
          {category && (
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500">التصنيف الطبي: </span>
                <span className={`font-semibold ${category.textColor}`}>
                  {category.label}
                </span>
                <span className="text-slate-400 mx-1.5">·</span>
                <span className="text-slate-600">{category.guidance}</span>
              </div>
              <div className="flex items-center gap-3 font-mono-tabular text-slate-600 shrink-0">
                <span>MAP: {mapValue}</span>
                <span className="text-slate-300">/</span>
                <span>ضغط النبض: {pulsePressure}</span>
              </div>
            </div>
          )}

          {/* Date/time & Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="bp-date"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                التاريخ والوقت
              </label>
              <input
                id="bp-date"
                type="datetime-local"
                required
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                className="w-full px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label
                htmlFor="bp-context"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                توقيت وظرف القياس
              </label>
              <select
                id="bp-context"
                value={context}
                onChange={(e) =>
                  setContext(e.target.value as MeasurementContext)
                }
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              >
                {(Object.keys(CONTEXT_LABELS) as MeasurementContext[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {CONTEXT_LABELS[key]}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Arm & Posture segmented controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-slate-600 mb-1.5">
                الذراع المستخدمة
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                {(['left', 'right'] as ArmSide[]).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setArm(side)}
                    className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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
                وضعية الجسم
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(['sitting', 'lying', 'standing'] as BodyPosture[]).map(
                  (pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setPosture(pos)}
                      className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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

          {/* Irregular heartbeat checkbox */}
          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={irregularHeartbeat}
              onChange={(e) => setIrregularHeartbeat(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
            />
            <span>ظهر مؤشر عدم انتظام ضربات القلب (IHB) على الجهاز</span>
          </label>

          {/* Notes */}
          <div>
            <label
              htmlFor="bp-notes"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              ملاحظات أو أعراض مصاحبة (اختياري)
            </label>
            <textarea
              id="bp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: بعد راحة 5 دقائق، تناول جرعة الدواء الصباحية، شعور بصداع خفيف..."
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 resize-none"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
            >
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
            >
              {editingReading ? 'حفظ التعديلات' : 'حفظ القياس'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
