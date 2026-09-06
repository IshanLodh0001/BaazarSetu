import React from "react";
import { SafeAreaView, ScrollView, View, Text, Pressable } from "react-native";
import { User, Pencil, MapPin, LogOut } from "lucide-react-native";

export default function ProfileScreen({ navigation }) {
  const handleEditProfile = () => {
    console.log("Edit Profile pressed");
  };

  const handleLogout = () => {
    console.log("Logout pressed");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="font-heading text-h1 text-primary">
            My Profile
          </Text>
        </View>

        {/* Profile Card */}
        <View className="mb-6 rounded-2.5xl border border-border bg-surface p-5">
          {/* Avatar + Basic Info */}
          <View className="flex-row items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              <User size={30} color="#FFFCF7" />
            </View>

            <View className="ml-4 flex-1">
              <Text className="font-headingSemiBold text-h2 text-text">
                {" "}
              </Text>

              <Text className="mt-1 font-sans text-body-sm text-muted">
                {" "}
              </Text>
            </View>

            
          </View>
        </View>

        {/* Edit Profile */}
        <Pressable
          onPress={handleEditProfile}
          className="mt-5 flex-row items-center justify-center rounded-xl bg-primary py-3 active:bg-primary-dark"
        >
          <Pencil size={16} color="#FFFCF7" />

          <Text className="ml-2 font-sansSemiBold text-body-sm text-surface">
            Edit Profile
          </Text>
        </Pressable>
      </View>

      {/* Logout */}
      <Pressable
        onPress={handleLogout}
        className="flex-row items-center justify-center rounded-2.5xl border border-border bg-surface p-4 active:bg-background/50"
      >
        <LogOut size={20} color="#B65345" />

        <Text className="ml-2 font-sansSemiBold text-body text-error">
          Logout
        </Text>
      </Pressable>
    </ScrollView>
    </SafeAreaView >
  );
}
