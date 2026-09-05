import { useState } from "react";
import Search from "../../components/Search";
import { View, Text, ScrollView, Image } from "react-native";
import FeaturedProduct from "../../components/FeaturedProduct";
import MakerCard from "../../components/MakerCard";

const HomeScreen = () => {
  const [search, setSearch] = useState("");
  const handleSearch = () => {
    console.log("Searching for:", search);
  };
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
    </ScrollView>
  );
};

export default HomeScreen;
