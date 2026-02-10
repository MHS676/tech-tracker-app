import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import api from '../services/api';
import { colors } from '../theme/colors';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const { stats } = useData();
  const [isTracking, setIsTracking] = useState(user?.isTracking || false);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('unknown');

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationStatus(status);
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(status);
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Location permission is required for job tracking.'
      );
    }
  };

  const handleToggleTracking = async (value) => {
    if (locationStatus !== 'granted') {
      await requestLocationPermission();
      return;
    }

    setLoading(true);
    try {
      const updated = await api.toggleTracking(user.id, value);
      setIsTracking(value);
      updateUser({ ...user, isTracking: value });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ONLINE': return colors.success;
      case 'ON_WAY': return colors.warning;
      case 'ON_SITE': return colors.primary500;
      default: return colors.dark500;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'T'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(user?.status) }]} />
            <Text style={styles.statusText}>{user?.status || 'OFFLINE'}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="location" size={20} color={colors.success} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Location Tracking</Text>
                <Text style={styles.settingDescription}>
                  {isTracking ? 'Currently tracking' : 'Tracking disabled'}
                </Text>
              </View>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary500} />
            ) : (
              <Switch
                value={isTracking}
                onValueChange={handleToggleTracking}
                trackColor={{ false: colors.dark600, true: colors.primary500 }}
                thumbColor={colors.white}
              />
            )}
          </View>

          <TouchableOpacity style={styles.settingItem} onPress={requestLocationPermission}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.info + '20' }]}>
                <Ionicons name="shield-checkmark" size={20} color={colors.info} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Location Permission</Text>
                <Text style={styles.settingDescription}>
                  {locationStatus === 'granted' ? 'Granted' : 'Not granted'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.dark500} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Tech Tracker v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark900,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.dark800,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark700,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.dark800,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.dark700,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary500,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark50,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.dark400,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark300,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.dark800,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.dark700,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark50,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.dark400,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.dark700,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark400,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dark800,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.dark700,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.dark50,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.dark400,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger + '15',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: colors.dark600,
  },
});
