import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Plus } from "lucide-react-native";
import HeaderCompoent from "../../components/HeadComponent";
import SellerOrderCard from "../../components/SellerOrderCard";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { getSellerAnalytics, getSellerOrders } from "../../services/api";

const SellerDashboardScreen = ({ navigation }) => {
  const { token, user } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [analyticsResult, ordersResult] = await Promise.all([
        getSellerAnalytics(token),
        getSellerOrders(token),
      ]);

      setAnalytics(analyticsResult.data);
      setOrders(ordersResult.data || []);
    } catch (err) {
      console.error("Failed to load seller dashboard:", err);
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <View className="flex-1 bg-background">
      <HeaderCompoent title="Seller Dashboard" />

      <View className="px-6">
        <Text className="text-text text-body-lg font-sansMedium">
          Welcome back, {user?.name || "Seller"}
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View className="rounded-xl border border-error bg-surface p-4">
            <Text className="font-sans text-body-sm text-error">{error}</Text>

            <Pressable onPress={loadDashboard} className="mt-3">
              <Text className="font-sansSemiBold text-body-sm text-primary">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Stats */}
            <View className="mt-6 flex-row flex-wrap gap-3">
              <View className="w-[48%] rounded-xl border border-border bg-surface p-4">
                <Text className="font-monoBold text-h2 text-primary">
                  ₹{analytics?.sales?.totalRevenue ?? 0}
                </Text>

                <Text className="mt-1 font-sans text-body-sm text-secondary">
                  Sales
                </Text>
              </View>

              <View className="w-[48%] rounded-xl border border-border bg-surface p-4">
                <Text className="font-monoBold text-h2 text-primary">
                  {analytics?.sales?.totalOrders ?? 0}
                </Text>

                <Text className="mt-1 font-sans text-body-sm text-secondary">
                  Orders
                </Text>
              </View>

              <View className="w-[48%] rounded-xl border border-border bg-surface p-4">
                <Text className="font-monoBold text-h2 text-primary">
                  {analytics?.inventory?.totalProducts ?? 0}
                </Text>

                <Text className="mt-1 font-sans text-body-sm text-secondary">
                  Products
                </Text>
              </View>

              <View className="w-[48%] rounded-xl border border-border bg-surface p-4">
                <Text className="font-monoBold text-h2 text-accent">
                  {analytics?.inventory?.lowStockProducts ?? 0}
                </Text>

                <Text className="mt-1 font-sans text-body-sm text-secondary">
                  Low Stock
                </Text>
              </View>
            </View>

            {/* Recent Orders */}
            <View className="mt-6">
              <Text className="text-text text-body-lg font-sansMedium">
                Recent orders
              </Text>

              <View className="mt-4 gap-3">
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <SellerOrderCard
                      key={order.id}
                      order={order}
                      onPress={() => console.log(order.id)}
                    />
                  ))
                ) : (
                  <View className="rounded-xl border border-border bg-surface p-5">
                    <Text className="text-center font-sans text-body-sm text-muted">
                      No orders yet.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {/* Add Product */}
        <Pressable
          onPress={() => navigation.navigate("AddProduct")}
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
