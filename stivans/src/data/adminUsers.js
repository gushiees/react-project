// src/data/adminUsers.js
import { supabase } from '../supabaseClient';

export async function deleteUserById(userId) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch('/api/admin/users/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ userId }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.details || json?.error || 'Delete failed');
  return json;
}
