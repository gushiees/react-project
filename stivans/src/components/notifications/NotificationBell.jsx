import React, { useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import { useAuth } from "../../AuthContext.jsx";
import {
  fetchNotifications,
  markRead,
  markAllRead,
  subscribeUserNotifications,
} from "../../data/notifications.jsx";

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const panelRef = useRef(null);

  const unreadCount = items.filter((n) => !n.is_read).length;

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      if (!user) return;
      setItems(await fetchNotifications());
      unsub = subscribeUserNotifications(user.id, (n) =>
        setItems((prev) => [n, ...prev])
      );
    })();
    return () => unsub();
  }, [user]);

  // close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (!user) return null;

  return (
    <div className="notif-bell" style={{ position: "relative" }}>
      <button
        aria-label="Notifications"
        className="notif-btn"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 6,
        }}
      >
        <FaBell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              fontSize: 11,
              minWidth: 16,
              height: 16,
              lineHeight: "16px",
              borderRadius: 8,
              background: "#f43f5e",
              color: "#fff",
              textAlign: "center",
              padding: "0 4px",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="notif-panel"
          style={{
            position: "absolute",
            right: 0,
            top: 36,
            width: 360,
            maxHeight: 420,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,.08)",
            zIndex: 50,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", padding: 12 }}>
            <strong>Notifications</strong>
            <button
              onClick={async () => {
                await markAllRead();
                setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
              }}
              style={{ background: "transparent", border: "none", color: "#2563eb", cursor: "pointer" }}
            >
              Mark all read
            </button>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: 12, color: "#6b7280" }}>No notifications yet.</div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                onClick={async () => {
                  if (!n.is_read) {
                    await markRead(n.id);
                    setItems((prev) =>
                      prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
                    );
                  }
                }}
                style={{
                  padding: "10px 12px",
                  borderTop: "1px solid #f1f5f9",
                  background: n.is_read ? "#fff" : "#fef3c7",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: n.is_read ? 500 : 700 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
