import { View, Text, TextInput, Pressable } from "react-native";
import { Image, Camera } from "lucide-react-native";

const AddProduct = ({
  form,
  updateField,
  onAddImage,
  onSubmit,
}) => {
  return (
    <View>
      {/* Product Image */}
      <View className="mt-6">
        <Text className="font-sansMedium text-body-sm text-text">
          Product Image
        </Text>

        <Pressable
          onPress={onAddImage}
          className="mt-2 overflow-hidden rounded-xl border border-border bg-surface"
        >
          {form.image ? (
            <View className="relative">
              <Image
                source={form.image}
                className="h-52 w-full"
                resizeMode="cover"
              />

              <View className="absolute bottom-3 right-3 flex-row items-center rounded-lg bg-surface px-3 py-2">
                <Camera size={16} color="#304238" />

                <Text className="ml-2 font-sansMedium text-label text-primary">
                  Change Image
                </Text>
              </View>
            </View>
          ) : (
            <View className="h-48 items-center justify-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-background">
                <Image size={22} color="#304238" />
              </View>

              <Text className="mt-3 font-sansSemiBold text-body-sm text-text">
                Add a photo
              </Text>

              <Text className="mt-1 font-sans text-label text-muted">
                Take a photo or choose from gallery
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Product Name */}
      <View className="mt-6">
        <Text className="font-sansMedium text-body-sm text-text">
          Product Name
        </Text>

        <TextInput
          value={form.name}
          onChangeText={(value) => updateField("name", value)}
          placeholder="Enter product name"
          placeholderTextColor="#74766D"
          className="mt-2 h-14 rounded-xl border border-border bg-surface px-4 font-sans text-body text-text"
        />
      </View>

      {/* Description */}
      <View className="mt-5">
        <Text className="font-sansMedium text-body-sm text-text">
          Description
        </Text>

        <TextInput
          value={form.description}
          onChangeText={(value) => updateField("description", value)}
          placeholder="Describe your product"
          placeholderTextColor="#74766D"
          multiline
          textAlignVertical="top"
          className="mt-2 h-32 rounded-xl border border-border bg-surface px-4 py-3 font-sans text-body text-text"
        />
      </View>

      {/* Category */}
      <View className="mt-5">
        <Text className="font-sansMedium text-body-sm text-text">
          Category
        </Text>

        <TextInput
          value={form.category}
          onChangeText={(value) => updateField("category", value)}
          placeholder="Enter category"
          placeholderTextColor="#74766D"
          className="mt-2 h-14 rounded-xl border border-border bg-surface px-4 font-sans text-body text-text"
        />
      </View>

      {/* Price + Stock */}
      <View className="mt-5 flex-row gap-3">
        <View className="flex-1">
          <Text className="font-sansMedium text-body-sm text-text">
            Price
          </Text>

          <TextInput
            value={form.price}
            onChangeText={(value) => updateField("price", value)}
            placeholder="₹ Price"
            placeholderTextColor="#74766D"
            keyboardType="numeric"
            className="mt-2 h-14 rounded-xl border border-border bg-surface px-4 font-mono text-body text-text"
          />
        </View>

        <View className="flex-1">
          <Text className="font-sansMedium text-body-sm text-text">
            Stock
          </Text>

          <TextInput
            value={form.stock}
            onChangeText={(value) => updateField("stock", value)}
            placeholder="Quantity"
            placeholderTextColor="#74766D"
            keyboardType="numeric"
            className="mt-2 h-14 rounded-xl border border-border bg-surface px-4 font-mono text-body text-text"
          />
        </View>
      </View>

      {/* Location */}
      <View className="mt-5">
        <Text className="font-sansMedium text-body-sm text-text">
          Location
        </Text>

        <TextInput
          value={form.location}
          onChangeText={(value) => updateField("location", value)}
          placeholder="Enter your location"
          placeholderTextColor="#74766D"
          className="mt-2 h-14 rounded-xl border border-border bg-surface px-4 font-sans text-body text-text"
        />
      </View>

      {/* Add Product */}
      <Pressable
        onPress={onSubmit}
        className="mt-8 h-14 items-center justify-center rounded-xl bg-primary"
      >
        <Text className="font-sansSemiBold text-body text-surface">
          Add Product
        </Text>
      </Pressable>
    </View>
  );
};

export default AddProduct;