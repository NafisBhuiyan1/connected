import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

// A small "people nearby" network. Node 0 is you, in the middle.
const NODES = [
  { x: 130, y: 82, r: 9 },
  { x: 58, y: 44, r: 6 },
  { x: 204, y: 38, r: 6.5 },
  { x: 222, y: 112, r: 5.5 },
  { x: 150, y: 146, r: 6 },
  { x: 44, y: 124, r: 5 },
  { x: 100, y: 18, r: 4.5 },
];
const EDGES: [number, number][] = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [2, 6], [3, 4]];
const len = (a: number, b: number) => Math.hypot(NODES[a].x - NODES[b].x, NODES[a].y - NODES[b].y);

const TOTAL_HOLD_MS = 2550;

/** Animated "Connected." launch intro. Calls onDone after it fades out; tap to skip. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [v] = useState(() => ({
    nodes: NODES.map(() => new Animated.Value(0)),
    edges: EDGES.map(() => new Animated.Value(0)),
    pulse: new Animated.Value(0),
    word: new Animated.Value(0),
    dot: new Animated.Value(0),
    tag: new Animated.Value(0),
    out: new Animated.Value(1),
  }));
  const [leaving, setLeaving] = useState(false);

  const finish = (fast = false) => {
    if (leaving) return;
    setLeaving(true);
    Animated.timing(v.out, { toValue: 0, duration: fast ? 220 : 450, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(() => onDone());
  };

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        [...v.nodes, ...v.edges, v.word, v.dot, v.tag].forEach((a) => a.setValue(1));
        timer = setTimeout(() => finish(), 900);
        return;
      }
      const pop = (a: Animated.Value) => Animated.timing(a, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(2.2)), useNativeDriver: false });
      const draw = (a: Animated.Value) => Animated.timing(a, { toValue: 1, duration: 460, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });
      Animated.parallel([
        Animated.stagger(85, v.nodes.map(pop)),
        Animated.sequence([Animated.delay(260), Animated.stagger(70, v.edges.map(draw))]),
        Animated.sequence([
          Animated.delay(500),
          Animated.loop(Animated.timing(v.pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: false }), { iterations: 2 }),
        ]),
        Animated.sequence([Animated.delay(950), Animated.timing(v.word, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: false })]),
        Animated.sequence([Animated.delay(1420), Animated.spring(v.dot, { toValue: 1, friction: 4, tension: 120, useNativeDriver: false })]),
        Animated.sequence([Animated.delay(1700), Animated.timing(v.tag, { toValue: 1, duration: 500, useNativeDriver: false })]),
      ]).start();
      timer = setTimeout(() => finish(), TOTAL_HOLD_MS);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // Runs once on mount; `finish` only reads stable animated values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.out, zIndex: 100 }]} pointerEvents={leaving ? 'none' : 'auto'}>
      <Pressable style={{ flex: 1 }} onPress={() => finish(true)} accessibilityRole="button" accessibilityLabel="Connected. Tap to continue">
        <LinearGradient colors={['#7652E6', '#5B35C9', '#3E2191']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fill}>
          <View style={styles.center}>
            <Svg width={260} height={164} viewBox="0 0 260 164">
              <AnimatedCircle
                cx={NODES[0].x}
                cy={NODES[0].y}
                r={v.pulse.interpolate({ inputRange: [0, 1], outputRange: [10, 46] })}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={1.5}
                opacity={v.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] })}
              />
              {EDGES.map(([a, b], i) => {
                const L = len(a, b);
                return (
                  <AnimatedLine
                    key={`e${i}`}
                    x1={NODES[a].x}
                    y1={NODES[a].y}
                    x2={NODES[b].x}
                    y2={NODES[b].y}
                    stroke="#FFFFFF"
                    strokeOpacity={0.55}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeDasharray={`${L} ${L}`}
                    strokeDashoffset={v.edges[i].interpolate({ inputRange: [0, 1], outputRange: [L, 0] })}
                  />
                );
              })}
              {NODES.map((n, i) => (
                <AnimatedCircle
                  key={`n${i}`}
                  cx={n.x}
                  cy={n.y}
                  r={v.nodes[i].interpolate({ inputRange: [0, 1], outputRange: [0, n.r] })}
                  fill={i === 0 ? '#FFFFFF' : '#D9CCFF'}
                  opacity={v.nodes[i]}
                />
              ))}
            </Svg>

            <View style={styles.wordRow}>
              <Animated.Text
                style={[styles.word, { opacity: v.word, transform: [{ translateY: v.word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
              >
                Connected
              </Animated.Text>
              <Animated.View
                style={[
                  styles.period,
                  {
                    opacity: v.dot,
                    transform: [
                      { translateY: v.dot.interpolate({ inputRange: [0, 1], outputRange: [-36, 0] }) },
                      { scale: v.dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                    ],
                  },
                ]}
              />
            </View>
            <Animated.View style={{ opacity: v.tag }}>
              <Text style={styles.tag}>Find the right people around you.</Text>
            </Animated.View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 18, marginTop: -40 },
  wordRow: { flexDirection: 'row', alignItems: 'flex-end' },
  word: { color: '#FFFFFF', fontSize: 46, fontWeight: '800', letterSpacing: -1.5 },
  period: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#D9CCFF', marginLeft: 3, marginBottom: 11 },
  tag: { color: 'rgba(255,255,255,0.78)', fontSize: 16, letterSpacing: 0.2 },
});
