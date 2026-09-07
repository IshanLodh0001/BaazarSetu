import React from "react";
import { SafeAreaView, ScrollView, View, Text, Pressable } from "react-native";
import { User, Pencil, MapPin, LogOut, Store } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import HeadComponent from "../../components/HeadComponent";
import Navbar from "../../components/Navbar";

export default function ProfileScreen({ user, navigation }) {
//   const navigation = useNavigation();
  const currentUser = user ?? {
    name: "User",
    mobileNumber: "9876543210",
    location: "Raipur, Chhattisgarh",
    role: "seller",
  };

  const isSeller = currentUser.role === "seller";

  const handleEditProfile = () => {
    console.log("Edit Profile pressed");
  };

  const handleSellerDashboard = () => {
    navigation.navigate("SellerDashboard");
  };

  const handleLogout = () => {
    console.log("Logout pressed");

    // TODO: clear authentication state
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <HeadComponent title={"My Profile"} />

        {/* Profile Card */}
        <View className="my-6 rounded-2.5xl border border-border bg-surface p-5">
          {/* Avatar + Basic Info */}
          <View className="flex-row items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              <User size={30} color="#FFFCF7" />
            </View>

            <View className="ml-4 flex-1">
              <Text className="font-headingSemiBold text-h2 text-text">
                {currentUser.name}
              </Text>

              <Text className="mt-1 font-sans text-body-sm text-muted">
                +91 {currentUser.mobileNumber}
              </Text>
            </View>
          </View>

          {/* Location */}
          <View className="mt-4 flex-row items-center">
            <MapPin size={16} color="#806A52" />

            <Text className="ml-1.5 font-sans text-body-sm text-secondary">
              {currentUser.location}
            </Text>
          </View>
        </View>

        {/* Edit Profile */}
        <Pressable
          onPress={handleEditProfile}
          className="flex-row items-center justify-center rounded-xl bg-primary py-3 active:bg-primary-dark"
        >
          <Pencil size={16} color="#FFFCF7" />

          <Text className="ml-2 font-sansSemiBold text-body-sm text-surface">
            Edit Profile
          </Text>
        </Pressable>

        {/* Seller Dashboard */}
        {isSeller && (
          <Pressable
            onPress={handleSellerDashboard}
            className="mt-4 flex-row items-center justify-center rounded-xl border border-border bg-surface py-3 active:bg-background"
          >
            <Store size={18} color="#304238" />

            <Text className="ml-2 font-sansSemiBold text-body-sm text-primary">
              Seller Dashboard
            </Text>
          </Pressable>
        )}

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          className="mt-6 flex-row items-center justify-center rounded-2.5xl border border-border bg-surface p-4 active:bg-background"
        >
          <LogOut size={20} color="#B65345" />

          <Text className="ml-2 font-sansSemiBold text-body text-error">
            Logout
          </Text>
        </Pressable>
      </ScrollView>
      <Navbar navigation={navigation} />
    </SafeAreaView>
  );
}
