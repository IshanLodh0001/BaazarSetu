import { View, Text, Image, Pressable } from "react-native";

const ProductCard = ({ product, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      className="w-48 overflow-hidden rounded-md border border-border bg-surface"
    >
      <Image
        source={product.image}
        className="h-40 w-full"
        resizeMode="cover"
      />

      <View className="p-3">
        <Text
          className="font-sansSemiBold text-body-sm text-text"
          numberOfLines={2}
        >
          {product.name}
        </Text>

        <Text
          className="mt-1 font-sans text-label text-secondary"
          numberOfLines={1}
        >
          {product.location}
        </Text>

        <Text className="mt-2 font-monoMedium text-data text-primary">
          ₹{product.price}
        </Text>
      </View>
    </Pressable>
  );
};

export default ProductCard;