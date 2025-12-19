import fs from 'fs-extra';
import path from 'path';
import type { ProjectConfig } from '../types/index.js';

/**
 * Generate dynamic onboarding pages based on configuration
 * Note: Templates already have pages 1-3, so we only generate pages 4-5 if needed
 * Onboarding is a mobile-only feature
 */
export async function generateOnboardingPages(
  config: ProjectConfig,
  targetDir: string
): Promise<void> {
  // Onboarding is mobile-only - skip if mobile platform not selected
  if (!config.platforms.includes('mobile')) {
    return;
  }

  if (!config.features.onboarding.enabled) {
    return;
  }

  const { pages, skipButton, showPaywall } = config.features.onboarding;

  // Templates already include pages 1-3
  // Only generate additional pages if needed (4-5)
  if (pages <= 3) {
    return;
  }

  const onboardingDir = path.join(targetDir, 'mobile/app/(onboarding)');
  await fs.ensureDir(onboardingDir);

  // Generate pages 4-5
  for (let i = 4; i <= pages; i++) {
    const isLastPage = i === pages;

    const pageContent = generatePageContent({
      pageNumber: i,
      totalPages: pages,
      isFirstPage: false,
      isLastPage,
      skipButton,
      showPaywall: showPaywall && isLastPage,
      hasPaywall: config.integrations.revenueCat.enabled,
    });

    await fs.writeFile(path.join(onboardingDir, `page-${i}.tsx`), pageContent);
  }

  // Update _layout.tsx to include all pages
  await updateOnboardingLayout(pages, onboardingDir);
}

interface PageOptions {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  skipButton: boolean;
  showPaywall: boolean;
  hasPaywall: boolean;
}

function generatePageContent(options: PageOptions): string {
  const { pageNumber, totalPages, isLastPage, skipButton, showPaywall } = options;

  const nextAction = isLastPage
    ? showPaywall
      ? "router.replace('/paywall');"
      : "router.replace('/(tabs)');"
    : `router.push('/(onboarding)/page-${pageNumber + 1}');`;

  return `import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { OnboardingLayout } from '@/components/ui/OnboardingLayout';

export default function OnboardingPage${pageNumber}() {
  const router = useRouter();

  const handleNext = () => {
    ${nextAction}
  };

  ${
    skipButton
      ? `const handleSkip = () => {
    router.replace('/(tabs)');
  };`
      : ''
  }

  return (
    <OnboardingLayout
      currentPage={${pageNumber}}
      totalPages={${totalPages}}
      ${skipButton ? 'onSkip={handleSkip}' : ''}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Your App</Text>
        <Text style={styles.description}>
          This is onboarding page ${pageNumber} of ${totalPages}. Customize this content to guide your users.
        </Text>

        <Button onPress={handleNext} style={styles.button}>
          ${isLastPage ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  button: {
    minWidth: 200,
  },
});
`;
}

async function updateOnboardingLayout(totalPages: number, onboardingDir: string): Promise<void> {
  const layoutPath = path.join(onboardingDir, '_layout.tsx');

  // Check if layout exists
  if (!(await fs.pathExists(layoutPath))) {
    // Create new layout
    const layoutContent = generateOnboardingLayout(totalPages);
    await fs.writeFile(layoutPath, layoutContent);
  } else {
    // Update existing layout to include all pages
    const layoutContent = generateOnboardingLayout(totalPages);
    await fs.writeFile(layoutPath, layoutContent);
  }
}

function generateOnboardingLayout(totalPages: number): string {
  const screenImports = Array.from({ length: totalPages }, (_, i) => i + 1)
    .map((i) => `      <Stack.Screen name="page-${i}" />`)
    .join('\n');

  return `import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
${screenImports}
    </Stack>
  );
}
`;
}
