import { View, Text, ScrollView, Pressable } from "react-native";
import HeadComponent from "../../components/HeadComponent";
import Navbar from "../../components/Navbar";
import Search from "../../components/Search";
import { useState } from "react";
import CategoryPill from "../../components/CategoryPill";
const SearchScreen = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const handleSearch = () => {
    console.log("Searching for:", search);
  };
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

  return (
    <View className="flex-1 bg-background">
      <HeadComponent title={"Search"} />
      <ScrollView className="px-[24]">
        <Search
          setSearch={setSearch}
          search={search}
          handleSearch={handleSearch}
        />

        {/* Categories */}
        <View className="w-full mt-9">
          <Text className="text-body text-text font-sans">Categories</Text>
          <View className="flex-1 flex-row flex-wrap items-center mt-3 gap-3">
            {categories.map((elem) => {
              return (
                <CategoryPill
                  elem={elem}
                  handleSetActive={handleSetActive}
                  active={active}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
      <Navbar />
    </View>
  );
};

export default SearchScreen;
