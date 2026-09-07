import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://baazarsetu.onrender.com/api/v1";

const apiRequest = async (endpoint, options = {}, token = null) => {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
};

export const sendOTP = (phone) =>
  apiRequest("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const verifyOTP = ({ phone, code, role }) =>
  apiRequest("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      phone,
      code,
      role,
    }),
  });

export const getMe = async (token = null) => {
  const authToken =
    token || (await AsyncStorage.getItem("auth_token"));

  return apiRequest("/users/me", {}, authToken);
};