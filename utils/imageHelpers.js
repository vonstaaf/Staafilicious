import * as FileSystem from 'expo-file-system/legacy'; // 🔑 Uppdaterad för att ta bort varningsmeddelandet i SDK 54
import { Asset } from 'expo-asset';

/**
 * 100% Robust Image Helper.
 * Använder minnesbaserad konvertering (Fetch + Blob) för nätverksbilder
 * för att helt kringgå Androids filsystem-problem i produktion.
 */
export const getBase64Image = async (imageSource) => {
  // 1. Grundläggande kontroller
  if (!imageSource) return null;

  // Om det redan är en base64-sträng, returnera direkt
  if (typeof imageSource === 'string' && imageSource.startsWith('data:image')) {
    return imageSource;
  }

  try {
    // --- SCENARIO 1: LOKALA TILLGÅNGAR (require/import som blir siffror) ---
    if (typeof imageSource === 'number') {
      const asset = Asset.fromModule(imageSource);
      await asset.downloadAsync(); // Se till att den finns i cachen
      
      const uri = asset.localUri || asset.uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      
      // Bestäm filtyp (default png)
      const type = asset.type === 'image' ? 'png' : (asset.type || 'png');
      return `data:image/${type};base64,${base64}`;
    }

    // --- SCENARIO 2: NÄTVERKSBILDER (http/https) ---
    // Detta är "Magic Fix" för Android Production. 
    // Vi laddar inte ner till fil, utan direkt till minnet.
    if (typeof imageSource === 'string' && imageSource.startsWith('http')) {
      const response = await fetch(imageSource);
      const blob = await response.blob();

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // reader.result innehåller hela strängen "data:image/png;base64,..."
          resolve(reader.result);
        };
        reader.onerror = (err) => {
          console.warn("FileReader failed:", err);
          reject(err);
        };
        reader.readAsDataURL(blob);
      });
    }

    // --- SCENARIO 3: LOKALA FILER (file:// från kameran/biblioteket) ---
    if (typeof imageSource === 'string') {
      // Fixa prefix om det saknas
      const uri = imageSource.startsWith('file://') ? imageSource : `file://${imageSource}`;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      
      // Enkel gissning av mime-typ
      const isPng = uri.toLowerCase().includes('.png');
      const mime = isPng ? 'image/png' : 'image/jpeg';
      
      return `data:${mime};base64,${base64}`;
    }

    return null;

  } catch (error) {
    console.warn("Image conversion failed completely:", error);
    return null;
  }
};