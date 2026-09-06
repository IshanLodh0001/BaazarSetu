import { View, Text, ScrollView, Pressable } from "react-native";
import { useState } from "react";
import { ArrowRight } from "lucide-react-native";
import HeadComponent from "../../components/HeadComponent";
import Navbar from "../../components/Navbar";
import CartItem from "../../components/CartItem";

const CartScreen = ({ navigation }) => {
  const cartItems = [
    {
      id: "1",
      name: "Handwoven Bamboo Basket",
      location: "Bastar, Chhattisgarh",
      price: 1500,
      quantity: 1,
      image: require("../../../assets/featuredplaceholder.jpeg"),
    },
    {
      id: "2",
      name: "Jaipur Blue Pottery",
      location: "Jaipur, Rajasthan",
      price: 2400,
      quantity: 1,
      image: require("../../../assets/bluepottery.jpg"),
    },
  ];
  const [cart, setCart] = useState(cartItems);
  const updateQuantity = (id, change) => {
    setCart((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(1, item.quantity + change),
            }
          : item,
      ),
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return (
    <View className="flex-1 bg-background">
      <HeadComponent title={"Cart"} />
      <ScrollView className="mt-6 px-4" contentContainerStyle={{ gap: 12 }}>
        {cart.map((item) => (
          <Pressable
            onPress={() =>
              navigation.navigate("ProductDetails", {
                item,
              })
            }
          >
            <CartItem
              key={item.id}
              item={item}
              onIncrease={() => updateQuantity(item.id, 1)}
              onDecrease={() => updateQuantity(item.id, -1)}
            />
          </Pressable>
        ))}
      </ScrollView>

      <View className="mt-8 px-4 py-3 border-t border-border pt-5 flex items-center">
        <View className="flex-row w-full items-center justify-between">
          <Text className="font-sans text-body text-secondary">Total</Text>

          <Text className="font-monoSemiBold text-h3 text-primary">
            ₹{total}
          </Text>
        </View>

        <Pressable
          onPress={() => console.log("Proceed to enquiry")}
          className="mt-5 h-14 w-60 flex-row items-center justify-center rounded-md bg-primary"
        >
          <Text className="font-sansSemiBold text-body text-surface">
            Proceed to Enquiry
          </Text>

          <ArrowRight size={18} color="#FFFCF7" style={{ marginLeft: 8 }} />
        </Pressable>
      </View>
      <Navbar navigation={navigation} />
    </View>
  );
};

export default CartScreen;
