import { useState } from "react";
import Search from "../../components/Search";
import { View, Text, ScrollView, Image } from "react-native";
import FeaturedProduct from "../../components/FeaturedProduct";
import MakerCard from "../../components/MakerCard";
import ProductCard from "../../components/ProductCard";

const HomeScreen = () => {
  const [search, setSearch] = useState("");
  const handleSearch = () => {
    console.log("Searching for:", search);
  };

  const products = [
    {
      id: "1",
      name: "Jaipur Blue Pottery",
      location: "Jaipur, Rajasthan",
      price: "2400",
      image: require("../../../assets/bluepottery.jpg"),
    },
    {
      id: "2",
      name: "Banarasi Silk",
      location: "Varanasi, Uttar Pradesh",
      price: "8500",
      image: require("../../../assets/banarasi.jpg"),
    },
    {
      id: "3",
      name: "Kutch Embroidery",
      location: "Kutch, Gujarat",
      price: "3200",
      image: require("../../../assets/kutch.jpg"),
    },
    {
      id: "4",
      name: "Dhokra Craft",
      location: "Bastar, Chhattisgarh",
      price: "4100",
      image: require("../../../assets/dhokra.jpg"),
    },
  ];
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingVertical: 32,
      }}
    >
      {/* Hero section */}
      <View className="mt-6 flex-row items-center justify-between">
        <Text className="font-heading text-h1 text-primary-dark">
          BazaarSetu
        </Text>
        <Image
          source={require("../../../assets/portraitPlaceholder.png")}
          className="h-10 w-10 rounded-full"
        />
      </View>
      <View className="mt-6">
        <Text className="font-heading py-3 text-h3 text-primary">
          Find craft{"\n"}worth doing business with.
        </Text>
      </View>

      {/* Search */}
      <Search
        setSearch={setSearch}
        search={search}
        handleSearch={handleSearch}
      />

      {/* Featured component */}
      <FeaturedProduct />

      {/* Meet The Maker Section */}

      <MakerCard />

      {/* Carft worth knowing section */}

      <View className="mt-10">
        <Text className="font-heading text-h3 text-primary">
          Craft worth knowing
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => console.log(product.name)}
            />
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

export default HomeScreen;
