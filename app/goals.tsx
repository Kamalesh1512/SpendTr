// Goals — designed by the design bundle (docs/design_system/templates/
// spendtr-app/goals.jsx `GoalsScreen` + `AddEditGoal`). Goals are Pro-only
// (docs/MONETIZATION.md) and pure bookkeeping — no account is ever linked
// or moved (docs/design_system/templates/spendtr-app/goals.jsx footer note,
// implementation plan §8 "Goal → account link" is deliberately dropped).
// Currency follows the user's base currency; there is no per-goal picker.
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useGoals } from '@/hooks/useGoals';
import { useSettings } from '@/hooks/useSettings';
import { Amount, Button, CategoryIcon, EmptyState, Field, Group, Icon, Input, Note, PickerRow, PrivacyLine, SectionLabel, Sheet, Track } from '@/components/ds';
import * as goalRepository from '@/repositories/goalRepository';
import { PaywallRequiredError } from '@/types/errors';
import { majorToMinor } from '@/utils/money';
import { formatGroupedAmountMinor } from '@/utils/money';
import { todayIsoDate } from '@/utils/date';

const GOAL_ICONS = ['umbrella', 'airplane', 'laptop', 'home', 'car', 'school', 'heart', 'trophy'] as const;
const GOAL_COLORS = ['#14B8A6', '#F97316', '#6366F1', '#22C55E', '#EC4899', '#EAB308'];

