import { View, ScrollView, Image, Text } from "react-native";
import { MapPin, Star, Package, Tag } from "lucide-react-native";

import HeadComponent from "../../components/HeadComponent";
import Navbar from "../../components/Navbar";

const ProductDetailsScreen = ({ navigation, route }) => {
  const product = route.params?.product;

  if (!product) {
    return (
      <View className="flex-1 bg-background">
        <HeadComponent title="Product" navigation={navigation} />

        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-sans text-body text-muted">
            Product not found.
          </Text>
        </View>
 
        <Navbar navigation={navigation} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <HeadComponent title="Product" navigation={navigation} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image */}
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          {product.image ? (
            <Image
              source={product.image}
              className="h-80 w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-80 w-full items-center justify-center">
              <Text className="font-sans text-body-sm text-muted">
                No image available
              </Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View className="mt-6">
          <View className="flex-row items-start">
            <Text
              className="flex-1 font-heading text-h1 text-primary"
              numberOfLines={3}
            >
              {product.name}
            </Text>

            {product.isAvailable && (
              <View className="ml-3 rounded-full bg-success/10 px-3 py-1.5">
                <Text className="font-sansSemiBold text-label text-success">
                  Available
                </Text>
              </View>
            )}
          </View>

          {/* Location */}
          {product.location ? (
            <View className="mt-3 flex-row items-center">
              <MapPin size={16} color="#806A52" />

              <Text className="ml-1.5 font-sans text-body-sm text-secondary">
                {product.location}
              </Text>
            </View>
          ) : null}

          {/* Price */}
          <Text className="mt-5 font-monoSemiBold text-h2 text-primary">
            ₹{product.price}
          </Text>
        </View>

        {/* Rating */}
        {(product.rating !== undefined ||
          product.reviewCount !== undefined) && (
          <View className="mt-6 flex-row items-center">
            <Star size={17} color="#C49A55" fill="#C49A55" />

            <Text className="ml-2 font-monoMedium text-data text-text">
              {Number(product.rating || 0).toFixed(1)}
            </Text>

            <Text className="ml-2 font-sans text-body-sm text-muted">
              ({product.reviewCount || 0} reviews)
            </Text>
          </View>
        )}

        {/* About */}
        {product.description ? (
          <View className="mt-8">
            <Text className="font-heading text-h2 text-primary">
              About this product
            </Text>

            <Text className="mt-3 font-sans text-body text-text">
              {product.description}
            </Text>
          </View>
        ) : null}

        {/* Product Details */}
        <View className="mt-8">
          <Text className="font-heading text-h2 text-primary">
            Product details
          </Text>

          <View className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
            {product.category ? (
              <View className="flex-row items-center border-b border-border px-4 py-4">
                <Tag size={17} color="#806A52" />

                <Text className="ml-3 font-sans text-body-sm text-muted">
                  Category
                </Text>

                <Text className="ml-auto font-sansMedium text-body-sm text-text">
                  {product.category}
                </Text>
              </View>
            ) : null}

            {product.subCategory ? (
              <View className="flex-row items-center border-b border-border px-4 py-4">
                <Text className="w-5 text-center font-monoMedium text-data text-secondary">
                  S
                </Text>

                <Text className="ml-3 font-sans text-body-sm text-muted">
                  Subcategory
                </Text>

                <Text className="ml-auto font-sansMedium text-body-sm text-text">
                  {product.subCategory}
                </Text>
              </View>
            ) : null}

            {product.craftType ? (
              <View className="flex-row items-center border-b border-border px-4 py-4">
                <Text className="w-5 text-center font-monoMedium text-data text-secondary">
                  C
                </Text>

                <Text className="ml-3 font-sans text-body-sm text-muted">
                  Craft
                </Text>

                <Text className="ml-auto font-sansMedium text-body-sm text-text">
                  {product.craftType}
                </Text>
              </View>
            ) : null}

            {product.material ? (
              <View className="flex-row items-center border-b border-border px-4 py-4">
                <Text className="w-5 text-center font-monoMedium text-data text-secondary">
                  M
                </Text>

                <Text className="ml-3 font-sans text-body-sm text-muted">
                  Material
                </Text>

                <Text className="ml-auto font-sansMedium text-body-sm text-text">
                  {product.material}
                </Text>
              </View>
            ) : null}

            {product.colour ? (
              <View className="flex-row items-center border-b border-border px-4 py-4">
                <Text className="w-5 text-center font-monoMedium text-data text-secondary">
                  C
                </Text>

                <Text className="ml-3 font-sans text-body-sm text-muted">
                  Colour
                </Text>

                <Text className="ml-auto font-sansMedium text-body-sm text-text">
                  {product.colour}
                </Text>
              </View>
            ) : null}

            <View className="flex-row items-center px-4 py-4">
              <Package size={17} color="#806A52" />

              <Text className="ml-3 font-sans text-body-sm text-muted">
                Stock
              </Text>

              <Text className="ml-auto font-monoMedium text-data text-text">
                {product.stock ?? 0} available
              </Text>
            </View>
          </View>
        </View>

        {/* Artisan */}
        {product.artisan ? (
          <View className="mt-8">
            <Text className="font-heading text-h2 text-primary">
              Made by
            </Text>

            <View className="mt-4 rounded-xl border border-border bg-surface p-5">
              <Text className="font-sansSemiBold text-body text-text">
                {product.artisan.businessName || "Local Artisan"}
              </Text>

              {(product.artisan.district || product.artisan.state) && (
                <View className="mt-2 flex-row items-center">
                  <MapPin size={15} color="#806A52" />

                  <Text className="ml-1.5 font-sans text-body-sm text-secondary">
                    {[product.artisan.district, product.artisan.state]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
              )}

              {product.artisan.rating !== undefined ? (
                <View className="mt-3 flex-row items-center">
                  <Star size={15} color="#C49A55" fill="#C49A55" />

                  <Text className="ml-1.5 font-mono text-data text-text">
                    {Number(product.artisan.rating || 0).toFixed(1)}
                  </Text>
                </View>
              ) : null}

              {product.artisan.isVerified && (
                <Text className="mt-3 font-sansMedium text-body-sm text-success">
                  ✓ Verified artisan
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Tags */}
        {product.tags?.length > 0 ? (
          <View className="mt-8">
            <Text className="font-heading text-h2 text-primary">
              Tags
            </Text>

            <View className="mt-3 flex-row flex-wrap gap-2">
              {product.tags.map((tag) => (
                <View
                  key={tag}
                  className="rounded-full border border-border bg-surface px-3 py-2"
                >
                  <Text className="font-sans text-label text-secondary">
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Navbar navigation={navigation} />
    </View>
  );
};

export default ProductDetailsScreen;