import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";
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
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [activeTab, setActiveTab] = useState("details");
  const [aiResult, setAiResult] = useState(null);

  const handleGetAssistance = () => {
    setAiResult({
      name: "Handcrafted Terracotta Vase",
      description:
        "A handcrafted terracotta vase made by traditional artisans.",
      category: "Home Decor",
      price: "850",
      tags: ["Terracotta", "Handcrafted", "Home Decor"],
    });
  };

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddProduct = () => {
    console.log("Product:", form);
  };

  const handleAddImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      console.log("Media library permission denied");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      updateField("image", result.assets[0].uri);
    }
  };

  const handleRecordVoice = async () => {
    try {
      // STOP RECORDING
      if (isRecording) {
        await audioRecorder.stop();

        setVoice(audioRecorder.uri);
        setIsRecording(false);

        console.log("Voice recording:", audioRecorder.uri);
        return;
      }

      // REQUEST MICROPHONE PERMISSION
      const permission = await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        console.log("Microphone permission denied");
        return;
      }

      // CONFIGURE AUDIO
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      // START RECORDING
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);

      console.log("Recording started");
    } catch (error) {
      console.error("Recording error:", error);
      setIsRecording(false);
    }
  };

  const handleUseSuggestions = () => {
    if (!aiResult) return;

    setForm((prev) => ({
      ...prev,
      name: aiResult.name,
      description: aiResult.description,
      category: aiResult.category,
      price: aiResult.price,
    }));

    setActiveTab("details");
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
            voice={voice}
            isRecording={isRecording}
            aiResult={aiResult}
            onAddImage={handleAddImage}
            onRecordVoice={handleRecordVoice}
            onGetAssistance={handleGetAssistance}
            onUseSuggestions={handleUseSuggestions}
          />
        )}
      </ScrollView>

      <Navbar />
    </View>
  );
};

export default AddProductScreen;
