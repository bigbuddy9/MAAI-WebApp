import { initSupabaseStorage } from '@maai/shared';
import { supabase } from './supabase';

export const db = initSupabaseStorage(supabase);
