/**
 * Supabase client manager for team mode.
 *
 * Lazy singleton that creates a Supabase client on first access, performs
 * anonymous sign-in, and persists the session via the storage adapter.
 * The client is invalidated when team config changes so a new session can be created.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { safeStorage } from "electron";
import { mainLog } from "../log";
import { getTeamCredentials } from "./config";
import { teamSessionStorage } from "./sessionStorage";

let cachedClient: SupabaseClient | null = null;
let encryptionWarningLogged = false;

/**
 * Returns the Supabase client, creating it on first access.
 *
 * If team config is missing, returns null (caller should throw TEAM_NOT_CONFIGURED).
 * Does NOT perform authentication - use getAuthenticatedSupabaseClient() for that.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const credentials = getTeamCredentials();
  if (!credentials) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  const { supabaseUrl, supabaseAnonKey } = credentials;

  // Log a single warning if safeStorage encryption is not available
  if (!encryptionWarningLogged && !safeStorage.isEncryptionAvailable()) {
    mainLog.warn(
      "[team:session] System does not support safeStorage encryption. Team session will be stored in plaintext."
    );
    encryptionWarningLogged = true;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storage: teamSessionStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });

  cachedClient = client;
  return client;
}

/**
 * Returns an authenticated Supabase client with the user ID.
 *
 * Creates the client if needed, checks for existing persisted session first,
 * only signs in when no user exists, and returns both the client and the authenticated user ID.
 *
 * This ensures anonymous identity persistence across app restarts - the same
 * anonymous user ID is reused when a valid session exists.
 *
 * Throws if team config is missing or authentication fails.
 */
export async function getAuthenticatedSupabaseClient(): Promise<{
  client: SupabaseClient;
  userId: string;
}> {
  const credentials = getTeamCredentials();
  if (!credentials) {
    throw new Error("Team mode is not configured");
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Team mode is not configured");
  }

  // First, check if there's an existing persisted session
  const { data: { user: existingUser }, error: getUserError } = await client.auth.getUser();
  if (getUserError) {
    throw new Error(`Authentication failed: ${getUserError.message}`);
  }

  // If we have a valid user from the persisted session, reuse it
  if (existingUser) {
    return { client, userId: existingUser.id };
  }

  // No existing user - need to sign in
  await signInAnonymously(client);

  // Get the newly signed-in user
  const { data: { user: newUser }, error: postSignInError } = await client.auth.getUser();
  if (postSignInError) {
    throw new Error(`Authentication failed: ${postSignInError.message}`);
  }
  if (!newUser) {
    throw new Error("Not authenticated");
  }

  return { client, userId: newUser.id };
}

/**
 * Invalidates the cached client (e.g., when team config changes).
 */
export function invalidateSupabaseClient(): void {
  cachedClient = null;
}

/**
 * Performs anonymous sign-in and returns the session.
 */
async function signInAnonymously(client: SupabaseClient): Promise<void> {
  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    throw error;
  }
  mainLog.info("[team:session] Anonymous sign-in successful", { userId: data.user?.id });
}
