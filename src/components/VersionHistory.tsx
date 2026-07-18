"use client";

import { useState, useEffect } from "react";

interface Version {
  id: string;
  version_number: number;
  label: string;
  instruction: string | null;
  created_at: string;
  pinned: boolean;
}

interface VersionHistoryProps {
  projectId: string;
  onRestore: (files: any[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

function timeAgo(dateString: string): string {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function VersionHistory({
  projectId,
  onRestore,
  isOpen,
  onClose,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pinning, setPinning] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showPinInput, setShowPinInput] = useState<string | null>(null);
  const [pinLabel, setPinLabel] = useState("");

  useEffect(() => {
    if (isOpen) loadVersions();
  }, [isOpen, projectId]);

  async function loadVersions() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      const data = await res.json();
      if (res.ok) setVersions(data.versions || []);
    } catch {}
    finally { setLoading(false); }
  }

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 4000);
  }

  // ── RESTORE ──────────────────────────────────────────────────────────────

  async function handleRestore(version: Version) {
    if (!confirm(`Restore to "${version.label.replace("📌 ", "")}"?\n\nYour current state will be saved automatically first.`)) return;
    setRestoring(version.id);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/versions/${version.id}/restore`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok) {
        showMessage(`✅ Restored to "${version.label.replace("📌 ", "")}". ${data.filesRestored} files recovered.`);
        onRestore(data.files || []);
        await loadVersions();
      } else {
        showMessage(`❌ ${data.error}`);
      }
    } catch { showMessage("❌ Connection error. Please try again."); }
    finally { setRestoring(null); }
  }

  // ── DELETE ───────────────────────────────────────────────────────────────

  async function handleDelete(versionId: string) {
    if (!confirm("Delete this version? This cannot be undone.")) return;
    setDeleting(versionId);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (res.ok) {
        setVersions((prev) => prev.filter((v) => v.id !== versionId));
        showMessage("✅ Version deleted.");
      } else {
        showMessage("❌ Failed to delete.");
      }
    } catch { showMessage("❌ Connection error."); }
    finally { setDeleting(null); }
  }

  // ── CLEAR ALL UNPINNED ────────────────────────────────────────────────────

  async function handleClearAll() {
    const unpinnedCount = versions.filter((v) => !v.pinned).length;
    if (unpinnedCount === 0) { showMessage("No unpinned versions to clear."); return; }
    if (!confirm(`Delete all ${unpinnedCount} unpinned versions? Pinned versions will be kept.`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`✅ Cleared ${data.deleted} unpinned versions.`);
        await loadVersions();
      } else {
        showMessage("❌ Failed to clear.");
      }
    } catch { showMessage("❌ Connection error."); }
  }

  // ── PIN / UNPIN ───────────────────────────────────────────────────────────

  async function handlePin(version: Version, customLabel?: string) {
    setPinning(version.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: version.id,
          pin: !version.pinned,
          customLabel: customLabel || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setVersions((prev) =>
          prev.map((v) =>
            v.id === version.id ? { ...v, label: data.version.label, pinned: data.version.pinned } : v
          )
        );
        setShowPinInput(null);
        setPinLabel("");
        showMessage(version.pinned ? "📌 Unpinned." : "📌 Version pinned — it will never be auto-deleted.");
      } else {
        showMessage("❌ Failed to update.");
      }
    } catch { showMessage("❌ Connection error."); }
    finally { setPinning(null); }
  }

  if (!isOpen) return null;

  const pinnedVersions = versions.filter((v) => v.pinned);
  const unpinnedVersions = versions.filter((v) => !v.pinned);
  const totalCount = versions.length;
  const unpinnedCount = unpinnedVersions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 bg-stone-950 px-6 py-4">
          <div>
            <h2 className="font-black text-stone-100 text-lg">⏱ Version History</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {totalCount} version{totalCount !== 1 ? "s" : ""} ·{" "}
              {pinnedVersions.length} pinned ·{" "}
              {unpinnedCount}/20 unpinned slots used
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-stone-700 hover:bg-stone-800 px-3 py-1.5 text-sm text-stone-400 hover:text-stone-100 transition">
            ✕ Close
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-4 mt-3 rounded-xl border p-3 text-sm ${
            message.startsWith("✅") || message.startsWith("📌")
              ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
              : "border-red-800 bg-red-950/40 text-red-300"
          }`}>
            {message}
          </div>
        )}

        {/* Version List */}
        <div className="p-4 max-h-[55vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center py-10 text-stone-500 text-sm">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-stone-400 text-sm font-bold mb-1">No versions saved yet</p>
              <p className="text-stone-600 text-xs">
                Versions are saved automatically every time Shang Tsung edits your code.
              </p>
            </div>
          ) : (
            <>
              {/* Pinned Versions */}
              {pinnedVersions.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-orange-400 mb-2 px-1">
                    📌 Pinned
                  </p>
                  {pinnedVersions.map((version) => (
                    <VersionCard
                      key={version.id}
                      version={version}
                      onRestore={handleRestore}
                      onDelete={handleDelete}
                      onPin={handlePin}
                      restoring={restoring}
                      deleting={deleting}
                      pinning={pinning}
                      showPinInput={showPinInput}
                      setShowPinInput={setShowPinInput}
                      pinLabel={pinLabel}
                      setPinLabel={setPinLabel}
                      isPinned
                    />
                  ))}
                </div>
              )}

              {/* Unpinned Versions */}
              {unpinnedVersions.length > 0 && (
                <div>
                  {pinnedVersions.length > 0 && (
                    <p className="text-xs font-black uppercase tracking-wider text-stone-500 mb-2 px-1 mt-4">
                      Auto-saved
                    </p>
                  )}
                  {unpinnedVersions.map((version, index) => (
                    <VersionCard
                      key={version.id}
                      version={version}
                      onRestore={handleRestore}
                      onDelete={handleDelete}
                      onPin={handlePin}
                      restoring={restoring}
                      deleting={deleting}
                      pinning={pinning}
                      showPinInput={showPinInput}
                      setShowPinInput={setShowPinInput}
                      pinLabel={pinLabel}
                      setPinLabel={setPinLabel}
                      isLatest={index === 0 && pinnedVersions.length === 0}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-800 bg-stone-950 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-600">
              Restoring saves current state first · Pinned versions never auto-deleted
            </p>
            {unpinnedCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-lg border border-red-900/50 bg-red-950/20 hover:bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition"
              >
                Clear Unpinned ({unpinnedCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VERSION CARD ─────────────────────────────────────────────────────────────

interface VersionCardProps {
  version: Version;
  onRestore: (version: Version) => void;
  onDelete: (id: string) => void;
  onPin: (version: Version, customLabel?: string) => void;
  restoring: string | null;
  deleting: string | null;
  pinning: string | null;
  showPinInput: string | null;
  setShowPinInput: (id: string | null) => void;
  pinLabel: string;
  setPinLabel: (label: string) => void;
  isLatest?: boolean;
  isPinned?: boolean;
}

function VersionCard({
  version,
  onRestore,
  onDelete,
  onPin,
  restoring,
  deleting,
  pinning,
  showPinInput,
  setShowPinInput,
  pinLabel,
  setPinLabel,
  isLatest,
  isPinned,
}: VersionCardProps) {
  const displayLabel = version.label?.startsWith("📌 ")
    ? version.label.slice(3)
    : version.label;

  return (
    <div className={`rounded-xl border p-4 mb-2 transition ${
      isPinned
        ? "border-orange-800/50 bg-orange-900/10"
        : isLatest
        ? "border-stone-600 bg-stone-800/70"
        : "border-stone-700 bg-stone-800/40 hover:bg-stone-800/60"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-stone-500">v{version.version_number}</span>
            {isPinned && (
              <span className="text-xs bg-orange-900/40 border border-orange-800/50 text-orange-400 px-1.5 py-0.5 rounded font-bold">
                📌 Pinned
              </span>
            )}
            {isLatest && !isPinned && (
              <span className="text-xs bg-stone-700 text-stone-300 px-1.5 py-0.5 rounded font-bold">
                Latest
              </span>
            )}
          </div>
          <p className="font-bold text-stone-100 text-sm truncate">{displayLabel}</p>
          {version.instruction && (
            <p className="text-xs text-stone-500 mt-0.5 truncate">{version.instruction}</p>
          )}
          <p className="text-xs text-stone-600 mt-1">{timeAgo(version.created_at)}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {!isLatest && (
            <button
              type="button"
              onClick={() => onRestore(version)}
              disabled={restoring === version.id}
              className="rounded-lg border border-stone-600 hover:border-orange-700 bg-stone-900 hover:bg-orange-900/20 px-2.5 py-1 text-xs font-black text-stone-300 hover:text-orange-300 disabled:opacity-50 transition"
            >
              {restoring === version.id ? "..." : "Restore"}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (isPinned) {
                onPin(version);
              } else {
                setShowPinInput(version.id);
                setPinLabel(displayLabel);
              }
            }}
            disabled={pinning === version.id}
            className={`rounded-lg border px-2.5 py-1 text-xs font-black transition disabled:opacity-50 ${
              isPinned
                ? "border-orange-800/50 bg-orange-900/20 text-orange-400 hover:bg-orange-900/30"
                : "border-stone-700 hover:border-orange-700 bg-stone-900 text-stone-400 hover:text-orange-400"
            }`}
          >
            {pinning === version.id ? "..." : isPinned ? "Unpin" : "📌 Pin"}
          </button>

          {!isLatest && (
            <button
              type="button"
              onClick={() => onDelete(version.id)}
              disabled={deleting === version.id}
              className="rounded-lg border border-stone-700 hover:border-red-800 bg-stone-900 hover:bg-red-950/20 px-2.5 py-1 text-xs font-black text-stone-500 hover:text-red-400 disabled:opacity-50 transition"
            >
              {deleting === version.id ? "..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* Pin label input */}
      {showPinInput === version.id && (
        <div className="mt-3 pt-3 border-t border-stone-700">
          <p className="text-xs text-stone-400 mb-2">Give this version a memorable name:</p>
          <input
            type="text"
            value={pinLabel}
            onChange={(e) => setPinLabel(e.target.value)}
            placeholder="e.g. Working homepage before redesign"
            className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-orange-600"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onPin(version, pinLabel);
              if (e.key === "Escape") { setShowPinInput(null); setPinLabel(""); }
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => onPin(version, pinLabel)}
              className="flex-1 rounded-lg bg-orange-700 hover:bg-orange-600 px-3 py-1.5 text-xs font-black text-white transition"
            >
              📌 Pin This Version
            </button>
            <button
              type="button"
              onClick={() => { setShowPinInput(null); setPinLabel(""); }}
              className="rounded-lg border border-stone-700 hover:bg-stone-800 px-3 py-1.5 text-xs text-stone-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}