import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print'; // 👈 Behövs för PDF
import { Alert } from 'react-native';

/**
 * HJÄLPFUNKTION: Formatera namn (Stor bokstav)
 */
const formatName = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * EXPORTERA PROJEKT TILL JSON-FIL (Bevarad logik)
 */
export const exportProjectAsJson = async (project) => {
  try {
    const formattedName = formatName(project.name);
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
      Alert.alert("Fel", "Delning är inte tillgänglig.");
    }
  } catch (error) {
    Alert.alert("Export misslyckades", "Kunde inte skapa JSON.");
  }
};

/**
 * IMPORTERA PROJEKT FRÅN JSON-FIL (Bevarad logik)
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

    if (!projectData.name) throw new Error("Ogiltig fil.");
    projectData.name = formatName(projectData.name);
    return projectData;
  } catch (error) {
    Alert.alert("Import misslyckades", "Filen kunde inte läsas.");
    return null;
  }
};

/**
 * GENERERA PDF-RAPPORT (Ny motor med sidbrytnings-fixar)
 */
export const generateProjectPdf = async (project, companyData, logoUri) => {
  try {
    const html = `
      <html>
        <head>
          <style>
            @page { margin: 15mm; size: A4 portrait; }
            body { font-family: 'Helvetica', sans-serif; color: #333; line-height: 1.4; }
            
            /* LOGO & HEADER */
            .header { border-bottom: 2px solid #EEE; padding-bottom: 20px; margin-bottom: 30px; display: flex; flex-direction: row; justify-content: space-between; }
            .logo { width: 150px; height: 60px; object-fit: contain; }
            .company-info { text-align: right; }
            .company-name { font-weight: 900; font-size: 16px; color: #1C1C1E; }
            .company-sub { font-size: 10px; color: #999; }

            /* FIX: HÅLL IHOP KATEGORIER (Egenkontroll) */
            .category-block { 
              page-break-inside: avoid; 
              break-inside: avoid; 
              display: block;
              width: 100%;
              margin-bottom: 25px;
              border: 1px solid #F0F0F0;
              border-radius: 8px;
              padding: 15px;
            }
            .category-title { background: #F8F9FB; padding: 10px; font-weight: 900; font-size: 12px; margin: -15px -15px 15px -15px; border-bottom: 1px solid #EEE; border-radius: 8px 8px 0 0; }

            /* FIX: GRUPPSCHEMA PÅ EN SIDA */
            .group-schedule-container {
              page-break-before: always; /* Börja alltid på ny sida */
              width: 100%;
            }
            .schedule-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed; /* Tvingar bredden att hålla sig till ramen */
              font-size: ${project.groups?.length > 20 ? '8px' : '10px'}; /* Skalar texten om det är många rader */
            }
            .schedule-table th { background: #1C1C1E; color: #FFF; padding: 8px; font-size: 9px; text-transform: uppercase; }
            .schedule-table td { border: 1px solid #EEE; padding: 6px; }

            .status-ok { color: #34C759; font-weight: bold; }
            .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 8px; color: #CCC; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUri ? `<img src="${logoUri}" class="logo" />` : '<div style="width:150px"></div>'}
            <div class="company-info">
              <div class="company-name">${companyData?.companyName || 'Företaget'}</div>
              <div class="company-sub">Org.nr: ${companyData?.orgNr || '-'}</div>
              <div class="company-sub">${companyData?.phone || ''}</div>
            </div>
          </div>

          <h1>Projekt: ${formatName(project.name)}</h1>
          <p style="font-size: 10px; color: #666;">Exportdatum: ${new Date().toLocaleDateString('sv-SE')}</p>

          ${project.inspectionCategories?.map(cat => `
            <div class="category-block">
              <div class="category-title">${cat.title.toUpperCase()}</div>
              <table style="width: 100%; border-collapse: collapse;">
                ${cat.items?.map(item => `
                  <tr>
                    <td style="padding: 5px 0; font-size: 11px; border-bottom: 1px solid #FAFAFA;">${item.label}</td>
                    <td style="text-align: right; font-size: 11px; border-bottom: 1px solid #FAFAFA;" class="status-ok">✔ OK</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          `).join('') || ''}

          ${project.groups && project.groups.length > 0 ? `
            <div class="group-schedule-container">
              <h2>Gruppschema</h2>
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th style="width: 10%;">Nr</th>
                    <th style="width: 50%;">Beskrivning / Belastning</th>
                    <th style="width: 20%;">Typ</th>
                    <th style="width: 20%;">Säkring</th>
                  </tr>
                </thead>
                <tbody>
                  ${project.groups.map(g => `
                    <tr>
                      <td style="text-align: center; font-weight: bold;">${g.id}</td>
                      <td>${g.label || ''}</td>
                      <td>${g.type || ''}</td>
                      <td>${g.fuse || ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="footer">Genererad via Workaholic Pro</div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    
  } catch (error) {
    console.error("PDF Error:", error);
    Alert.alert("PDF-fel", "Kunde inte skapa rapporten.");
  }
};