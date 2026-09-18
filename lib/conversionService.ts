/**
 * Client for the conversion backend Scanella uses.
 *
 * PDF to Word, Word to PDF and Compress need a document engine no phone ships
 * with, so they run through the same hosted endpoints Scanella talks to. The
 * file never passes through that backend: it hands back an upload URL and a
 * token, the file goes straight to the conversion service, and the result comes
 * straight back.
 *
 *   POST /api/ilove/start    {kind, filename}  -> {token, server, task, tool, uploadUrl}
 *   POST <uploadUrl>         multipart task+file -> {server_filename}
 *   POST /api/ilove/process  {kind, token, …}  -> {downloadUrl}
 *   GET  <downloadUrl>       Bearer token      -> the finished file
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/** Override with EXPO_PUBLIC_CONVERT_API to point at your own deployment. */
export const CONVERT_API =
  process.env.EXPO_PUBLIC_CONVERT_API ?? 'https://pdf-palette-2.vercel.app';

export type ConversionKind = 'pdf-to-word' | 'word-to-pdf' | 'compress';

export type ConversionSource = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

export type ConversionResult = {
  uri: string;
  name: string;
  mimeType: string;
};

export type Progress = (stage: 'starting' | 'uploading' | 'converting' | 'downloading') => void;

const RESULT: Record<ConversionKind, { extension: string; mimeType: string }> = {
  'pdf-to-word': {
    extension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  'word-to-pdf': { extension: 'pdf', mimeType: 'application/pdf' },
  compress: { extension: 'pdf', mimeType: 'application/pdf' },
};

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
};

export class ConversionError extends Error {}

function extensionOf(name: string): string {
  const match = /\.([^.]+)$/.exec(name);
  return match ? match[1].toLowerCase() : '';
}

function mimeFor(source: ConversionSource): string {
  return source.mimeType || MIME_BY_EXTENSION[extensionOf(source.name)] || 'application/octet-stream';
}

function resultName(sourceName: string, kind: ConversionKind): string {
  const base = sourceName.replace(/\.[^.]+$/, '');
  return `${base}.${RESULT[kind].extension}`;
}

async function postJson(url: string, body: unknown): Promise<Record<string, any>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ConversionError(
      'Could not reach the converter. Check your connection and try again.',
    );
  }
  const text = await response.text();
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ConversionError('The converter sent back something we could not read.');
  }
  if (!response.ok) {
    throw new ConversionError(
      parsed.reason || parsed.message || `The converter refused the job (${response.status}).`,
    );
  }
  return parsed;
}

export async function convert(
  source: ConversionSource,
  kind: ConversionKind,
  onProgress?: Progress,
): Promise<ConversionResult> {
  const finishedName = resultName(source.name, kind);

  // 1. Open a job.
  onProgress?.('starting');
  const job = await postJson(`${CONVERT_API}/api/ilove/start`, {
    kind,
    filename: source.name,
  });
  if (job.engine && job.engine !== 'ilovepdf') {
    throw new ConversionError(job.reason || 'Converting is not available right now.');
  }
  const token: string | undefined = job.token;
  const task: string | undefined = job.task;
  const uploadUrl: string | undefined = job.uploadUrl ?? job.upload_url;
  if (!token || !task || !uploadUrl) {
    throw new ConversionError('The converter sent back something we could not read.');
  }

  // 2. Send the file straight to the conversion service.
  onProgress?.('uploading');
  const form = new FormData();
  form.append('task', task);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(source.uri)).blob();
    form.append('file', blob, source.name);
  } else {
    form.append('file', {
      uri: source.uri,
      name: source.name,
      type: mimeFor(source),
    } as unknown as Blob);
  }

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ConversionError('The upload did not finish. Check your connection and try again.');
  }
  const uploadBody = await uploadResponse.json().catch(() => ({}) as Record<string, any>);
  const serverFilename: string | undefined =
    uploadBody.server_filename ?? uploadBody.serverFilename;
  if (!uploadResponse.ok || !serverFilename) {
    throw new ConversionError('The converter did not accept that file.');
  }

  // 3. Convert.
  onProgress?.('converting');
  const processed = await postJson(`${CONVERT_API}/api/ilove/process`, {
    kind,
    token,
    server: job.server,
    task,
    tool: job.tool ?? kind,
    files: [{ serverFilename, filename: source.name }],
    serverFilename,
    filename: finishedName,
  });
  if (processed.engine && processed.engine !== 'ilovepdf') {
    throw new ConversionError(processed.reason || 'Converting failed. Try again.');
  }
  const downloadUrl: string | undefined = processed.downloadUrl ?? processed.download_url;
  if (!downloadUrl) {
    throw new ConversionError('The converter sent back something we could not read.');
  }

  // 4. Bring the result back.
  onProgress?.('downloading');
  const downloadToken: string = processed.token ?? token;
  const name: string = processed.filename ?? finishedName;
  const target = `${FileSystem.cacheDirectory ?? ''}${Date.now()}-${name.replace(/[^\w.\-]+/g, '_')}`;

  if (Platform.OS === 'web') {
    const response = await fetch(downloadUrl, {
      headers: { authorization: `Bearer ${downloadToken}` },
    });
    if (!response.ok) throw new ConversionError('The finished file could not be downloaded.');
    const blob = await response.blob();
    return { uri: URL.createObjectURL(blob), name, mimeType: RESULT[kind].mimeType };
  }

  const download = await FileSystem.downloadAsync(downloadUrl, target, {
    headers: { authorization: `Bearer ${downloadToken}` },
  });
  if (download.status !== 200) {
    throw new ConversionError('The finished file could not be downloaded.');
  }
  return { uri: download.uri, name, mimeType: RESULT[kind].mimeType };
}
