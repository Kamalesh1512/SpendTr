// GoalDetail (docs/design_system/templates/spendtr-app/goals.jsx
// `GoalDetailScreen`). One number in tabular figures, one track, then the
// contribution history. No "Held in" account row — goals never link an
// account (implementation plan §8).
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrencies } from '@/hooks/useCurrencies';
import { AddContributionSheet } from '@/components/AddContributionSheet';
import { Amount, Button, CategoryIcon, Group, Icon, Note, SectionLabel, Track } from '@/components/ds';
import * as goalRepository from '@/repositories/goalRepository';
import type { Goal, GoalContribution } from '@/repositories/goalRepository';
import { todayIsoDate } from '@/utils/date';
import { formatGroupedAmountMinor } from '@/utils/money';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, space, font } = useTheme();
  const router = useRouter();
  const { currencies } = useCurrencies();
  const [goal, setGoal] = useState<Goal | null | undefined>(undefined);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [savedMinor, setSavedMinor] = useState(0);
  const [contributionSheetOpen, setContributionSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const currency = currencies.find((c) => c.code === goal?.currencyCode);
  const decimalDigits = currency?.decimalDigits ?? 2;
  const symbol = currency?.symbol ?? '$';

  function money(amountMinor: number): string {
    return formatGroupedAmountMinor(amountMinor, { symbol, decimalDigits, currencyCode: currency?.code ?? 'USD' });
  }

  const refetch = useCallback(async () => {
    const all = await goalRepository.list();
    const found = all.find((g) => g.id === id) ?? null;
    setGoal(found);
    if (found) {
      const [progress, rows] = await Promise.all([
        goalRepository.getProgress(found.id),
        goalRepository.getContributions(found.id),
      ]);
      setSavedMinor(progress.contributedMinor);
      setContributions(rows);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const percent = useMemo(
    () => (goal && goal.targetAmountMinor > 0 ? (savedMinor / goal.targetAmountMinor) * 100 : 0),
    [goal, savedMinor],
  );
  const left = goal ? Math.max(0, goal.targetAmountMinor - savedMinor) : 0;
  const done = goal?.isAchieved ?? false;

  if (goal === undefined) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;
  }
  if (goal === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Text style={{ color: colors.textMuted, padding: space[20] }}>Goal not found.</Text>
      </SafeAreaView>
    );
  }

  async function addContribution(amountMinor: number) {
    setBusy(true);
    try {
      await goalRepository.addContribution(goal!.id, { amountMinor, occurredAt: todayIsoDate() });
      setContributionSheetOpen(false);
      await refetch();
    } catch (e) {
      Alert.alert('Could not add contribution', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  function closeGoal() {
    Alert.alert('Close this goal?', 'This removes it from your list. Nothing else changes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close goal',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await goalRepository.delete(goal!.id);
            router.back();
          } catch (e) {
            Alert.alert('Could not close goal', e instanceof Error ? e.message : 'Unknown error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[12], paddingTop: space[8], paddingBottom: space[8] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {goal.name}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Delete goal" onPress={closeGoal} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space[60] }}>
        <View style={{ paddingHorizontal: space[20], alignItems: 'center', gap: space[14] }}>
          <CategoryIcon icon={goal.icon} color={goal.color} size={60} />
          <View style={{ alignItems: 'center' }}>
            <SectionLabel size="xs">{done ? 'Goal reached' : 'Put aside'}</SectionLabel>
            <Text
              style={{
                fontSize: 40,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
                color: done ? colors.success : colors.text,
                marginTop: 3,
              }}
            >
              {money(savedMinor)}
            </Text>
            <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted, marginTop: 4, fontVariant: ['tabular-nums'] }}>
              of {money(goal.targetAmountMinor)}
            </Text>
          </View>
          <View style={{ width: '100%' }}>
            <Track percent={percent} color={done ? colors.success : goal.color} height={8} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[8] }}>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{Math.round(percent)}%</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                {done ? 'Nothing left to save' : `${money(left)} to go`}
              </Text>
            </View>
          </View>
        </View>

        {goal.targetDate ? (
          <View style={{ padding: space[20] }}>
            <Group>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[14] }}>
                <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted }}>Target date</Text>
                <Text style={{ fontSize: font.size.bodySm, fontWeight: '600', color: colors.text }}>
                  {new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </Text>
              </View>
            </Group>
          </View>
        ) : null}

        {done ? (
          <View style={{ paddingHorizontal: space[20] }}>
            <Note tone="ok">Target met. Keep contributing, or close the goal and move the balance back to everyday spending.</Note>
          </View>
        ) : null}

        <View style={{ padding: space[20], paddingBottom: space[6] }}>
          <SectionLabel size="xs">Contributions</SectionLabel>
        </View>
        {contributions.length === 0 ? (
          <Text style={{ color: colors.textMuted, paddingHorizontal: space[20], fontSize: font.size.bodySm }}>
            Nothing saved toward this goal yet.
          </Text>
        ) : (
          contributions.map((c) => (
            <View
              key={c.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[20], paddingVertical: space[10], borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrow-up" size={15} color={colors.success} />
              </View>
              <Text style={{ flex: 1, fontSize: font.size.bodySm, color: colors.text }}>{c.occurredAt}</Text>
              <Amount amountMinor={c.amountMinor} currencyCode={currency?.code} decimalDigits={decimalDigits} showCode={false} size="sm" />
            </View>
          ))
        )}
      </ScrollView>

      <View style={{ padding: space[20], borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button variant="primary" fullWidth disabled={busy} onPress={() => setContributionSheetOpen(true)}>
          Add a contribution
        </Button>
      </View>

      <AddContributionSheet
        visible={contributionSheetOpen}
        onClose={() => setContributionSheetOpen(false)}
        onSave={addContribution}
        goalName={goal.name}
        savedMinor={savedMinor}
        targetMinor={goal.targetAmountMinor}
        currencyCode={goal.currencyCode}
        decimalDigits={decimalDigits}
        symbol={currency?.symbol ?? '$'}
        color={goal.color}
      />
    </SafeAreaView>
  );
}
