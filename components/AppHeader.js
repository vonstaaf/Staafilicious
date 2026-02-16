import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkaholicTheme } from '../theme';

export default function AppHeader({ title, navigation, rightIcon, onRightPress, subTitle }) {
  const insets = useSafeAreaInsets();
  const formattedTitle = title ? title.charAt(0).toUpperCase() + title.slice(1) : "";

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.sideBtn}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{formattedTitle}</Text>
          {subTitle ? <Text style={styles.headerSubTitle} numberOfLines={1}>{subTitle.toUpperCase()}</Text> : null}
        </View>

        <TouchableOpacity 
          onPress={onRightPress} 
          style={[styles.sideBtn, { alignItems: 'flex-end' }]}
          disabled={!rightIcon}
        >
          {rightIcon && <Ionicons name={rightIcon} size={24} color="#FFF" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: WorkaholicTheme.colors.primary,
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    zIndex: 10,
    marginTop: Platform.OS === 'android' ? -StatusBar.currentHeight : 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  sideBtn: { width: 45, height: '100%', justifyContent: 'center' },
  titleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  headerSubTitle: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", marginTop: -2 }
});