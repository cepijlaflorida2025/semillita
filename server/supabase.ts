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
