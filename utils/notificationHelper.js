import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Constants from 'expo-constants'; // 🔑 Tillagd för att kontrollera miljö

// Hur notisen ska bete sig när appen är öppen
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(userId) {
  let token;

  // 1. 🔑 FIX FÖR EXPO GO (SDK 54)
  // Vi avbryter tyst om vi kör i Expo Go för att slippa felmeddelanden
  if (Constants.appOwnership === 'expo') {
    console.log('Notiser: Pausade i Expo Go-läge.');
    return null;
  }

  // 2. Kolla om det är en fysisk enhet
  if (!Device.isDevice) {
    console.log('Notiser: Kräver en fysisk enhet (ej simulator).');
    return null;
  }

  try {
    // 3. Kolla/Fråga om tillåtelse
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notiser: Användaren nekade tillåtelse.');
      return null;
    }

    // 4. Hämta Token (nu när vi vet att vi inte är i Expo Go)
    // ProjectId hämtas automatiskt från din app.json via Constants
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: projectId
    })).data;

    console.log("Token hämtad:", token);

    // 5. Spara i Firebase under användarens profil
    if (userId && token) {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        pushToken: token
      });
    }

    // Inställningar för Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (error) {
    // Vi loggar felet men låter appen fortsätta rulla
    console.log("Notis-info: Kunde inte registrera token just nu.");
    return null;
  }
}