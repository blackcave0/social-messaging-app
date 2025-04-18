import axios from 'axios';
import { API_URL } from './config';

// Constants
const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

/**
 * In-memory cache for user data to avoid repeated API calls
 */
const userCache: Record<string, any> = {};

/**
 * Fetches user data from the API with retry mechanism
 * @param userId User ID to fetch
 * @param token Auth token
 * @param retryCount Current retry attempt (internal use)
 * @returns User data
 */
export const fetchUserData = async (
  userId: string,
  token: string,
  retryCount = 0
): Promise<any> => {
  // If we've already tried 3 times, return a default user object
  if (retryCount >= 3) {
    console.warn(`Failed to fetch user data for ${userId} after 3 attempts, using default`);
    return {
      _id: userId,
      name: 'Unknown User',
      profilePicture: DEFAULT_AVATAR
    };
  }

  try {
    // Check cache first
    if (userCache[userId]) {
      return userCache[userId];
    }

    // Fetch from API - use the correct endpoint path
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
    }

    const userData = await response.json();

    // Cache the user data
    userCache[userId] = {
      ...userData,
      name: userData.name || userData.username || 'Unknown User',
      profilePicture: userData.profilePicture || DEFAULT_AVATAR
    };

    // Note: Removed CustomEvent code as it's not available in React Native
    // Instead, we'll rely on React's state management for updates

    return userCache[userId];
  } catch (error) {
    console.error(`Error fetching user data for ${userId} (attempt ${retryCount + 1}):`, error);

    // Implement exponential backoff for retries
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchUserData(userId, token, retryCount + 1);
    }

    // Return a default user object if all retries fail
    return {
      _id: userId,
      name: 'Unknown User',
      profilePicture: DEFAULT_AVATAR
    };
  }
};

/**
 * Extracts user data from participants list
 * @param participants List of participant objects or IDs
 * @param currentUserId Current user's ID to exclude
 * @param defaultAvatar Default avatar URL
 * @returns User data for other participant
 */
export const getOtherParticipant = (
  participants: any[],
  currentUserId: string,
  defaultAvatar: string
): { _id: string; name: string; profilePicture: string } => {
  // Handle missing participants
  if (!participants || participants.length === 0) {
    return { _id: '', name: 'Unknown User', profilePicture: defaultAvatar };
  }

  // Check if any string IDs match cached users
  const stringIds = participants.filter(p => typeof p === 'string' && p && p.trim() !== '');
  for (const id of stringIds) {
    if (userCache[id]) {
      const user = userCache[id];
      return {
        _id: user._id || id,
        name: user.name || user.username || 'Unknown User',
        profilePicture: user.profilePicture || defaultAvatar
      };
    }
  }

  // Filter to user objects
  const userObjects = participants.filter(p => typeof p === 'object' && p !== null);

  // If no user objects, use the first string ID
  if (userObjects.length === 0) {
    const firstId = stringIds[0] || '';
    // Try to fetch user data immediately if not in cache
    if (firstId && !userCache[firstId]) {
      // Return a temporary object that will be updated when data is loaded
      return {
        _id: firstId,
        name: 'Loading...',
        profilePicture: defaultAvatar
      };
    }
    return {
      _id: firstId,
      name: userCache[firstId]?.name || 'Unknown User',
      profilePicture: defaultAvatar
    };
  }

  // Find other participant (not current user)
  const otherUser = userObjects.find(p => p._id !== currentUserId) || userObjects[0];

  return {
    _id: otherUser._id || '',
    name: otherUser.name || otherUser.username || 'Unknown User',
    profilePicture: otherUser.profilePicture || defaultAvatar
  };
};

/**
 * Load user data for an array of user IDs
 * @param userIds Array of user IDs to load
 * @param token Authentication token
 * @returns Object with user ID as key and user data as value
 */
export const batchLoadUsers = async (
  userIds: string[],
  token: string
): Promise<Record<string, any>> => {
  // Filter out empty IDs and already cached users
  const uniqueIds = Array.from(new Set(userIds))
    .filter(id => id && id.trim() !== '' && !userCache[id]);

  if (uniqueIds.length === 0) return userCache;

  console.log(`Batch loading ${uniqueIds.length} users`);

  // Process in smaller batches to avoid overwhelming the server
  const batchSize = 5;
  const batches = [];

  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    batches.push(uniqueIds.slice(i, i + batchSize));
  }

  const newUsers: Record<string, any> = {};

  for (const batch of batches) {
    const promises = batch.map(id => fetchUserData(id, token));
    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        newUsers[batch[index]] = result.value;
      }
    });
  }

  console.log(`Successfully batch loaded ${Object.keys(newUsers).length} users`);
  return { ...userCache, ...newUsers };
}; 