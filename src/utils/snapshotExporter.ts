import { toJpeg, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface SnapshotMetadata {
  title?: string;
  subtitle?: string;
  filterLabel?: string;
  totalCards?: number;
  highPriorityCount?: number;
  capturedAt?: string;
  dateStr?: string;
}

/**
 * Filter function to skip capturing interactive toolbars or floating modals that shouldn't appear in snapshots
 */
const defaultDomFilter = (node: HTMLElement) => {
  if (!node || !node.classList) return true;
  if (
    node.classList.contains('no-snapshot') ||
    node.classList.contains('snapshot-hide') ||
    node.getAttribute?.('data-no-snapshot') === 'true'
  ) {
    return false;
  }
  return true;
};

/**
 * Captures an HTML element and triggers a browser download as a high-resolution JPG image
 */
export async function downloadElementAsJpg(
  element: HTMLElement,
  filename: string = 'Parabolic_Rally_Stock_Cards',
  metadata?: SnapshotMetadata
): Promise<string> {
  const dateTag = metadata?.dateStr || new Date().toISOString().split('T')[0];
  const timeTag = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-');
  const cleanFilename = `${filename}_${dateTag}_${timeTag}.jpg`;

  const dataUrl = await toJpeg(element, {
    quality: 0.95,
    backgroundColor: '#0f172a', // Deep slate background to preserve dark theme aesthetics
    pixelRatio: 2, // High DPI for crisp stock cards text
    cacheBust: true,
    filter: defaultDomFilter as any
  });

  const link = document.createElement('a');
  link.download = cleanFilename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return dataUrl;
}

/**
 * Captures an HTML element and downloads a PDF document (either continuous sheet or multi-page A4)
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string = 'Parabolic_Rally_Stock_Cards',
  metadata?: SnapshotMetadata,
  pdfMode: 'continuous' | 'paginated_a4' = 'continuous'
): Promise<void> {
  const dateTag = metadata?.dateStr || new Date().toISOString().split('T')[0];
  const timeTag = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-');
  const cleanFilename = `${filename}_${dateTag}_${timeTag}.pdf`;

  // Render high-quality JPEG first
  const dataUrl = await toJpeg(element, {
    quality: 0.95,
    backgroundColor: '#0f172a',
    pixelRatio: 2,
    cacheBust: true,
    filter: defaultDomFilter as any
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (err) => reject(new Error('Failed to load captured image for PDF generation: ' + err));
  });

  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  if (pdfMode === 'continuous') {
    // 📄 Continuous Single-Sheet Canvas:
    // Guarantees zero awkward page splits that cut cards in half!
    const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [imgWidth, imgHeight],
      hotfixes: ['px_scaling']
    });

    pdf.addImage(dataUrl, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    pdf.save(cleanFilename);
  } else {
    // 📑 Paginated Multi-Page A4:
    // Suitable for physical printing or standard document viewers
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Scale so image width matches A4 width
    const pdfImgHeight = (imgHeight * pageWidth) / imgWidth;

    let heightLeft = pdfImgHeight;
    let position = 0;

    // First page
    pdf.addImage(dataUrl, 'JPEG', 0, position, pageWidth, pdfImgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // Successive pages
    while (heightLeft > 0) {
      position = position - pageHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'JPEG', 0, position, pageWidth, pdfImgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(cleanFilename);
  }
}
