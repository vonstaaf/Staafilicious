import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

/**
 * EXPORTERA PROJEKT TILL JSON-FIL
 */
export const exportProjectAsJson = async (project) => {
  try {
    const formattedName = project.name.charAt(0).toUpperCase() + project.name.slice(1);
    const fileName = `${formattedName.replace(/[^a-z0-9åäöÅÄÖ]/gi, '_')}_export.json`;
    const fileUri = FileSystem.cacheDirectory + fileName;

    const projectData = JSON.stringify(project, null, 2);

    await FileSystem.writeAsStringAsync(fileUri, projectData);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: `Exportera: ${formattedName}`,
        UTI: 'public.json'
      });
    } else {
      Alert.alert("Fel", "Delning är inte tillgänglig på denna enhet.");
    }
  } catch (error) {
    console.error("Export error:", error);
    Alert.alert("Export misslyckades", "Kunde inte skapa exportfilen.");
  }
};

/**
 * IMPORTERA PROJEKT FRÅN JSON-FIL
 */
export const importProjectFromJson = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true
    });

    if (result.canceled) return null;

    const fileUri = result.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(fileUri);
    const projectData = JSON.parse(content);

    if (!projectData.name) {
      throw new Error("Filen saknar projektnamn och verkar ogiltig.");
    }

    projectData.name = projectData.name.charAt(0).toUpperCase() + projectData.name.slice(1);

    return projectData;
  } catch (error) {
    console.error("Import error:", error);
    Alert.alert("Import misslyckades", "Filen kunde inte läsas in.");
    return null;
  }
};