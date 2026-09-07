import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";

const API_BASE_URL = "https://baazarsetu.onrender.com/api/v1";

const apiRequest = async (endpoint, options = {}, token = null) => {
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

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
  const authToken = token || (await AsyncStorage.getItem("auth_token"));

  return apiRequest("/users/me", {}, authToken);
};

export const getSellerAnalytics = async (token = null) => {
  const authToken = token || (await AsyncStorage.getItem("auth_token"));

  return apiRequest("/artisan/analytics/overview", {}, authToken);
};

export const getSellerOrders = async (token = null) => {
  const authToken = token || (await AsyncStorage.getItem("auth_token"));

  return apiRequest("/artisan/orders", {}, authToken);
};

export const createProduct = async (product, token = null) => {
  const authToken = token || (await AsyncStorage.getItem("auth_token"));

  return apiRequest(
    "/products",
    {
      method: "POST",
      body: JSON.stringify(product),
    },
    authToken,
  );
};

export const uploadProductImages = async (
  productId,
  imageUri,
  token = null,
) => {
  const authToken =
    token || (await AsyncStorage.getItem("auth_token"));

  const filename =
    imageUri.split("/").pop() || `product-${Date.now()}.jpg`;

  const file = new File(imageUri);

  const formData = new FormData();
  formData.append("images", file);

  return apiRequest(
    `/products/${productId}/images`,
    {
      method: "POST",
      body: formData,
    },
    authToken,
  );
};

export const publishProduct = async (productId, token = null) => {
  const authToken = token || (await AsyncStorage.getItem("auth_token"));

  return apiRequest(
    `/products/${productId}/publish`,
    {
      method: "POST",
    },
    authToken,
  );
};
