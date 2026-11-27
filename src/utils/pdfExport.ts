import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function exportReportElementToPDF(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  if (document.fonts?.ready) await document.fonts.ready;

  const dataUrl = await toPng(element, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('تعذر تجهيز صورة التقرير لتصدير PDF'));
    img.src = dataUrl;
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const marginMm = 8;
  const usableWidthMm = pageWidthMm - marginMm * 2;
  const usableHeightMm = pageHeightMm - marginMm * 2;
  const imgWidthPx = img.naturalWidth;
  const imgHeightPx = img.naturalHeight;
  const pxPerMm = imgWidthPx / usableWidthMm;
  const pageHeightPx = Math.max(1, Math.floor(usableHeightMm * pxPerMm));

  if (imgHeightPx <= pageHeightPx) {
    pdf.addImage(dataUrl, 'PNG', marginMm, marginMm, usableWidthMm, imgHeightPx / pxPerMm, undefined, 'FAST');
  } else {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('تعذر تهيئة الرسم لتقسيم صفحات PDF');

    let offsetY = 0;
    let pageIndex = 0;
    while (offsetY < imgHeightPx) {
      const sliceHeight = Math.min(pageHeightPx, imgHeightPx - offsetY);
      canvas.width = imgWidthPx;
      canvas.height = sliceHeight;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, imgWidthPx, sliceHeight);
      ctx.drawImage(img, 0, offsetY, imgWidthPx, sliceHeight, 0, 0, imgWidthPx, sliceHeight);
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', marginMm, marginMm, usableWidthMm, sliceHeight / pxPerMm, undefined, 'FAST');
      offsetY += sliceHeight;
      pageIndex += 1;
    }
  }

  const safeFileName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const pdfBytes = new Uint8Array(pdf.output('arraybuffer'));
    const base64Data = bytesToBase64(pdfBytes);
    const saved = await Filesystem.writeFile({
      path: safeFileName,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });
    const fileUri = await Filesystem.getUri({
      directory: Directory.Cache,
      path: safeFileName,
    });
    await Share.share({
      title: 'تقرير ضغط الدم',
      text: 'ملف تقرير ضغط الدم بصيغة PDF',
      url: fileUri.uri || saved.uri,
      dialogTitle: 'حفظ أو مشاركة تقرير PDF',
    });
    return;
  }

  const blob = pdf.output('blob');
  const pdfFile = new File([blob], safeFileName, { type: 'application/pdf' });
  if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
    await navigator.share({ files: [pdfFile], title: 'تقرير ضغط الدم', text: 'ملف تقرير ضغط الدم بصيغة PDF' });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}
