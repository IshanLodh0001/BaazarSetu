import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
} from "react-native";
import {
  User,
  Pencil,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Package,
  Heart,
  HelpCircle,
  Settings,
  LogOut,
} from "lucide-react-native";

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
        {/* 1. Header */}
        <View className="mb-6">
          <Text className="font-heading text-h1 text-primary">
            My Profile
          </Text>
        </View>

        {/* 2. Profile Header Card */}
        <View className="mb-6 rounded-2.5xl border border-border bg-surface p-5">
          <View className="flex-row items-center">
            {/* Circular Placeholder Avatar */}
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              <User size={30} color="#FFFCF7" />
            </View>

            {/* Name & Mobile Number */}
            <View className="ml-4 flex-1">
              <Text className="font-headingSemiBold text-h2 text-text">
                Shubham Sharma
              </Text>
              <Text className="mt-0.5 font-sans text-body-sm text-muted">
                +91 XXXXX XXXXX
              </Text>
            </View>
          </View>

          {/* Edit Profile Button */}
          <Pressable
            onPress={handleEditProfile}
            className="mt-4 flex-row items-center justify-center rounded-xl bg-primary py-3 active:bg-primary-dark"
          >
            <Pencil size={16} color="#FFFCF7" />
            <Text className="ml-2 font-sansSemiBold text-body-sm text-surface">
              Edit Profile
            </Text>
          </Pressable>
        </View>

        {/* 3. Account Section */}
        <View className="mb-6">
          <Text className="mb-2 px-1 font-sansSemiBold text-body-sm text-muted">
            Account
          </Text>
          <View className="overflow-hidden rounded-2.5xl border border-border bg-surface">
            {/* Personal Information */}
            <Pressable
              onPress={() => console.log("Personal Information pressed")}
              className="flex-row items-center justify-between p-4 active:bg-background/50"
            >
              <View className="flex-row items-center">
                <User size={20} color="#304238" />
                <Text className="ml-3 font-sansMedium text-body text-text">
                  Personal Information
                </Text>
              </View>
              <ChevronRight size={18} color="#74766D" />
            </Pressable>

            <View className="h-[1px] bg-border" />

            {/* Addresses */}
            <Pressable
              onPress={() => console.log("Addresses pressed")}
              className="flex-row items-center justify-between p-4 active:bg-background/50"
            >
              <View className="flex-row items-center">
                <MapPin size={20} color="#304238" />
                <Text className="ml-3 font-sansMedium text-body text-text">
                  Addresses
                </Text>
              </View>
              <ChevronRight size={18} color="#74766D" />
            </Pressable>

            <View className="h-[1px] bg-border" />

            {/* Security */}
            <Pressable
              onPress={() => console.log("Security pressed")}
              className="flex-row items-center justify-between p-4 active:bg-background/50"
            >
              <View className="flex-row items-center">
                <ShieldCheck size={20} color="#304238" />
                <Text className="ml-3 font-sansMedium text-body text-text">
                  Security
                </Text>
              </View>
              <ChevronRight size={18} color="#74766D" />
            </Pressable>
          </View>
        </View>

        {/* 4. Activity Section */}
        <View className="mb-6">
          <Text className="mb-2 px-1 font-sansSemiBold text-body-sm text-muted">
            Activity
          </Text>
          <View className="overflow-hidden rounded-2.5xl border border-border bg-surface">
            {/* My Orders */}
            <Pressable
              onPress={() => console.log("My Orders pressed")}
              className="flex-row items-center justify-between p-4 active:bg-background/50"
            >
              <View className="flex-row items-center">
                <Package size={20} color="#304238" />
                <Text className="ml-3 font-sansMedium text-body text-text">
                  My Orders
                </Text>
              </View>
              <ChevronRight size={18} color="#74766D" />
            </Pressable>

            <View className="h-[1px] bg-border" />

            {/* Wishlist */}
            <Pressable
              onPress={() => console.log("Wishlist pressed")}
              className="flex-row items-center justify-between p-4 active:bg-background/50"
            >
              <View className="flex-row items-center">
                <Heart size={20} color="#304238" />
                <Text className="ml-3 font-sansMedium text-body text-text">
                  Wishlist
                </Text>
              </View>
              <ChevronRight size={18} color="#74766D" />
            </Pressable>
          </View>
        </View>

        {/* 5. Support Section */}
        <View className="mb-6">
          <Text className="mb-2 px-1 font-sansSemiBold text-body-sm text-muted">
            Support & Settings
          </Text>
          <View className="overflow-hidden rounded-2.5xl border border-border bg-surface">
            {/* Help & Support */}
            <Pressable
              onPress={() => console.log("Help & Support pressed")}
              className="flex-row items-center justify-between p-4 active:bg-background/50"
            >
              <View className="flex-row items-center">
                <HelpCircle size={20} color="#304238" />
                <Text className="ml-3 font-sansMedium text-body text-text">
                  Help & Support
                </Text>
              </View>
              <ChevronRight size={18} color="#74766D" />
            </Pressable>

            <View className="h-[1px] bg-border" />

            {/* Settings */}
            <Pressable
              onPress={() => console.log("Settings pressed")}
              className="flex-row items-center justify-between p-4 active:bg-background/50"
            >
              <View className="flex-row items-center">
                <Settings size={20} color="#304238" />
                <Text className="ml-3 font-sansMedium text-body text-text">
                  Settings
                </Text>
              </View>
              <ChevronRight size={18} color="#74766D" />
            </Pressable>
          </View>
        </View>

        {/* 6. Logout */}
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
    </SafeAreaView>
  );
}
