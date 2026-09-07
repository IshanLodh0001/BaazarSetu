import { View, Text, Image, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
const HeadComponent = ({ title }) => {
  const navigation = useNavigation();
  return (
    <View className=" px-[24] py-2 mt-12 flex-row items-center justify-between border-b border-border">
      <Text className="font-heading text-h1 text-primary-dark">{title}</Text>
      <Pressable onPress={() => navigation.navigate("Profile")}>
        <Image
          source={require("../../assets/portraitPlaceholder.png")}
          className="h-10 w-10 rounded-full"
        />
      </Pressable>
    </View>
  );
};

export default HeadComponent;
