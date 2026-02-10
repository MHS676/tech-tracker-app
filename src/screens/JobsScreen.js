import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors } from '../theme/colors';
import JobCard from '../components/JobCard';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

export default function JobsScreen() {
  const { user } = useAuth();
  const { jobs, loading, fetchJobs } = useData();
  const [activeTab, setActiveTab] = useState('all');

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchJobs(user.id);
      }
    }, [user?.id, fetchJobs])
  );

  const filteredJobs = jobs.filter(job => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(job.status);
    if (activeTab === 'completed') return job.status === 'COMPLETED';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs</Text>
        <Text style={styles.subtitle}>{jobs.length} total jobs</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Jobs List */}
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
        {filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color={colors.dark600} />
            <Text style={styles.emptyTitle}>No Jobs Found</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'all' 
                ? 'Jobs assigned to you will appear here'
                : `No ${activeTab} jobs at the moment`
              }
            </Text>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {filteredJobs.map(job => (
              <JobCard key={job.id} job={job} showActions />
            ))}
          </View>
        )}
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.dark400,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: colors.dark900,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.dark800,
    borderWidth: 1,
    borderColor: colors.dark700,
  },
  tabActive: {
    backgroundColor: colors.primary500,
    borderColor: colors.primary500,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.dark400,
  },
  tabTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  jobsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark300,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.dark500,
    marginTop: 8,
    textAlign: 'center',
  },
});
