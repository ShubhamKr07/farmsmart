import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { ThemeOverrideProvider } from "@/context/ThemeOverrideContext";

import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);

const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isSignedIn && !inAuthGroup) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeOverrideProvider>
      <RootLayoutInner />
    </ThemeOverrideProvider>
  );
}

function RootLayoutInner() {
  const colors = useColors();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <AuthGuard>
                    <Stack screenOptions={{ headerBackTitle: "Back" }}>
                      <Stack.Screen
                        name="(auth)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="cycle/[id]"
                        options={{
                          headerShown: true,
                          title: "Cycle Detail",
                          headerTintColor: colors.primary,
                        }}
                      />
                      <Stack.Screen
                        name="ask"
                        options={{
                          presentation: "modal",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="alerts"
                        options={{
                          presentation: "modal",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="search"
                        options={{
                          presentation: "modal",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="logs/index"
                        options={{
                          presentation: "modal",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="logs/[type]"
                        options={{
                          presentation: "modal",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="channel-availability"
                        options={{
                          presentation: "modal",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="seeding"
                        options={{
                          presentation: "modal",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="fertigation/[id]"
                        options={{
                          presentation: "modal",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="harvest/[id]"
                        options={{
                          presentation: "modal",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="manual-check/[id]"
                        options={{
                          presentation: "modal",
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="seed-lot/[qrCode]"
                        options={{
                          headerShown: true,
                          title: "Seed Lot",
                          headerTintColor: colors.primary,
                        }}
                      />
                    </Stack>
                  </AuthGuard>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
