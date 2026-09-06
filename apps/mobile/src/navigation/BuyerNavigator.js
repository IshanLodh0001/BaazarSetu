import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/buyer/HomeScreen";
import SearchScreen from "../screens/buyer/SearchScreen";
import ProductDetailsScreen from "../screens/buyer/ProductDetailsScreen";
import CartScreen from "../screens/buyer/CartScreen";
import BuyerDashboardScreen from "../screens/buyer/BuyerDashboardScreen";

const Stack = createNativeStackNavigator();

const BuyerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
      />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Dashboard" component={BuyerDashboardScreen} />
    </Stack.Navigator>
  );
};

export default BuyerNavigator;