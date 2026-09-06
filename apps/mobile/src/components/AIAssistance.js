import { View, Text, Pressable, Image } from "react-native";
import { Image as ImageIcon, Mic, Sparkles, Camera } from "lucide-react-native";

const AIAssistance = ({
  image,
  voice,
  isRecording,
  aiResult,
  onAddImage,
  onRecordVoice,
  onGetAssistance,
  onUseSuggestions,
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
                <ImageIcon size={22} color="#304238" />
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
      {aiResult && (
        <View className="mt-6 rounded-xl border border-border bg-surface p-5">
          <Text className="font-heading text-h3 text-primary">
            AI Suggestions
          </Text>

          <View className="mt-5">
            <Text className="font-sansMedium text-label text-muted">
              Product Name
            </Text>
            <Text className="mt-1 font-sans text-body text-text">
              {aiResult.name}
            </Text>
          </View>

          <View className="mt-4">
            <Text className="font-sansMedium text-label text-muted">
              Description
            </Text>
            <Text className="mt-1 font-sans text-body-sm text-text">
              {aiResult.description}
            </Text>
          </View>

          <View className="mt-4">
            <Text className="font-sansMedium text-label text-muted">
              Category
            </Text>
            <Text className="mt-1 font-sans text-body-sm text-text">
              {aiResult.category}
            </Text>
          </View>

          <View className="mt-4">
            <Text className="font-sansMedium text-label text-muted">
              Suggested Price
            </Text>
            <Text className="mt-1 font-monoMedium text-data text-primary">
              ₹{aiResult.price}
            </Text>
          </View>

          <View className="mt-4">
            <Text className="font-sansMedium text-label text-muted">Tags</Text>

            <View className="mt-2 flex-row flex-wrap gap-2">
              {aiResult.tags.map((tag) => (
                <View
                  key={tag}
                  className="rounded-full bg-background px-3 py-2"
                >
                  <Text className="font-sans text-label text-secondary">
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Use Suggestions */}
      {aiResult && (
        <Pressable
          onPress={onUseSuggestions}
          className="mt-6 h-14 items-center justify-center rounded-xl bg-primary"
        >
          <Text className="font-sansSemiBold text-body text-surface">
            Use Suggestions
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export default AIAssistance;
