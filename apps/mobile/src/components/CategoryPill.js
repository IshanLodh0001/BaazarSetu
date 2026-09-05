import { View, Text, Pressable } from "react-native";

const CategoryPill = ({active, elem, handleSetActive}) => {
  return (
    <Pressable key={elem} onPress={() => handleSetActive(elem)}>
      <View
        className={`rounded-full border px-4 py-2 ${
          active === elem
            ? "border-primary-dark bg-primary"
            : "border-border bg-surface"
        }`}
      >
        <Text
          className={`font-sansMedium text-body-sm ${
            active === elem ? "text-surface" : "text-text"
          }`}
        >
          {elem}
        </Text>
      </View>
    </Pressable>
  );
};

export default CategoryPill;
