import { supabase } from './supabaseClient';
import { ProfileType } from '../types';

export interface ProfileRecord {
  id: string;
  name: string;
  email: string;
  profileType: ProfileType;
  document: string;
  createdAt: string;
}

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  profile_type: ProfileType;
  document: string;
  created_at: string;
}

function fromRow(row: ProfileRow): ProfileRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    profileType: row.profile_type,
    document: row.document,
    createdAt: row.created_at,
  };
}

export async function fetchProfiles(): Promise<ProfileRecord[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as ProfileRow[]).map(fromRow);
}

export async function updateProfileRole(id: string, profileType: ProfileType): Promise<ProfileRecord> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ profile_type: profileType })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as ProfileRow);
}
