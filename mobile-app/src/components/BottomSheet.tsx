import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { C } from '@/theme';

type Props = {
  /** Height of the area the sheet lives in (the map screen, above the tab bar). */
  containerHeight: number;
  /** Visible sheet heights, smallest first, e.g. [peek, half, full]. */
  snaps: number[];
  index: number;
  onIndexChange: (i: number) => void;
  /** Draggable header (handle + title). */
  header: ReactNode;
  children: ReactNode;
  /** Changes when the content swaps, so the list scrolls back to top. */
  contentKey?: string;
};

/**
 * Life360-style sheet that snaps between heights. Drag or flick the header; tap the handle to step.
 * Content scrolls at every height (padding keeps the last rows reachable).
 */
export function BottomSheet({ containerHeight, snaps, index, onIndexChange, header, children, contentKey }: Props) {
  const yFor = (i: number) => containerHeight - snaps[Math.max(0, Math.min(snaps.length - 1, i))];
  const [y] = useState(() => new Animated.Value(yFor(index)));
  const scroll = useRef<ScrollViewInstance>(null);
  const state = useRef({ start: 0, index, snaps, containerHeight, onIndexChange });

  useEffect(() => {
    state.current = { ...state.current, index, snaps, containerHeight, onIndexChange };
  }, [index, snaps, containerHeight, onIndexChange]);

  useEffect(() => {
    Animated.spring(y, { toValue: containerHeight - snaps[index], useNativeDriver: true, damping: 22, stiffness: 220, mass: 0.9 }).start();
  }, [index, snaps, containerHeight, y]);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [contentKey]);

  // The gesture callbacks read `state.current` only while a finger is moving, never during render.
  // The compiler can't see that through PanResponder.create, so this one rule is disabled here.
  /* eslint-disable react-hooks/refs */
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          const s = state.current;
          s.start = s.containerHeight - s.snaps[s.index];
        },
        onPanResponderMove: (_, g) => {
          const s = state.current;
          const top = s.containerHeight - s.snaps[s.snaps.length - 1];
          const bottom = s.containerHeight - s.snaps[0];
          y.setValue(Math.max(top - 20, Math.min(bottom + 30, s.start + g.dy)));
        },
        onPanResponderRelease: (_, g) => {
          const s = state.current;
          const pos = s.start + g.dy;
          let target: number;
          if (g.vy < -0.6) target = Math.min(s.snaps.length - 1, s.index + 1);
          else if (g.vy > 0.6) target = Math.max(0, s.index - 1);
          else {
            target = 0;
            let best = Infinity;
            s.snaps.forEach((h, i) => {
              const d = Math.abs(s.containerHeight - h - pos);
              if (d < best) { best = d; target = i; }
            });
          }
          if (target === s.index) {
            Animated.spring(y, { toValue: s.containerHeight - s.snaps[target], useNativeDriver: true, damping: 22, stiffness: 220 }).start();
          }
          s.onIndexChange(target);
        },
      }),
    [y],
  );
  /* eslint-enable react-hooks/refs */

  const step = () => onIndexChange(index >= snaps.length - 1 ? 0 : index + 1);

  return (
    <Animated.View style={[styles.sheet, { height: containerHeight, transform: [{ translateY: y }] }]}>
      <View {...pan.panHandlers}>
        <Pressable onPress={step} accessibilityRole="adjustable" accessibilityLabel="People list" accessibilityHint="Tap to show more or less" style={styles.handleHit}>
          <View style={styles.handle} />
        </Pressable>
        {header}
      </View>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: containerHeight - snaps[index] + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: C.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: '#1B1726',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  handleHit: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.line2 },
});
