import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkaholicTheme } from '../theme';
import { ProjectsContext } from '../context/ProjectsContext';

// 🚀 Lokala raketen
const appLogo = require('../assets/icon3.png');

export default function AppHeader({ title, navigation, rightIcon, onRightPress, subTitle }) {
  const insets = useSafeAreaInsets();
  const { companyData } = useContext(ProjectsContext);
  
  const formattedTitle = title ? title.charAt(0).toUpperCase() + title.slice(1) : "";
  const hasExternalLogo = companyData?.logoUrl && companyData.logoUrl.startsWith('http');

  return (
    <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
      <View style={styles.headerContent}>
        
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.sideBtn}>
          <Ionicons name="chevron-back" size={32} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <View style={styles.logoWrapper}>
            <Image 
              source={hasExternalLogo ? { uri: companyData.logoUrl } : appLogo} 
              style={styles.headerLogo} 
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.textStack}>
            <Text style={styles.headerTitle} numberOfLines={1}>{formattedTitle}</Text>
            {subTitle ? (
              <Text style={styles.headerSubTitle} numberOfLines={1}>
                {subTitle.toUpperCase()}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.sideBtn}>
          {rightIcon && (
            <TouchableOpacity onPress={onRightPress} style={{alignItems: 'flex-end'}}>
              <Ionicons name={rightIcon} size={28} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: WorkaholicTheme.colors.primary,
    paddingHorizontal: 15,
    paddingBottom: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 90, 
  },
  sideBtn: { width: 40, justifyContent: 'center' },
  titleContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  logoWrapper: {
    width: 75, // ⬆️ Ökat storleken på containern
    height: 75,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    // 🗑️ Vit bakgrund, borderRadius och elevation borttaget!
  },
  headerLogo: {
    width: '100%', // ⬆️ Raketen fyller nu hela containern
    height: '100%',
  },
  textStack: { flexShrink: 1, justifyContent: 'center' },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  headerSubTitle: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", marginTop: 2 }
});