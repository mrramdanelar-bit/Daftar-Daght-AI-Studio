import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Exports a rendered DOM report element (with native browser Arabic RTL shaping
 * and inline SVG charts) into a high-resolution multi-page A4 PDF file.
 */
export async function exportReportElementToPDF(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  // Ensure fonts are fully loaded before rasterizing
  if (document.fonts && document.fonts.ready) {
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

  // How many source pixels fit onto one A4 printable page height
  const pxPerMm = imgWidthPx / usableWidthMm;
  const pageHeightPx = Math.floor(usableHeightMm * pxPerMm);

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
    // Cleanly slice into multiple A4 pages using an offscreen canvas
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

  pdf.save(fileName);
}
