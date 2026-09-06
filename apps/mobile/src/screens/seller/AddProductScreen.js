import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import HeadComponent from "../../components/HeadComponent";
import AIAssistance from "../../components/AIAssistance";
import Navbar from "../../components/Navbar";
import AddProduct from "../../components/AddProduct";

const AddProductScreen = () => {
  const [form, setForm] = useState({
    image: null,
    name: "",
    description: "",
    category: "",
    price: "",
    stock: "",
    location: "",
  });

  const [voice, setVoice] = useState(null);

  const [activeTab, setActiveTab] = useState("details");

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddProduct = () => {
    console.log("Product:", form);
  };

  const handleAddImage = () => {
    console.log("Add image");
  };

  const handleRecordVoice = () => {
    console.log("Record voice");
  };

  const handleGetAssistance = () => {
    console.log("Get AI assistance");
  };

  return (
    <View className="flex-1 bg-background">
      <HeadComponent title="Add Product" />

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tabs */}
        <View className="mt-4 flex-row gap-2">
          <Pressable
            onPress={() => setActiveTab("details")}
            className={`flex-1 rounded-xl px-4 py-3 ${
              activeTab === "details"
                ? "bg-primary"
                : "border border-border bg-surface"
            }`}
          >
            <Text
              className={`text-center font-sansSemiBold text-body-sm ${
                activeTab === "details" ? "text-surface" : "text-text"
              }`}
            >
              Product Details
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("AI")}
            className={`flex-1 rounded-xl px-4 py-3 ${
              activeTab === "AI"
                ? "bg-primary"
                : "border border-border bg-surface"
            }`}
          >
            <Text
              className={`text-center font-sansSemiBold text-body-sm ${
                activeTab === "AI" ? "text-surface" : "text-text"
              }`}
            >
              AI Assistance
            </Text>
          </Pressable>
        </View>

        {/* Product Details */}
        {activeTab === "details" ? (
          <AddProduct
            form={form}
            updateField={updateField}
            onAddImage={handleAddImage}
            onSubmit={handleAddProduct}
          />
        ) : (
          <AIAssistance
            image={form.image}
            onAddImage={handleAddImage}
            onRecordVoice={handleRecordVoice}
            onGetAssistance={handleGetAssistance}
          />
        )}
      </ScrollView>

      <Navbar />
    </View>
  );
};

export default AddProductScreen;