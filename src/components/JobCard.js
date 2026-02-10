import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors } from '../theme/colors';

export default function JobCard({ job, showActions = true }) {
  const { user } = useAuth();
  const { acceptJob, startJob, completeJob } = useData();
  const [loading, setLoading] = useState(false);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return { bg: colors.warning + '20', text: colors.warning };
      case 'ACCEPTED':
        return { bg: colors.info + '20', text: colors.info };
      case 'IN_PROGRESS':
        return { bg: colors.primary500 + '20', text: colors.primary400 };
      case 'COMPLETED':
        return { bg: colors.success + '20', text: colors.success };
      case 'CANCELLED':
        return { bg: colors.danger + '20', text: colors.danger };
      default:
        return { bg: colors.dark600, text: colors.dark400 };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ASSIGNED': return 'Assigned';
      case 'ACCEPTED': return 'Accepted';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const handleAction = async (action) => {
    setLoading(true);
    try {
      switch (action) {
        case 'accept':
          await acceptJob(job.id);
          Alert.alert('Success', 'Job accepted!');
          break;
        case 'start':
          await startJob(job.id, user.id);
          Alert.alert('Success', 'Job started! Location tracking enabled.');
          break;
        case 'complete':
          await completeJob(job.id, user.id);
          Alert.alert('Success', 'Job completed!');
          break;
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusStyle = getStatusStyle(job.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {getStatusLabel(job.status)}
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      {/* Address */}
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={16} color={colors.dark500} />
        <Text style={styles.address} numberOfLines={1}>{job.address}</Text>
      </View>

      {/* Meta */}
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.dark500} />
          <Text style={styles.metaText}>{formatDate(job.createdAt)}</Text>
        </View>
        {job.admin && (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={14} color={colors.dark500} />
            <Text style={styles.metaText}>by {job.admin.name}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {showActions && job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
        <View style={styles.actions}>
          {job.status === 'ASSIGNED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAction('accept')}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                  <Text style={styles.actionButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {job.status === 'ACCEPTED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => handleAction('start')}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="play" size={18} color={colors.white} />
                  <Text style={styles.actionButtonText}>Start Job</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {job.status === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleAction('complete')}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color={colors.white} />
                  <Text style={styles.actionButtonText}>Complete</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark800,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark700,
  },
  header: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark50,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: colors.dark400,
    lineHeight: 20,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  address: {
    fontSize: 13,
    color: colors.dark500,
    marginLeft: 6,
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.dark500,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.dark700,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: colors.info,
  },
  startButton: {
    backgroundColor: colors.primary500,
  },
  completeButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
