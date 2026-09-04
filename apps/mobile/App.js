import "./global.css";

import { ScrollView, Text, View } from "react-native";

import { useFonts } from "@expo-google-fonts/inter/useFonts";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";

import { useFonts as useNewsreaderFonts } from "@expo-google-fonts/newsreader/useFonts";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader/400Regular";
import { Newsreader_500Medium } from "@expo-google-fonts/newsreader/500Medium";
import { Newsreader_600SemiBold } from "@expo-google-fonts/newsreader/600SemiBold";

import { useFonts as useJetBrainsFonts } from "@expo-google-fonts/jetbrains-mono/useFonts";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono/400Regular";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono/500Medium";
import { JetBrainsMono_600SemiBold } from "@expo-google-fonts/jetbrains-mono/600SemiBold";
import { JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono/700Bold";

export default function App() {
  const [interLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [newsreaderLoaded] = useNewsreaderFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
  });

  const [jetbrainsLoaded] = useJetBrainsFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  if (!interLoaded || !newsreaderLoaded || !jetbrainsLoaded) {
    return null;
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 py-16">

        {/* Header */}
        <Text className="font-heading text-4xl text-primary">
          BazaarSetu
        </Text>

        <Text className="mt-3 font-sans text-base text-text">
          Discover craft worth doing business with.
        </Text>

        <Text className="mt-2 font-mono text-xs text-muted">
          DESIGN SYSTEM TEST
        </Text>

        {/* Divider */}
        <View className="my-10 h-px bg-border" />

        {/* Typography */}
        <Text className="font-mono text-xs text-muted">
          TYPOGRAPHY
        </Text>

        <Text className="mt-4 font-heading text-3xl text-primary">
          Craft with a story.
        </Text>

        <Text className="mt-3 font-sans text-base leading-6 text-text">
          A marketplace connecting traditional artisans with modern
          businesses.
        </Text>

        <Text className="mt-4 font-sansMedium text-sm text-text">
          Inter Medium — UI / Body
        </Text>

        <Text className="mt-2 font-mono text-xs text-muted">
          JetBrains Mono — DATA / METADATA
        </Text>

        {/* Color section */}
        <View className="my-10 h-px bg-border" />

        <Text className="font-mono text-xs text-muted">
          COLOR PALETTE
        </Text>

        {/* Primary */}
        <View className="mt-5 overflow-hidden rounded-xl border border-border">
          <View className="h-24 bg-primary" />

          <View className="bg-surface p-4">
            <Text className="font-sansSemiBold text-sm text-text">
              Primary
            </Text>

            <Text className="mt-1 font-mono text-xs text-muted">
              #304238
            </Text>
          </View>
        </View>

        {/* Accent */}
        <View className="mt-4 overflow-hidden rounded-xl border border-border">
          <View className="h-24 bg-accent" />

          <View className="bg-surface p-4">
            <Text className="font-sansSemiBold text-sm text-text">
              Accent
            </Text>

            <Text className="mt-1 font-mono text-xs text-muted">
              #C86643
            </Text>
          </View>
        </View>

        {/* Secondary */}
        <View className="mt-4 overflow-hidden rounded-xl border border-border">
          <View className="h-24 bg-secondary" />

          <View className="bg-surface p-4">
            <Text className="font-sansSemiBold text-sm text-text">
              Secondary
            </Text>

            <Text className="mt-1 font-mono text-xs text-muted">
              #806A52
            </Text>
          </View>
        </View>

        {/* Gold */}
        <View className="mt-4 overflow-hidden rounded-xl border border-border">
          <View className="h-24 bg-gold" />

          <View className="bg-surface p-4">
            <Text className="font-sansSemiBold text-sm text-text">
              Gold
            </Text>

            <Text className="mt-1 font-mono text-xs text-muted">
              #C49A55
            </Text>
          </View>
        </View>

        {/* Status colors */}
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 overflow-hidden rounded-xl border border-border">
            <View className="h-20 bg-success" />

            <View className="bg-surface p-3">
              <Text className="font-sansSemiBold text-xs text-text">
                Success
              </Text>
            </View>
          </View>

          <View className="flex-1 overflow-hidden rounded-xl border border-border">
            <View className="h-20 bg-error" />

            <View className="bg-surface p-3">
              <Text className="font-sansSemiBold text-xs text-text">
                Error
              </Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View className="my-10 h-px bg-border" />

        <Text className="font-mono text-xs text-muted">
          COMPONENTS
        </Text>

        <View className="mt-5 gap-3">

          {/* Primary button */}
          <View className="items-center rounded-xl bg-primary px-5 py-4">
            <Text className="font-sansSemiBold text-sm text-surface">
              Primary Action
            </Text>
          </View>

          {/* Secondary button */}
          <View className="items-center rounded-xl border border-border bg-surface px-5 py-4">
            <Text className="font-sansSemiBold text-sm text-text">
              Secondary Action
            </Text>
          </View>

          {/* Accent button */}
          <View className="items-center rounded-xl bg-accent px-5 py-4">
            <Text className="font-sansSemiBold text-sm text-surface">
              Accent Action
            </Text>
          </View>

        </View>

        {/* Product-style card */}
        <View className="my-10 h-px bg-border" />

        <Text className="font-mono text-xs text-muted">
          SURFACE / CARD
        </Text>

        <View className="mt-5 rounded-2xl border border-border bg-surface p-5">

          <Text className="font-heading text-2xl text-primary">
            Handwoven Cotton
          </Text>

          <Text className="mt-2 font-sans text-sm leading-5 text-muted">
            Naturally dyed textile crafted by artisans using traditional
            weaving techniques.
          </Text>

          <View className="mt-5 flex-row items-center justify-between">
            <Text className="font-mono text-xs text-muted">
              SKU-2048
            </Text>

            <Text className="font-sansBold text-base text-primary">
              ₹1,850
            </Text>
          </View>

        </View>

      </View>
    </ScrollView>
  );
}