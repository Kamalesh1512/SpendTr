import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';

interface CardProps {
  children: ReactNode;
}

export function Card({ children }: CardProps) {
  const colors = useAppColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
});
