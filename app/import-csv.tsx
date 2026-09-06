// CSVImport (docs/design_system/templates/spendtr-app/data-mgmt.jsx
// `CsvImportScreen`, docs/USER_FLOWS.md Flow 13). Three steps with the step
// count in the header: choose file -> map columns against a live five-row
// preview -> summary. Pro-only, grouped with export
// (docs/MONETIZATION.md "CSV export and import").
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { AccountPickerSheet } from '@/components/AccountPickerSheet';
import { Button, Group, Icon, Note, PickerRow, PrivacyLine, SectionLabel, SettingsRow, Sheet } from '@/components/ds';
import {
  evaluateCsvRows,
  importTransactionsFromCsv,
  parseCsv,
  pickCsvFile,
  type CsvColumnMapping,
  type CsvImportSummary,
  type CsvParseResult,
  type CsvRowResult,
  type DecimalStyle,
} from '@/services/export';
import { PaywallRequiredError } from '@/types/errors';

type MappableField = 'dateColumn' | 'noteColumn' | 'amountColumn' | 'currencyColumn' | 'categoryColumn';

const MAP_FIELDS: { field: MappableField; sourceHint: string; label: string; required: boolean }[] = [
  { field: 'dateColumn', sourceHint: 'date', label: 'Date', required: true },
  { field: 'noteColumn', sourceHint: 'description / note', label: 'Note', required: false },
  { field: 'amountColumn', sourceHint: 'amount', label: 'Amount', required: true },
  { field: 'currencyColumn', sourceHint: 'currency', label: 'Currency', required: false },
  { field: 'categoryColumn', sourceHint: 'category', label: 'Category', required: false },
];

function guessMapping(headers: string[]): CsvColumnMapping {
  const find = (keywords: string[]) => headers.findIndex((h) => keywords.some((k) => h.toLowerCase().includes(k)));
  const dateColumn = find(['date']);
  const amountColumn = find(['amount', 'value', 'total']);
  const noteColumn = find(['desc', 'note', 'memo', 'narrative']);
  const currencyColumn = find(['curr']);
  const categoryColumn = find(['cat']);
  return {
    dateColumn: dateColumn === -1 ? 0 : dateColumn,
    amountColumn: amountColumn === -1 ? Math.min(1, headers.length - 1) : amountColumn,
    noteColumn: noteColumn === -1 ? null : noteColumn,
    currencyColumn: currencyColumn === -1 ? null : currencyColumn,
    categoryColumn: categoryColumn === -1 ? null : categoryColumn,
    decimalStyle: 'dot',
  };
}

