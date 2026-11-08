import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card, Note, Row, Segmented, Tag } from '@/components/ui';
import { fieldLabel, statusLabel } from '@/data/options';
import { dataSource } from '@/data/source';
import type { ConnectionRequest, RequestStatus } from '@/data/types';
import { firstName } from '@/lib/match';
import { dayLabel, fmtTime } from '@/lib/time';
import { useApp } from '@/state/AppState';
import { C, S, T } from '@/theme';

const STATUS_TAG: Record<RequestStatus, { label: string; tone: 'warn' | 'ok' | 'neutral' }> = {
  requested: { label: 'Requested', tone: 'warn' },
  accepted: { label: 'Accepted', tone: 'ok' },
  declined: { label: 'Declined', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

const failed = (what: string) => (e: unknown) => Alert.alert(`Couldn’t ${what}`, e instanceof Error ? e.message : 'Check your connection and try again.');

export default function Inbox() {
  const app = useApp();
  const [tab, setTab] = useState<'sent' | 'received'>('sent');
  const [refreshing, setRefreshing] = useState(false);
  const byNewest = (a: ConnectionRequest, b: ConnectionRequest) => b.updatedAt - a.updatedAt;
  const sent = app.requests.filter((r) => !r.incoming).sort(byNewest);
  const received = app.requests.filter((r) => r.incoming && r.status !== 'cancelled').sort(byNewest);
  const newCount = app.incoming.filter((i) => i.state === 'new').length + received.filter((r) => r.status === 'requested').length;

  const refresh = () => {
    setRefreshing(true);
    app.refreshRemote();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <ScrollView
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: S.lg, gap: S.lg, paddingBottom: S.xxl }}
      refreshControl={app.session ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} /> : undefined}
    >
      <Segmented
        label="Inbox section"
        options={[{ id: 'sent', label: `Sent${sent.length ? ` (${sent.length})` : ''}` }, { id: 'received', label: `Received${newCount ? ` (${newCount})` : ''}` }]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'sent' ? (
        sent.length ? (
          sent.map((r) => <RequestRow key={r.id} r={r} />)
        ) : (
          <View style={styles.empty}>
            <Ionicons name="paper-plane-outline" size={36} color={C.ink3} />
            <Text style={T.h3}>No requests yet</Text>
            <Text style={[T.muted, { textAlign: 'center' }]}>Open someone on the map and we’ll help you write a first message.</Text>
            <Button label="Go to the map" onPress={() => router.navigate('/')} />
          </View>
        )
      ) : (
        <>
          {received.map((r) => <RequestRow key={r.id} r={r} />)}
          {app.session && !received.length ? (
            <Text style={T.small}>No one has sent you a request yet. Keep &quot;Let people nearby find me&quot; on in Profile so people can find you.</Text>
          ) : null}
          {!app.session && app.backendEnabled ? (
            <Note icon="person-add-outline">Create an account (Profile tab) to receive requests from real people.</Note>
          ) : null}
          {app.showDemo ? (
            <>
              <Note icon="flask-outline">These are sample requests so you can try the other side. They’re from demo profiles, not real people.</Note>
              {app.incoming.map((i) => (
                <Card key={i.id}>
                  <Row style={{ flexWrap: 'nowrap' }}>
                    <Avatar name={i.name} />
                    <View style={{ flex: 1 }}>
                      <Text style={T.h3}>{i.name}</Text>
                      <Text style={T.small}>{i.role} · {statusLabel(i.status)} · {fieldLabel(i.field)}</Text>
                    </View>
                    {i.state === 'new' ? <Tag label="New" tone="warn" /> : <Tag label={i.state === 'accepted' ? 'Accepted' : 'Declined'} tone={i.state === 'accepted' ? 'ok' : 'neutral'} />}
                  </Row>
                  <Text style={[T.body, { fontSize: 15 }]}>{i.message}</Text>
                  {i.state === 'new' ? (
                    <Row>
                      <Button label="Accept" small onPress={() => app.respondIncoming(i.id, 'accepted')} />
                      <Button label="Decline" small variant="secondary" onPress={() => app.respondIncoming(i.id, 'declined')} />
                    </Row>
                  ) : (
                    <Row>
                      <Text style={[T.small, { flex: 1 }]}>
                        {i.state === 'accepted' ? `${firstName(i.name)} can now message you. Suggest a public place to meet.` : `${firstName(i.name)} gets a short, polite note with no reason given.`}
                      </Text>
                      <Button label="Undo" variant="quiet" small onPress={() => app.respondIncoming(i.id, 'new')} />
                    </Row>
                  )}
                </Card>
              ))}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

/** One request (sent or received, demo or real). */
function RequestRow({ r }: { r: ConnectionRequest }) {
  const app = useApp();
  const p = dataSource.getPerson(r.personId);
  const name = p?.name ?? 'Connected member';
  const s = STATUS_TAG[r.status];
  const last = app.messages[r.id]?.at(-1)?.text ?? r.message;
  const pendingForMe = r.incoming && r.status === 'requested';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => (r.status === 'accepted' ? router.push({ pathname: '/chat/[id]', params: { id: r.id } }) : router.push({ pathname: '/person/[id]', params: { id: r.personId } }))}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: C.bg2 }]}
    >
      <Avatar name={name} uri={p?.photo} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Text style={[T.h3, { flexShrink: 1 }]} numberOfLines={1}>{name}</Text>
          <Tag label={pendingForMe ? 'New' : s.label} tone={pendingForMe ? 'warn' : s.tone} />
        </Row>
        <Text style={T.small} numberOfLines={2}>{last.replace(/\s+/g, ' ')}</Text>
        <Text style={[T.small, { fontSize: 12 }]}>
          {dayLabel(r.updatedAt)}, {fmtTime(r.updatedAt)}{r.remote ? '' : ' · demo'}
        </Text>
        {pendingForMe ? (
          <Row>
            <Button label="Accept" small onPress={() => app.respondRemote(r.id, 'accepted').catch(failed('accept'))} />
            <Button label="Decline" small variant="secondary" onPress={() => app.respondRemote(r.id, 'declined').catch(failed('decline'))} />
          </Row>
        ) : r.status === 'requested' ? (
          <Row>
            <Button label="Cancel" variant="secondary" small onPress={() => app.cancelRequest(r.id).catch(failed('cancel'))} />
            {r.remote ? null : <Button label="Demo: accept" variant="quiet" small onPress={() => app.simulateReply(r.id, 'accepted')} />}
          </Row>
        ) : r.status === 'accepted' ? (
          <Text style={[T.small, { color: C.accent, fontWeight: '600' }]}>Open chat</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: S.md, padding: S.md, borderWidth: 1, borderColor: C.line, borderRadius: 12, alignItems: 'flex-start' },
  empty: { alignItems: 'center', gap: S.md, paddingVertical: S.xxl, paddingHorizontal: S.lg },
});
