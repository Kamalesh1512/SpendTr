import { useRouter } from 'expo-router';
import { PaywallModal } from '@/components/PaywallModal';
import { useSettings } from '@/hooks/useSettings';

export default function PaywallRoute() {
  const router = useRouter();
  const { refetch } = useSettings();

  return (
    <PaywallModal
      onPurchased={() => {
        refetch();
        router.back();
      }}
      onClose={() => router.back()}
    />
  );
}
