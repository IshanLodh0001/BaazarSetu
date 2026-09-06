import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SellerDashboardScreen from "../screens/seller/SellerDashboardScreen";
import AddProductScreen from "../screens/seller/AddProductScreen";

const Stack = createNativeStackNavigator();

const SellerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} />

      <Stack.Screen name="AddProduct" component={AddProductScreen} />
    </Stack.Navigator>
  );
};

export default SellerNavigator;
