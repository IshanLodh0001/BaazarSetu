import { View, Text, ScrollView } from "react-native";

import HeaderComponent from "../../components/HeadComponent";
import OrderCard from "../../components/OrderCart";
import Navbar from "../../components/Navbar";

const BuyerDashboardScreen = () => {
  const orders = [
    {
      id: "BZ-1024",
      product: "Handwoven Bamboo Basket",
      price: 1500,
      status: "Pending",
      date: "Sep 5, 2026",
    },
    {
      id: "BZ-1019",
      product: "Jaipur Blue Pottery",
      price: 2400,
      status: "Completed",
      date: "Sep 2, 2026",
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <HeaderComponent title={"Dashboard"} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
      >
        <View className="h-fit w-full p-2 flex">
          <Text className="text-body text-text font-sans">Welcome back</Text>
          <Text className="text-body text-text font-sans">
            Explore your activity and orders.
          </Text>
        </View>

        <View className="mt-6 flex-row gap-3">
          <View className="flex-1 rounded-xl border border-border bg-surface p-4">
            <Text className="font-monoBold text-h2 text-primary">
              {orders.length}
            </Text>

            <Text className="mt-1 font-mono text-body-sm text-secondary">
              Orders
            </Text>
          </View>

          <View className="flex-1 rounded-xl border border-border bg-surface p-4">
            <Text className="font-monoBold text-h2 text-primary">
              {orders.filter((order) => order.status === "Pending").length}
            </Text>

            <Text className="mt-1 font-mono text-body-sm text-secondary">
              Pending
            </Text>
          </View>
        </View>

        <View className="mt-6">
          <Text className="text-body text-text font-sans">Recent order</Text>
          <View className="mt-6 gap-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => console.log(order.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
      <Navbar />
    </View>
  );
};

export default BuyerDashboardScreen;
