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

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const CONTENT_HEIGHT = 1018;

type PdfPage = {
  page: HTMLDivElement;
  content: HTMLDivElement;
};

function createPage(host: HTMLDivElement, pageNumber: number): PdfPage {
  const page = document.createElement('div');
  page.style.cssText = `
    position:relative;width:${PAGE_WIDTH}px;height:${PAGE_HEIGHT}px;
    box-sizing:border-box;padding:34px 38px 66px;background:#fff;
    color:#0f172a;direction:rtl;overflow:hidden;
    font-family:"IBM Plex Sans Arabic",Arial,sans-serif;
  `;
  const content = document.createElement('div');
  content.style.cssText = `width:100%;height:${CONTENT_HEIGHT}px;overflow:hidden;box-sizing:border-box;`;
  const footer = document.createElement('div');
  footer.style.cssText = `
    position:absolute;bottom:25px;left:38px;right:38px;
    border-top:1px solid #e2e8f0;padding-top:9px;
    display:flex;justify-content:space-between;align-items:center;
    color:#64748b;font-size:10px;direction:rtl;
    font-family:"IBM Plex Sans Arabic",Arial,sans-serif;
  `;
  footer.innerHTML = '<span>نبض | تقرير متابعة ضغط الدم</span><span>صفحة ' + pageNumber + '</span>';
  page.append(content, footer);
  host.appendChild(page);
  return { page, content };
}

function fits(content: HTMLElement): boolean {
  return content.scrollHeight <= CONTENT_HEIGHT + 1;
}

function appendTableSection(
  section: HTMLElement,
  current: PdfPage,
  host: HTMLDivElement,
  pages: PdfPage[]
): PdfPage {
  const heading = section.querySelector('h2');
  const originalTable = section.querySelector('table');
  if (!heading || !originalTable) {
    const clone = section.cloneNode(true) as HTMLElement;
    current.content.appendChild(clone);
    if (!fits(current.content)) {
      current.content.removeChild(clone);
      current = createPage(host, pages.length + 1);
      pages.push(current);
      current.content.appendChild(clone);
    }
    return current;
  }

  let table = originalTable.cloneNode(false) as HTMLTableElement;
  const thead = originalTable.querySelector('thead');
  if (thead) table.appendChild(thead.cloneNode(true));
  const tbody = document.createElement('tbody');
  tbody.className = originalTable.querySelector('tbody')?.className || '';
  table.appendChild(tbody);

  let sectionClone = document.createElement('section');
  sectionClone.className = section.className;
  const headingClone = heading.cloneNode(true) as HTMLElement;
  sectionClone.append(headingClone, table);
  current.content.appendChild(sectionClone);

  const rows = Array.from(originalTable.querySelectorAll('tbody tr'));
  for (const row of rows) {
    const rowClone = row.cloneNode(true) as HTMLTableRowElement;
    tbody.appendChild(rowClone);
    if (!fits(current.content)) {
      tbody.removeChild(rowClone);
      if (tbody.children.length > 0) {
        current = createPage(host, pages.length + 1);
        pages.push(current);
        table = originalTable.cloneNode(false) as HTMLTableElement;
        if (thead) table.appendChild(thead.cloneNode(true));
        const nextBody = document.createElement('tbody');
        nextBody.className = originalTable.querySelector('tbody')?.className || '';
        table.appendChild(nextBody);
        sectionClone = document.createElement('section');
        sectionClone.className = section.className;
        const continuedHeading = heading.cloneNode(true) as HTMLElement;
        continuedHeading.textContent = (heading.textContent || 'السجل التفصيلي') + ' — تابع';
        sectionClone.append(continuedHeading, table);
        current.content.appendChild(sectionClone);
        nextBody.appendChild(rowClone);
      } else {
        // A single unusually tall row is kept intact rather than clipped.
        tbody.appendChild(rowClone);
      }
    }
  }
  return current;
}

function buildPaginatedPages(element: HTMLElement): { host: HTMLDivElement; pages: PdfPage[] } {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;z-index:-1;background:#fff;';
  document.body.appendChild(host);

  const pages: PdfPage[] = [createPage(host, 1)];
  let current = pages[0];
  const blocks = Array.from(element.children) as HTMLElement[];

  for (const block of blocks) {
    if (block.querySelector('table')) {
      current = appendTableSection(block, current, host, pages);
      continue;
    }

    const clone = block.cloneNode(true) as HTMLElement;
    current.content.appendChild(clone);
    if (!fits(current.content)) {
      current.content.removeChild(clone);
      current = createPage(host, pages.length + 1);
      pages.push(current);
      current.content.appendChild(clone);
    }
  }

  pages.forEach((item, index) => {
    const number = item.page.querySelector('div:last-child span:last-child');
    if (number) number.textContent = `صفحة ${index + 1} من ${pages.length}`;
  });
  return { host, pages };
}

export async function exportReportElementToPDF(
  element: HTMLElement,
  fileName: string,
  action: 'download' | 'print' = 'download'
): Promise<void> {
  if (document.fonts?.ready) await document.fonts.ready;

  const { host, pages } = buildPaginatedPages(element);
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let index = 0; index < pages.length; index++) {
      const pageImage = await toPng(pages[index].page, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      if (index > 0) pdf.addPage();
      pdf.addImage(pageImage, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const safeFileName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

    if (Capacitor.isNativePlatform()) {
      const pdfBytes = new Uint8Array(pdf.output('arraybuffer'));
      const saved = await Filesystem.writeFile({
        path: safeFileName,
        data: bytesToBase64(pdfBytes),
        directory: Directory.Cache,
        recursive: true,
      });
      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: safeFileName,
      });
      await Share.share({
        title: action === 'print' ? 'طباعة تقرير ضغط الدم' : 'تقرير ضغط الدم بصيغة PDF',
        text: action === 'print'
          ? 'اختر تطبيق الطباعة لطباعة التقرير، أو اختر حفظه بصيغة PDF.'
          : 'اختر مكاناً لحفظ تقرير ضغط الدم أو تطبيقاً لمشاركته.',
        url: fileUri.uri || saved.uri,
        dialogTitle: action === 'print' ? 'طباعة أو حفظ التقرير' : 'حفظ أو مشاركة تقرير PDF',
      });
      return;
    }

    const blob = pdf.output('blob');
    const pdfFile = new File([blob], safeFileName, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
      await navigator.share({
        files: [pdfFile],
        title: action === 'print' ? 'طباعة تقرير ضغط الدم' : 'تقرير ضغط الدم',
        text: 'ملف تقرير ضغط الدم بصيغة PDF',
      });
      return;
    }

    const url = URL.createObjectURL(blob);
    if (action === 'print') {
      const opened = window.open(url, '_blank');
      if (!opened) {
        const link = document.createElement('a');
        link.href = url;
        link.download = safeFileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = safeFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  } finally {
    host.remove();
  }
}
