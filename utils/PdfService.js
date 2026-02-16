import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { getInspectionHtml } from './pdfTemplates';
import { getBase64Image } from './imageHelpers';

const APP_LOGO_LOCAL = require('../assets/logo.png'); 

export const generateProjectPdf = async (project, inspection, companyData) => {
  try {
    const savedLogoUri = await AsyncStorage.getItem('@company_logo');
    
    const appLogoBase64 = await getBase64Image(APP_LOGO_LOCAL);
    const logoToUse = companyData?.logoUrl || companyData?.logo || savedLogoUri;
    const companyLogoBase64 = logoToUse ? await getBase64Image(logoToUse) : null;

    let processedImages = [];
    if (inspection.images && inspection.images.length > 0) {
      processedImages = await Promise.all(
        inspection.images.map(imgUri => getBase64Image(imgUri))
      );
    }

    const rawName = project?.name || "Projekt";
    const projectName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const safeFileName = `Egenkontroll_${projectName.replace(/[^a-z0-9åäöÅÄÖ]/gi, '_')}.pdf`;

    const htmlContent = getInspectionHtml({
      ...inspection,
      images: processedImages, 
      projectName: projectName,
      companyData: companyData || {}, 
      appLogo: appLogoBase64,
      companyLogo: companyLogoBase64,
      date: inspection.date || new Date().toLocaleDateString('sv-SE'),
    });

    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    const destinationUri = FileSystem.cacheDirectory + safeFileName;
    
    await FileSystem.copyAsync({
      from: uri,
      to: destinationUri
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(destinationUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `Spara PDF: ${safeFileName}`
      });
    } else {
      Alert.alert("Fel", "Delning är inte tillgänglig på denna enhet.");
    }

  } catch (error) {
    console.error("PDF Error:", error);
    Alert.alert("Fel", "Kunde inte skapa PDF: " + error.message);
  }
};