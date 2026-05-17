import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";

const PHOTO_CATEGORIES = ["Dolt montage", "Före", "Efter"];

export default function PhotoDocumentationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, projects, updateProject } = useContext(ProjectsContext);

  const routeProjectId = route?.params?.project?.id || null;
  const activeProject = useMemo(() => {
    if (!routeProjectId) return selectedProject || null;
    return projects.find((p) => p.id === routeProjectId) || selectedProject || null;
  }, [projects, routeProjectId, selectedProject]);

  const [category, setCategory] = useState(PHOTO_CATEGORIES[0]);
  const [comment, setComment] = useState("");

  const photos = useMemo(() => (Array.isArray(activeProject?.photos) ? activeProject.photos : []), [activeProject?.photos]);

  const groupedPhotos = useMemo(() => {
    return PHOTO_CATEGORIES.map((cat) => ({
      category: cat,
      items: photos
        .filter((photo) => photo.category === cat)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    }));
  }, [photos]);

  const savePhoto = async (uri) => {
    if (!activeProject?.id) return;
    const nextPhoto = {
      id: String(Date.now()),
      uri,
      description: comment.trim(),
      category,
      createdAt: new Date().toISOString(),
    };
    const existing = Array.isArray(activeProject.photos) ? activeProject.photos : [];
    try {
      await updateProject(activeProject.id, { photos: [nextPhoto, ...existing] });
      setComment("");
      Alert.alert("Sparat", "Fotot är sparat i dokumentationen.");
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara fotot.");
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Behörighet saknas", "Tillåt bildbibliotek för att ladda upp foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await savePhoto(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Behörighet saknas", "Tillåt kamera för att ta foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await savePhoto(result.assets[0].uri);
  };

  if (!activeProject?.id) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Inget aktivt projekt hittades.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <AppHeader title="FOTODOKUMENTATION" subTitle={(activeProject.name || "").toUpperCase()} navigation={navigation} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>KATEGORI</Text>
          <View style={styles.categoryRow}>
            {PHOTO_CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.categoryBtn, category === item && styles.categoryBtnActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.categoryBtnText, category === item && styles.categoryBtnTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>KOMMENTAR</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Kort beskrivning av bilden..."
            placeholderTextColor="#AAA"
            value={comment}
            onChangeText={setComment}
          />

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={pickFromLibrary}>
              <Ionicons name="images-outline" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>VÄLJ BILD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: WorkaholicTheme.colors.primary }]} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>TA FOTO</Text>
            </TouchableOpacity>
          </View>
        </View>

        {groupedPhotos.map((group) => (
          <View key={group.category} style={styles.groupCard}>
            <Text style={styles.groupTitle}>{group.category.toUpperCase()}</Text>
            {group.items.length === 0 ? (
              <Text style={styles.groupEmpty}>Inga bilder i denna kategori ännu.</Text>
            ) : (
              <View style={styles.grid}>
                {group.items.map((photo) => (
                  <View key={photo.id} style={styles.photoCard}>
                    <Image source={{ uri: photo.uri }} style={styles.image} />
                    <Text numberOfLines={2} style={styles.photoComment}>
                      {photo.description || "Ingen kommentar"}
                    </Text>
                    <Text style={styles.photoDate}>
                      {new Date(photo.createdAt || Date.now()).toLocaleDateString("sv-SE")}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#999", fontWeight: "700" },

  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  sectionLabel: { fontSize: 10, color: "#AAA", fontWeight: "900", letterSpacing: 1 },
  categoryRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  categoryBtn: { backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  categoryBtnActive: { backgroundColor: WorkaholicTheme.colors.primary + "20" },
  categoryBtnText: { color: "#666", fontWeight: "800", fontSize: 11 },
  categoryBtnTextActive: { color: WorkaholicTheme.colors.primary },

  commentInput: {
    marginTop: 8,
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    paddingVertical: 12,
  },
  actionBtnText: { color: "#FFF", fontWeight: "900", fontSize: 12 },

  groupCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  groupTitle: { fontWeight: "900", color: "#555", fontSize: 11, letterSpacing: 0.8, marginBottom: 10 },
  groupEmpty: { color: "#999", fontSize: 12, fontWeight: "600" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoCard: { width: "48%", backgroundColor: "#F8F9FB", borderRadius: 12, padding: 8 },
  image: { width: "100%", height: 110, borderRadius: 10, backgroundColor: "#EEE" },
  photoComment: { marginTop: 6, fontSize: 11, fontWeight: "700", color: "#444" },
  photoDate: { marginTop: 3, fontSize: 10, color: "#999", fontWeight: "700" },
});
