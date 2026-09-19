import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useFileManager } from '@/context/FileManagerContext';
import { toolById, type Tool } from '@/lib/toolCatalog';
import { convert, type ConversionKind } from '@/lib/conversionService';
import {
  addPageNumbers,
  addWatermark,
  imagesToPdf,
  mergePdfs,
  pageCount,
  rotatePdf,
  signPdf,
  splitPdf,
} from '@/lib/pdfTools';

type Picked = { name: string; mimeType: string | null; uri: string };
type Stroke = { x: number; y: number }[];

const PDF_TYPES = ['application/pdf'];
const IMAGE_TYPES = ['image/jpeg', 'image/png'];

async function pick(types: string[], multiple: boolean): Promise<Picked[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: types,
    multiple,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  // Bytes are read when a tool actually needs them. Reading a large PDF here
  // made choosing a file feel like the app had hung.
  return result.assets.map((asset) => ({
    name: asset.name,
    mimeType: asset.mimeType ?? null,
    uri: asset.uri,
  }));
}

const SERVER_KINDS: Record<string, ConversionKind> = {
  'pdf-word': 'pdf-to-word',
  'word-pdf': 'word-to-pdf',
  compress: 'compress',
};

const WORD_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
];

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

async function blobToBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(blob);
  });
}

export default function ToolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tool = toolById(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { saveGeneratedFile, saveFileFromUri } = useFileManager();

  const [files, setFiles] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ label: string; fraction: number | null } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pages, setPages] = useState<number | null>(null);

  // Tool-specific inputs.
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [ranges, setRanges] = useState('1-1');
  const [turns, setTurns] = useState(1);
  const [signPage, setSignPage] = useState('1');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const current = useRef<Stroke>([]);
  const canvas = useRef({ width: 1, height: 1 });
  // Bytes are read once per file and kept, so running a tool twice does not
  // re-read the whole document.
  const bytes = useRef(new Map<string, string>());

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          current.current = [
            { x: locationX / canvas.current.width, y: locationY / canvas.current.height },
          ];
          setStrokes((prev) => [...prev, current.current]);
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          current.current.push({
            x: locationX / canvas.current.width,
            y: locationY / canvas.current.height,
          });
          setStrokes((prev) => [...prev.slice(0, -1), [...current.current]]);
        },
      }),
    [],
  );

  if (!tool) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>That tool does not exist.</Text>
      </View>
    );
  }

  const reset = () => {
    setStatus(null);
    setProblem(null);
    setProgress(null);
  };

  const readBytes = async (file: Picked): Promise<string> => {
    const cached = bytes.current.get(file.uri);
    if (cached) return cached;

    // expo-file-system has no readAsStringAsync on web, where the picker hands
    // back a blob URL instead of a path.
    const base64 =
      Platform.OS === 'web'
        ? await blobToBase64(file.uri)
        : await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

    bytes.current.set(file.uri, base64);
    return base64;
  };

  const serverKind = SERVER_KINDS[tool.id];

  const choose = async (types: string[], multiple: boolean) => {
    reset();
    setPages(null);
    try {
      const picked = await pick(types, multiple);
      if (picked.length === 0) return;
      setFiles(picked);

      // Page count is only worth the read for the tools that show it, and it
      // runs after the file is on screen so choosing stays instant.
      if (types === PDF_TYPES && !serverKind && (tool.id === 'split' || tool.id === 'sign')) {
        readBytes(picked[0])
          .then(pageCount)
          .then((count) => {
            setPages(count);
            if (tool.id === 'split') setRanges(`1-${count}`);
          })
          .catch(() => undefined);
      }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That file could not be read.');
    }
  };

  const finish = async (base64: string, name: string) => {
    const saved = await saveGeneratedFile(base64, name, 'application/pdf');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatus(saved ? `Saved “${name}” to your files.` : 'Could not save the result.');
  };

  const run = async () => {
    if (busy) return;
    reset();
    setBusy(true);
    try {
      if (serverKind) {
        const result = await convert(
          { uri: files[0].uri, name: files[0].name, mimeType: files[0].mimeType },
          serverKind,
          (stage, fraction) =>
            setProgress({
              label:
                stage === 'starting'
                  ? 'Starting'
                  : stage === 'uploading'
                    ? 'Uploading'
                    : stage === 'converting'
                      ? 'Converting'
                      : 'Downloading',
              fraction,
            }),
        );
        const saved = await saveFileFromUri(result.uri, result.name, result.mimeType);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStatus(saved ? `Saved “${result.name}” to your files.` : 'Could not save the result.');
        return;
      }

      switch (tool.id) {
        case 'merge': {
          setProgress({ label: 'Merging', fraction: null });
          const sources = [];
          for (const file of files) sources.push(await readBytes(file));
          const out = await mergePdfs(sources);
          await finish(out, `${baseName(files[0].name)} merged.pdf`);
          break;
        }
        case 'split': {
          const parsed = ranges
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => {
              const [start, end] = part.split('-').map((n) => Number(n.trim()));
              return { start, end: Number.isFinite(end) ? end : start };
            });
          if (parsed.some((r) => !Number.isFinite(r.start) || !Number.isFinite(r.end))) {
            throw new Error('Write ranges like 1-3, 4-6.');
          }
          setProgress({ label: 'Splitting', fraction: null });
          const outs = await splitPdf(await readBytes(files[0]), parsed);
          for (const [index, out] of outs.entries()) {
            await saveGeneratedFile(
              out,
              `${baseName(files[0].name)} part ${index + 1}.pdf`,
              'application/pdf',
            );
          }
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStatus(`Saved ${outs.length} file${outs.length === 1 ? '' : 's'} to your files.`);
          break;
        }
        case 'rotate': {
          setProgress({ label: 'Rotating', fraction: null });
          const out = await rotatePdf(await readBytes(files[0]), turns);
          await finish(out, `${baseName(files[0].name)} rotated.pdf`);
          break;
        }
        case 'pages': {
          setProgress({ label: 'Numbering pages', fraction: null });
          const out = await addPageNumbers(await readBytes(files[0]));
          await finish(out, `${baseName(files[0].name)} numbered.pdf`);
          break;
        }
        case 'watermark': {
          setProgress({ label: 'Adding watermark', fraction: null });
          const out = await addWatermark(await readBytes(files[0]), watermarkText);
          await finish(out, `${baseName(files[0].name)} watermarked.pdf`);
          break;
        }
        case 'img-pdf': {
          setProgress({ label: 'Building PDF', fraction: null });
          const images = [];
          for (const file of files) {
            images.push({
              base64: await readBytes(file),
              mimeType: file.mimeType ?? 'image/jpeg',
            });
          }
          const out = await imagesToPdf(images);
          await finish(out, `${baseName(files[0].name)}.pdf`);
          break;
        }
        case 'sign': {
          const page = Number(signPage);
          if (!Number.isFinite(page) || page < 1) throw new Error('Pick a page number.');
          setProgress({ label: 'Signing', fraction: null });
          const out = await signPdf(await readBytes(files[0]), strokes, {
            page,
            x: 0.58,
            y: 0.86,
            width: 0.32,
            height: 0.08,
          });
          await finish(out, `${baseName(files[0].name)} signed.pdf`);
          break;
        }
        default:
          break;
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setProblem(error instanceof Error ? error.message : 'That did not work.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const needsImages = tool.id === 'img-pdf';
  const needsWord = tool.id === 'word-pdf';
  const wantsMany = tool.id === 'merge' || needsImages;
  const canRun =
    files.length > 0 &&
    (tool.id !== 'merge' || files.length >= 2) &&
    (tool.id !== 'sign' || strokes.length > 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{tool.title}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.hero, { backgroundColor: tool.wash, borderColor: `${tool.ink}26` }]}>
          <Text style={[styles.heroText, { color: '#101D41' }]}>{tool.blurb}</Text>
        </View>

        {!tool.onDevice && !tool.viaServer ? (
          <View style={[styles.note, { backgroundColor: colors.card }]}>
            <Feather name="alert-circle" size={18} color={colors.mutedForeground} />
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{tool.needs}</Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() =>
                choose(
                  needsImages ? IMAGE_TYPES : needsWord ? WORD_TYPES : PDF_TYPES,
                  wantsMany,
                )
              }
              style={[styles.primary, { backgroundColor: colors.navy }]}
            >
              <Feather name="upload" size={16} color="#FFFFFF" />
              <Text style={styles.primaryText}>
                {needsImages
                  ? 'Choose images'
                  : needsWord
                    ? 'Choose a document'
                    : wantsMany
                      ? 'Choose PDFs'
                      : 'Choose a PDF'}
              </Text>
            </Pressable>

            {files.length > 0 ? (
              <View style={[styles.files, { backgroundColor: colors.card }]}>
                {files.map((file, index) => (
                  <Text
                    key={`${file.name}-${index}`}
                    style={[styles.fileName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {index + 1}. {file.name}
                  </Text>
                ))}
                {pages !== null && !needsImages ? (
                  <Text style={[styles.pageCount, { color: colors.mutedForeground }]}>
                    {pages} page{pages === 1 ? '' : 's'}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {tool.id === 'watermark' && files.length > 0 ? (
              <TextInput
                value={watermarkText}
                onChangeText={setWatermarkText}
                placeholder="Watermark text"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
              />
            ) : null}

            {tool.id === 'split' && files.length > 0 ? (
              <>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Page ranges, like 1-3, 4-6
                </Text>
                <TextInput
                  value={ranges}
                  onChangeText={setRanges}
                  placeholder="1-3, 4-6"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
                />
              </>
            ) : null}

            {tool.id === 'rotate' && files.length > 0 ? (
              <View style={styles.row}>
                {[1, 2, 3].map((quarter) => (
                  <Pressable
                    key={quarter}
                    onPress={() => setTurns(quarter)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: turns === quarter ? colors.navy : colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: turns === quarter ? '#FFFFFF' : colors.foreground,
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      {quarter * 90}°
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {tool.id === 'sign' && files.length > 0 ? (
              <>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Draw your signature
                </Text>
                <View
                  {...responder.panHandlers}
                  onLayout={(event) => {
                    canvas.current = {
                      width: event.nativeEvent.layout.width,
                      height: event.nativeEvent.layout.height,
                    };
                  }}
                  style={[styles.pad, { backgroundColor: colors.card }]}
                >
                  <Svg style={StyleSheet.absoluteFill}>
                    {strokes.map((stroke, index) => (
                      <Path
                        key={index}
                        d={stroke
                          .map(
                            (point, i) =>
                              `${i === 0 ? 'M' : 'L'} ${point.x * canvas.current.width} ${
                                point.y * canvas.current.height
                              }`,
                          )
                          .join(' ')}
                        stroke="#10243D"
                        strokeWidth={2.4}
                        strokeLinecap="round"
                        fill="none"
                      />
                    ))}
                  </Svg>
                </View>
                <View style={styles.row}>
                  <Pressable
                    onPress={() => setStrokes([])}
                    style={[styles.chip, { backgroundColor: colors.card }]}
                  >
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
                      Clear
                    </Text>
                  </Pressable>
                  <TextInput
                    value={signPage}
                    onChangeText={setSignPage}
                    keyboardType="number-pad"
                    style={[
                      styles.input,
                      styles.pageInput,
                      { backgroundColor: colors.card, color: colors.foreground },
                    ]}
                  />
                  <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>
                    page
                  </Text>
                </View>
              </>
            ) : null}

            <Pressable
              onPress={run}
              disabled={!canRun || busy}
              style={[
                styles.primary,
                {
                  // While working the button keeps a solid colour: a muted grey
                  // with a white spinner on it read as nothing at all.
                  backgroundColor: busy
                    ? colors.navy
                    : canRun
                      ? colors.primary
                      : colors.muted,
                  marginTop: 18,
                },
              ]}
            >
              {busy ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.primaryText}>
                    {progress ? `${progress.label}…` : 'Working…'}
                  </Text>
                </>
              ) : (
                <>
                  <Feather
                    name="check"
                    size={16}
                    color={canRun ? '#FFFFFF' : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.primaryText,
                      { color: canRun ? '#FFFFFF' : colors.mutedForeground },
                    ]}
                  >
                    Run {tool.title}
                  </Text>
                </>
              )}
            </Pressable>

            {busy && progress ? (
              <View style={[styles.progress, { backgroundColor: colors.card }]}>
                <View style={styles.progressTop}>
                  <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                    {progress.label}…
                  </Text>
                  {progress.fraction !== null ? (
                    <Text style={[styles.progressPercent, { color: colors.mutedForeground }]}>
                      {Math.round(progress.fraction * 100)}%
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.track, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        backgroundColor: colors.primary,
                        // Nothing to measure during the server's own work, so
                        // the bar sits at a third rather than pretending.
                        width: `${Math.round((progress.fraction ?? 0.33) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}
          </>
        )}

        {status && !busy ? (
          <View style={[styles.result, { backgroundColor: colors.accent }]}>
            <Feather name="check-circle" size={16} color={colors.accentForeground} />
            <Text style={[styles.resultText, { color: colors.accentForeground }]}>{status}</Text>
          </View>
        ) : null}

        {problem ? (
          <View style={[styles.result, { backgroundColor: '#FDECEC' }]}>
            <Feather name="alert-triangle" size={16} color="#B23B3B" />
            <Text style={[styles.resultText, { color: '#B23B3B' }]}>{problem}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10 },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  hero: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  heroText: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_500Medium' },
  note: { flexDirection: 'row', gap: 10, borderRadius: 16, padding: 16 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  files: { borderRadius: 14, padding: 14, marginTop: 14, gap: 4 },
  fileName: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  pageCount: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  label: { fontSize: 12, marginTop: 16, marginBottom: 6, fontFamily: 'Inter_500Medium' },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginTop: 12,
    fontFamily: 'Inter_500Medium',
  },
  pageInput: { width: 70, textAlign: 'center', marginTop: 12 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center' },
  chip: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  pad: { height: 170, borderRadius: 16, overflow: 'hidden' },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  resultText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  progress: { borderRadius: 14, padding: 14, marginTop: 12, gap: 10 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  progressPercent: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
