import { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? 'w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100/70 transition-colors whitespace-nowrap'
            : 'inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap'
        }
      >
        {isInstallable ? (
          <Download className="w-4 h-4 shrink-0" />
        ) : (
          <Smartphone className="w-4 h-4 shrink-0" />
        )}
        <span>
          {isInstallable
            ? 'تثبيت التطبيق على الهاتف'
            : isIOS
            ? 'تثبيت على آيفون'
            : 'تثبيت على هاتف أندرويد'}
        </span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3
                id="pwa-guide-title"
                className="text-base font-semibold text-slate-900"
              >
                {isIOS
                  ? 'تثبيت نبض على iPhone / iPad'
                  : 'تثبيت نبض كتطبيق على هاتف أندرويد'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="إغلاق"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm text-slate-600 leading-relaxed">
              {isIOS ? (
                <ol className="list-decimal list-inside space-y-2">
                  <li>افتح التطبيق في متصفح Safari.</li>
                  <li>
                    اضغط على زر <strong>المشاركة (Share)</strong> أسفل الشاشة.
                  </li>
                  <li>
                    اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                  </li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-2">
                  <li>افتح رابط التطبيق في متصفح Google Chrome على هاتف أندرويد.</li>
                  <li>
                    اضغط على قائمة النقاط الثلاث <strong>(⋮)</strong> أعلى المتصفح.
                  </li>
                  <li>
                    اختر <strong>تثبيت التطبيق (Install App)</strong> أو{' '}
                    <strong>الإضافة إلى الشاشة الرئيسية</strong>.
                  </li>
                  <li>
                    سيعمل التطبيق بواجهة أندرويد مستقلة وبدون إنترنت مع إشعارات
                    التذكير المجدولة.
                  </li>
                </ol>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 lg:bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white shadow-sm no-print"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>وضع عدم الاتصال — يتم حفظ قراءاتك محلياً</span>
    </div>
  );
}
