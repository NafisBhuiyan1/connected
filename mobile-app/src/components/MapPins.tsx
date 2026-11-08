import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { initials } from '@/lib/match';
import { C } from '@/theme';

export type Strength = 'strong' | 'good' | 'some';

const NODE: Record<Strength, number> = { strong: 40, good: 34, some: 28 };
const CARD_H = 44;
const GAP = 6;
const WIDTH = 176;

/**
 * Where the coordinate sits inside a NodePin, for the Marker `anchor` prop.
 * With the name card showing, the node is lower in the view, so the anchor moves down.
 */
export function nodeAnchor(strength: Strength, selected: boolean) {
  const size = NODE[strength] + (selected ? 6 : 0);
  if (!selected) return { x: 0.5, y: 0.5 };
  return { x: 0.5, y: (CARD_H + GAP + size / 2) / (CARD_H + GAP + size) };
}

/**
 * A person as a node in your network. Solid purple = strong match, purple ring = good match,
 * quiet gray = other. Selected nodes grow and show a small name-and-role card above.
 */
export function NodePin({ name, role, uri, strength, selected, door, real }: { name: string; role: string; uri?: string | null; strength: Strength; selected: boolean; door: boolean; real?: boolean }) {
  const size = NODE[strength] + (selected ? 6 : 0);
  const solid = strength === 'strong' || selected;
  const ring = selected ? C.accent : strength === 'some' ? '#B9B4C8' : C.accent;
  const node = (
    <View
      style={[
        styles.node,
        { width: size, height: size, borderRadius: size / 2, borderColor: solid ? C.white : ring, backgroundColor: solid ? C.accent : C.white },
        strength === 'some' && !selected && { borderWidth: 1.5 },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.34, color: solid ? C.white : strength === 'some' ? C.ink3 : C.accent }]}>{initials(name)}</Text>
      )}
      {real ? <View style={styles.real} accessibilityLabel="Connected member" /> : null}
      {door ? (
        <View style={styles.door}>
          <Ionicons name="enter" size={9} color={C.white} />
        </View>
      ) : null}
    </View>
  );

  if (!selected) return <View collapsable={false} style={{ padding: 4 }}>{node}</View>;

  return (
    <View collapsable={false} style={{ width: WIDTH, alignItems: 'center' }}>
      <View style={styles.card}>
        <Text style={styles.cardName} numberOfLines={1}>{name}{real ? '  ·  Member' : ''}</Text>
        <Text style={styles.cardRole} numberOfLines={1}>{role}</Text>
      </View>
      <View style={styles.cardTip} />
      {/* The tip adds 4px below the card (10px tall, pulled up 6px); this spacer makes the gap exactly GAP. */}
      <View style={{ height: GAP - 4 }} />
      {node}
    </View>
  );
}

/** You: the center node of your network, like the intro animation. */
export function YouNode({ live }: { live: boolean }) {
  return (
    <View collapsable={false} style={styles.youWrap}>
      <View style={[styles.youRing, !live && { borderColor: 'rgba(91,53,201,0.25)', backgroundColor: 'rgba(91,53,201,0.06)' }]} />
      <View style={styles.youDot}>
        <View style={styles.youCore} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    shadowColor: '#2A1E5C',
    shadowOpacity: 0.22,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  initials: { fontWeight: '700', letterSpacing: 0.3 },
  real: { position: 'absolute', right: -2, bottom: -2, width: 13, height: 13, borderRadius: 7, backgroundColor: '#1FB860', borderWidth: 2, borderColor: C.white },
  door: { position: 'absolute', right: -4, top: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: C.blue, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },
  card: {
    height: CARD_H,
    maxWidth: WIDTH,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E1DEEA',
    shadowColor: '#2A1E5C',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  cardName: { fontSize: 13, fontWeight: '700', color: C.ink },
  cardRole: { fontSize: 11, color: C.ink2 },
  cardTip: { width: 10, height: 10, backgroundColor: C.white, transform: [{ rotate: '45deg' }], marginTop: -6, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#E1DEEA' },
  youWrap: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  youRing: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: 'rgba(91,53,201,0.45)', backgroundColor: 'rgba(91,53,201,0.10)' },
  youDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, borderWidth: 3, borderColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#2A1E5C', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 5 },
  youCore: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.white },
});
