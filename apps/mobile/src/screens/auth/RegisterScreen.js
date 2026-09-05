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
import { Eye, EyeOff } from "lucide-react-native";

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = () => {
    console.log("Create Account pressed");
    console.log("Full Name:", fullName);
    console.log("Mobile Number:", mobileNumber);
    console.log("Password:", password);
    console.log("Confirm Password:", confirmPassword);
  };

  const handleNavigateToLogin = () => {
    if (navigation && typeof navigation.navigate === "function") {
      navigation.navigate("Login");
    } else if (navigation && typeof navigation.goBack === "function") {
      navigation.goBack();
    } else {
      console.log("Navigate to Login");
    }
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
          <View className="mb-6 items-center">
            <Text className="font-heading text-h1 text-primary">
              BazaarSetu
            </Text>

            <Text className="mt-1.5 text-center font-sans text-body-sm text-muted">
              Join our community of artisans and craft lovers.
            </Text>
          </View>

          {/* Registration Card */}
          <View className="rounded-2.5xl border border-border bg-surface p-6">
            {/* Heading */}
            <Text className="font-headingSemiBold text-h2 text-text">
              Create Account
            </Text>

            <Text className="mt-1 font-sans text-body-sm text-muted">
              Start your journey with BazaarSetu today.
            </Text>

            {/* Full Name Input */}
            <View className="mt-5">
              <Text className="mb-2 font-sansSemiBold text-body-sm text-text">
                Full Name
              </Text>

              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#74766D"
                autoCapitalize="words"
                autoCorrect={false}
                className="rounded-xl border border-border bg-background px-4 py-3.5 font-sans text-body text-text"
              />
            </View>

            {/* Mobile Number Input */}
            <View className="mt-4">
              <Text className="mb-2 font-sansSemiBold text-body-sm text-text">
                Mobile Number
              </Text>

              <TextInput
                value={mobileNumber}
                onChangeText={setMobileNumber}
                placeholder="Enter your mobile number"
                placeholderTextColor="#74766D"
                keyboardType="phone-pad"
                className="rounded-xl border border-border bg-background px-4 py-3.5 font-sans text-body text-text"
              />
            </View>

            {/* Password Input */}
            <View className="mt-4">
              <Text className="mb-2 font-sansSemiBold text-body-sm text-text">
                Password
              </Text>

              <View className="flex-row items-center rounded-xl border border-border bg-background px-4">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  placeholderTextColor="#74766D"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="flex-1 py-3.5 font-sans text-body text-text"
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="pl-2"
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#74766D" />
                  ) : (
                    <Eye size={20} color="#74766D" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View className="mt-4">
              <Text className="mb-2 font-sansSemiBold text-body-sm text-text">
                Confirm Password
              </Text>

              <View className="flex-row items-center rounded-xl border border-border bg-background px-4">
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#74766D"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  className="flex-1 py-3.5 font-sans text-body text-text"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="pl-2"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#74766D" />
                  ) : (
                    <Eye size={20} color="#74766D" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Create Account Button */}
            <Pressable
              onPress={handleRegister}
              className="mt-6 items-center justify-center rounded-xl bg-primary py-4 active:bg-primary-dark"
            >
              <Text className="font-sansBold text-body text-surface">
                Create Account
              </Text>
            </Pressable>
          </View>

          {/* Login Link */}
          <View className="mt-6 flex-row items-center justify-center">
            <Text className="font-sans text-body-sm text-muted">
              Already have an account?{" "}
            </Text>

            <Pressable onPress={handleNavigateToLogin}>
              <Text className="font-sansSemiBold text-body-sm text-accent">
                Login
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
