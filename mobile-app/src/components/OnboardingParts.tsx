import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, R, S, T } from '@/theme';
import type { IconName } from './ui';

/** A large tappable choice with an icon, used for one-of or many-of questions. */
export function OptionCard({ icon, title, hint, selected, onPress, multi }: { icon: IconName; title: string; hint?: string; selected: boolean; onPress: () => void; multi?: boolean }) {
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.cardOn, pressed && !selected && { backgroundColor: C.bg2 }]}
    >
      <View style={[styles.iconWrap, selected && { backgroundColor: C.accent }]}>
        <Ionicons name={icon} size={20} color={selected ? C.white : C.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[T.label, { fontSize: 16 }]}>{title}</Text>
        {hint ? <Text style={[T.small, { fontSize: 14 }]}>{hint}</Text> : null}
      </View>
      <View style={[styles.check, multi && { borderRadius: 6 }, selected && styles.checkOn]}>
        {selected ? <Ionicons name="checkmark" size={14} color={C.white} /> : null}
      </View>
    </Pressable>
  );
}

/** Square tile for a 2-column grid of choices (fields, meeting style). */
export function Tile({ icon, label, selected, onPress, multi }: { icon: IconName; label: string; selected: boolean; onPress: () => void; multi?: boolean }) {
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.cardOn, pressed && !selected && { backgroundColor: C.bg2 }]}
    >
      <View style={[styles.iconWrap, { width: 44, height: 44, borderRadius: 22 }, selected && { backgroundColor: C.accent }]}>
        <Ionicons name={icon} size={22} color={selected ? C.white : C.accent} />
      </View>
      <Text style={[T.label, { textAlign: 'center' }]}>{label}</Text>
    </Pressable>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/** Title block for each step: section name, big question, helper text. */
export function StepTitle({ icon, section, title, sub }: { icon: IconName; section: string; title: string; sub?: string }) {
  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <View style={styles.stepIcon}>
          <Ionicons name={icon} size={18} color={C.accent} />
        </View>
        <Text style={styles.section}>{section}</Text>
      </View>
      <Text style={[T.title, { fontSize: 28, lineHeight: 34 }]} accessibilityRole="header">{title}</Text>
      {sub ? <Text style={[T.muted, { fontSize: 16, lineHeight: 23 }]}>{sub}</Text> : null}
    </View>
  );
}

export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Text style={T.label}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, paddingRight: S.lg, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.bg },
  cardOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.accent, borderColor: C.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  tile: { width: '48.5%', minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: S.sm, padding: S.md, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.bg },
  stepIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  section: { color: C.accent, fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
});
