import { Home, PackageIcon, Search, ShoppingCart } from "lucide-react-native";
import { View, Text, Pressable } from "react-native";

const Navbar = ({ navigation }) => {
  return (
    <View className="h-16 w-full mb-3 px-9 flex-row items-center justify-between gap-2 font-sans bg-surface border-t border-border rounded-md">
      <Pressable onPress={() => navigation.navigate("Home")}>
        <Text className="">
          <Home size={24} />
        </Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("Search")}>
        <Text className="">
          <Search size={24} />
        </Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("BuyerDashboard")}>
        <Text className="">
          <PackageIcon size={24} />
        </Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("Cart")}>
        <Text className="">
          <ShoppingCart size={24} />
        </Text>
      </Pressable>
    </View>
  );
};

export default Navbar;
