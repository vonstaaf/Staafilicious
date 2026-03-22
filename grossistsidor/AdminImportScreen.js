import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { runPriceImport } from './importService';

export default function AdminImportScreen() {
  const [loading, setLoading] = useState(false);

  const handleImport = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/plain' });
      if (!result.canceled) {
        setLoading(true);
        const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
        const count = await runPriceImport(content, type);
        setLoading(false);
        Alert.alert("Succé", `Klart! Importerade ${count} artiklar för ${type}.`);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Fel", "Något gick snett vid importen.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grossisthantering</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#6200EE" />
      ) : (
        <>
          <TouchableOpacity style={styles.btn} onPress={() => handleImport('rexel')}>
            <Text style={styles.btnText}>Importera Rexel (.txt)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#ffd700' }]} onPress={() => handleImport('ahlsell')}>
            <Text style={[styles.btnText, { color: '#000' }]}>Importera Ahlsell (.txt)</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
  btn: { backgroundColor: '#000', padding: 18, borderRadius: 12, marginBottom: 15 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '600' }
});