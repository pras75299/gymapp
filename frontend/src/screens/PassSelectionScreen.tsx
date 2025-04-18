import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Gym, PassType } from "../api/gymApi";

type RootStackParamList = {
  PassSelection: { gym: Gym };
};

type PassSelectionScreenRouteProp = RouteProp<
  RootStackParamList,
  "PassSelection"
>;

export default function PassSelectionScreen() {
  const route = useRoute<PassSelectionScreenRouteProp>();
  const { gym } = route.params;

  const renderPass = ({ item }: { item: PassType }) => (
    <TouchableOpacity style={styles.passCard}>
      <Text style={styles.passName}>{item.name}</Text>
      <Text style={styles.passDuration}>{item.duration} days</Text>
      <Text style={styles.passPrice}>
        {item.price} {item.currency}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.gymName}>{gym.name}</Text>
        {gym.location && <Text style={styles.location}>{gym.location}</Text>}
      </View>
      <Text style={styles.title}>Available Passes</Text>
      <FlatList
        data={gym.passes}
        renderItem={renderPass}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.passList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    marginBottom: 24,
  },
  gymName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  location: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  passList: {
    gap: 12,
  },
  passCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  passDuration: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  passPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2196F3",
    marginTop: 8,
  },
});
