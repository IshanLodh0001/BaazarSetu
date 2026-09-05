import { View, Text, Image, Pressable } from "react-native";
import { Minus, Plus } from "lucide-react-native";

const CartItem = ({ item, onIncrease, onDecrease }) => {
  return (
    <View className="flex-row overflow-hidden rounded-xl border border-border bg-surface p-3">
      <Image
        source={item.image}
        className="h-24 w-24 rounded-lg"
        resizeMode="cover"
      />

      <View className="ml-3 flex-1 justify-between">
        <View>
          <Text
            className="font-sansSemiBold text-body-sm text-text"
            numberOfLines={2}
          >
            {item.name}
          </Text>

          <Text
            className="mt-1 font-sans text-label text-secondary"
            numberOfLines={1}
          >
            {item.location}
          </Text>

          <Text className="mt-2 font-monoMedium text-data text-primary">
            ₹{item.price}
          </Text>
        </View>

        <View className="mt-2 flex-row items-center self-end rounded-lg border border-border">
          <Pressable
            onPress={onDecrease}
            className="h-8 w-8 items-center justify-center"
          >
            <Minus size={16} color="#304238" />
          </Pressable>

          <Text className="w-8 text-center font-monoMedium text-data text-text">
            {item.quantity}
          </Text>

          <Pressable
            onPress={onIncrease}
            className="h-8 w-8 items-center justify-center"
          >
            <Plus size={16} color="#304238" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default CartItem;
