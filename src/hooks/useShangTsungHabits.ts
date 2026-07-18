"use client";

import { useState, useEffect, useCallback } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ChipUsage {
  message: string;
  count: number;
  lastUsed: number;
}

interface PanelState {
  shangCollapsed: boolean;
  explorerCollapsed: boolean;
}

interface FileHistory {
  filePath: string;
  openCount: number;
  lastOpened: number;
}

interface SessionData {
  totalSessions: number;
  lastVisit: number;
  chipUsage: Record<string, ChipUsage>;
  panelState: PanelState;
  fileHistory: Record<string, FileHistory>;
  preferredViewMode: "preview" | "code";
}

// ─── STORAGE KEY ──────────────────────────────────────────────────────────────

function getStorageKey(projectId: string) {
  return `s2k-habits-${projectId}`;
}

// ─── DEFAULT STATE ────────────────────────────────────────────────────────────

function getDefaultSession(): SessionData {
  return {
    totalSessions: 0,
    lastVisit: Date.now(),
    chipUsage: {},
    panelState: { shangCollapsed: false, explorerCollapsed: false },
    fileHistory: {},
    preferredViewMode: "preview",
  };
}

// ─── LOAD FROM STORAGE ────────────────────────────────────────────────────────

function loadSession(projectId: string): SessionData {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (!raw) return getDefaultSession();
    return { ...getDefaultSession(), ...JSON.parse(raw) };
  } catch {
    return getDefaultSession();
  }
}

// ─── SAVE TO STORAGE ──────────────────────────────────────────────────────────

function saveSession(projectId: string, data: SessionData) {
  try {
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(data));
  } catch {}
}

// ─── MAIN HOOK ────────────────────────────────────────────────────────────────

export function useShangTsungHabits(projectId: string) {
  const [session, setSession] = useState<SessionData>(getDefaultSession);
  const [loaded, setLoaded] = useState(false);

  // Load on mount and increment session count
  useEffect(() => {
    const data = loadSession(projectId);
    data.totalSessions += 1;
    data.lastVisit = Date.now();
    saveSession(projectId, data);
    setSession(data);
    setLoaded(true);
  }, [projectId]);

  // ── TRACK CHIP USAGE ──────────────────────────────────────────────────────

  const trackChipUsed = useCallback(
    (message: string) => {
      setSession((prev) => {
        const existing = prev.chipUsage[message] || { message, count: 0, lastUsed: 0 };
        const updated: SessionData = {
          ...prev,
          chipUsage: {
            ...prev.chipUsage,
            [message]: {
              message,
              count: existing.count + 1,
              lastUsed: Date.now(),
            },
          },
        };
        saveSession(projectId, updated);
        return updated;
      });
    },
    [projectId]
  );

  // ── TRACK PANEL STATE ─────────────────────────────────────────────────────

  const trackPanelState = useCallback(
    (shangCollapsed: boolean, explorerCollapsed: boolean) => {
      setSession((prev) => {
        const updated: SessionData = {
          ...prev,
          panelState: { shangCollapsed, explorerCollapsed },
        };
        saveSession(projectId, updated);
        return updated;
      });
    },
    [projectId]
  );

  // ── TRACK FILE OPENED ─────────────────────────────────────────────────────

  const trackFileOpened = useCallback(
    (filePath: string) => {
      setSession((prev) => {
        const existing = prev.fileHistory[filePath] || {
          filePath,
          openCount: 0,
          lastOpened: 0,
        };
        const updated: SessionData = {
          ...prev,
          fileHistory: {
            ...prev.fileHistory,
            [filePath]: {
              filePath,
              openCount: existing.openCount + 1,
              lastOpened: Date.now(),
            },
          },
        };
        saveSession(projectId, updated);
        return updated;
      });
    },
    [projectId]
  );

  // ── TRACK VIEW MODE ───────────────────────────────────────────────────────

  const trackViewMode = useCallback(
    (mode: "preview" | "code") => {
      setSession((prev) => {
        const updated: SessionData = {
          ...prev,
          preferredViewMode: mode,
        };
        saveSession(projectId, updated);
        return updated;
      });
    },
    [projectId]
  );

  // ── SORT CHIPS BY USAGE ───────────────────────────────────────────────────

  function sortChipsByHabits<T extends { message: string }>(chips: T[]): T[] {
    if (session.totalSessions < 3) return chips;

    return [...chips].sort((a, b) => {
      const usageA = session.chipUsage[a.message];
      const usageB = session.chipUsage[b.message];

      const countA = usageA?.count || 0;
      const countB = usageB?.count || 0;

      if (countA !== countB) return countB - countA;

      const lastA = usageA?.lastUsed || 0;
      const lastB = usageB?.lastUsed || 0;
      return lastB - lastA;
    });
  }

  // ── GET MOST USED FILE PATH ───────────────────────────────────────────────

  function getMostUsedFilePath(): string | null {
    const entries = Object.values(session.fileHistory);
    if (entries.length === 0) return null;

    return entries.sort((a, b) => {
      if (a.openCount !== b.openCount) return b.openCount - a.openCount;
      return b.lastOpened - a.lastOpened;
    })[0]?.filePath || null;
  }

  // ── HABIT SUMMARY (for Shang Tsung's greeting) ───────────────────────────

  function getHabitSummary(): string {
    if (session.totalSessions <= 1) return "";

    const topChips = Object.values(session.chipUsage)
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);

    const mostUsedFile = getMostUsedFilePath();

    const parts: string[] = [];

    if (session.totalSessions >= 3) {
      parts.push(`Session #${session.totalSessions}`);
    }

    if (topChips.length > 0 && session.totalSessions >= 3) {
      const topCommand = topChips[0].message;
      parts.push(`Your most used command: "${topCommand}"`);
    }

    if (mostUsedFile && session.totalSessions >= 3) {
      parts.push(`You usually open: ${mostUsedFile}`);
    }

    return parts.join("\n");
  }

  return {
    loaded,
    session,
    panelState: session.panelState,
    preferredViewMode: session.preferredViewMode,
    totalSessions: session.totalSessions,
    trackChipUsed,
    trackPanelState,
    trackFileOpened,
    trackViewMode,
    sortChipsByHabits,
    getMostUsedFilePath,
    getHabitSummary,
  };
}