export default function GoalsScreen() {
  const { colors, space, font } = useTheme();
  const router = useRouter();
  const { goals, loading, refetch } = useGoals();
  const { settings } = useSettings();
  const { currencies } = useCurrencies();
  const [progressByGoalId, setProgressByGoalId] = useState<Map<string, number>>(new Map());
  const [editorOpen, setEditorOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(GOAL_ICONS[0]);
  const [color, setColor] = useState<string>(GOAL_COLORS[0]!);
  const [targetText, setTargetText] = useState('');
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const currency = currencies.find((c) => c.code === (settings?.baseCurrencyCode ?? 'USD'));
  const decimalDigits = currency?.decimalDigits ?? 2;
  const symbol = currency?.symbol ?? '$';

  function money(amountMinor: number): string {
    return formatGroupedAmountMinor(amountMinor, { symbol, decimalDigits, currencyCode: currency?.code ?? 'USD' });
  }

  function formatTargetDate(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  function handleTargetDateChange(_event: DateTimePickerChangeEvent, selected: Date) {
    if (Platform.OS === 'android') setDatePickerOpen(false);
    setTargetDate(todayIsoDate(selected));
  }

  useFocusEffect(
    useCallback(() => {
      goalRepository.list().then(async (rows) => {
        const entries = await Promise.all(
          rows.map(async (g) => [g.id, (await goalRepository.getProgress(g.id)).contributedMinor] as const),
        );
        setProgressByGoalId(new Map(entries));
      });
    }, []),
  );

  const totalSaved = useMemo(
    () => goals.reduce((sum, g) => sum + (progressByGoalId.get(g.id) ?? 0), 0),
    [goals, progressByGoalId],
  );
  const totalTarget = useMemo(() => goals.reduce((sum, g) => sum + g.targetAmountMinor, 0), [goals]);

  function openCreate() {
    setName('');
    setIcon(GOAL_ICONS[0]);
    setColor(GOAL_COLORS[0]!);
    setTargetText('');
    setTargetDate(null);
    setEditorOpen(true);
  }

  async function save() {
    const targetAmountMinor = majorToMinor(parseFloat(targetText) || 0, decimalDigits);
    if (!name.trim()) {
      Alert.alert('Name this goal');
      return;
    }
    if (!targetAmountMinor) {
      Alert.alert('Enter a target above zero');
      return;
    }
    setSaving(true);
    try {
      await goalRepository.create({
        name: name.trim(),
        targetAmountMinor,
        currencyCode: currency?.code ?? 'USD',
        targetDate: targetDate ?? undefined,
        icon,
        color,
      });
      setEditorOpen(false);
      refetch();
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        setEditorOpen(false);
        router.push({ pathname: '/paywall', params: { reason: e.reason } });
      } else {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[12], paddingTop: space[8], paddingBottom: space[8] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>Goals</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Add a goal" onPress={openCreate} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="add" size={22} color={colors.accent} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space[60] }}>
        {!loading && goals.length === 0 ? (
          <View style={{ paddingHorizontal: space[20] }}>
            <EmptyState
              icon="flag"
              title="No goals yet"
              message="A goal is just a target and a date. Spendtr tracks what you put aside — it never moves money."
              actionLabel="Set a goal"
              onAction={openCreate}
            />
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: space[20], paddingBottom: space[14] }}>
              <Group>
                <View style={{ padding: space[14] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <SectionLabel size="xs">Put aside so far</SectionLabel>
                    <Amount amountMinor={totalSaved} currencyCode={currency?.code} decimalDigits={decimalDigits} showCode={false} size="xl" />
                  </View>
                  <View style={{ marginTop: space[10] }}>
                    <Track percent={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0} />
                  </View>
                  <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[8] }}>
                    of {money(totalTarget)} across {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
                  </Text>
                </View>
              </Group>
            </View>

            {goals.map((g) => {
              const saved = progressByGoalId.get(g.id) ?? 0;
              const percent = g.targetAmountMinor > 0 ? (saved / g.targetAmountMinor) * 100 : 0;
              const left = Math.max(0, g.targetAmountMinor - saved);
              return (
                <Pressable
                  key={g.id}
                  onPress={() => router.push(`/goal/${g.id}` as Href)}
                  style={{ paddingHorizontal: space[20], paddingVertical: space[14], borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[12] }}>
                    <CategoryIcon icon={g.icon} color={g.color} size={38} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                        {g.name}
                      </Text>
                      {g.targetDate ? (
                        <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 }}>by {g.targetDate}</Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Amount amountMinor={saved} currencyCode={currency?.code} decimalDigits={decimalDigits} showCode={false} />
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1, fontVariant: ['tabular-nums'] }}>
                        of {money(g.targetAmountMinor)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: space[10] }}>
                    <Track percent={percent} color={g.color} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[6] }}>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>{Math.round(percent)}%</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                      {money(left)} to go
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            <View style={{ padding: space[20] }}>
              <PrivacyLine>Goals are bookkeeping only — no account is ever moved or linked.</PrivacyLine>
            </View>
          </>
        )}
      </ScrollView>

      <Sheet
        visible={editorOpen}
        title="New goal"
        subtitle="A target, a date, and how far you are"
        onClose={() => setEditorOpen(false)}
        height={0.8}
        footer={
          <Button variant="primary" fullWidth loading={saving} onPress={save}>
            Create goal
          </Button>
        }
      >
        <ScrollView contentContainerStyle={{ padding: space[20] }} keyboardShouldPersistTaps="handled">
          <Field label="Goal name">
            <Input value={name} onChangeText={setName} placeholder="What are you saving for?" maxLength={80} />
          </Field>

          <Field label="Icon">
            <View style={{ flexDirection: 'row', gap: space[8], flexWrap: 'wrap' }}>
              {GOAL_ICONS.map((n) => (
                <Pressable key={n} accessibilityRole="button" accessibilityLabel={n} onPress={() => setIcon(n)}>
                  <CategoryIcon icon={n} color={color} size={40} selected={icon === n} />
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Colour">
            <View style={{ flexDirection: 'row', gap: space[10] }}>
              {GOAL_COLORS.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={c}
                  onPress={() => setColor(c)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: c,
                    borderWidth: color === c ? 2 : 0,
                    borderColor: colors.text,
                  }}
                />
              ))}
            </View>
          </Field>

          <Field label="Target amount">
            <Input value={targetText} onChangeText={setTargetText} keyboardType="decimal-pad" placeholder="0.00" />
          </Field>

          <Field label="Target date" hint="Used only to work out a suggested monthly amount.">
            <PickerRow
              icon="calendar-outline"
              label="Reach it by"
              value={targetDate ? formatTargetDate(targetDate) : 'No date set'}
              onPress={() => setDatePickerOpen(true)}
            />
          </Field>
          {datePickerOpen ? (
            <View>
              <DateTimePicker
                value={targetDate ? new Date(`${targetDate}T00:00:00`) : new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onValueChange={handleTargetDateChange}
                onDismiss={() => setDatePickerOpen(false)}
              />
              {Platform.OS === 'ios' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDatePickerOpen(false)}
                  style={{ alignItems: 'flex-end', paddingVertical: space[10] }}
                >
                  <Text style={{ color: colors.accent, fontWeight: '700' }}>Done</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={{ marginTop: space[16] }}>
            <Note tone="info">Contributions are recorded against the goal — Spendtr never moves or reserves money on its own.</Note>
          </View>
        </ScrollView>
      </Sheet>
    </SafeAreaView>
  );
}
