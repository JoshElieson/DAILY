/**
 * Loads the bundled type families (Inter + Newsreader) used by the type scale.
 * Newsreader carries the reflective serif tone; Inter is the working voice
 * (foundations §2.1, implementation §4).
 */
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  Newsreader_400Regular,
  Newsreader_500Medium,
} from '@expo-google-fonts/newsreader';
import { useFonts } from 'expo-font';

export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Newsreader_400Regular,
    Newsreader_500Medium,
  });
  return loaded;
}
