import { View, Text, ScrollView, Pressable } from "react-native";
import { Plus } from "lucide-react-native";
import HeaderCompoent from "../../components/HeadComponent";
import SellerOrderCard from "../../components/SellerOrderCard";
import Navbar from "../../components/Navbar";

const SellerDashboardScreen = ({navigation}) => {
  const recentOrders = [
    {
      id: "BZ-1024",
      product: "Handwoven Bamboo Basket",
      buyer: "Ananya Sharma",
      price: 1500,
      status: "Pending",
      image: require("../../../assets/featuredplaceholder.jpeg"),
    },
    {
      id: "BZ-1021",
      product: "Jaipur Blue Pottery",
      buyer: "Rahul Mehta",
      price: 2400,
      status: "Completed",
      image: require("../../../assets/bluepottery.jpg"),
    },
    {
      id: "BZ-1018",
      product: "Kutch Embroidery",
      buyer: "Priya Shah",
      price: 3200,
      status: "Processing",
      image: require("../../../assets/kutch.jpg"),
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <HeaderCompoent title={"Seller Dashboard"} />
      <View className="px-6">
        <Text className="text-text text-body-lg font-sansMedium ">
          Welcome back, {`Shubham`}
        </Text>
      </View>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
      >
        <View className="mt-6 flex-row flex-wrap gap-3">
          <View className="w-[48%] rounded-xl border border-border bg-surface p-4">
            <Text className="font-monoBold text-h2 text-primary">₹24,500</Text>
            <Text className="mt-1 font-sans text-body-sm text-secondary">
              Sales
            </Text>
          </View>

          <View className="w-[48%] rounded-xl border border-border bg-surface p-4">
            <Text className="font-monoBold text-h2 text-primary">18</Text>
            <Text className="mt-1 font-sans text-body-sm text-secondary">
              Orders
            </Text>
          </View>

          <View className="w-[48%] rounded-xl border border-border bg-surface p-4">
            <Text className="font-monoBold text-h2 text-primary">12</Text>
            <Text className="mt-1 font-sans text-body-sm text-secondary">
              Products
            </Text>
          </View>

          <View className="w-[48%] rounded-xl border border-border bg-surface p-4">
            <Text className="font-monoBold text-h2 text-accent">3</Text>
            <Text className="mt-1 font-sans text-body-sm text-secondary">
              Low Stock
            </Text>
          </View>
        </View>

        <View>
          <View className="mt-6">
            <Text className="text-text text-body-lg font-sansMedium">
              Recent orders
            </Text>
            <View className="mt-4 gap-3">
              {recentOrders.map((order) => (
                <SellerOrderCard
                  key={order.id}
                  order={order}
                  onPress={() => console.log(order.id)}
                />
              ))}
            </View>
          </View>
        </View>
        <Pressable
          // onPress={() => navigation.navigate("AddProduct")}
          className="mt-6 h-14 flex-row items-center justify-center rounded-xl bg-primary"
        >
          <Plus size={18} color="#FFFCF7" />
          <Text className="ml-2 font-sansSemiBold text-body text-surface">
            Add Product
          </Text>
        </Pressable>
      </ScrollView>
      <Navbar navigation={navigation} />
    </View>
  );
};

export default SellerDashboardScreen;
