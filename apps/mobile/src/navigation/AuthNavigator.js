import React, { useState } from "react";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

export default function AuthNavigator() {
  const [currentScreen, setCurrentScreen] = useState("Login");

  const navigation = {
    navigate: (screenName) => setCurrentScreen(screenName),
    goBack: () => setCurrentScreen("Login"),
  };

  if (currentScreen === "Register") {
    return <RegisterScreen navigation={navigation} />;
  }

  return <LoginScreen navigation={navigation} />;
}
