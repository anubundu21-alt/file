import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type IconName = React.ComponentProps<typeof Feather>['name'];

type Slide = {
  eyebrow: string;
  title: string;
  description: string;
  icon: IconName;
  accent: string;
  art: 'files' | 'search' | 'storage';
};

const slides: Slide[] = [
  {
    eyebrow: 'A calmer way to manage files',
    title: 'Your files, finally simple.',
    description: 'Sift brings the important things forward, so you can spend less time hunting and more time getting things done.',
    icon: 'layers',
    accent: '#19C88A',
    art: 'files',
  },
  {
    eyebrow: 'Search that understands you',
    title: 'Find anything in seconds.',
    description: 'Search by name, type, or what you remember. Your files stay close, clear, and ready.',
    icon: 'search',
    accent: '#77B7F2',
    art: 'search',
  },
  {
    eyebrow: 'A lighter place for your files',
    title: 'Make room without the guesswork.',
    description: 'See what is taking space, review every suggestion, and decide what stays yours.',
    icon: 'pie-chart',
    accent: '#F5C75D',
    art: 'storage',
  },
];

function SplashBrand() {
  const colors = useColors();
  return (
    <View style={[styles.splash, { backgroundColor: colors.navy }]}>
      <View style={styles.splashOrbLarge} />
      <View style={styles.splashOrbSmall} />
      <View style={styles.brandLockup}>
        <View style={styles.brandMark}>
          <Image source={require('@/assets/images/icon.png')} style={styles.brandImage} />
        </View>
        <Text style={styles.brandName}>SIFT</Text>
        <Text style={styles.brandTagline}>Everything you need, right here.</Text>
      </View>
      <View style={styles.splashBottom}>
        <View style={styles.splashLine}><View style={styles.splashLineFill} /></View>
        <Text style={styles.splashCaption}>A better place for your files</Text>
      </View>
    </View>
  );
}

function FilesArt({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.artCanvas}>
      <View style={[styles.artBlob, { backgroundColor: `${colors.teal}20` }]} />
      <View style={[styles.fileSheet, styles.fileSheetBack, { backgroundColor: '#BCEEDB' }]}>
        <View style={styles.sheetLineShort} />
        <View style={styles.sheetLineLong} />
      </View>
      <View style={[styles.fileSheet, styles.fileSheetMiddle, { backgroundColor: '#CDE8FC' }]}>
        <View style={styles.sheetLineShort} />
        <View style={styles.sheetLineLong} />
      </View>
      <View style={[styles.fileSheet, styles.fileSheetFront, { backgroundColor: colors.navy }]}>
        <View style={[styles.folderTab, { backgroundColor: colors.teal }]} />
        <View style={styles.folderLine} />
        <View style={styles.folderLineSmall} />
        <Feather name="check" color={colors.teal} size={24} style={styles.artCheck} />
      </View>
    </View>
  );
}

function SearchArt({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.artCanvas}>
      <View style={[styles.artBlob, { backgroundColor: `${colors.sky}20` }]} />
      <View style={[styles.mockSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" color={colors.mutedForeground} size={16} />
        <Text style={[styles.mockSearchText, { color: colors.foreground }]}>large videos</Text>
      </View>
      <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
        <View style={[styles.resultIcon, { backgroundColor: '#E4DFFD' }]}><Feather name="video" color={colors.lavender} size={18} /></View>
        <View style={styles.resultLines}><View style={[styles.resultLine, { backgroundColor: colors.foreground }]} /><View style={[styles.resultLineSmall, { backgroundColor: colors.border }]} /></View>
        <Feather name="check-circle" color={colors.teal} size={18} />
      </View>
      <View style={[styles.resultCard, styles.resultCardSecond, { backgroundColor: colors.card }]}>
        <View style={[styles.resultIcon, { backgroundColor: '#F9D0C5' }]}><Feather name="film" color={colors.coral} size={18} /></View>
        <View style={styles.resultLines}><View style={[styles.resultLine, { backgroundColor: colors.foreground }]} /><View style={[styles.resultLineSmall, { backgroundColor: colors.border }]} /></View>
        <Feather name="more-horizontal" color={colors.mutedForeground} size={18} />
      </View>
    </View>
  );
}

function StorageArt({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.artCanvas}>
      <View style={[styles.artBlob, { backgroundColor: `${colors.sunshine}26` }]} />
      <View style={[styles.storageArtCard, { backgroundColor: colors.navy }]}>
        <View style={styles.storageArtTop}><Text style={styles.storageArtLabel}>STORAGE</Text><Feather name="more-horizontal" color="#9DB2A8" size={16} /></View>
        <Text style={styles.storageArtNumber}>74.2 <Text style={styles.storageArtUnit}>GB</Text></Text>
        <View style={styles.storageArtBar}><View style={[styles.storageArtFill, { backgroundColor: colors.teal, width: '58%' }]} /></View>
        <View style={styles.storageArtFooter}><Text style={styles.storageArtSmall}>58% used</Text><Text style={styles.storageArtSmall}>128 GB total</Text></View>
      </View>
      <View style={[styles.cleanupBadge, { backgroundColor: colors.card }]}>
        <View style={[styles.cleanupDot, { backgroundColor: colors.teal }]} />
        <Text style={[styles.cleanupText, { color: colors.foreground }]}>4.8 GB to review</Text>
        <Feather name="arrow-up-right" color={colors.mutedForeground} size={14} />
      </View>
    </View>
  );
}

