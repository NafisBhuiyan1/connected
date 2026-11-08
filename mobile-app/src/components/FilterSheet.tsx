import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AVAILABILITY, FIELDS, GOALS, INTERESTS, TRAVEL_MI } from '@/data/options';
import type { Filters } from '@/lib/filters';
import { C, R, S, T } from '@/theme';
import { Button, ChipGroup, IconButton, Segmented } from './ui';

type Props = {
  visible: boolean;
  value: Filters;
  resultCount: number;
  onChange: (f: Filters) => void;
  onReset: () => void;
  onClose: () => void;
};

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function FilterSheet({ visible, value: f, resultCount, onChange, onReset, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close filters" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + S.md }]}>
        <View style={styles.head}>
          <Text style={T.h2} accessibilityRole="header">Filters</Text>
          <IconButton icon="close" label="Close filters" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ gap: S.xl, paddingBottom: S.lg }}>
          <Block label="Distance">
            <Segmented label="Distance" options={TRAVEL_MI.map((m) => ({ id: m, label: `${m} mi` }))} value={f.distanceMi} onChange={(v) => onChange({ ...f, distanceMi: v })} />
          </Block>
          <Block label="Availability">
            <ChipGroup
              options={[{ id: 'any' as const, label: 'Any time' }, ...AVAILABILITY]}
              selected={[f.availability]}
              onToggle={(id) => onChange({ ...f, availability: id })}
            />
          </Block>
          <Block label="Connection goal" hint="What they offer">
            <ChipGroup options={GOALS.filter((g) => g.id !== 'other')} selected={f.goals} onToggle={(id) => onChange({ ...f, goals: toggle(f.goals, id) })} />
          </Block>
          <Block label="Field">
            <ChipGroup options={FIELDS} selected={f.fields} onToggle={(id) => onChange({ ...f, fields: toggle(f.fields, id) })} />
          </Block>
          <Block label="Interests">
            <ChipGroup options={INTERESTS.map((i) => ({ id: i, label: i }))} selected={f.interests} onToggle={(id) => onChange({ ...f, interests: toggle(f.interests, id) })} />
          </Block>
        </ScrollView>
        <View style={styles.foot}>
          <Button label="Clear" variant="secondary" onPress={onReset} />
          <Button label={resultCount ? `Show ${resultCount} ${resultCount === 1 ? 'person' : 'people'}` : 'No one matches yet'} onPress={onClose} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

function Block({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: S.sm }}>
      <Text style={T.label}>
        {label}
        {hint ? <Text style={[T.small, { fontWeight: '400' }]}>  {hint}</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(27,23,38,0.35)' },
  sheet: { maxHeight: '82%', backgroundColor: C.bg, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, paddingHorizontal: S.lg, paddingTop: S.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: S.sm },
  foot: { flexDirection: 'row', gap: S.sm, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.line },
});
