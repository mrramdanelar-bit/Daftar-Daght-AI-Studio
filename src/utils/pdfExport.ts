import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Export a rendered report to PDF.
 * On Android/WebView, use the native share sheet when PDF file sharing is supported.
 * Fall back to a normal browser download on platforms without file sharing.
 */
export async function exportReportElementToPDF(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

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
    const renderedHeightMm = imgHeightPx / pxPerMm;
    pdf.addImage(
      dataUrl,
      'PNG',
      marginMm,
      marginMm,
      usableWidthMm,
      renderedHeightMm,
      undefined,
      'FAST'
    );
  } else {
    const sliceCanvas = document.createElement('canvas');
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('تعذر تهيئة الرسم لتقسيم صفحات PDF');
    }

    let offsetY = 0;
    let pageIndex = 0;

    while (offsetY < imgHeightPx) {
      const sliceHeight = Math.min(pageHeightPx, imgHeightPx - offsetY);
      sliceCanvas.width = imgWidthPx;
      sliceCanvas.height = sliceHeight;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, imgWidthPx, sliceHeight);
      ctx.drawImage(
        img,
        0,
        offsetY,
        imgWidthPx,
        sliceHeight,
        0,
        0,
        imgWidthPx,
        sliceHeight
      );

      const sliceDataUrl = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm = sliceHeight / pxPerMm;

      if (pageIndex > 0) {
        pdf.addPage();
      }
      pdf.addImage(
        sliceDataUrl,
        'PNG',
        marginMm,
        marginMm,
        usableWidthMm,
        sliceHeightMm,
        undefined,
        'FAST'
      );

      offsetY += sliceHeight;
      pageIndex += 1;
    }
  }

  const safeFileName = fileName.toLowerCase().endsWith('.pdf')
    ? fileName
    : `${fileName}.pdf`;
  const blob = pdf.output('blob');
  const pdfFile = new File([blob], safeFileName, { type: 'application/pdf' });

  // Android Chrome/WebView can present the native share sheet, including Save to Files.
  try {
    const shareData = {
      files: [pdfFile],
      title: 'تقرير ضغط الدم',
      text: 'ملف تقرير ضغط الدم بصيغة PDF',
    };

    if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
      await navigator.share(shareData);
      return;
    }
  } catch (error) {
    // A user cancellation should not trigger a second download attempt.
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }
    throw new Error('تعذرت مشاركة ملف PDF. حاول مرة أخرى أو استخدم متصفح Chrome.');
  }

  // Standard browser fallback.
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}
