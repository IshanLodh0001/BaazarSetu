import {
  View,
  Text,
  Image,
  Pressable,
} from "react-native";
import { ArrowRight } from "lucide-react-native";
const MakerCard = () => {
  return (
          <View className="mt-10">
        <Text className="font-heading text-h3 text-primary">
          Meet the maker
        </Text>

        <View className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <Image
            source={require("../../assets/portraitPlaceholder.png")}
            className="h-56 w-full"
            resizeMode="cover"
          />

          <View className="p-4">
            <Text className="font-sansSemiBold text-body text-text">
              Ramesh Kumar
            </Text>

            <Text className="mt-1 font-sans text-body-sm text-secondary">
              Bastar, Chhattisgarh
            </Text>

            <Pressable className="mt-4 flex-row items-center">
              <Text className="font-sansMedium text-data text-primary">
                Read story
              </Text>
              <ArrowRight size={16} color="#304238" />
            </Pressable>
          </View>
        </View>
      </View>
  );
};

export default MakerCard;
