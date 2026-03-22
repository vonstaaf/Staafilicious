import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { CompanyContext } from '../context/CompanyContext';
import { capitalizeFirst, getCompanyInitials } from '../utils/stringHelpers';

const logoBrand = require('../assets/workaholic_logo_white.png');
const logoDefault = require('../assets/icon3.png');

const COMPANY_LOGO_SIZE = 48;

export default function AppHeader({
  title,
  navigation,
  rightIcon,
  onRightPress,
  subTitle,
  showBackButton = true,
  hideTitle = false,
  useBrandLogo = false,
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { company } = useContext(CompanyContext) || {};

  const formattedTitle = title ? capitalizeFirst(title) : '';
  const showCompanyBranding = Boolean(company && (company.logoUrl || (company.companyName || company.name)));

  let logoContent = null;
  if (showCompanyBranding) {
    if (company.logoUrl) {
      logoContent = (
        <View style={[styles.companyLogoContainer, { width: COMPANY_LOGO_SIZE, height: COMPANY_LOGO_SIZE }]}>
          <Image
            source={{ uri: company.logoUrl }}
            style={[styles.companyLogo, { width: COMPANY_LOGO_SIZE, height: COMPANY_LOGO_SIZE }]}
            resizeMode="contain"
          />
        </View>
      );
    } else {
      const initials = getCompanyInitials(company.companyName || company.name || '');
      const circleBg = company.primaryColor || theme.colors.primary;
      logoContent = (
        <View style={[styles.initialsCircle, { backgroundColor: circleBg, width: COMPANY_LOGO_SIZE, height: COMPANY_LOGO_SIZE, borderRadius: COMPANY_LOGO_SIZE / 2 }]}>
          <Text style={styles.initialsText} numberOfLines={1}>{initials || '?'}</Text>
        </View>
      );
    }
  } else {
    const logoSource = useBrandLogo ? logoBrand : logoDefault;
    logoContent = (
      <Image source={logoSource} style={styles.headerLogo} resizeMode="contain" />
    );
  }

  const logoWrapperStyle = [
    styles.logoWrapper,
    useBrandLogo && !showCompanyBranding && styles.logoWrapperBrand,
    showCompanyBranding && styles.logoWrapperCompany,
  ];

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.primary }, useBrandLogo && styles.headerOverflowVisible, { paddingTop: insets.top + 5 }]}>
      <View style={[styles.headerContent, useBrandLogo && styles.headerContentOverflowVisible]}>
        <View style={styles.sideBtn}>
          {showBackButton && navigation ? (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={32} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.titleContainer, useBrandLogo && styles.titleContainerBrand]}>
          <View style={logoWrapperStyle}>
            {logoContent}
          </View>
          {!hideTitle && (formattedTitle || subTitle) ? (
            <View style={styles.textStack}>
              {formattedTitle ? (
                <Text style={styles.headerTitle} numberOfLines={1}>{formattedTitle}</Text>
              ) : null}
              {subTitle ? (
                <Text style={styles.headerSubTitle} numberOfLines={1}>
                  {subTitle.toUpperCase()}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.sideBtn}>
          {rightIcon && onRightPress ? (
            <TouchableOpacity onPress={onRightPress} style={{ alignItems: 'flex-end' }}>
              <Ionicons name={rightIcon} size={28} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 15,
    paddingBottom: 12,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 10,
  },
  headerOverflowVisible: {
    overflow: 'visible',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 78,
  },
  headerContentOverflowVisible: {
    overflow: 'visible',
  },
  sideBtn: { width: 40, justifyContent: 'center' },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainerBrand: {
    height: 78,
    maxHeight: 78,
    overflow: 'visible',
  },
  logoWrapper: {
    width: 70,
    height: 70,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapperBrand: {
    width: 132,
    height: 132,
    marginRight: 0,
  },
  logoWrapperCompany: {
    width: COMPANY_LOGO_SIZE,
    height: COMPANY_LOGO_SIZE,
    marginRight: 10,
  },
  headerLogo: {
    width: '100%',
    height: '100%',
  },
  companyLogoContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogo: {
    borderRadius: 8,
  },
  initialsCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  textStack: { flexShrink: 1, justifyContent: 'center' },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  headerSubTitle: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", marginTop: 2 }
});