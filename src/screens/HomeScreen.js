import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors } from '../theme/colors';
import StatCard from '../components/StatCard';
import JobCard from '../components/JobCard';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { 
    jobs, 
    stats, 
    loading, 
    fetchJobs, 
    isTracking, 
    isGPSOn,
    currentLocation, 
    activeJobId,
    toggleGPS 
  } = useData();
  const [gpsLoading, setGpsLoading] = React.useState(false);
  const [gpsStatus, setGpsStatus] = React.useState('');

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchJobs(user.id);
      }
    }, [user?.id, fetchJobs])
  );

  const activeJobs = jobs.filter(j => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(j.status));
  const currentJob = jobs.find(j => j.status === 'IN_PROGRESS');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleGPSToggle = async () => {
    try {
      setGpsLoading(true);
      setGpsStatus('Starting GPS...');
      
      await toggleGPS(!isGPSOn, (progress) => {
        setGpsStatus(progress);
      });
      
      setGpsStatus('');
    } catch (error) {
      console.error('GPS toggle error:', error);
      setGpsStatus('');
      Alert.alert(
        'Location Error',
        error.message || 'Unable to access location. Please enable location services in your device settings.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.name || 'Technician'}</Text>
        </View>
        <View style={styles.headerRight}>
          {isTracking && (
            <View style={styles.trackingIndicator}>
              <View style={styles.trackingDot} />
              <Text style={styles.trackingText}>Live</Text>
            </View>
          )}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'T'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchJobs(user?.id)}
            tintColor={colors.primary500}
          />
        }
      >
        {/* GPS Toggle Button */}
        <TouchableOpacity 
          style={[
            styles.gpsToggleButton, 
            isGPSOn && styles.gpsToggleButtonActive
          ]}
          onPress={handleGPSToggle}
          disabled={gpsLoading}
        >
          <View style={styles.gpsToggleLeft}>
            <View style={[
              styles.gpsIconContainer,
              isGPSOn && styles.gpsIconContainerActive
            ]}>
              <Ionicons 
                name={isGPSOn ? "location" : "location-outline"} 
                size={24} 
                color={isGPSOn ? colors.dark50 : colors.dark400} 
              />
            </View>
            <View>
              <Text style={[
                styles.gpsToggleTitle,
                isGPSOn && styles.gpsToggleTitleActive
              ]}>
                {gpsLoading ? 'Getting Location...' : isGPSOn ? 'GPS Sharing On' : 'Share My Location'}
              </Text>
              <Text style={styles.gpsToggleSubtitle}>
                {gpsLoading 
                  ? gpsStatus || 'Please wait, this may take a few seconds...'
                  : isGPSOn 
                    ? 'Your location is visible to admin' 
                    : 'Tap to share location with admin'
                }
              </Text>
            </View>
          </View>
          <View style={[
            styles.gpsToggleSwitch,
            isGPSOn && styles.gpsToggleSwitchActive
          ]}>
            <View style={[
              styles.gpsToggleKnob,
              isGPSOn && styles.gpsToggleKnobActive
            ]} />
          </View>
        </TouchableOpacity>

        {/* Location Tracking Banner */}
        {isTracking && currentLocation && (
          <View style={styles.trackingBanner}>
            <View style={styles.trackingBannerLeft}>
              <Ionicons name="navigate" size={24} color={colors.success} />
              <View style={styles.trackingBannerText}>
                <Text style={styles.trackingBannerTitle}>Location Tracking Active</Text>
                <Text style={styles.trackingBannerSubtitle}>
                  {currentLocation.lat?.toFixed(6)}, {currentLocation.lng?.toFixed(6)}
                </Text>
              </View>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="briefcase-outline"
            label="Total Jobs"
            value={stats.total}
            color={colors.info}
          />
          <StatCard
            icon="time-outline"
            label="Pending"
            value={stats.pending}
            color={colors.warning}
          />
          <StatCard
            icon="play-circle-outline"
            label="Active"
            value={stats.active}
            color={colors.primary500}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Completed"
            value={stats.completed}
            color={colors.success}
          />
        </View>

        {/* Current Job */}
        {currentJob && (
          <View style={styles.section}>
            <View style={styles.currentJobHeader}>
              <Text style={styles.sectionTitle}>Current Job</Text>
              {isTracking && (
                <View style={styles.trackingBadge}>
                  <Ionicons name="location" size={12} color={colors.success} />
                  <Text style={styles.trackingBadgeText}>Tracking</Text>
                </View>
              )}
            </View>
            <JobCard job={currentJob} />
          </View>
        )}

        {/* Active Jobs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Jobs</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {activeJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color={colors.dark600} />
              <Text style={styles.emptyTitle}>No Active Jobs</Text>
              <Text style={styles.emptyText}>New jobs will appear here</Text>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {activeJobs.slice(0, 3).map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </View>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.dark800,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark700,
  },
  greeting: {
    fontSize: 14,
    color: colors.dark400,
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark50,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark50,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary400,
    fontWeight: '500',
  },
  jobsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: colors.dark800,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark700,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark300,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.dark500,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  trackingText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  trackingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success + '40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  trackingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  trackingBannerText: {
    flex: 1,
  },
  trackingBannerTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  trackingBannerSubtitle: {
    color: colors.dark400,
    fontSize: 12,
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  liveText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  currentJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trackingBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  // GPS Toggle Button Styles
  gpsToggleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.dark800,
    borderWidth: 1,
    borderColor: colors.dark700,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  gpsToggleButtonActive: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success + '40',
  },
  gpsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gpsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dark700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsIconContainerActive: {
    backgroundColor: colors.success,
  },
  gpsToggleTitle: {
    color: colors.dark300,
    fontSize: 15,
    fontWeight: '600',
  },
  gpsToggleTitleActive: {
    color: colors.success,
  },
  gpsToggleSubtitle: {
    color: colors.dark500,
    fontSize: 12,
    marginTop: 2,
  },
  gpsToggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark600,
    padding: 2,
    justifyContent: 'center',
  },
  gpsToggleSwitchActive: {
    backgroundColor: colors.success,
  },
  gpsToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.dark400,
  },
  gpsToggleKnobActive: {
    backgroundColor: colors.white,
    alignSelf: 'flex-end',
  },
});
