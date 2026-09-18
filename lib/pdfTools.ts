/**
 * On-device PDF operations, ported from Scanella's tool set.
 *
 * Scanella rasterizes pages with PDFKit/PdfRenderer and rebuilds the document
 * from page pictures. Expo Go ships no PDF rasterizer, so these work on the
 * document structure instead (pdf-lib, pure JS). That keeps text and vectors
 * sharp rather than flattening every page to an image, and it means nothing
 * here needs a native module or a server.
 *
 * Everything is base64 in, base64 out, which is what expo-file-system reads and
 * writes.
 */

import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export type Base64 = string;

export type PageRange = { start: number; end: number };

async function load(base64: Base64) {
  try {
    return await PDFDocument.load(base64, { ignoreEncryption: false });
  } catch (error) {
    const message = String(error);
    if (message.includes('encrypted') || message.includes('Encrypted')) {
      throw new Error(
        'That PDF is password protected. Unlock it first — Unlock PDF needs a password and is not in this version.',
      );
    }
    throw new Error('That file could not be read as a PDF.');
  }
}

export async function pageCount(pdf: Base64): Promise<number> {
  return (await load(pdf)).getPageCount();
}

/** Merge PDF — several documents into one, in the order given. */
export async function mergePdfs(pdfs: Base64[]): Promise<Base64> {
  if (pdfs.length < 2) {
    throw new Error('Pick at least two PDFs to merge.');
  }
  const out = await PDFDocument.create();
  for (const pdf of pdfs) {
    const source = await load(pdf);
    const pages = await out.copyPages(source, source.getPageIndices());
    pages.forEach((page) => out.addPage(page));
  }
  return out.saveAsBase64();
}

/**
 * Split PDF — one document per range. Ranges are 1-based and inclusive, which
 * is how the page numbers read on screen.
 */
export async function splitPdf(pdf: Base64, ranges: PageRange[]): Promise<Base64[]> {
  const source = await load(pdf);
  const total = source.getPageCount();
  if (ranges.length === 0) {
    throw new Error('Choose at least one page range.');
  }

  const out: Base64[] = [];
  for (const range of ranges) {
    if (range.start < 1 || range.end > total || range.start > range.end) {
      throw new Error(
        `Pages ${range.start}-${range.end} are outside this PDF, which has ${total} page${total === 1 ? '' : 's'}.`,
      );
    }
    const doc = await PDFDocument.create();
    const indices = [];
    for (let i = range.start - 1; i <= range.end - 1; i += 1) indices.push(i);
    const pages = await doc.copyPages(source, indices);
    pages.forEach((page) => doc.addPage(page));
    out.push(await doc.saveAsBase64());
  }
  return out;
}

/** Rotate PDF — quarter turns clockwise, applied to every page. */
export async function rotatePdf(pdf: Base64, quarterTurns: number): Promise<Base64> {
  const doc = await load(pdf);
  const turns = ((quarterTurns % 4) + 4) % 4;
  doc.getPages().forEach((page) => {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + turns * 90) % 360));
  });
  return doc.saveAsBase64();
}

/** Page numbers — "3 / 12" centred in the bottom margin of every page. */
export async function addPageNumbers(pdf: Base64): Promise<Base64> {
  const doc = await load(pdf);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  pages.forEach((page, index) => {
    const label = `${index + 1} / ${pages.length}`;
    const size = 10;
    const width = font.widthOfTextAtSize(label, size);
    const { width: pageWidth } = page.getSize();
    page.drawText(label, {
      x: pageWidth / 2 - width / 2,
      y: 22,
      size,
      font,
      color: rgb(0.24, 0.29, 0.38),
    });
  });

  return doc.saveAsBase64();
}

/** Watermark — one diagonal line of text across the middle of every page. */
export async function addWatermark(pdf: Base64, text: string): Promise<Base64> {
  const label = text.trim();
  if (!label) throw new Error('Type the watermark text first.');

  const doc = await load(pdf);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    // Size the text to the page so it reads the same on A4 and on a receipt.
    const size = Math.min(width, height) / Math.max(6, label.length * 0.62);
    const textWidth = font.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: width / 2 - (textWidth / 2) * Math.cos(Math.PI / 6),
      y: height / 2 - (textWidth / 2) * Math.sin(Math.PI / 6),
      size,
      font,
      color: rgb(0.45, 0.45, 0.5),
      rotate: degrees(30),
      opacity: 0.22,
    });
  });

  return doc.saveAsBase64();
}

export type ImageInput = { base64: Base64; mimeType: string };

/** Image to PDF — one page per picture, sized to the picture. */
export async function imagesToPdf(images: ImageInput[]): Promise<Base64> {
  if (images.length === 0) throw new Error('Pick at least one image.');

  const doc = await PDFDocument.create();
  for (const image of images) {
    const isPng = /png/i.test(image.mimeType);
    const embedded = isPng
      ? await doc.embedPng(image.base64)
      : await doc.embedJpg(image.base64);
    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    });
  }
  return doc.saveAsBase64();
}

export type SignaturePlacement = {
  /** Page to sign, 1-based. */
  page: number;
  /** Where the signature box sits, 0..1 of the page, origin top-left. */
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Sign PDF — the drawn strokes go in as vectors, not a flattened picture, so
 * the signature stays crisp at any zoom and the rest of the page is untouched.
 * Strokes are normalized 0..1 points within the signature box.
 */
export async function signPdf(
  pdf: Base64,
  strokes: { x: number; y: number }[][],
  placement: SignaturePlacement,
): Promise<Base64> {
  if (strokes.length === 0) throw new Error('Draw your signature first.');

  const doc = await load(pdf);
  const pages = doc.getPages();
  const index = placement.page - 1;
  if (index < 0 || index >= pages.length) {
    throw new Error(`This PDF has ${pages.length} page${pages.length === 1 ? '' : 's'}.`);
  }

  const page = pages[index];
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const boxWidth = placement.width * pageWidth;
  const boxHeight = placement.height * pageHeight;
  const boxX = placement.x * pageWidth;
  // PDF coordinates start at the bottom; the placement comes from a screen.
  const boxTop = pageHeight - placement.y * pageHeight;

  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i += 1) {
      const from = stroke[i - 1];
      const to = stroke[i];
      page.drawLine({
        start: { x: boxX + from.x * boxWidth, y: boxTop - from.y * boxHeight },
        end: { x: boxX + to.x * boxWidth, y: boxTop - to.y * boxHeight },
        thickness: 1.6,
        color: rgb(0.06, 0.14, 0.25),
        opacity: 1,
      });
    }
  }

  return doc.saveAsBase64();
}
