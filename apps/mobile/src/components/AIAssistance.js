import { View, Text, Pressable, Image as RNImage } from "react-native";
import { Image, Mic, Sparkles, Camera } from "lucide-react-native";

const AIAssistance = ({
  image,
  voice,
  isRecording,
  onAddImage,
  onRecordVoice,
  onGetAssistance,
}) => {
  return (
    <View className="mt-8">
      {/* Intro */}
      <View>
        <Text className="font-heading text-h2 text-primary">AI Assistance</Text>

        <Text className="mt-1 font-sans text-body-sm text-secondary">
          Show us your product and describe it in your own words. We'll help
          create the listing for you.
        </Text>
      </View>

      {/* Product Image */}
      <View className="mt-7">
        <Text className="font-sansMedium text-body-sm text-text">
          Product Image
        </Text>

        <Pressable
          onPress={onAddImage}
          className="mt-2 overflow-hidden rounded-xl border border-dashed border-border bg-surface"
        >
          {image ? (
            <View className="relative">
              <Image
                source={{ uri: image }}
                className="h-52 w-full"
                resizeMode="cover"
              />
            </View>
          ) : (
            <View className="h-52 items-center justify-center">
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

      {/* Voice Description */}
      <View className="mt-6">
        <Text className="font-sansMedium text-body-sm text-text">
          Voice Description
        </Text>

        <View className="mt-2 items-center rounded-xl border border-border bg-surface px-5 py-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
            <Mic size={24} color="#FFFCF7" />
          </View>

          <Text className="mt-3 font-sansSemiBold text-body-sm text-text">
            Tell us about your product
          </Text>

          <Text className="mt-1 text-center font-sans text-label text-muted">
            Describe your product naturally in your own language.
          </Text>

          <Pressable
            onPress={onRecordVoice}
            className={`mt-5 h-12 w-full items-center justify-center rounded-xl ${
              isRecording ? "bg-accent" : "border border-border"
            }`}
          >
            <Text
              className={`font-sansSemiBold text-body-sm ${
                isRecording ? "text-surface" : "text-primary"
              }`}
            >
              {isRecording ? "Stop Recording" : "Record Voice"}
            </Text>
          </Pressable>
          {voice && !isRecording && (
            <Text className="mt-3 text-center font-sans text-label text-success">
              Voice description recorded
            </Text>
          )}
        </View>
      </View>

      {/* AI Assistance */}
      <Pressable
        onPress={onGetAssistance}
        className="mt-7 h-14 flex-row items-center justify-center rounded-xl bg-primary"
      >
        <Sparkles size={18} color="#FFFCF7" />

        <Text className="ml-2 font-sansSemiBold text-body text-surface">
          Get AI Assistance
        </Text>
      </Pressable>
    </View>
  );
};

export default AIAssistance;
