import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { logError } from "../utils/logger";

/**
 * Isolerar kraschar i AI-arbetsorder så att hela appen inte vitnar.
 */
export default class AiWorkOrderErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logError(error, {
      screen: "AiWorkOrderScreen",
      action: "error_boundary",
      componentStack: info?.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.box}>
          <Text style={styles.title}>Något gick fel i AI-delen</Text>
          <Text style={styles.body}>
            Vi kunde inte visa arbetsordern. Du kan gå tillbaka eller försöka igen.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleRetry}>
            <Text style={styles.btnText}>Försök igen</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {
    margin: 20,
    padding: 16,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  title: { fontWeight: "800", fontSize: 16, color: "#E65100", marginBottom: 8 },
  body: { fontSize: 14, color: "#5D4037", lineHeight: 20, marginBottom: 12 },
  btn: {
    alignSelf: "flex-start",
    backgroundColor: "#E65100",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
});
