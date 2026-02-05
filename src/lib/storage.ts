import { initSupabaseStorage } from '@/shared';
import { supabase } from './supabase';

export const db = initSupabaseStorage(supabase);
