import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../../src/hooks';
import { useSessionActions } from '../../src/store/deviceSession.store';
import { Button, Input } from '../../src/components/ui';
import { formatDisplayName } from '../../src/utils/formatters';

export default function HomeScreen() {
  const { user, signOut, deleteAccount, isLoading, isAuthenticated } = useAuth();
  const { deleteSession, initializeSession } = useSessionActions();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [deleteSessionConfirmText, setDeleteSessionConfirmText] = useState('');
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const handleLogout = async () => {
    const result = await signOut();
    if (!result.success) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
    // Button visibility updates automatically via isAuthenticated state
    // Navigation handled by _layout.tsx reactively
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }

    setIsDeleting(true);
    const result = await deleteAccount();
    setIsDeleting(false);

    if (result.success) {
      // Clear BetterAuth session (important for UI to update)
      await signOut();

      // Close modal
      setShowDeleteModal(false);
      setDeleteConfirmText('');

      // Navigation to login is handled reactively by _layout.tsx
      // since isAuthenticated becomes false after signOut
    } else {
      // Show error to user
      Alert.alert('Error', result.error || 'Failed to delete account. Please try again.');
    }
  };

  const handleDeleteSession = async () => {
    if (deleteSessionConfirmText !== 'DELETE') {
      return;
    }

    setIsDeletingSession(true);
    try {
      // Delete session (store action handles onboarding flag clearing)
      await deleteSession();

      // Get feature flags from app.json
      const onboardingEnabled = Constants.expoConfig?.extra?.features?.onboarding?.enabled ?? false;

      // Close modal first
      setShowDeleteSessionModal(false);
      setDeleteSessionConfirmText('');

      // Configuration-based post-deletion behavior
      if (!onboardingEnabled) {
        // MINIMAL CONFIG: Recreate session immediately (data reset)
        console.log('Minimal config: Recreating session after deletion...');
        await initializeSession();
        console.log('Session recreated successfully - data reset complete');
        // Stay on current screen (tabs/home) - user sees fresh start
      } else {
        // ONBOARDING ENABLED: Navigate to onboarding
        // Session will be created after onboarding completes
        console.log('Navigating to onboarding...');
        router.replace('/(onboarding)/page-1');
      }

    } catch (error) {
      console.error('Failed to delete/recreate session:', error);
      // Still close modal since store clears local state even on error
      setShowDeleteSessionModal(false);
      setDeleteSessionConfirmText('');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const isDeleteButtonEnabled = deleteConfirmText === 'DELETE' && !isDeleting;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Your App!</Text>
          
          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>
                Hello, {formatDisplayName(user.name)}!
              </Text>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.userId}>User ID: {user.id}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Getting Started</Text>
            <Text style={styles.sectionText}>
              This is your main app screen. You can now start building your amazing features!
            </Text>
            
            <View style={styles.featureList}>
              <Text style={styles.feature}>✅ Authentication system</Text>
              <Text style={styles.feature}>✅ Zustand state management</Text>
              <Text style={styles.feature}>✅ Error handling</Text>
              <Text style={styles.feature}>✅ Form validation</Text>
              <Text style={styles.feature}>✅ API integration</Text>
            </View>
          </View>

          <View style={styles.actions}>
            {isAuthenticated ? (
              // Authenticated users - show logout and delete account
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
              // Anonymous users (session only) - show login/register and delete session
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
              <Text style={styles.warningTitle}>⚠️ Warning</Text>
              <Text style={styles.warningText}>
                This action is permanent and cannot be undone. All your account data will be deleted immediately.
              </Text>
            </View>

            <View style={styles.gdprNotice}>
              <Text style={styles.gdprTitle}>Third-Party Data Notice</Text>
              <Text style={styles.gdprText}>
                Please note that data stored by third-party services (RevenueCat, Adjust, Scate) may persist on their servers and cannot be deleted through this app. For complete data deletion, you may need to contact these services directly or submit a GDPR data deletion request.
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
                title={isDeleting ? "Deleting..." : "Confirm Delete"}
                variant="primary"
                onPress={handleDeleteAccount}
                disabled={!isDeleteButtonEnabled}
                loading={isDeleting}
                style={StyleSheet.flatten([styles.modalButton, styles.deleteConfirmButton])}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Session Confirmation Modal */}
      <Modal
        visible={showDeleteSessionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteSessionModal(false)}
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
              <Text style={styles.warningTitle}>⚠️ Warning</Text>
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
                title={isDeletingSession ? "Deleting..." : "Confirm Delete"}
                variant="primary"
                onPress={handleDeleteSession}
                disabled={deleteSessionConfirmText !== 'DELETE'}
                loading={isDeletingSession}
                style={StyleSheet.flatten([styles.modalButton, styles.deleteConfirmButton])}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  
  scrollContent: {
    flexGrow: 1,
  },
  
  content: {
    flex: 1,
    padding: 20,
  },
  
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 24,
  },
  
  userInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  
  email: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 4,
  },
  
  userId: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  
  sectionText: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
    marginBottom: 16,
  },
  
  featureList: {
    gap: 8,
  },
  
  feature: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '500',
  },
  
  actions: {
    marginTop: 'auto',
    paddingTop: 20,
  },

  logoutButton: {
    marginTop: 16,
  },

  deleteButton: {
    marginTop: 12,
    borderColor: '#FF3B30',
  },

  deleteButtonText: {
    color: '#FF3B30',
  },

  signInButton: {
    marginTop: 16,
  },

  createAccountButton: {
    marginTop: 12,
  },

  deleteSessionButton: {
    marginTop: 12,
    borderColor: '#FF3B30',
  },

  deleteSessionButtonText: {
    color: '#FF3B30',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },

  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },

  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },

  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },

  gdprNotice: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },

  gdprTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
  },

  gdprText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },

  confirmInput: {
    marginBottom: 20,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },

  modalButton: {
    flex: 1,
  },

  deleteConfirmButton: {
    backgroundColor: '#FF3B30',
  },
});