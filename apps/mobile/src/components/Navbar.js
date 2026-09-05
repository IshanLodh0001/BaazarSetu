import { Home, PackageIcon, Search, ShoppingCart } from "lucide-react-native";
import { View, Text, Pressable } from "react-native";

const Navbar = () => {
  return (
    <View className="h-16 w-full mb-3 px-9 flex-row items-center justify-between gap-2 font-sans bg-surface border-t border-border rounded-md">
      <Pressable>
        <Text className="">
          <Home size={24} />
        </Text>
      </Pressable>
      <Pressable>
        <Text className="">
          <Search size={24} />
        </Text>
      </Pressable>
      <Pressable>
        <Text className="">
          <PackageIcon size={24} />
        </Text>
      </Pressable>
      <Pressable>
        <Text className="">
          <ShoppingCart size={24}/>
        </Text>
      </Pressable>
    </View>
  );
};

export default Navbar;
