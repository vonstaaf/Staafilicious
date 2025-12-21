import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export const generateProjectReport = async (project, logoUri) => {
  let finalLogoSource = logoUri;

  // Om vi har en lokal logotyp, konvertera den till Base64 för garanterad visning i PDF
  if (logoUri && !logoUri.startsWith('http') && !logoUri.startsWith('data:')) {
    try {
      const base64 = await FileSystem.readAsStringAsync(logoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      finalLogoSource = `data:image/png;base64,${base64}`;
    } catch (e) {
      console.warn("Kunde inte konvertera logotyp till Base64:", e);
    }
  }

  // Säkerställ stor bokstav i projektnamnet för rapporten
  const formattedName = project.name.charAt(0).toUpperCase() + project.name.slice(1);

  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #1a1a1a; }
          .header { display: flex; flex-direction: row; justify-content: space-between; align-items: center; border-bottom: 3px solid #007AFF; padding-bottom: 20px; }
          .logo { max-width: 120px; max-height: 60px; object-fit: contain; }
          .project-title { color: #007AFF; font-size: 32px; margin-top: 30px; margin-bottom: 10px; }
          .meta-box { background: #f0f7ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
          .details { margin-top: 30px; line-height: 1.8; font-size: 16px; }
          .footer { position: absolute; bottom: 40px; left: 40px; right: 40px; font-size: 10px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">Projektunderlag</h1>
          ${finalLogoSource ? `<img src="${finalLogoSource}" class="logo" />` : '<div style="width:1px;"></div>'}
        </div>
        
        <h2 class="project-title">${formattedName}</h2>
        
        <div class="meta-box">
          <p style="margin: 5px 0;"><strong>Datum:</strong> ${new Date().toLocaleDateString('sv-SE')}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> ${project.status || 'Aktivt'}</p>
        </div>

        <div class="details">
          <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 5px;">Beskrivning & Anteckningar</h3>
          <p>${project.description || 'Inga anteckningar har lagts till för detta projekt.'}</p>
        </div>

        <div class="footer">
          Detta dokument är genererat automatiskt i Workaholic.
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Sharing.shareAsync(uri, { 
        UTI: '.pdf', 
        mimeType: 'application/pdf',
        dialogTitle: `Dela underlag för ${formattedName}` 
      });
    } else {
      await Print.printAsync({ html: htmlContent });
    }
  } catch (error) {
    console.error("PDF Error:", error);
    alert("Ett fel uppstod när PDF:en skapades.");
  }
};