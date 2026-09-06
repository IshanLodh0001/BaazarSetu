import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen({ navigation }) {
  const [form, setForm] = useState({
    mobileNumber: "",
    otp: "",
  });

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogin = () => {
    console.log("Login pressed");
    console.log("Login data:", form);

    // TODO: connect to login API
  };

  const handleNavigateToRegister = () => {
    navigation.navigate("Register");
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-10">
          {/* Branding */}
          <View className="mb-8 items-center">
            <Text className="font-heading text-h1 text-primary">
              BazaarSetu
            </Text>

            <Text className="mt-1.5 text-center font-sans text-body-sm text-muted">
              Empowering artisans, preserving crafts.
            </Text>
          </View>

          {/* Login Card */}
          <View className="rounded-2.5xl border border-border bg-surface p-6">
            <Text className="font-headingSemiBold text-h2 text-text">
              Welcome Back
            </Text>

            <Text className="mt-1 font-sans text-body-sm text-muted">
              Sign in with OTP to continue to your marketplace.
            </Text>

            {/* Mobile Number */}
            <View className="mt-6">
              <Text className="mb-2 font-sansSemiBold text-body-sm text-text">
                Mobile Number
              </Text>

              <TextInput
                value={form.mobileNumber}
                onChangeText={(value) => updateField("mobileNumber", value)}
                placeholder="Enter your mobile number"
                placeholderTextColor="#74766D"
                keyboardType="phone-pad"
                className="rounded-xl border border-border bg-background px-4 py-3.5 font-sans text-body text-text"
              />
            </View>

            {/* OTP */}
            <View className="mt-4">
              <Text className="mb-2 font-sansSemiBold text-body-sm text-text">
                Enter OTP
              </Text>

              <TextInput
                value={form.otp}
                onChangeText={(value) => updateField("otp", value)}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor="#74766D"
                keyboardType="number-pad"
                maxLength={6}
                className="rounded-xl border border-border bg-background px-4 py-3.5 font-sans text-body text-text"
              />
            </View>

            {/* Login Button */}
            <Pressable
              onPress={handleLogin}
              className="mt-6 items-center justify-center rounded-xl bg-primary py-4 active:bg-primary-dark"
            >
              <Text className="font-sansBold text-body text-surface">
                Login
              </Text>
            </Pressable>
          </View>

          {/* Register Link */}
          <View className="mt-6 flex-row items-center justify-center">
            <Text className="font-sans text-body-sm text-muted">
              Don't have an account?{" "}
            </Text>

            <Pressable onPress={handleNavigateToRegister}>
              <Text className="font-sansSemiBold text-body-sm text-accent">
                Create Account
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}