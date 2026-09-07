import { View, Text, ScrollView, Pressable } from "react-native";
import HeadComponent from "../../components/HeadComponent";
import Navbar from "../../components/Navbar";
import Search from "../../components/Search";
import { useState } from "react";
import CategoryPill from "../../components/CategoryPill";
import ProductCard from "../../components/ProductCard";
const SearchScreen = ({ navigation }) => {
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

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const categories = [
    "All",
    "Pottery",
    "Textiles",
    "Wood",
    "Metal",
    "Basketry",
    "Jewellery",
  ];

  const [active, setActive] = useState("All");
  const handleSetActive = (elem) => {
    setActive(elem);
  };

  const handleSearch = () => {
    const query = search.trim().toLowerCase();

    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(query),
    );

    setResults(filtered);
  };

  return (
    <View className="flex-1 bg-background">
      <HeadComponent title={"Search"} navigation={navigation} />
      <ScrollView className="px-[24]">
        <Search
          setSearch={setSearch}
          search={search}
          handleSearch={handleSearch}
        />

        {/* Categories */}
        <View className="h-fit w-full mt-9">
          <Text className="text-body text-text font-sans">Categories</Text>
          <View className="flex-1 flex-row flex-wrap items-center mt-3 gap-3">
            {categories.map((elem) => {
              return (
                <CategoryPill
                  elem={elem}
                  key={elem}
                  handleSetActive={handleSetActive}
                  active={active}
                />
              );
            })}
          </View>
        </View>

        {/* Explore */}

        <View className="h-fit w-full mt-6">
          <Text className="text-body font-sansSemiBold text-primary mb-4">
            Explore
          </Text>
          {search.trim() === "" ? (
            <View className="flex-row flex-wrap gap-4">
              {products.map((product) => {
                return (
                  <ProductCard
                    product={product}
                    key={product.id}
                    onPress={() =>
                      navigation.navigate("ProductDetails", {
                        product,
                      })
                    }
                  />
                );
              })}
            </View>
          ) : (
            <View className="h-fit w-full flex gap-4">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="font-sans text-body-sm text-muted">
                  Results for "{search}"
                </Text>

                <Text className="font-mono text-data text-muted">
                  {results.length} items
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-4">
                {results.map((product) => {
                  return (
                    <ProductCard
                      product={product}
                      key={product.id}
                      onPress={() =>
                        navigation.navigate("ProductDetails", {
                          product,
                        })
                      }
                    />
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <Navbar navigation={navigation} />
    </View>
  );
};

export default SearchScreen;
