import { View, Text, Image, Pressable } from "react-native";

const SellerOrderCard = ({ order, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row overflow-hidden rounded-xl border border-border bg-surface p-3"
    >
      <Image
        source={order.image}
        className="h-20 w-20 rounded-lg"
        resizeMode="cover"
      />

      <View className="ml-3 flex-1 justify-between">
        <View>
          <Text
            className="font-sansSemiBold text-body-sm text-text"
            numberOfLines={1}
          >
            {order.product}
          </Text>

          <Text
            className="mt-1 font-sans text-label text-secondary"
            numberOfLines={1}
          >
            {order.buyer}
          </Text>

          <Text className="mt-1 font-mono text-label text-muted">
            #{order.id}
          </Text>
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-monoMedium text-data text-primary">
            ₹{order.price}
          </Text>

          <Text
            className={`font-sansMedium text-label ${
              order.status === "Pending"
                ? "text-accent"
                : order.status === "Completed"
                  ? "text-success"
                  : "text-secondary"
            }`}
          >
            {order.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export default SellerOrderCard;
