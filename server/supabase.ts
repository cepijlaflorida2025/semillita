import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not configured. File uploads will use local storage.');
}

// Bucket configuration
export const PROFILE_BUCKET = 'semillita-uploads';

// Lazy-initialized clients (prevents initialization errors in serverless)
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Get Supabase client (lazy-initialized)
 * Only creates client when needed, preventing serverless initialization errors
 */
function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

/**
 * Get Supabase admin client (lazy-initialized)
 * Only creates client when needed, preventing serverless initialization errors
 */
function getSupabaseAdminClient(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase admin credentials not configured');
    }
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return _supabaseAdmin;
}

// Track if bucket has been verified (to avoid checking on every upload)
let bucketVerified = false;

/**
 * Ensure the storage bucket exists and has correct policies
 */
async function ensureBucketExists(): Promise<void> {
  if (bucketVerified) {
    return;
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    const bucketExists = buckets?.some(b => b.name === PROFILE_BUCKET);

    if (!bucketExists) {
      console.log(`📦 Creating bucket: ${PROFILE_BUCKET}`);

      // Create the bucket with public access
      const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket(
        PROFILE_BUCKET,
        {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/webm']
        }
      );

      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }

      console.log(`✅ Bucket created successfully: ${PROFILE_BUCKET}`);
    } else {
      console.log(`✅ Bucket already exists: ${PROFILE_BUCKET}`);
    }

    bucketVerified = true;
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    throw error;
  }
}

/**
 * Upload a file to Supabase Storage
 * @param file - File buffer to upload
 * @param filename - Name for the file
 * @param mimetype - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToSupabase(
  file: Buffer,
  filename: string,
  mimetype: string
): Promise<string> {
  try {
    // Ensure bucket exists before uploading
    await ensureBucketExists();

    // Get admin client lazily
    const supabaseAdmin = getSupabaseAdminClient();

    // Use admin client to bypass RLS policies
    const { data, error } = await supabaseAdmin.storage
      .from(PROFILE_BUCKET)
      .upload(filename, file, {
        contentType: mimetype,
        upsert: true, // Allow overwriting files with same name
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL using admin client
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(PROFILE_BUCKET)
      .getPublicUrl(data.path);

    console.log('✅ File uploaded to Supabase:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw error;
  }
}

/**
 * Delete a file from Supabase Storage
 * @param filepath - Path of the file to delete
 */
export async function deleteFromSupabase(filepath: string): Promise<void> {
  try {
    // Get admin client lazily
    const supabaseAdmin = getSupabaseAdminClient();

    // Use admin client to bypass RLS policies
    const { error } = await supabaseAdmin.storage
      .from(PROFILE_BUCKET)
      .remove([filepath]);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
    throw error;
  }
}

/**
 * Delete all files for a user from Supabase Storage
 * @param userId - User ID whose files should be deleted
 * @returns Number of files deleted
 */
