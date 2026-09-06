import { View, Text, Image, Pressable } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

const FeaturedProduct = ({ product }) => {
  const navigation = useNavigation();
  return (
    <Pressable
      product={product}
      onPress={() =>
        navigation.navigate("ProductDetails", {
          product,
        })
      }
    >
      <View className="mt-6">
        <Text className="py-2 text-body-lg text-primary font-sans">
          Featured
        </Text>
        <View className="h-96 w-full mt-2 border-border bg-surface overflow-hidden rounded-xl">
          <Image
            source={require("../../assets/featuredplaceholder.jpeg")}
            className="h-64 w-full"
          />
          <Text className="font-sansSemiBold px-1 mt-3 text-body text-text">
            Handwoven bamboo basket
          </Text>
          <Text className="font-sans px-1 mt-1 text-body-sm text-secondary">
            Bastar, Chhattisgarh
          </Text>

          <View className="flex-row justify-between px-1 py-3">
            <Text className="font-mono text-data">₹1500</Text>
            <Pressable className="w-fit px-2 py-1 flex-row items-center justify-center gap-2">
              <Text className="font-mono text-data text-text">
                View Product
              </Text>
              <ArrowRight size={16} color="#304238" />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default FeaturedProduct;
