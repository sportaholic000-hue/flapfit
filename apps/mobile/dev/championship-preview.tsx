// Standalone local preview: avoids launching app services or the game screen.
// Native development builds can also use the /championship-preview route.
import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChampionshipPreview } from '../src/components/ChampionshipPreview';

function PreviewRoot() {
  return __DEV__ ? (
    <SafeAreaProvider>
      <ChampionshipPreview />
    </SafeAreaProvider>
  ) : null;
}

registerRootComponent(PreviewRoot);
