import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AVATAR_COLORS, C, R, S, T } from '@/theme';
import { initials } from '@/lib/match';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'blue';
  icon?: IconName;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, small, style, accessibilityHint }: ButtonProps) {
  const v = btn[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, small && styles.btnSmall, v.box, pressed && v.pressed, disabled && { opacity: 0.45 }, style]}
    >
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={v.text.color} /> : null}
      <Text style={[styles.btnText, small && { fontSize: 14 }, v.text]}>{label}</Text>
    </Pressable>
  );
}

const btn = {
  primary: StyleSheet.create({ box: { backgroundColor: C.accent }, pressed: { backgroundColor: C.accentPressed }, text: { color: C.white } }),
  blue: StyleSheet.create({ box: { backgroundColor: C.blue }, pressed: { opacity: 0.85 }, text: { color: C.white } }),
  secondary: StyleSheet.create({ box: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line2 }, pressed: { backgroundColor: C.bg2 }, text: { color: C.ink } }),
  quiet: StyleSheet.create({ box: { backgroundColor: 'transparent', paddingHorizontal: S.sm }, pressed: { backgroundColor: C.bg2 }, text: { color: C.ink2 } }),
  danger: StyleSheet.create({ box: { backgroundColor: 'transparent', paddingHorizontal: S.sm }, pressed: { backgroundColor: C.badSoft }, text: { color: C.bad } }),
};

export function Chip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && !selected && { backgroundColor: C.bg2 }]}
    >
      {selected ? <Ionicons name="checkmark" size={15} color={C.accent} /> : icon ? <Ionicons name={icon} size={15} color={C.ink2} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({ options, selected, onToggle }: { options: { id: T; label: string }[]; selected: T[]; onToggle: (id: T) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Chip key={o.id} label={o.label} selected={selected.includes(o.id)} onPress={() => onToggle(o.id)} />
      ))}
    </View>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <Pressable
            key={String(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.id)}
            style={[styles.segBtn, i > 0 && styles.segDivider, on && styles.segOn]}
          >
            <Text style={[styles.segText, on && { color: C.white, fontWeight: '600' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Choice({ title, hint, selected, onPress, multi }: { title: string; hint?: string; selected: boolean; onPress: () => void; multi?: boolean }) {
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, selected && styles.choiceOn, pressed && !selected && { backgroundColor: C.bg2 }]}
    >
      <View style={[styles.mark, multi && { borderRadius: 5 }, selected && { borderColor: C.accent, backgroundColor: multi ? C.accent : C.bg }]}>
        {selected ? multi ? <Ionicons name="checkmark" size={14} color={C.white} /> : <View style={styles.markDot} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={T.label}>{title}</Text>
        {hint ? <Text style={T.small}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Profile photo when there is one, otherwise soft-colored initials. `ring` adds a purple outline. */
export function Avatar({ name, size = 44, uri, ring }: { name: string; size?: number; uri?: string | null; ring?: boolean }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const inner = ring ? size - 6 : size;
  const face = uri ? (
    <Image source={{ uri }} style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: C.bg2 }} accessibilityIgnoresInvertColors />
  ) : (
    <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: AVATAR_COLORS[h % AVATAR_COLORS.length], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontWeight: '700', color: C.ink, fontSize: inner * 0.36, letterSpacing: 0.3 }}>{initials(name)}</Text>
    </View>
  );
  if (!ring) return <View accessible={false}>{face}</View>;
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: C.accent, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      {face}
    </View>
  );
}

export function Tag({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'accent' | 'blue'; icon?: IconName }) {
  const map = {
    neutral: [C.bg2, C.ink2], ok: [C.okSoft, C.ok], warn: [C.warnSoft, C.warn], bad: [C.badSoft, C.bad], accent: [C.accentSoft, C.accent], blue: [C.blueSoft, C.blue],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export const DemoTag = () => <Tag label="Demo profile" icon="flask-outline" />;

export function Section({ title, right, children, style }: { title?: string; right?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: S.md }, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <Text style={T.h2} accessibilityRole="header">{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Note({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'accent'; icon?: IconName }) {
  const bg = tone === 'warn' ? C.warnSoft : tone === 'accent' ? C.accentSoft : C.bg2;
  const fg = tone === 'warn' ? C.warn : tone === 'accent' ? C.accent : C.ink3;
  return (
    <View style={[styles.note, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={18} color={fg} style={{ marginTop: 1 }} /> : null}
      <Text style={[T.small, { color: C.ink2, flex: 1, fontSize: 14, lineHeight: 20 }]}>{children}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: S.sm, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: S.md }}>
      <Text style={[T.small, { width: 92, fontSize: 14 }]}>{k}</Text>
      <Text style={[T.body, { flex: 1, fontSize: 15, lineHeight: 21 }]}>{v}</Text>
    </View>
  );
}

export function IconButton({ icon, label, onPress, style }: { icon: IconName; label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: C.bg2 }, style]}>
      <Ionicons name={icon} size={22} color={C.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 48, paddingHorizontal: S.lg, borderRadius: R.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm },
  btnSmall: { minHeight: 40, paddingHorizontal: S.md },
  btnText: { fontSize: 16, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1, borderColor: C.line2, backgroundColor: C.bg, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOn: { backgroundColor: C.accentSoft, borderColor: C.accent },
  chipText: { fontSize: 15, color: C.ink2 },
  chipTextOn: { color: C.accent, fontWeight: '600' },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: C.line2, borderRadius: R.sm, overflow: 'hidden' },
  segBtn: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.sm, backgroundColor: C.bg },
  segDivider: { borderLeftWidth: 1, borderLeftColor: C.line2 },
  segOn: { backgroundColor: C.ink },
  segText: { fontSize: 15, color: C.ink2 },
  choice: { flexDirection: 'row', gap: S.md, alignItems: 'center', padding: S.lg, borderRadius: R.md, borderWidth: 1, borderColor: C.line2, backgroundColor: C.bg },
  choiceOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  mark: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.ink3, alignItems: 'center', justifyContent: 'center' },
  markDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.accent },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: S.lg, gap: S.md },
  note: { flexDirection: 'row', gap: S.sm, padding: S.md, borderRadius: R.md },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
});
