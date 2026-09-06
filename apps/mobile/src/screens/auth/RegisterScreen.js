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

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    fullName: "",
    mobileNumber: "",
    otp: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setError("");
  };

  const handleSendOTP = () => {
    const fullName = formData.fullName.trim();
    const mobileNumber = formData.mobileNumber;

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(fullName)) {
      setError("Name can only contain alphabets and spaces.");
      return;
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    console.log("Sending registration OTP to:", mobileNumber);

    // TODO: connect to send OTP API
    setOtpSent(true);
  };

  const handleRegister = () => {
    const fullName = formData.fullName.trim();
    const mobileNumber = formData.mobileNumber;
    const otp = formData.otp;

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(fullName)) {
      setError("Name can only contain alphabets and spaces.");
      return;
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    console.log("Create Account pressed");
    console.log("Registration data:", {
      fullName,
      mobileNumber,
      otp,
    });

    // TODO: connect to registration API
  };

  const handleNavigateToLogin = () => {
    navigation.navigate("Login");
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
            <Text className="font-headingSemiBold text-h2 text-text">
              Create Account
            </Text>

            <Text className="mt-1 font-sans text-body-sm text-muted">
              Create your BazaarSetu account using your mobile number.
            </Text>

            {/* Full Name */}
            <View className="mt-5">
              <Text className="mb-2 font-sansSemiBold text-body-sm text-text">
                Full Name
              </Text>

              <TextInput
                value={formData.fullName}
                onChangeText={(value) =>
                  updateField("fullName", value.replace(/[^A-Za-z ]/g, ""))
                }
                placeholder="Enter your full name"
                placeholderTextColor="#74766D"
                autoCapitalize="words"
                autoCorrect={false}
                className="rounded-xl border border-border bg-background px-4 py-3.5 font-sans text-body text-text"
              />
            </View>

            {/* Mobile Number */}
            <View className="mt-4">
              <Text className="mb-2 font-sansSemiBold text-body-sm text-text">
                Mobile Number
              </Text>

              <TextInput
                value={formData.mobileNumber}
                onChangeText={(value) =>
                  updateField(
                    "mobileNumber",
                    value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                placeholder="Enter your 10-digit mobile number"
                placeholderTextColor="#74766D"
                keyboardType="number-pad"
                maxLength={10}
                autoCorrect={false}
                editable={!otpSent}
                className="rounded-xl border border-border bg-background px-4 py-3.5 font-sans text-body text-text"
              />
            </View>

            {/* Send OTP */}
            {!otpSent ? (
              <Pressable
                onPress={handleSendOTP}
                disabled={
                  formData.fullName.trim().length === 0 ||
                  formData.mobileNumber.length !== 10
                }
                className={`mt-4 items-center justify-center rounded-xl py-4 ${
                  formData.fullName.trim().length > 0 &&
                  formData.mobileNumber.length === 10
                    ? "bg-primary active:bg-primary-dark"
                    : "bg-border"
                }`}
              >
                <Text
                  className={`font-sansBold text-body ${
                    formData.fullName.trim().length > 0 &&
                    formData.mobileNumber.length === 10
                      ? "text-surface"
                      : "text-muted"
                  }`}
                >
                  Send OTP
                </Text>
              </Pressable>
            ) : (
              <>
                {/* OTP */}
                <View className="mt-4">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="font-sansSemiBold text-body-sm text-text">
                      Enter OTP
                    </Text>

                    <Pressable
                      onPress={handleSendOTP}
                      hitSlop={{
                        top: 8,
                        bottom: 8,
                        left: 8,
                        right: 8,
                      }}
                    >
                      <Text className="font-sansSemiBold text-body-sm text-accent">
                        Resend OTP
                      </Text>
                    </Pressable>
                  </View>

                  <TextInput
                    value={formData.otp}
                    onChangeText={(value) =>
                      updateField("otp", value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#74766D"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    className="rounded-xl border border-border bg-background px-4 py-3.5 font-sans text-body text-text"
                  />
                </View>

                {/* Error */}
                {error ? (
                  <Text className="mt-3 font-sans text-body-sm text-error">
                    {error}
                  </Text>
                ) : null}

                {/* Create Account */}
                <Pressable
                  onPress={handleRegister}
                  disabled={formData.otp.length !== 6}
                  className={`mt-6 items-center justify-center rounded-xl py-4 ${
                    formData.otp.length === 6
                      ? "bg-primary active:bg-primary-dark"
                      : "bg-border"
                  }`}
                >
                  <Text
                    className={`font-sansBold text-body ${
                      formData.otp.length === 6 ? "text-surface" : "text-muted"
                    }`}
                  >
                    Create Account
                  </Text>
                </Pressable>
              </>
            )}

            {/* Error before OTP */}
            {!otpSent && error ? (
              <Text className="mt-3 font-sans text-body-sm text-error">
                {error}
              </Text>
            ) : null}
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
