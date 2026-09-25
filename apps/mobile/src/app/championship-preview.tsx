import { Redirect } from 'expo-router';
import { ChampionshipPreview } from '@/components/ChampionshipPreview';

export default function ChampionshipPreviewRoute() {
  return __DEV__ ? <ChampionshipPreview /> : <Redirect href="/(tabs)/stats" />;
}
