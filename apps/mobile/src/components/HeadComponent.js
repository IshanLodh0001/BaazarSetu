import { View, Text, Image } from "react-native";
const HeadComponent = () => {
  return (
    <View className=" px-[24] py-2 mt-12 flex-row items-center justify-between border-b border-border">
      <Text className="font-heading text-h1 text-primary-dark">BazaarSetu</Text>
      <Image
        source={require("../../assets/portraitPlaceholder.png")}
        className="h-10 w-10 rounded-full"
      />
    </View>
  );
};

export default HeadComponent;
