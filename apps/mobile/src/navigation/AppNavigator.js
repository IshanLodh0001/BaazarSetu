import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/buyer/HomeScreen";
import SearchScreen from "../screens/buyer/SearchScreen";
import ProductDetailsScreen from "../screens/buyer/ProductDetailsScreen";
import CartScreen from "../screens/buyer/CartScreen";
import BuyerDashboardScreen from "../screens/buyer/BuyerDashboardScreen";

import SellerDashboardScreen from "../screens/seller/SellerDashboardScreen";
import AddProductScreen from "../screens/seller/AddProductScreen";

import ProfileScreen from "../screens/shared/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
      />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="BuyerDashboard" component={BuyerDashboardScreen} />

      <Stack.Screen
        name="SellerDashboard"
        component={SellerDashboardScreen}
      />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />

      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}