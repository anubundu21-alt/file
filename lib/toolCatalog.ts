/**
 * The tool set from Scanella's "All tools" screen, ported to Sift.
 *
 * Titles, order and colours are Scanella's. What changes is how each tool runs:
 * Scanella rasterizes pages natively and sends the heavy conversions to a
 * hosted iLovePDF proxy. Sift runs in Expo Go, which has no rasterizer and no
 * backend configured, so the tools that only need the document structure run
 * here on device, and the ones that need an engine say so instead of pretending.
 */

export type ToolId =
  | 'pdf-word'
  | 'word-pdf'
  | 'img-pdf'
  | 'compress'
  | 'merge'
  | 'jpg'
  | 'split'
  | 'pages'
  | 'watermark'
  | 'rotate'
  | 'unlock'
  | 'sign'
  | 'extract';

export type Tool = {
  id: ToolId;
  title: string;
  /** Card background in light mode. */
  wash: string;
  /** Card accent, and the card tint in dark mode. */
  ink: string;
  /** What the tool does, shown on its own screen. */
  blurb: string;
  /** False when it needs an engine Expo Go does not have. */
  onDevice: boolean;
  /** Why it cannot run here, for the tools that cannot. */
  needs?: string;
};

export const tools: Tool[] = [
  {
    id: 'pdf-word',
    title: 'PDF to Word',
    wash: '#EDF3FF',
    ink: '#2F6FED',
    blurb: 'Turn a PDF into an editable Word document.',
    onDevice: false,
    needs:
      'Keeping the text and layout through this conversion needs a document engine no phone ships with, so it runs on a server.',
  },
  {
    id: 'word-pdf',
    title: 'Word to PDF',
    wash: '#EDF3FF',
    ink: '#2F6FED',
    blurb: 'Turn a DOC, DOCX, ODT or RTF into a PDF.',
    onDevice: false,
    needs:
      'Rendering a Word file faithfully needs a document engine no phone ships with, so it runs on a server.',
  },
  {
    id: 'img-pdf',
    title: 'Image to PDF',
    wash: '#E7F5FE',
    ink: '#0EA5E9',
    blurb: 'Pick JPG or PNG photos and get one PDF, a page per picture.',
    onDevice: true,
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    wash: '#F1EDFF',
    ink: '#7C5CFF',
    blurb: 'Make a PDF smaller without wrecking how it reads.',
    onDevice: false,
    needs:
      'Real compression resamples the images and fonts inside the file, which needs an engine no phone ships with.',
  },
  {
    id: 'merge',
    title: 'Merge PDF',
    wash: '#F1EDFF',
    ink: '#7C5CFF',
    blurb: 'Put two or more PDFs together, in the order you pick them.',
    onDevice: true,
  },
  {
    id: 'jpg',
    title: 'PDF to JPG',
    wash: '#E7F5FE',
    ink: '#0EA5E9',
    blurb: 'Get one picture per page of a PDF.',
    onDevice: false,
    needs:
      'This has to paint each page into a picture, and Expo Go has no PDF renderer. It needs a development build.',
  },
  {
    id: 'split',
    title: 'Split PDF',
    wash: '#FFE9EE',
    ink: '#F43F5E',
    blurb: 'Cut a PDF into separate documents by page range.',
    onDevice: true,
  },
  {
    id: 'pages',
    title: 'Page numbers',
    wash: '#F1EDFF',
    ink: '#7C5CFF',
    blurb: 'Number every page along the bottom.',
    onDevice: true,
  },
  {
    id: 'watermark',
    title: 'Watermark',
    wash: '#FFF5E0',
    ink: '#F59E0B',
    blurb: 'Lay your own text diagonally across every page.',
    onDevice: true,
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    wash: '#F1EDFF',
    ink: '#7C5CFF',
    blurb: 'Turn the pages upright, then save.',
    onDevice: true,
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    wash: '#E2F5F2',
    ink: '#0D9488',
    blurb: 'Remove the password from a PDF you can open.',
    onDevice: false,
    needs:
      'Stripping a password means decrypting the file, which needs the native PDF stack rather than Expo Go.',
  },
  {
    id: 'sign',
    title: 'Sign PDF',
    wash: '#E2F5F2',
    ink: '#0D9488',
    blurb: 'Draw your signature and place it on a page.',
    onDevice: true,
  },
  {
    id: 'extract',
    title: 'Extract text',
    wash: '#EDF3FF',
    ink: '#2F6FED',
    blurb: 'Read the text out of a picture.',
    onDevice: false,
    needs:
      'Text recognition runs on the phone’s own ML stack, which Expo Go does not expose. It needs a development build.',
  },
];

export function toolById(id: string | undefined): Tool | undefined {
  return tools.find((tool) => tool.id === id);
}