function SlideArt({ slide, colors }: { slide: Slide; colors: ReturnType<typeof useColors> }) {
  if (slide.art === 'files') return <FilesArt colors={colors} />;
  if (slide.art === 'search') return <SearchArt colors={colors} />;
  return <StorageArt colors={colors} />;
}

function Onboarding({ onComplete }: { onComplete: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem('sift-onboarding-complete', 'true');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const next = () => {
    Haptics.selectionAsync();
    if (isLast) {
      void finish();
    } else {
      setIndex((current) => current + 1);
    }
  };

  return (
    <View style={[styles.onboarding, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.onboardingTop}>
        <View style={styles.smallBrand}>
          <View style={[styles.smallBrandMark, { backgroundColor: colors.navy }]}>
            <Image source={require('@/assets/images/icon.png')} style={styles.smallBrandImage} />
          </View>
          <Text style={[styles.smallBrandName, { color: colors.foreground }]}>SIFT</Text>
        </View>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={[styles.skip, { color: colors.mutedForeground }]}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.onboardingBody}>
        <SlideArt slide={slide} colors={colors} />
        <View style={styles.slideCopy}>
          <Text style={[styles.slideEyebrow, { color: slide.accent }]}>{slide.eyebrow}</Text>
          <Text style={[styles.slideTitle, { color: colors.foreground }]}>{slide.title}</Text>
          <Text style={[styles.slideDescription, { color: colors.mutedForeground }]}>{slide.description}</Text>
        </View>
      </View>

      <View style={[styles.onboardingBottom, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <View style={styles.dots}>
          {slides.map((item, dotIndex) => (
            <View key={item.title} style={[styles.dot, { backgroundColor: dotIndex === index ? slide.accent : colors.border, width: dotIndex === index ? 24 : 7 }]} />
          ))}
        </View>
        <Pressable onPress={next} style={({ pressed }) => [styles.nextButton, { backgroundColor: colors.navy }, pressed && styles.pressed]}>
          <Text style={styles.nextButtonText}>{isLast ? 'Get started' : 'Continue'}</Text>
          <Feather name={isLast ? 'arrow-right' : 'chevron-right'} color="#FFFFFF" size={18} />
        </Pressable>
        <Text style={[styles.privacyNote, { color: colors.mutedForeground }]}>Your files stay yours. Sift starts local-first.</Text>
      </View>
    </View>
  );
}

export default function LaunchScreen() {
  const [phase, setPhase] = useState<'splash' | 'onboarding' | 'ready'>('splash');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const complete = await AsyncStorage.getItem('sift-onboarding-complete');
      if (!active) return;
      if (complete === 'true') {
        setPhase('ready');
        router.replace('/(tabs)');
      } else {
        setPhase('onboarding');
      }
    }, 1100);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  if (phase === 'splash') return <SplashBrand />;
  if (phase === 'onboarding') return <Onboarding onComplete={() => { setPhase('ready'); router.replace('/(tabs)'); }} />;
  return <View style={styles.ready} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  splashOrbLarge: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: '#17364E', top: -120, right: -90 },
  splashOrbSmall: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#153246', bottom: -80, left: -65 },
  brandLockup: { alignItems: 'center', marginTop: -28 },
  brandMark: { width: 94, height: 94, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  brandImage: { width: 94, height: 94, borderRadius: 30 },
  brandName: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', letterSpacing: 7, fontSize: 27, marginTop: 23, marginLeft: 7 },
  brandTagline: { color: '#AFC6BA', fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 9 },
  splashBottom: { position: 'absolute', bottom: 46, alignItems: 'center', gap: 10 },
  splashLine: { width: 112, height: 3, borderRadius: 2, backgroundColor: '#294B5B', overflow: 'hidden' },
  splashLineFill: { width: '38%', height: '100%', backgroundColor: '#19C88A', borderRadius: 2 },
  splashCaption: { color: '#75988A', fontFamily: 'Inter_500Medium', fontSize: 11 },
  onboarding: { flex: 1 },
  onboardingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 17 },
  smallBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallBrandMark: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  smallBrandImage: { width: 27, height: 27, borderRadius: 9 },
  smallBrandName: { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 2 },
  skip: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  onboardingBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingBottom: 16 },
  artCanvas: { height: 300, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  artBlob: { position: 'absolute', width: 260, height: 260, borderRadius: 130 },
  fileSheet: { width: 137, height: 168, borderRadius: 18, position: 'absolute', shadowColor: '#10243D', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  fileSheetBack: { transform: [{ rotate: '-12deg' }], top: 66, left: 74 },
  fileSheetMiddle: { transform: [{ rotate: '9deg' }], top: 51, right: 70 },
  fileSheetFront: { top: 65, alignItems: 'center', paddingTop: 29 },
  sheetLineShort: { width: 44, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF', opacity: 0.6, marginTop: 50, marginLeft: 22, alignSelf: 'flex-start' },
  sheetLineLong: { width: 86, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF', opacity: 0.35, marginTop: 10, marginLeft: 22, alignSelf: 'flex-start' },
  folderTab: { width: 47, height: 16, borderTopLeftRadius: 7, borderTopRightRadius: 7, alignSelf: 'flex-start', marginLeft: 20 },
  folderLine: { width: 86, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF', opacity: 0.42, marginTop: 30 },
  folderLineSmall: { width: 57, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF', opacity: 0.25, marginTop: 10, alignSelf: 'flex-start', marginLeft: 25 },
  artCheck: { position: 'absolute', bottom: 23, right: 23 },
  mockSearch: { position: 'absolute', top: 50, left: 17, right: 17, height: 53, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, shadowColor: '#10243D', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  mockSearchText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  resultCard: { position: 'absolute', top: 128, left: 41, right: 41, height: 67, borderRadius: 17, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10, shadowColor: '#10243D', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  resultCardSecond: { top: 204, left: 64, right: 64, opacity: 0.75 },
  resultIcon: { width: 37, height: 37, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  resultLines: { flex: 1, gap: 7 },
  resultLine: { width: '72%', height: 6, borderRadius: 3, opacity: 0.6 },
  resultLineSmall: { width: '44%', height: 5, borderRadius: 3 },
  storageArtCard: { position: 'absolute', top: 62, left: 28, right: 28, borderRadius: 23, padding: 20, shadowColor: '#10243D', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  storageArtTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storageArtLabel: { color: '#9DB2A8', fontFamily: 'Inter_600SemiBold', letterSpacing: 1.3, fontSize: 10 },
  storageArtNumber: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: -1.2, marginTop: 22 },
  storageArtUnit: { color: '#B6C8BE', fontFamily: 'Inter_400Regular', fontSize: 13, letterSpacing: 0 },
  storageArtBar: { height: 9, borderRadius: 5, backgroundColor: '#294356', overflow: 'hidden', marginTop: 22 },
  storageArtFill: { height: '100%', borderRadius: 5 },
  storageArtFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  storageArtSmall: { color: '#9DB2A8', fontFamily: 'Inter_400Regular', fontSize: 10 },
  cleanupBadge: { position: 'absolute', bottom: 31, right: 24, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#10243D', shadowOpacity: 0.11, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  cleanupDot: { width: 7, height: 7, borderRadius: 4 },
  cleanupText: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5 },
  slideCopy: { marginTop: 19 },
  slideEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase' },
  slideTitle: { fontFamily: 'Inter_700Bold', fontSize: 37, lineHeight: 42, letterSpacing: -1.4, marginTop: 10, maxWidth: 350 },
  slideDescription: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 23, marginTop: 13, maxWidth: 340 },
  onboardingBottom: { paddingHorizontal: 22 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 18 },
  dot: { height: 7, borderRadius: 4 },
  nextButton: { minHeight: 56, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  nextButtonText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  privacyNote: { fontFamily: 'Inter_400Regular', fontSize: 10.5, textAlign: 'center', marginTop: 13 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  ready: { flex: 1 },
});