import { useLocalSearchParams, useRouter } from 'expo-router';
import { PaywallModal } from '@/components/PaywallModal';
import { useSettings } from '@/hooks/useSettings';
import type { PaywallRequiredError } from '@/types/errors';

export default function PaywallRoute() {
  const router = useRouter();
  const { refetch } = useSettings();
  const { reason } = useLocalSearchParams<{ reason?: PaywallRequiredError['reason'] }>();

  return (
    <PaywallModal
      reason={reason}
      onPurchased={() => {
        refetch();
        router.back();
      }}
      onClose={() => router.back()}
    />
  );
}
