import { View, Text, ScrollView } from "react-native";
import { useEffect, useState } from "react";

import HeadComponent from "../../components/HeadComponent";
import Navbar from "../../components/Navbar";
import Search from "../../components/Search";
import CategoryPill from "../../components/CategoryPill";
import ProductCard from "../../components/ProductCard";

import { getMarketplaceProducts } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const SearchScreen = ({ navigation }) => {
  const { token } = useAuth();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [products, setProducts] = useState([]);
  const [active, setActive] = useState("All");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    "All",
    "Pottery",
    "Textiles",
    "Wood",
    "Metal",
    "Basketry",
    "Jewellery",
  ];

  const normalizeProduct = (product) => {
    const imagePath =
      product.images?.find((img) => img.isPrimary)?.processedPath ||
      product.images?.find((img) => img.isPrimary)?.originalPath ||
      product.images?.[0]?.processedPath ||
      product.images?.[0]?.originalPath ||
      null;

    return {
      ...product,
      id: product.productId,
      name: product.productName,
      location: [product.artisan?.district, product.artisan?.state]
        .filter(Boolean)
        .join(", "),
      price: String(product.price ?? 0),
      image: imagePath
        ? {
            uri: `https://baazarsetu.onrender.com/${imagePath.replace(
              /^\/+/,
              "",
            )}`,
          }
        : null,
    };
  };

  const loadProducts = async (params = {}) => {
    try {
      setLoading(true);
      setError("");

      const response = await getMarketplaceProducts(
        {
          page: 1,
          limit: 20,
          ...params,
        },
        token,
      );

      const normalizedProducts = response.data.products.map(normalizeProduct);

      setProducts(normalizedProducts);
      setResults(normalizedProducts);
    } catch (err) {
      console.error("Failed to load marketplace products:", err);
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const query = search.trim();

    loadProducts({
      search: query || undefined,
      category: active !== "All" ? active : undefined,
    });
  };

  const handleSetActive = (elem) => {
    setActive(elem);

    loadProducts({
      search: search.trim() || undefined,
      category: elem !== "All" ? elem : undefined,
    });
  };

  const displayProducts = search.trim() === "" ? products : results;

  return (
    <View className="flex-1 bg-background">
      <HeadComponent title="Search" navigation={navigation} />

      <ScrollView
        className="px-[24]"
        showsVerticalScrollIndicator={false}
      >
        <Search
          setSearch={setSearch}
          search={search}
          handleSearch={handleSearch}
        />

        {/* Categories */}
        <View className="mt-9 w-full">
          <Text className="font-sans text-body text-text">
            Categories
          </Text>

          <View className="mt-3 w-full flex-row flex-wrap gap-3">
            {categories.map((elem) => (
              <CategoryPill
                elem={elem}
                key={elem}
                handleSetActive={handleSetActive}
                active={active}
              />
            ))}
          </View>
        </View>

        {/* Explore */}
        <View className="mt-6 w-full">
          <Text className="mb-4 font-sansSemiBold text-body text-primary">
            Explore
          </Text>

          {error ? (
            <View className="rounded-xl border border-error bg-surface p-4">
              <Text className="font-sans text-body-sm text-error">
                {error}
              </Text>
            </View>
          ) : loading ? (
            <Text className="font-sans text-body-sm text-muted">
              Loading products...
            </Text>
          ) : (
            <>
              {search.trim() !== "" && (
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="font-sans text-body-sm text-muted">
                    Results for "{search}"
                  </Text>

                  <Text className="font-mono text-data text-muted">
                    {results.length} items
                  </Text>
                </View>
              )}

              <View className="flex-row flex-wrap gap-4">
                {displayProducts.map((product) => (
                  <ProductCard
                    product={product}
                    key={product.id}
                    onPress={() =>
                      navigation.navigate("ProductDetails", {
                        product,
                      })
                    }
                  />
                ))}
              </View>

              {!displayProducts.length && (
                <Text className="font-sans text-body-sm text-muted">
                  No products found.
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Navbar navigation={navigation} />
    </View>
  );
};

export default SearchScreen;