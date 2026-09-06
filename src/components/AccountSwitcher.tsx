// AccountSwitcher — anchored popover under Home's account pill
// (docs/design_system/templates/spendtr-app/accounts.jsx `AccountSwitcher`,
// implementation plan §4 "AccountSwitcher | accounts.jsx | Popover").
// "Showing" a row selects and dismisses, mirroring every other picker in
// the app — no confirm button. Balances render in each account's own
// currency; only "All accounts" converts, and only when it actually could
// (docs/design_system/readme.md "the base-currency echo only appears when
// currencies differ" — the same discipline applied here: an unconverted
// account's currency is named rather than silently mis-summed).
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Popover, Amount, CategoryIcon, Icon, SectionLabel } from './ds';
import { useTheme } from '../theme/ThemeProvider';
import type { Account } from '../repositories/accountRepository';
import * as accountRepository from '../repositories/accountRepository';

export type AccountSwitcherSelection = { kind: 'all' } | { kind: 'account'; accountId: string };

interface AccountSwitcherProps {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
  selection: AccountSwitcherSelection;
  onSelect: (selection: AccountSwitcherSelection) => void;
  onAddAccount: () => void;
  anchorTop: number;
  anchorLeft: number;
}

export function AccountSwitcher({
  visible,
  onClose,
  accounts,
  selection,
  onSelect,
  onAddAccount,
  anchorTop,
  anchorLeft,
}: AccountSwitcherProps) {
  const { colors, space, font } = useTheme();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [allTotal, setAllTotal] = useState<{ totalBaseMinor: number; baseCurrencyCode: string } | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    Promise.all(accounts.map((a) => accountRepository.getCurrentBalance(a.id))).then((values) => {
      if (cancelled) return;
      setBalances(Object.fromEntries(accounts.map((a, i) => [a.id, values[i] ?? 0])));
    });
    accountRepository.getAllAccountsBaseTotal().then((result) => {
      if (!cancelled) setAllTotal(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, accounts.map((a) => a.id).join(',')]);

  function select(next: AccountSwitcherSelection) {
    onSelect(next);
    onClose();
  }

  return (
    <Popover visible={visible} onClose={onClose} top={anchorTop} left={anchorLeft} width={272}>
      <View style={{ paddingHorizontal: space[14], paddingTop: space[10], paddingBottom: space[6] }}>
        <SectionLabel size="xs">Showing</SectionLabel>
      </View>

      <Row
        selected={selection.kind === 'all'}
        onPress={() => select({ kind: 'all' })}
        leading={
          <View style={styles.stackedDots}>
            {accounts.slice(0, 3).map((a, i) => (
              <View
                key={a.id}
                style={[
                  styles.dot,
                  { backgroundColor: a.color, borderColor: colors.surfaceRaised, marginLeft: i ? -7 : 0 },
                ]}
              />
            ))}
          </View>
        }
        title="All accounts"
        subtitle={allTotal ? `Converted to ${allTotal.baseCurrencyCode}` : undefined}
        trailing={
          allTotal ? (
            <Amount amountMinor={allTotal.totalBaseMinor} currencyCode={allTotal.baseCurrencyCode} size="sm" showCode={false} />
          ) : null
        }
      />

      <View style={[styles.divider, { borderTopColor: colors.border }]} />

      {accounts.map((a) => (
        <Row
          key={a.id}
          selected={selection.kind === 'account' && selection.accountId === a.id}
          onPress={() => select({ kind: 'account', accountId: a.id })}
          leading={<CategoryIcon icon={a.icon} color={a.color} size={26} />}
          title={a.name}
          subtitle={a.currencyCode}
          trailing={
            balances[a.id] !== undefined ? (
              <Amount amountMinor={balances[a.id]!} currencyCode={a.currencyCode} size="sm" showCode={false} />
            ) : null
          }
        />
      ))}

      <View style={[styles.divider, { borderTopColor: colors.border }]} />

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onClose();
          onAddAccount();
        }}
        style={[styles.row, { paddingHorizontal: space[14], gap: space[10] }]}
      >
        <Icon name="add" size={18} color={colors.accent} />
        <Text style={{ flex: 1, fontSize: font.size.bodySm, fontWeight: '600', color: colors.accent }}>
          Add an account
        </Text>
      </Pressable>
    </Popover>
  );
}

function Row({
  selected,
  onPress,
  leading,
  title,
  subtitle,
  trailing,
}: {
  selected: boolean;
  onPress: () => void;
  leading: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  const { colors, space, font } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.row,
        { paddingHorizontal: space[14], gap: space[10], backgroundColor: selected ? colors.surfaceSelected : 'transparent' },
      ]}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: font.size.bodySm, fontWeight: '600', color: colors.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontSize: font.size['2xs'], color: colors.textMuted, marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {selected ? <Icon name="checkmark" size={16} color={colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingVertical: 8 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  stackedDots: { flexDirection: 'row', width: 30 },
  dot: { width: 15, height: 15, borderRadius: 7.5, borderWidth: 2 },
});