export async function deleteUserFiles(userId: string): Promise<number> {
  try {
    console.log(`🗑️ [Delete User Files] Starting deletion for user: ${userId}`);
    const supabaseAdmin = getSupabaseAdminClient();

    // List all files in the user's folder
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(PROFILE_BUCKET)
      .list(userId, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error(`❌ [Delete User Files] Error listing files:`, listError);
      throw new Error(`Error listing user files: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      console.log(`✅ [Delete User Files] No files found for user ${userId}`);
      return 0;
    }

    // Create array of file paths to delete
    const filePaths = files.map(file => `${userId}/${file.name}`);

    console.log(`🗑️ [Delete User Files] Deleting ${filePaths.length} files...`);

    // Delete all files
    const { data: deleteData, error: deleteError } = await supabaseAdmin.storage
      .from(PROFILE_BUCKET)
      .remove(filePaths);

    if (deleteError) {
      console.error(`❌ [Delete User Files] Error deleting files:`, deleteError);
      throw new Error(`Error deleting user files: ${deleteError.message}`);
    }

    console.log(`✅ [Delete User Files] Successfully deleted ${filePaths.length} files for user ${userId}`);

    return filePaths.length;
  } catch (error) {
    console.error('❌ [Delete User Files] Error deleting user files:', error);
    throw error;
  }
}

/**
 * Delete profile history records for a user from Supabase database
 * @param userId - User ID whose profile history should be deleted
 */
export async function deleteUserProfileHistory(userId: string): Promise<void> {
  try {
    console.log(`🗑️ [Delete Profile History] Starting deletion for user: ${userId}`);
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('profile_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      // If table doesn't exist, log warning but don't fail
      if (error.code === '42P01') {
        console.warn('⚠️ profile_history table not found. Skipping...');
      } else {
        throw new Error(`Supabase delete error: ${error.message}`);
      }
    } else {
      console.log(`✅ [Delete Profile History] Successfully deleted profile history for user ${userId}`);
    }
  } catch (error) {
    console.error('❌ [Delete Profile History] Error deleting profile history:', error);
    // Don't throw - we don't want to fail the deletion if history deletion fails
  }
}

/**
 * Save profile history record to Supabase database
 * @param profileData - Profile data to save
 */
export async function saveProfileHistory(profileData: {
  userId: string;
  photoUrl: string;
  plantId?: string;
  type: 'plant' | 'journal_entry' | 'seed' | 'avatar';
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    // Get client lazily
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('profile_history')
      .insert({
        user_id: profileData.userId,
        photo_url: profileData.photoUrl,
        plant_id: profileData.plantId,
        type: profileData.type,
        metadata: profileData.metadata,
        created_at: new Date().toISOString(),
      });

    if (error) {
      // If table doesn't exist, log warning but don't fail
      if (error.code === '42P01') {
        console.warn('⚠️ profile_history table not found. Please create it in Supabase.');
      } else {
        throw new Error(`Supabase insert error: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error saving profile history:', error);
    // Don't throw - we don't want to fail the upload if history save fails
  }
}

/**
 * Get profile history for a user
 * @param userId - User ID to get history for
 * @param limit - Maximum number of records to return
 */
export async function getProfileHistory(userId: string, limit = 50): Promise<any[]> {
  try {
    // Get client lazily
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('profile_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error getting profile history:', error);
    return [];
  }
}

/**
 * Get storage usage statistics for the bucket
 * @returns Object with total size in bytes and number of files
 *
 * Note: Due to Supabase Storage API limitations, this function counts files
 * but may not be able to get accurate size information without making
 * individual requests for each file, which would be very slow.
 */
export async function getStorageStats(): Promise<{
  totalSizeBytes: number;
  totalSizeMB: number;
  fileCount: number;
  bucketName: string;
}> {
  try {
    console.log(`📊 [Storage Stats] Counting files in bucket...`);
    return await countFilesAndEstimateSize();
  } catch (error) {
    console.error('❌ [Storage Stats] Error getting storage stats:', error);
    throw error;
  }
}

/**
 * Get storage statistics per user
 * @returns Map of userId to their storage stats
 */
export async function getStorageStatsByUser(): Promise<Map<string, {
  fileCount: number;
  estimatedSizeMB: number;
}>> {
  try {
    console.log(`📊 [Storage Stats] Calculating storage per user...`);
    const supabaseAdmin = getSupabaseAdminClient();

    // Helper function to recursively list all files
    async function listAllFiles(path: string = ''): Promise<any[]> {
      const { data: items, error } = await supabaseAdmin.storage
        .from(PROFILE_BUCKET)
        .list(path, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error(`❌ [Storage Stats] Error listing files in path "${path}":`, error);
        return [];
      }

      if (!items) return [];

      let allFiles: any[] = [];

      for (const item of items) {
        const itemPath = path ? `${path}/${item.name}` : item.name;

        // If it's a folder (id is null), recursively get its contents
        if (item.id === null) {
          const subFiles = await listAllFiles(itemPath);
          allFiles = allFiles.concat(subFiles);
        } else {
          // It's a file
          allFiles.push({ ...item, fullPath: itemPath });
        }
      }

      return allFiles;
    }

    const allFiles = await listAllFiles();

    // Group files by userId (extracted from path)
    // Path format: userId/timestamp_id.ext
    const userStats = new Map<string, { fileCount: number; estimatedSizeMB: number }>();
    const AVERAGE_FILE_SIZE_MB = 0.5; // 500KB per file estimate

    for (const file of allFiles) {
      const pathParts = file.fullPath.split('/');
      if (pathParts.length >= 2) {
        const userId = pathParts[0];

        if (!userStats.has(userId)) {
          userStats.set(userId, { fileCount: 0, estimatedSizeMB: 0 });
        }

        const stats = userStats.get(userId)!;
        stats.fileCount++;
        stats.estimatedSizeMB += AVERAGE_FILE_SIZE_MB;
      }
    }

    // Round the MB values
    for (const [userId, stats] of userStats.entries()) {
      stats.estimatedSizeMB = Math.round(stats.estimatedSizeMB * 100) / 100;
    }

    console.log(`✅ [Storage Stats] Calculated storage for ${userStats.size} users`);

    return userStats;
  } catch (error) {
    console.error('❌ [Storage Stats] Error getting storage by user:', error);
    return new Map();
  }
}

/**
 * Count files and estimate total size
 */
async function countFilesAndEstimateSize(): Promise<{
  totalSizeBytes: number;
  totalSizeMB: number;
  fileCount: number;
  bucketName: string;
}> {
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // Helper function to recursively list all files
    async function listAllFiles(path: string = ''): Promise<any[]> {
      const { data: items, error } = await supabaseAdmin.storage
        .from(PROFILE_BUCKET)
        .list(path, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error(`❌ [Storage Stats] Error listing files in path "${path}":`, error);
        return [];
      }

      if (!items) return [];

      let allFiles: any[] = [];

      for (const item of items) {
        const itemPath = path ? `${path}/${item.name}` : item.name;

        // If it's a folder (id is null), recursively get its contents
        if (item.id === null) {
          console.log(`📁 [Storage Stats] Found folder: ${itemPath}`);
          const subFiles = await listAllFiles(itemPath);
          allFiles = allFiles.concat(subFiles);
        } else {
          // It's a file
          console.log(`📄 [Storage Stats] Found file: ${item.name}`);
          allFiles.push(item);
        }
      }

      return allFiles;
    }

    const allFiles = await listAllFiles();
    const fileCount = allFiles.length;

    console.log(`✅ [Storage Stats] Total files found: ${fileCount}`);

    // Try to estimate size by downloading metadata for a sample
    // or use average file size estimation
    const AVERAGE_FILE_SIZE_MB = 0.5; // Estimate 500KB per file (conservative)
    const estimatedSizeMB = fileCount * AVERAGE_FILE_SIZE_MB;
    const estimatedSizeBytes = estimatedSizeMB * 1024 * 1024;

    return {
      totalSizeBytes: estimatedSizeBytes,
      totalSizeMB: Math.round(estimatedSizeMB * 100) / 100,
      fileCount,
      bucketName: PROFILE_BUCKET
    };
  } catch (error) {
    console.error('❌ [Storage Stats] Count files failed:', error);
    return {
      totalSizeBytes: 0,
      totalSizeMB: 0,
      fileCount: 0,
      bucketName: PROFILE_BUCKET
    };
  }
}
