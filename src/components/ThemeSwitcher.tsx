"use client";

import { useState, useEffect, useRef } from "react";

const THEMES = [
  {
    id: "war-room",
    label: "War Room",
    description: "Burnt sienna · Bold · Creative",
    icon: "⚔️",
    accentColor: "#c2410c",
    previewBg: "#1c1917",
    buttonClass: "bg-orange-700 hover:bg-orange-600",
  },
  {
    id: "boardroom",
    label: "Boardroom",
    description: "Gold · Sharp · Executive",
    icon: "🏛️",
    accentColor: "#d97706",
    previewBg: "#0f172a",
    buttonClass: "bg-amber-600 hover:bg-amber-500",
  },
  {
    id: "minimal",
    label: "Minimal Calm",
    description: "Indigo · Clean · Quiet",
    icon: "🌙",
    accentColor: "#6366f1",
    previewBg: "#18181b",
    buttonClass: "bg-indigo-600 hover:bg-indigo-500",
  },
  {
    id: "late-night",
    label: "Late Night",
    description: "Emerald · Terminal · Focused",
    icon: "🖥️",
    accentColor: "#059669",
    previewBg: "#09090b",
    buttonClass: "bg-emerald-700 hover:bg-emerald-600",
  },
] as const;

type ThemeId = typeof THEMES[number]["id"];

const STORAGE_KEY = "s2kdotza-theme";
const DEFAULT: ThemeId = "war-room";

export default function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState<ThemeId>(DEFAULT);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) as ThemeId) || DEFAULT;
      setActive(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  function selectTheme(id: ThemeId) {
    setActive(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
    setTimeout(() => setIsOpen(false), 200);
  }

  const current = THEMES.find((t) => t.id === active) || THEMES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-300 transition shadow-lg"
      >
        <span>{current.icon}</span>
        <span className="hidden sm:inline text-xs">{current.label}</span>
        <span className="text-slate-600 text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 z-50 w-64 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
          <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              🎨 Choose Your Vibe
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Accent color changes instantly
            </p>
          </div>

          <div className="p-3 space-y-1.5">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => selectTheme(theme.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition border ${
                  active === theme.id
                    ? "bg-slate-800 border-slate-600"
                    : "border-transparent hover:bg-slate-800/50"
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: theme.previewBg }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: theme.accentColor }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{theme.icon}</span>
                    <p className="text-sm font-semibold text-white">
                      {theme.label}
                    </p>
                    {active === theme.id && (
                      <span className="text-xs text-emerald-400 font-bold ml-auto">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {theme.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-800 bg-slate-950 px-4 py-2.5">
            <p className="text-xs text-slate-600 text-center">
              Full boardroom theme coming in Step 6
            </p>
          </div>
        </div>
      )}
    </div>
  );
}