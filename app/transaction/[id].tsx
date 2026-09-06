// Transaction edit/delete — previously missing entirely (Home rows were
// non-pressable). transactionRepository.update/delete already exist
// (docs/API_DESIGN.md); this is the screen that finally calls them.
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useTransactions } from '@/hooks/useTransactions';
import { CategoryPicker } from '@/components/CategoryPicker';
import { DatePicker } from '@/components/DatePicker';
import { Button, CategoryIcon, Chip, Field, Icon, Input, SectionLabel } from '@/components/ds';
import { SplitTransactionSheet, type SplitRow } from '@/components/SplitTransactionSheet';
import * as transactionRepository from '@/repositories/transactionRepository';
import { formatGroupedAmountMinor, majorToMinor, minorToMajor } from '@/utils/money';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, space, font } = useTheme();
  const router = useRouter();
  const { transactions, loading, refetch } = useTransactions();
  const { currencies } = useCurrencies();
  const [busy, setBusy] = useState(false);

  const transaction = useMemo(() => transactions.find((t) => t.id === id), [transactions, id]);
  const currency = currencies.find((c) => c.code === transaction?.currencyCode);
  const { categories } = useCategories(transaction?.type === 'income' ? 'income' : 'expense');

  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [occurredAt, setOccurredAt] = useState('');
  const [note, setNote] = useState('');
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [showSplitSheet, setShowSplitSheet] = useState(false);

  // `transactions` loads asynchronously, so `transaction` is briefly
  // undefined on first render. The form fields must (re)hydrate once the
  // real row arrives — a plain useState initializer only runs once and was
  // left stuck at these empty defaults even after the transaction loaded.
  useEffect(() => {
    if (!transaction || hydratedId === transaction.id) return;
    setAmountText(String(minorToMajor(transaction.amountMinor, currency?.decimalDigits ?? 2)));
    setCategoryId(transaction.categoryId ?? null);
    setOccurredAt(transaction.occurredAt.slice(0, 10));
    setNote(transaction.note ?? '');
    setHydratedId(transaction.id);
    if (transaction.isSplit) {
      transactionRepository.getSplits(transaction.id).then((rows) => {
        setSplits(rows.map((r) => ({ categoryId: r.categoryId ?? undefined, amountMinor: r.amountMinor })));
      });
    } else {
      setSplits([]);
    }
  }, [transaction, currency, hydratedId]);

  if (loading && !transaction) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (!transaction) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Text style={{ color: colors.textMuted, padding: space[20] }}>Transaction not found.</Text>
      </SafeAreaView>
    );
  }

  const isTransfer = transaction.type === 'transfer';

  async function save() {
    const amountMinor = majorToMinor(parseFloat(amountText) || 0, currency?.decimalDigits ?? 2);
    const isSplit = splits.length >= 2;
    if (isSplit && splits.reduce((sum, s) => sum + s.amountMinor, 0) !== amountMinor) {
      Alert.alert('Split doesn’t match the amount', 'Reopen Split and allocate the full amount before saving.');
      return;
    }
    setBusy(true);
    try {
      await transactionRepository.update(transaction!.id, {
        amountMinor,
        categoryId: isSplit ? undefined : (categoryId ?? undefined),
        splits: isSplit ? splits : undefined,
        note: note || undefined,
        occurredAt,
      });
      await refetch();
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await transactionRepository.delete(transaction!.id);
            await refetch();
            router.back();
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : 'Unknown error');
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
        <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>{isTransfer ? 'Transfer' : 'Transaction'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Delete" onPress={confirmDelete} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>

      {isTransfer ? (
        <View style={{ padding: space[20] }}>
          <Text style={{ color: colors.text, fontSize: font.size['2xl'], fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {formatGroupedAmountMinor(transaction.amountMinor, {
              symbol: '',
              decimalDigits: currency?.decimalDigits ?? 2,
              currencyCode: transaction.currencyCode,
            })}{' '}
            {transaction.currencyCode}
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: space[8], fontSize: font.size.bodySm }}>
            Editing a transfer isn&apos;t supported yet — delete and re-enter it if something&apos;s wrong.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: space[20], paddingBottom: space[60] }} keyboardShouldPersistTaps="handled">
          <Field label="Amount">
            <Input
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              style={{ fontSize: font.size['2xl'], fontWeight: '700', fontVariant: ['tabular-nums'] }}
            />
          </Field>

          <View style={{ marginBottom: space[8], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel size="sm">Category</SectionLabel>
            {categories.length >= 2 && splits.length < 2 ? (
              <Chip icon="pie-chart" label="Split" onPress={() => setShowSplitSheet(true)} />
            ) : null}
          </View>
          {splits.length >= 2 ? (
            <Pressable
              onPress={() => setShowSplitSheet(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space[8], padding: space[12], borderRadius: 10, backgroundColor: colors.accentQuiet }}
            >
              <CategoryIcon icon="pie-chart" color={colors.accent} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Split across {splits.length} categories</Text>
                <Text style={{ color: colors.accent, fontSize: 12, marginTop: 2 }}>Tap to edit</Text>
              </View>
            </Pressable>
          ) : (
            <CategoryPicker
              categories={categories}
              selectedId={categoryId}
              onSelect={(c) => setCategoryId(c.id)}
              height={Math.ceil(categories.length / 4) * 88}
            />
          )}

          <View style={{ marginTop: space[16], marginBottom: space[8] }}>
            <SectionLabel size="sm">Date</SectionLabel>
          </View>
          <DatePicker value={occurredAt} onChange={setOccurredAt} />

          <View style={{ marginTop: space[16] }}>
            <Field label="Note">
              <Input value={note} onChangeText={setNote} placeholder="Note" maxLength={280} />
            </Field>
          </View>

          <View style={{ marginTop: space[8] }}>
            <Button fullWidth disabled={busy} onPress={save}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </View>
        </ScrollView>
      )}

      <SplitTransactionSheet
        visible={showSplitSheet}
        onClose={() => setShowSplitSheet(false)}
        onSave={(rows) => {
          setSplits(rows);
          setCategoryId(null);
          setShowSplitSheet(false);
        }}
        totalMinor={majorToMinor(parseFloat(amountText) || 0, currency?.decimalDigits ?? 2)}
        currencyCode={transaction.currencyCode}
        decimalDigits={currency?.decimalDigits ?? 2}
        symbol={currency?.symbol ?? '$'}
        categories={categories}
        initialSplits={splits}
      />
    </SafeAreaView>
  );
}
