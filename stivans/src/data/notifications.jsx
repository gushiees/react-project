import { supabase } from "../supabaseClient";

export async function fetchNotifications(limit = 20) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markRead(id) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "");
  if (error) throw error;
}

export async function insertNotification(row) {
  // row: { user_id, type, title, body?, order_id?, meta? }
  const { error } = await supabase.from("notifications").insert(row);
  if (error) throw error;
}

export function subscribeUserNotifications(userId, onInsert) {
  if (!userId) return () => {};
  const channel = supabase
    .channel(`public:notifications:user:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => onInsert?.(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
