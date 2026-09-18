import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
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

type Picked = { name: string; base64: string; mimeType: string | null };
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
  const picked: Picked[] = [];
  for (const asset of result.assets) {
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    picked.push({ name: asset.name, base64, mimeType: asset.mimeType ?? null });
  }
  return picked;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export default function ToolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tool = toolById(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { saveGeneratedFile } = useFileManager();

  const [files, setFiles] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
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
  };

  const choose = async (types: string[], multiple: boolean) => {
    reset();
    try {
      const picked = await pick(types, multiple);
      if (picked.length === 0) return;
      setFiles(picked);
      if (types === PDF_TYPES) {
        const count = await pageCount(picked[0].base64);
        setPages(count);
        if (tool.id === 'split') setRanges(`1-${count}`);
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
      switch (tool.id) {
        case 'merge': {
          const out = await mergePdfs(files.map((file) => file.base64));
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
          const outs = await splitPdf(files[0].base64, parsed);
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
          const out = await rotatePdf(files[0].base64, turns);
          await finish(out, `${baseName(files[0].name)} rotated.pdf`);
          break;
        }
        case 'pages': {
          const out = await addPageNumbers(files[0].base64);
          await finish(out, `${baseName(files[0].name)} numbered.pdf`);
          break;
        }
        case 'watermark': {
          const out = await addWatermark(files[0].base64, watermarkText);
          await finish(out, `${baseName(files[0].name)} watermarked.pdf`);
          break;
        }
        case 'img-pdf': {
          const out = await imagesToPdf(
            files.map((file) => ({
              base64: file.base64,
              mimeType: file.mimeType ?? 'image/jpeg',
            })),
          );
          await finish(out, `${baseName(files[0].name)}.pdf`);
          break;
        }
        case 'sign': {
          const page = Number(signPage);
          if (!Number.isFinite(page) || page < 1) throw new Error('Pick a page number.');
          const out = await signPdf(files[0].base64, strokes, {
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
    }
  };

  const needsImages = tool.id === 'img-pdf';
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

        {!tool.onDevice ? (
          <View style={[styles.note, { backgroundColor: colors.card }]}>
            <Feather name="alert-circle" size={18} color={colors.mutedForeground} />
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{tool.needs}</Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => choose(needsImages ? IMAGE_TYPES : PDF_TYPES, wantsMany)}
              style={[styles.primary, { backgroundColor: colors.navy }]}
            >
              <Feather name="upload" size={16} color="#FFFFFF" />
              <Text style={styles.primaryText}>
                {needsImages ? 'Choose images' : wantsMany ? 'Choose PDFs' : 'Choose a PDF'}
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
                  backgroundColor: canRun && !busy ? colors.primary : colors.muted,
                  marginTop: 18,
                },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
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
          </>
        )}

        {status ? (
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
});