export default function ImportCsvScreen() {
  const { colors, space, font, radius, borderWidth } = useTheme();
  const router = useRouter();
  const { accounts } = useAccounts();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [mapping, setMapping] = useState<CsvColumnMapping | null>(null);
  const [mapFieldOpen, setMapFieldOpen] = useState<MappableField | null>(null);
  const [previewResults, setPreviewResults] = useState<CsvRowResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<CsvImportSummary | null>(null);

  const account = accounts.find((a) => a.id === accountId) ?? accounts.find((a) => a.isDefault) ?? accounts[0];

  useEffect(() => {
    if (accountId === null && account) setAccountId(account.id);
  }, [accountId, account]);

  const readyCount = useMemo(() => previewResults.filter((r) => r.status === 'ready').length, [previewResults]);

  useEffect(() => {
    if (!parsed || !mapping || !account) {
      setPreviewResults([]);
      return;
    }
    let cancelled = false;
    evaluateCsvRows(parsed, mapping, { accountId: account.id, defaultCurrencyCode: account.currencyCode }).then((rows) => {
      if (!cancelled) setPreviewResults(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [parsed, mapping, account]);

  async function chooseFile() {
    const picked = await pickCsvFile();
    if (!picked) return;
    const result = parseCsv(picked.content);
    setFileName(picked.name);
    setParsed(result);
    setMapping(guessMapping(result.headers));
    setStep(2);
  }

  function setDecimalStyle(decimalStyle: DecimalStyle) {
    setMapping((m) => (m ? { ...m, decimalStyle } : m));
  }

  function setFieldColumn(field: MappableField, columnIndex: number | null) {
    setMapping((m) => (m ? { ...m, [field]: columnIndex } : m));
    setMapFieldOpen(null);
  }

  async function runImport() {
    if (!parsed || !mapping || !account) return;
    setBusy(true);
    try {
      const result = await importTransactionsFromCsv(parsed, mapping, {
        accountId: account.id,
        defaultCurrencyCode: account.currencyCode,
      });
      setSummary(result);
      setStep(3);
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        router.replace({ pathname: '/paywall', params: { reason: e.reason } });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[16], paddingTop: space[8], paddingBottom: space[8] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>Import a CSV</Text>
        <Text style={{ fontSize: font.size.sm, color: colors.textMuted, minWidth: 50, textAlign: 'right' }}>Step {step}/3</Text>
      </View>

      {step === 1 ? (
        <ScrollView contentContainerStyle={{ padding: space[20] }}>
          <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted, marginBottom: space[20], lineHeight: 20 }}>
            Export a CSV from your bank or your old tracker. Nothing is uploaded — the file is read on this phone.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={chooseFile}
            style={{
              alignItems: 'center',
              gap: space[10],
              padding: space[24] + 10,
              borderRadius: radius.lg,
              borderWidth: borderWidth.thin,
              borderStyle: 'dashed',
              borderColor: colors.borderStrong,
            }}
          >
            <Icon name="folder-open-outline" size={26} color={colors.accent} />
            <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.accent }}>Choose a .csv file</Text>
          </Pressable>

          {accounts.length > 1 ? (
            <View style={{ marginTop: space[20] }}>
              <SectionLabel size="md">Import into</SectionLabel>
              <PickerRow
                icon={(account?.icon as never) ?? 'wallet'}
                iconColor={account?.color}
                label="Account"
                value={account ? `${account.name} · ${account.currencyCode}` : 'Select account'}
                onPress={() => setShowAccountPicker(true)}
              />
              <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[6] }}>
                Rows without a currency column use {account?.currencyCode}.
              </Text>
            </View>
          ) : null}

          <View style={{ marginTop: space[20] }}>
            <PrivacyLine>Parsing happens on-device. The file is never copied off the phone.</PrivacyLine>
          </View>
        </ScrollView>
      ) : step === 2 && parsed && mapping ? (
        <>
          <ScrollView contentContainerStyle={{ padding: space[20], paddingBottom: space[8] }}>
            <Group>
              <SettingsRow label={fileName ?? 'file.csv'} hint={`${parsed.rows.length} rows · header row detected`} last />
            </Group>

            <View style={{ marginTop: space[20], marginBottom: space[8] }}>
              <SectionLabel size="md">Match the columns</SectionLabel>
            </View>
            {MAP_FIELDS.map((f) => {
              const columnIndex = mapping[f.field];
              const label = columnIndex !== null ? (parsed.headers[columnIndex] ?? `Column ${columnIndex + 1}`) : 'Skip this column';
              return (
                <Pressable
                  key={f.field}
                  accessibilityRole="button"
                  onPress={() => setMapFieldOpen(f.field)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space[10], marginBottom: space[8] }}
                >
                  <Text style={{ width: 70, fontSize: 11, color: colors.textMuted }}>{f.label}</Text>
                  <Icon name="arrow-forward" size={14} color={colors.textMuted} />
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: 40,
                      paddingHorizontal: space[12],
                      backgroundColor: colors.surfaceRaised,
                      borderWidth: borderWidth.hairline,
                      borderColor: colors.border,
                      borderRadius: radius.sm,
                    }}
                  >
                    <Text style={{ fontSize: font.size.sm, color: columnIndex !== null ? colors.text : colors.textMuted }}>{label}</Text>
                    <Icon name="chevron-down" size={14} color={colors.textMuted} />
                  </View>
                </Pressable>
              );
            })}

            <View style={{ flexDirection: 'row', gap: space[8], marginTop: space[6], marginBottom: space[10] }}>
              <Pressable onPress={() => setDecimalStyle('dot')} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: borderWidth.hairline, borderColor: mapping.decimalStyle === 'dot' ? colors.accent : colors.border }}>
                <Text style={{ fontSize: 12, color: mapping.decimalStyle === 'dot' ? colors.accent : colors.textMuted }}>1,234.56</Text>
              </Pressable>
              <Pressable onPress={() => setDecimalStyle('comma')} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: borderWidth.hairline, borderColor: mapping.decimalStyle === 'comma' ? colors.accent : colors.border }}>
                <Text style={{ fontSize: 12, color: mapping.decimalStyle === 'comma' ? colors.accent : colors.textMuted }}>1.234,56</Text>
              </Pressable>
            </View>

            {readyCount < previewResults.length ? (
              <Note tone="warn">
                {previewResults.length - readyCount} of the first {previewResults.length} rows can&apos;t be read with this mapping — try the other decimal style, or check the Amount/Date columns.
              </Note>
            ) : null}

            <View style={{ marginTop: space[20], marginBottom: space[8] }}>
              <SectionLabel size="md">Live preview · first 5 rows</SectionLabel>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={{ flexDirection: 'row', borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border }}>
                  {parsed.headers.map((h) => (
                    <Text key={h} style={{ width: 110, fontSize: 11, color: colors.textMuted, paddingVertical: 6, paddingRight: 10 }}>
                      {h}
                    </Text>
                  ))}
                </View>
                {parsed.rows.slice(0, 5).map((row, i) => {
                  const bad = previewResults[i]?.status === 'skipped';
                  return (
                    <View key={i} style={{ flexDirection: 'row', backgroundColor: bad ? colors.dangerQuiet : 'transparent', borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border }}>
                      {row.map((cell, j) => (
                        <Text key={j} style={{ width: 110, fontSize: 11, color: bad ? colors.danger : colors.text, paddingVertical: 6, paddingRight: 10 }} numberOfLines={1}>
                          {cell || '—'}
                        </Text>
                      ))}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[10] }}>
              Negative amounts become expenses; positive become income. Unmatched category names become new categories.
            </Text>
          </ScrollView>
          <View style={{ padding: space[16], borderTopWidth: borderWidth.hairline, borderTopColor: colors.border }}>
            <Button variant="primary" fullWidth loading={busy} disabled={readyCount === 0} onPress={runImport}>
              {readyCount === 0 ? 'No rows to import' : `Import ${readyCount} row${readyCount === 1 ? '' : 's'}`}
            </Button>
            <View style={{ marginTop: space[4] }}>
              <Button variant="quiet" fullWidth onPress={() => setStep(1)}>
                Back to file
              </Button>
            </View>
          </View>

          <Sheet visible={mapFieldOpen !== null} title="Match this field" onClose={() => setMapFieldOpen(null)} height={0.5}>
            <ScrollView contentContainerStyle={{ padding: space[20] }}>
              {mapFieldOpen && !MAP_FIELDS.find((f) => f.field === mapFieldOpen)?.required ? (
                <Pressable
                  onPress={() => setFieldColumn(mapFieldOpen, null)}
                  style={{ paddingVertical: space[12], borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: font.size.body }}>Skip this column</Text>
                </Pressable>
              ) : null}
              {parsed.headers.map((h, i) => (
                <Pressable
                  key={h + i}
                  onPress={() => mapFieldOpen && setFieldColumn(mapFieldOpen, i)}
                  style={{ paddingVertical: space[12], borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontSize: font.size.body }}>{h}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Sheet>
        </>
      ) : step === 3 && summary ? (
        <ScrollView contentContainerStyle={{ padding: space[20] }}>
          <View style={{ alignItems: 'center', gap: space[10] }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.successQuiet, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="checkmark-circle" size={26} color={colors.success} />
            </View>
            <Text style={{ fontSize: font.size['2xl'], fontWeight: '700', color: colors.text }}>
              {summary.importedCount} of {summary.importedCount + summary.skippedCount} rows imported
            </Text>
            <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted, textAlign: 'center' }}>
              Added to {account?.name ?? 'your account'}.
            </Text>
          </View>

          {summary.newCategoryNames.length > 0 ? (
            <View style={{ marginTop: space[20] }}>
              <Group>
                <SettingsRow
                  icon={<Icon name="pricetag" size={18} color={colors.accent} />}
                  label={`${summary.newCategoryNames.length} new categor${summary.newCategoryNames.length === 1 ? 'y' : 'ies'} created`}
                  hint={summary.newCategoryNames.join(', ')}
                  last
                />
              </Group>
            </View>
          ) : null}

          {summary.skippedRows.length > 0 ? (
            <View style={{ marginTop: space[20] }}>
              <SectionLabel size="md">{summary.skippedRows.length} rows skipped</SectionLabel>
              <Group>
                {summary.skippedRows.map((r, i) => (
                  <SettingsRow
                    key={`${r.rowNumber}-${i}`}
                    icon={<Icon name="alert-circle-outline" size={18} color={colors.warning} />}
                    label={`Row ${r.rowNumber}`}
                    hint={r.reason}
                    last={i === summary.skippedRows.length - 1}
                  />
                ))}
              </Group>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      {step === 1 ? (
        <View style={{ padding: space[16], borderTopWidth: borderWidth.hairline, borderTopColor: colors.border }}>
          <Button variant="primary" fullWidth disabled>
            Choose a file to continue
          </Button>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ padding: space[16], borderTopWidth: borderWidth.hairline, borderTopColor: colors.border }}>
          <Button variant="primary" fullWidth onPress={() => router.back()}>
            Done
          </Button>
        </View>
      ) : null}

      <AccountPickerSheet
        visible={showAccountPicker}
        accounts={accounts}
        selectedId={accountId}
        onSelect={(a) => {
          setAccountId(a.id);
          setShowAccountPicker(false);
        }}
        onClose={() => setShowAccountPicker(false)}
      />
    </SafeAreaView>
  );
}
