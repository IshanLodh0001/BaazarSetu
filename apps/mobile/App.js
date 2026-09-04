import "./global.css";

import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-bold text-primary">BazarSetu</Text>

        <Text className="mt-2 text-center text-base text-muted">
          Connecting artisans with businesses.
        </Text>

        <View className="mt-8 rounded-2xl bg-surface px-6 py-4">
          <Text className="text-lg font-semibold text-accent">
            NativeWind works
          </Text>
        </View>
      </View>
    </View>
  );
}
