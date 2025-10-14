import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  is_premium: boolean;
  premium_type: string | null;
  premium_expires_at: string | null;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  language: string;
  theme: string;
  settings: Record<string, any>;
}

export interface PlaylistName {
  id: string;
  user_id: string;
  name: string;
  position: number;
}

/**
 * Sync user profile when they sign in
 */
export const syncUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error syncing profile:', error);
    return null;
  }
};

/**
 * Update user premium status
 */
export const updatePremiumStatus = async (
  userId: string,
  isPremium: boolean,
  premiumType?: 'monthly' | 'yearly' | 'lifetime',
  expiresAt?: string
) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: isPremium,
        premium_type: premiumType,
        premium_expires_at: expiresAt
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating premium status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating premium status:', error);
    return false;
  }
};

/**
 * Get user preferences from cloud
 */
export const getUserPreferences = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting preferences:', error);
    return null;
  }
};

/**
 * Update user preferences in cloud
 */
export const updateUserPreferences = async (
  userId: string,
  preferences: Partial<UserPreferences>
) => {
  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      });

    if (error) {
      console.error('Error updating preferences:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating preferences:', error);
    return false;
  }
};

/**
 * Sync playlist names to cloud (NOT the tracks inside)
 */
export const syncPlaylistNames = async (
  userId: string,
  playlists: Array<{ name: string; position: number }>
) => {
  try {
    // Get existing playlist names from cloud
    const { data: existingPlaylists } = await supabase
      .from('playlist_names')
      .select('*')
      .eq('user_id', userId);

    // Update or insert playlist names
    const updates = playlists.map((playlist, index) => ({
      user_id: userId,
      name: playlist.name,
      position: index,
      id: existingPlaylists?.[index]?.id
    }));

    const { error } = await supabase
      .from('playlist_names')
      .upsert(updates);

    if (error) {
      console.error('Error syncing playlist names:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error syncing playlist names:', error);
    return false;
  }
};

/**
 * Get playlist names from cloud
 */
export const getPlaylistNames = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('playlist_names')
      .select('*')
      .eq('user_id', userId)
      .order('position');

    if (error) {
      console.error('Error fetching playlist names:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting playlist names:', error);
    return [];
  }
};

/**
 * Update a single playlist name in cloud
 */
export const updatePlaylistName = async (
  playlistId: string,
  name: string
) => {
  try {
    const { error } = await supabase
      .from('playlist_names')
      .update({ name })
      .eq('id', playlistId);

    if (error) {
      console.error('Error updating playlist name:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating playlist name:', error);
    return false;
  }
};
