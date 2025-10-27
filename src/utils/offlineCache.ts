import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
const CACHE_KEYS = {
  ACTIVE_WORKSPACE: 'activeWorkspaceId',
  LAST_VIEWED_MONTH: 'lastViewedMonth',
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme',
  HAS_SEEN_ONBOARDING: 'hasSeenOnboarding',
};

// User Preferences Interface
export interface UserPreferences {
  darkMode: boolean;
  notifications: boolean;
  fontSize?: 'small' | 'medium' | 'large';
}

/**
 * Cache the active workspace ID
 */
export const cacheActiveWorkspace = async (workspaceId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.ACTIVE_WORKSPACE, workspaceId);
  } catch (error) {
    console.error('Failed to cache active workspace:', error);
  }
};

/**
 * Get the cached active workspace ID
 */
export const getCachedActiveWorkspace = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(CACHE_KEYS.ACTIVE_WORKSPACE);
  } catch (error) {
    console.error('Failed to get cached active workspace:', error);
    return null;
  }
};

/**
 * Cache the last viewed month ID
 */
export const cacheLastViewedMonth = async (monthId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.LAST_VIEWED_MONTH, monthId);
  } catch (error) {
    console.error('Failed to cache last viewed month:', error);
  }
};

/**
 * Get the cached last viewed month ID
 */
export const getCachedLastViewedMonth = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(CACHE_KEYS.LAST_VIEWED_MONTH);
  } catch (error) {
    console.error('Failed to get cached last viewed month:', error);
    return null;
  }
};

/**
 * Cache user preferences
 */
export const cacheUserPreferences = async (preferences: UserPreferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to cache user preferences:', error);
  }
};

/**
 * Get cached user preferences
 */
export const getCachedUserPreferences = async (): Promise<UserPreferences | null> => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.USER_PREFERENCES);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Failed to get cached user preferences:', error);
    return null;
  }
};

/**
 * Mark onboarding as seen
 */
export const setOnboardingSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.HAS_SEEN_ONBOARDING, 'true');
  } catch (error) {
    console.error('Failed to set onboarding seen:', error);
  }
};

/**
 * Check if onboarding has been seen
 */
export const hasSeenOnboarding = async (): Promise<boolean> => {
  try {
    const seen = await AsyncStorage.getItem(CACHE_KEYS.HAS_SEEN_ONBOARDING);
    return seen === 'true';
  } catch (error) {
    console.error('Failed to check onboarding status:', error);
    return false;
  }
};

/**
 * Clear all cached data
 */
export const clearCache = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.ACTIVE_WORKSPACE,
      CACHE_KEYS.LAST_VIEWED_MONTH,
      CACHE_KEYS.USER_PREFERENCES,
    ]);
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
};

/**
 * Clear all data including theme and onboarding
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Failed to clear all cache:', error);
  }
};
