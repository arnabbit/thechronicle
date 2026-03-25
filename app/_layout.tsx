import { useFonts } from 'expo-font';
import {
  Newsreader_400Regular,
  Newsreader_700Bold,
  Newsreader_400Regular_Italic,
  Newsreader_700Bold_Italic,
} from '@expo-google-fonts/newsreader';
import {
  PublicSans_300Light,
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_700Bold,
    Newsreader_400Regular_Italic,
    Newsreader_700Bold_Italic,
    PublicSans_300Light,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
