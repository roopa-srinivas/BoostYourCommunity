import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { goBackOr } from '@/lib/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useIntro } from '@/providers/intro-provider';

type Page = { icon: SymbolViewProps['name']; warm: boolean; title: string; body: string };

const PAGES: Page[] = [
  {
    icon: { ios: 'heart.fill', android: 'volunteer_activism', web: 'volunteer_activism' },
    warm: true,
    title: 'give what’s actually needed',
    body: 'shelters, pantries and community fridges near you post exactly what they’re short on, how much, and when to bring it.',
  },
  {
    icon: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
    warm: false,
    title: 'pledge, then drop off',
    body: 'say how many you’ll bring and you get a check-in code. the staff scan it when you arrive, so every drop-off counts.',
  },
  {
    icon: { ios: 'person.2.fill', android: 'group', web: 'group' },
    warm: true,
    title: 'give together',
    body: 'follow friends and the places you care about, share needs, earn badges, and see your year in giving.',
  },
  {
    icon: { ios: 'house.fill', android: 'home_work', web: 'home_work' },
    warm: false,
    title: 'run a shelter or pantry?',
    body: 'register it in the organization tab to post needs, check in drop-offs, and see what’s coming in.',
  },
];

/** The first-time intro: four short pages to swipe (or tap) through. */
export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const intro = useIntro();
  const { session } = useAuth();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const last = page === PAGES.length - 1;

  // Marking the intro seen unlocks sign-in and the app, but this screen stays
  // open too, so move on once the guards have updated.
  useEffect(() => {
    if (finishing && intro.seen) router.replace(session ? '/' : '/sign-in');
  }, [finishing, intro.seen, session]);

  function goTo(index: number) {
    setPage(index);
    scroller.current?.scrollTo({ x: index * width, animated: true });
  }

  function finish() {
    // Opened again from Give's "?", it just closes. The first time, it marks
    // the intro seen and the effect above moves on to sign-in or the app.
    if (intro.seen) {
      goBackOr('/');
    } else {
      setFinishing(true);
      intro.markSeen();
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        {!last ? (
          <ThemedText type="link" accessibilityRole="button" onPress={finish} style={styles.skip}>
            skip
          </ThemedText>
        ) : null}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
        style={styles.pages}>
        {PAGES.map((p) => (
          <View key={p.title} style={[styles.page, { width }]}>
            <View style={styles.pageInner}>
              <View style={[styles.icon, { backgroundColor: p.warm ? theme.accentSoft : theme.tintSoft }]}>
                <SymbolView name={p.icon} size={56} tintColor={p.warm ? theme.accent : theme.tint} />
              </View>
              <ThemedText type="title" style={styles.center}>
                {p.title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                {p.body}
              </ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityRole="adjustable" accessibilityLabel={`page ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((p, index) => (
            <View
              key={p.title}
              style={[
                styles.dot,
                { backgroundColor: index === page ? theme.tint : theme.backgroundSelected },
                index === page && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <Button label={last ? 'let’s go' : 'next'} onPress={() => (last ? finish() : goTo(page + 1))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { height: 48, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: Spacing.four },
  skip: { padding: Spacing.two },
  pages: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  pageInner: { width: '100%', maxWidth: MaxContentWidth, alignItems: 'center', gap: Spacing.three },
  icon: { width: 120, height: 120, borderRadius: Radius.card * 2, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.three },
  center: { textAlign: 'center' },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
});
