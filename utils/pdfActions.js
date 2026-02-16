import { Alert } from 'react-native';
import { handleGroupSchedulePdf } from './pdfModels/GroupSchedulePdf';
import { handleCustomerPdf } from './pdfModels/CustomerPdf';
import { handleMaterialPdf } from './pdfModels/MaterialPdf';
import { handleInspectionPdf } from './pdfModels/InspectionPdf';

/**
 * Denna fil fungerar som en central växel för alla PDF-funktioner.
 * Varje PDF-typ har nu sin egen logik i mappen /pdfModels.
 */

export { 
  handleGroupSchedulePdf, 
  handleCustomerPdf, 
  handleMaterialPdf, 
  handleInspectionPdf 
};