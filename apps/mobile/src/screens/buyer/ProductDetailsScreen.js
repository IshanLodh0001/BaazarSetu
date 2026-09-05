import { View, ScrollView, Image, Text, Pressable } from "react-native";
import HeadComponent from "../../components/HeadComponent";
import Navbar from "../../components/Navbar";

const ProductDetailsScreen = () => {
  const product = {
    id: "1",

    name: "Handwoven Bamboo Basket",
    description:
      "A traditional handwoven bamboo basket crafted by artisans in Bastar using locally sourced bamboo. Lightweight, durable, and suitable for both everyday use and decorative purposes.",

    price: 1500,
    currency: "INR",

    category: "Basketry",

    images: [require("../../../assets/featuredplaceholder.jpeg")],

    location: {
      city: "Bastar",
      state: "Chhattisgarh",
      country: "India",
    },

    inventory: {
      stock: 12,
      available: true,
    },

    maker: {
      id: "maker-1",
      name: "Ramesh Kumar",
      location: "Bastar, Chhattisgarh",
    },
  };
  return (
    <View className="flex-1 bg-background">
      <HeadComponent title={"Product"} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 10,
          paddingTop: 20,
        }}
      >
        {/* Product Image */}

        <Image
          className="h-80 w-full rounded-xl"
          source={product.images[0]}
          resizeMode="cover"
        />

        <Text className="mt-5 font-heading text-h1 text-primary">
          {product.name}
        </Text>

        <Text className="mt-2 font-sans text-body-sm text-secondary">
          {product.location.city}, {product.location.state}
        </Text>

        <Text className="mt-4 font-monoSemiBold text-h2 text-primary">
          ₹{product.price}
        </Text>

        <View className="mt-8">
          <Text className="font-heading text-h2 text-primary">
            About this product
          </Text>

          <Text className="mt-3 font-sans text-body text-text">
            {product.description}
          </Text>
        </View>

        <View className="mt-8">
          <Text className="font-heading text-h2 text-primary">Made by</Text>

          <Text className="mt-3 font-sansSemiBold text-body text-text">
            {product.maker.name}
          </Text>

          <Text className="mt-1 font-sans text-body-sm text-secondary">
            {product.maker.location}
          </Text>
        </View>

        {/* Add to Cart */}
        <Pressable className="mt-8 rounded-xl bg-primary px-5 py-4">
          <Text className="text-center font-sansSemiBold text-body text-surface">
            Add to cart
          </Text>
        </Pressable>
      </ScrollView>

      <Navbar />
    </View>
  );
};

export default ProductDetailsScreen;
