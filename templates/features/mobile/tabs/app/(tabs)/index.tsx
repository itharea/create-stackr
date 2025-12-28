import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/hooks';
import { useSessionActions } from '../../src/store/deviceSession.store';
import { Button, Input } from '../../src/components/ui';
import { IconSymbol } from '../../src/components/ui/IconSymbol';
import { formatDisplayName } from '../../src/utils/formatters';
import { useAppTheme, AppTheme } from '@/context/ThemeContext';

export default function HomeScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { user, signOut, deleteAccount, isLoading, isAuthenticated } = useAuth();
  const { deleteSession, initializeSession } = useSessionActions();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [deleteSessionConfirmText, setDeleteSessionConfirmText] = useState('');
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  // Gradient colors based on theme
  const gradientColors = theme.mode === 'dark'
    ? [theme.colors.card, 'transparent'] as const
    : ['#ffffff', '#f8fafc'] as const; // Subtle fade for light mode

  const handleLogout = async () => {
    const result = await signOut();
    if (!result.success) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }

    setIsDeleting(true);
    const result = await deleteAccount();
    setIsDeleting(false);

    if (result.success) {
      await signOut();
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    } else {
      Alert.alert('Error', result.error || 'Failed to delete account. Please try again.');
    }
  };

  const handleDeleteSession = async () => {
    if (deleteSessionConfirmText !== 'DELETE') {
      return;
    }

    setIsDeletingSession(true);
    try {
      await deleteSession();
      const onboardingEnabled = Constants.expoConfig?.extra?.features?.onboarding?.enabled ?? false;
      setShowDeleteSessionModal(false);
      setDeleteSessionConfirmText('');

      if (!onboardingEnabled) {
        await initializeSession();
      } else {
        router.replace('/(onboarding)/page-1');
      }
    } catch (error) {
      console.error('Failed to delete/recreate session:', error);
      setShowDeleteSessionModal(false);
      setDeleteSessionConfirmText('');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const isDeleteButtonEnabled = deleteConfirmText === 'DELETE' && !isDeleting;

  const features = [
    'Authentication system',
    'Zustand state management',
    'Error handling',
    'Form validation',
    'API integration',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Your App!</Text>

          {user && (
            <LinearGradient
              colors={gradientColors}
              style={styles.userInfo}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.greeting}>
                Hello, {formatDisplayName(user.name)}!
              </Text>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.userId}>User ID: {user.id}</Text>
            </LinearGradient>
          )}

          <LinearGradient
            colors={gradientColors}
            style={styles.section}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Text style={styles.sectionTitle}>Getting Started</Text>
            <Text style={styles.sectionText}>
              This is your main app screen. You can now start building your amazing features!
            </Text>

            <View style={styles.featureList}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={16}
                      color={theme.colors.success}
                    />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          <View style={styles.actions}>
            {isAuthenticated ? (
              <>
                <Button
                  title="Logout"
                  variant="outline"
                  onPress={handleLogout}
                  loading={isLoading}
                  style={styles.logoutButton}
                />

                <Button
                  title="Delete Account"
                  variant="outline"
                  onPress={() => setShowDeleteModal(true)}
                  style={styles.deleteButton}
                  textStyle={styles.deleteButtonText}
                />
              </>
            ) : (
              <>
                <Button
                  title="Sign In"
                  variant="primary"
                  onPress={() => router.push('/(auth)/login')}
                  style={styles.signInButton}
                />

                <Button
                  title="Create Account"
                  variant="outline"
                  onPress={() => router.push('/(auth)/register')}
                  style={styles.createAccountButton}
                />

                <Button
                  title="Delete Session"
                  variant="outline"
                  onPress={() => setShowDeleteSessionModal(true)}
                  style={styles.deleteSessionButton}
                  textStyle={styles.deleteSessionButtonText}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingModal}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDeleteModal(false)}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Delete Account</Text>

              <View style={styles.warningContainer}>
                <Text style={styles.warningTitle}>Warning</Text>
                <Text style={styles.warningText}>
                  This action is permanent and cannot be undone. All your account data will be deleted immediately.
                </Text>
              </View>

              <View style={styles.gdprNotice}>
                <Text style={styles.gdprTitle}>Third-Party Data Notice</Text>
                <Text style={styles.gdprText}>
                  Please note that data stored by third-party services (RevenueCat, Adjust, Scate) may persist on their servers.
                </Text>
              </View>

              <Input
                label="Type DELETE to confirm"
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="DELETE"
                autoCapitalize="characters"
                containerStyle={styles.confirmInput}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  style={styles.modalButton}
                />

                <Button
                  title={isDeleting ? "Deleting..." : "Delete"}
                  variant="primary"
                  onPress={handleDeleteAccount}
                  disabled={!isDeleteButtonEnabled}
                  loading={isDeleting}
                  style={StyleSheet.flatten([styles.modalButton, styles.deleteConfirmButton])}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Session Confirmation Modal */}
      <Modal
        visible={showDeleteSessionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteSessionModal(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingModal}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDeleteSessionModal(false)}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Delete Session</Text>

              <View style={styles.warningContainer}>
                <Text style={styles.warningTitle}>Warning</Text>
                <Text style={styles.warningText}>
                  This will delete your anonymous session and all local data. You'll need to go through onboarding again.
                </Text>
              </View>

              <Input
                label="Type DELETE to confirm"
                value={deleteSessionConfirmText}
                onChangeText={setDeleteSessionConfirmText}
                placeholder="DELETE"
                autoCapitalize="characters"
                containerStyle={styles.confirmInput}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setShowDeleteSessionModal(false);
                    setDeleteSessionConfirmText('');
                  }}
                  style={styles.modalButton}
                />

                <Button
                  title={isDeletingSession ? "Deleting..." : "Delete"}
                  variant="primary"
                  onPress={handleDeleteSession}
                  disabled={deleteSessionConfirmText !== 'DELETE'}
                  loading={isDeletingSession}
                  style={StyleSheet.flatten([styles.modalButton, styles.deleteConfirmButton])}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flex: 1,
    padding: theme.spacing[5],
  },

  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing[8],
    letterSpacing: -1,
  },

  userInfo: {
    // Removed solid background
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[5],
    marginBottom: theme.spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },

  greeting: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },

  email: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },

  userId: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
  },

  section: {
    // Removed solid background
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    marginBottom: theme.spacing[6],
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },

  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing[3],
  },

  sectionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: theme.spacing[5],
  },

  featureList: {
    gap: theme.spacing[3],
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },

  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.mode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    fontWeight: '500',
  },

  actions: {
    marginTop: 'auto',
    paddingTop: theme.spacing[5],
  },

  logoutButton: {
    marginTop: theme.spacing[4],
  },

  deleteButton: {
    marginTop: theme.spacing[3],
    borderColor: theme.colors.error,
  },

  deleteButtonText: {
    color: theme.colors.error,
  },

  signInButton: {
    marginTop: theme.spacing[4],
  },

  createAccountButton: {
    marginTop: theme.spacing[3],
  },

  deleteSessionButton: {
    marginTop: theme.spacing[3],
    borderColor: theme.colors.error,
  },

  deleteSessionButtonText: {
    color: theme.colors.error,
  },

  // Modal styles
  keyboardAvoidingModal: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[5],
  },

  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    padding: theme.spacing[6],
    paddingBottom: theme.spacing[12],
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.large,
  },

  modalTitle: {
    fontSize: theme.typography.fontSize['xl'],
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing[6],
    textAlign: 'center',
  },

  warningContainer: {
    backgroundColor: 'transparent', // No more solid gray block
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[5],
    borderWidth: 1,
    borderColor: theme.colors.warning, // Outline instead
    borderStyle: 'dashed', // Optional stylish touch
  },

  warningTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.warning,
    marginBottom: theme.spacing[2],
  },

  warningText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  gdprNotice: {
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[5],
    borderWidth: 1,
    borderColor: theme.colors.info,
  },

  gdprTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.info,
    marginBottom: theme.spacing[2],
  },

  gdprText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  confirmInput: {
    marginBottom: theme.spacing[6],
  },

  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },

  modalButton: {
    flex: 1,
  },

  deleteConfirmButton: {
    backgroundColor: theme.colors.error,
    borderWidth: 0, // Solid button
  },
});
