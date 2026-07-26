"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ToastProvider, useToast } from "@/components/ui/Toast";

interface RouteItem {
  id: string;
  page_name: string;
  route_path: string;
  purpose: string | null;
  access_level: string | null;
}

interface FeatureItem {
  id: string;
  feature_name: string;
  priority: string | null;
  complexity: string | null;
  status: string | null;
}

interface TableItem {
  id: string;
  table_name: string;
  purpose: string | null;
  fields_json: any;
}

interface Project {
  id: string;
  app_name: string;
  app_description: string | null;
  app_type: string | null;
  status: string;
  routes: RouteItem[];
  features: FeatureItem[];
  databaseTables: TableItem[];
}

/* --------------------------- helpers ---------------------------- */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy method */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function routeText(r: RouteItem): string {
  return `Route: ${r.page_name}\nPath: ${r.route_path}${r.purpose ? `\nPurpose: ${r.purpose}` : ""}`;
}
function featureText(f: FeatureItem): string {
  return `Feature: ${f.feature_name}\nPriority: ${f.priority || "Standard"}\nStatus: ${f.status || "Planned"}`;
}
function tableText(t: TableItem): string {
  return `Table: ${t.table_name}${t.purpose ? `\nPurpose: ${t.purpose}` : ""}`;
}

/* --------------------- card components (view + edit) ------------ */
function RouteCard({
  r,
  isEditing,
  draft,
  setDraft,
  onSave,
  onCancel,
  onEdit,
  onCopy,
  copied,
}: {
  r: RouteItem;
  isEditing: boolean;
  draft: any;
  setDraft: (d: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  if (isEditing) {
    return (
      <div className="relative p-4 rounded-2xl bg-black/40 border border-orange-500/40">
        <div className="absolute right-2 top-2 flex gap-1">
          <button onClick={onSave} className="rounded-md bg-orange-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-orange-500">💾 Save</button>
          <button onClick={onCancel} className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/10">Cancel</button>
        </div>
        <div className="space-y-2 pr-24">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Page name</div>
            <input value={draft.page_name ?? ""} onChange={(e) => setDraft({ ...draft, page_name: e.target.value })} className="w-full rounded-md bg-black/60 border border-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Route path</div>
            <input value={draft.route_path ?? ""} onChange={(e) => setDraft({ ...draft, route_path: e.target.value })} className="w-full rounded-md bg-black/60 border border-white/10 px-2 py-1 text-sm text-white font-mono outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Purpose</div>
            <textarea value={draft.purpose ?? ""} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} rows={2} className="w-full rounded-md bg-black/60 border border-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative group p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/15 transition">
      <div className="absolute right-2 top-2 flex gap-1">
        <button onClick={onEdit} title="Edit" className="rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[11px] text-zinc-300 hover:text-white hover:border-white/30">✏️</button>
        <button onClick={onCopy} title="Copy to clipboard" className="rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[11px] text-zinc-300 hover:text-white hover:border-white/30">{copied ? "Copied!" : "⧉"}</button>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1 pr-20">
        <span className="font-bold text-white text-sm">{r.page_name}</span>
        <span className="font-mono text-[11px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">{r.route_path}</span>
      </div>
      {r.purpose && <p className="text-zinc-500 text-[11px] mt-2 leading-normal">{r.purpose}</p>}
    </div>
  );
}

function FeatureCard({
  f,
  isEditing,
  draft,
  setDraft,
  onSave,
  onCancel,
  onEdit,
  onCopy,
  copied,
}: {
  f: FeatureItem;
  isEditing: boolean;
  draft: any;
  setDraft: (d: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  if (isEditing) {
    return (
      <div className="relative p-4 rounded-2xl bg-black/40 border border-orange-500/40">
        <div className="absolute right-2 top-2 flex gap-1">
          <button onClick={onSave} className="rounded-md bg-orange-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-orange-500">💾 Save</button>
          <button onClick={onCancel} className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/10">Cancel</button>
        </div>
        <div className="space-y-2 pr-24">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Feature name</div>
            <input value={draft.feature_name ?? ""} onChange={(e) => setDraft({ ...draft, feature_name: e.target.value })} className="w-full rounded-md bg-black/60 border border-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Priority</div>
              <input value={draft.priority ?? ""} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} className="w-full rounded-md bg-black/60 border border-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Complexity</div>
              <input value={draft.complexity ?? ""} onChange={(e) => setDraft({ ...draft, complexity: e.target.value })} className="w-full rounded-md bg-black/60 border border-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Status</div>
              <input value={draft.status ?? ""} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className="w-full rounded-md bg-black/60 border border-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative group p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/15 transition">
      <div className="absolute right-2 top-2 flex gap-1">
        <button onClick={onEdit} title="Edit" className="rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[11px] text-zinc-300 hover:text-white hover:border-white/30">✏️</button>
        <button onClick={onCopy} title="Copy to clipboard" className="rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[11px] text-zinc-300 hover:text-white hover:border-white/30">{copied ? "Copied!" : "⧉"}</button>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1 pr-20">
        <span className="font-bold text-white text-sm">{f.feature_name}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{f.priority || "Standard"}</span>
      </div>
      <p className="text-zinc-500 text-[11px] mt-1">Status: {f.status || "Planned"}</p>
    </div>
  );
}

function TableCard({
  t,
  isEditing,
  draft,
  setDraft,
  onSave,
  onCancel,
  onEdit,
  onCopy,
  copied,
}: {
  t: TableItem;
  isEditing: boolean;
  draft: any;
  setDraft: (d: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  if (isEditing) {
    return (
      <div className="relative p-4 rounded-2xl bg-black/40 border border-orange-500/40">
        <div className="absolute right-2 top-2 flex gap-1">
          <button onClick={onSave} className="rounded-md bg-orange-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-orange-500">💾 Save</button>
          <button onClick={onCancel} className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/10">Cancel</button>
        </div>
        <div className="space-y-2 pr-24">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Table name</div>
            <input value={draft.table_name ?? ""} onChange={(e) => setDraft({ ...draft, table_name: e.target.value })} className="w-full rounded-md bg-black/60 border border-white/10 px-2 py-1 text-sm text-white font-mono outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Purpose</div>
            <textarea value={draft.purpose ?? ""} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} rows={2} className="w-full rounded-md bg-black/60 border border-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative group p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/15 transition">
      <div className="absolute right-2 top-2 flex gap-1">
        <button onClick={onEdit} title="Edit" className="rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[11px] text-zinc-300 hover:text-white hover:border-white/30">✏️</button>
        <button onClick={onCopy} title="Copy to clipboard" className="rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[11px] text-zinc-300 hover:text-white hover:border-white/30">{copied ? "Copied!" : "⧉"}</button>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1 pr-20">
        <span className="font-bold text-emerald-400 font-mono text-sm">{t.table_name}</span>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">TABLE</span>
      </div>
      {t.purpose && <p className="text-zinc-500 text-[11px] mt-1 leading-normal">{t.purpose}</p>}
    </div>
  );
}

function changeSummary(c: any): string {
  const d = c.data || {};
  switch (c.action) {
    case "add_route": return `Add route: ${d.page_name} (${d.route_path})`;
    case "add_feature": return `Add feature: ${d.feature_name}`;
    case "add_table": return `Add table: ${d.table_name}`;
    case "edit_route": return `Edit route: ${d.page_name || d.id}`;
    case "edit_feature": return `Edit feature: ${d.feature_name || d.id}`;
    case "edit_table": return `Edit table: ${d.table_name || d.id}`;
    default: return "Plan change";
  }
}

function ApplyCard({ change, onApply }: { change: any; onApply: () => void }) {
  const [applied, setApplied] = useState(false);
  return (
    <div className="mt-2 rounded-lg border border-orange-500/30 bg-orange-500/10 p-2">
      <div className="text-[11px] text-zinc-300">{changeSummary(change)}</div>
      <button
        disabled={applied}
        onClick={() => { onApply(); setApplied(true); }}
        className="mt-1 rounded-md bg-orange-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-orange-500 disabled:opacity-50"
      >
        {applied ? "✅ Applied" : "Apply"}
      </button>
    </div>
  );
}

/* --------------------------- page ------------------------------- */
export default function PlanningStagePage() {
  return (
    <ToastProvider>
      <PlanningStageInner />
    </ToastProvider>
  );
}

function PlanningStageInner() {
  const params = useParams();
  const router = useRouter();
  const { show } = useToast();

  const projectId = typeof params?.id === "string" ? params.id : "";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);

  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMsgs, setCoachMsgs] = useState<{ role: string; content: string; planChanges?: any[] }[]>([]);
  const [coachInput, setCoachInput] = useState("");
  const [coachSending, setCoachSending] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function fetchProjectData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth");
          return;
        }
        throw new Error("Unable to load architecture plan for this project");
      }
      const data = await res.json();
      setProject(data.project || null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch project data");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnterForge() {
    if (generating || !project) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/forge-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate project code inside The Forge");
      }
      router.push(`/projects/${project.id}/forge`);
    } catch (err: any) {
      alert(`Forge Generation Error: ${err.message}`);
      setGenerating(false);
    }
  }

  const saveIdea = () => {
    if (!project) return;
    const idea = {
      projectId: project.id,
      app_name: project.app_name,
      app_description: project.app_description,
      app_type: project.app_type,
      status: project.status,
      routes: project.routes,
      features: project.features,
      databaseTables: project.databaseTables,
      savedAt: new Date().toISOString(),
    };
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("abs_saved_ideas")
          : null;
      const list = raw ? JSON.parse(raw) : [];
      const idx = Array.isArray(list)
        ? list.findIndex((x: any) => x.projectId === project.id)
        : -1;
      if (idx >= 0) list[idx] = idea;
      else list.push(idea);
      localStorage.setItem("abs_saved_ideas", JSON.stringify(list));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      show("💡 Idea saved to this browser", "success");
    } catch {
      show("⚠️ Could not save idea (storage blocked)", "error");
    }
  };

  const doCopy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 1500);
    }
  };

  const startEdit = (key: string, item: any) => {
    setEditingKey(key);
    setDraft({ ...item });
  };
  const cancelEdit = () => {
    setEditingKey(null);
    setDraft(null);
  };
  const saveEdit = async () => {
    if (!project || !editingKey || !draft) return;
    const [type, id] = editingKey.split("::");
    let updated: Project = { ...project };
    if (type === "route") {
      updated.routes = (project.routes || []).map((x) =>
        x.id === id ? { ...x, ...draft } : x
      );
    } else if (type === "feature") {
      updated.features = (project.features || []).map((x) =>
        x.id === id ? { ...x, ...draft } : x
      );
    } else if (type === "table") {
      updated.databaseTables = (project.databaseTables || []).map((x) =>
        x.id === id ? { ...x, ...draft } : x
      );
    }
    setProject(updated);
    setEditingKey(null);
    setDraft(null);
    persistLocal(updated);
    await syncServer(type, draft);
  };

  // Persist the edited blueprint to the browser (always works).
  const persistLocal = (p: Project) => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("abs_saved_ideas")
          : null;
      const list = raw ? JSON.parse(raw) : [];
      const idx = Array.isArray(list)
        ? list.findIndex((x: any) => x.projectId === p.id)
        : -1;
      const idea = {
        projectId: p.id,
        app_name: p.app_name,
        app_description: p.app_description,
        app_type: p.app_type,
        status: p.status,
        routes: p.routes,
        features: p.features,
        databaseTables: p.databaseTables,
        savedAt: new Date().toISOString(),
      };
      if (idx >= 0) list[idx] = idea;
      else list.push(idea);
      localStorage.setItem("abs_saved_ideas", JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };

  // Sync the edited item to the server using the real API endpoints.
  // Routes:   PUT /api/projects/[id]
  // Features: PUT /api/projects/[id]/features
  // Tables:   PUT /api/projects/[id]/tables
  const syncServer = async (type: string, item: any) => {
    let url = "";
    let body: any = null;
    if (type === "route") {
      url = `/api/projects/${projectId}`;
      body = {
        id: item.id,
        page_name: item.page_name,
        route_path: item.route_path,
        purpose: item.purpose,
      };
    } else if (type === "feature") {
      url = `/api/projects/${projectId}/features`;
      body = {
        id: item.id,
        feature_name: item.feature_name,
        priority: item.priority,
        complexity: item.complexity,
      };
    } else if (type === "table") {
      url = `/api/projects/${projectId}/tables`;
      body = {
        id: item.id,
        table_name: item.table_name,
        purpose: item.purpose,
        fields: item.fields_json,
      };
    }
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        show(
          `✅ ${type === "route" ? "Route" : type === "feature" ? "Feature" : "Table"} saved to project`,
          "success"
        );
        return;
      }
    } catch {
      /* fall through */
    }
    show(
      `💾 ${type === "route" ? "Route" : type === "feature" ? "Feature" : "Table"} saved locally (server sync needs setup)`,
      "info"
    );
  };

  const coachSend = async () => {
    const t = coachInput.trim();
    if (!t || coachSending) return;
    setCoachInput("");
    const history = coachMsgs.map((m) => ({ role: m.role, content: m.content }));
    setCoachMsgs((m) => [...m, { role: "user", content: t }]);
    setCoachSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/plan-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, history }),
      });
      const data = await res.json();
      setCoachMsgs((m) => [
        ...m,
        { role: "assistant", content: data.reply || "", planChanges: data.planChanges || [] },
      ]);
    } catch {
      setCoachMsgs((m) => [
        ...m,
        { role: "assistant", content: "⚠️ Coach is unavailable right now.", planChanges: [] },
      ]);
    } finally {
      setCoachSending(false);
    }
  };

  const applyChange = async (change: any) => {
    const { action, data } = change;
    let url = "";
    let method = "POST";
    let body: any = null;
    if (action === "add_route") {
      url = `/api/projects/${projectId}`;
      body = { page_name: data.page_name, route_path: data.route_path, purpose: data.purpose };
    } else if (action === "add_feature") {
      url = `/api/projects/${projectId}/features`;
      body = { feature_name: data.feature_name, priority: data.priority, complexity: data.complexity };
    } else if (action === "add_table") {
      url = `/api/projects/${projectId}/tables`;
      body = { table_name: data.table_name, purpose: data.purpose, fields: data.fields || [] };
    } else if (action === "edit_route") {
      url = `/api/projects/${projectId}`;
      method = "PUT";
      body = { id: data.id, page_name: data.page_name, route_path: data.route_path, purpose: data.purpose };
    } else if (action === "edit_feature") {
      url = `/api/projects/${projectId}/features`;
      method = "PUT";
      body = { id: data.id, feature_name: data.feature_name, priority: data.priority, complexity: data.complexity };
    } else if (action === "edit_table") {
      url = `/api/projects/${projectId}/tables`;
      method = "PUT";
      body = { id: data.id, table_name: data.table_name, purpose: data.purpose, fields: data.fields };
    } else {
      return;
    }
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        show("✅ Applied to plan", "success");
        fetchProjectData();
      } else {
        show("⚠️ Could not apply change", "error");
      }
    } catch {
      show("⚠️ Could not apply change", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-medium text-sm">Loading Lovable-grade architecture plan...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
        <div className="border border-red-500/30 bg-red-500/10 rounded-3xl p-8 max-w-md text-center">
          <h2 className="text-xl font-black text-red-300 mb-2">Error Loading Planning Stage</h2>
          <p className="text-zinc-400 text-xs mb-6">{error || "Project data unavailable."}</p>
          <Link
            href="/dashboard"
            className="rounded-xl bg-white/10 hover:bg-white/20 px-6 py-3 text-xs font-bold text-white transition"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-orange-500 selection:text-white">
      {/* Ambient Spectrum Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[850px] h-[380px] bg-gradient-to-tr from-indigo-600/15 via-orange-600/10 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1">
              <span>←</span> Dashboard
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Stage 1: Planning</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleEnterForge}
              disabled={generating}
              className="rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/20 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
            >
              {generating ? "⚡ Building Code..." : "⚡ Enter The Forge →"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Header */}
        <div className="border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-3xl p-8 mb-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Architecture Blueprint
            </div>
            <button
              onClick={saveIdea}
              className="shrink-0 rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 px-4 py-2 text-xs font-bold text-orange-300 transition"
            >
              {saved ? "✅ Idea Saved" : "💡 Save Idea"}
            </button>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">{project.app_name}</h1>
          <p className="text-zinc-400 text-sm max-w-3xl leading-relaxed mb-6">
            {project.app_description || "No description provided. This blueprint outlines your application's modular routes, features, and relational tables."}
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-mono text-zinc-400">
            <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
              Type: <span className="text-white font-bold">{project.app_type || "Custom App"}</span>
            </div>
            <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
              Routes: <span className="text-orange-400 font-bold">{project.routes?.length || 0}</span>
            </div>
            <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
              Features: <span className="text-indigo-400 font-bold">{project.features?.length || 0}</span>
            </div>
            <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
              Database Tables: <span className="text-emerald-400 font-bold">{project.databaseTables?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Modular Grid Section */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Column 1: Application Routes */}
          <div className="border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <span>🧭</span> Application Routes
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                  {project.routes?.length || 0}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                The structured Next.js App Router pages that Shang Tsung will generate inside The Forge (`app/[route]/page.tsx`).
              </p>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {project.routes && project.routes.length > 0 ? (
                  project.routes.map((r) => (
                    <RouteCard
                      key={r.id}
                      r={r}
                      isEditing={editingKey === `route::${r.id}`}
                      draft={draft}
                      setDraft={setDraft}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      onEdit={() => startEdit(`route::${r.id}`, r)}
                      onCopy={() => doCopy(`route-${r.id}`, routeText(r))}
                      copied={copiedKey === `route-${r.id}`}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs bg-black/20 rounded-2xl border border-dashed border-white/5">
                    No routes defined yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Key Features */}
          <div className="border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <span>⚡</span> Planned Features
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                  {project.features?.length || 0}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Core interactive functionalities, authentication flows, and dynamic UI modules slated for implementation.
              </p>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {project.features && project.features.length > 0 ? (
                  project.features.map((f) => (
                    <FeatureCard
                      key={f.id}
                      f={f}
                      isEditing={editingKey === `feature::${f.id}`}
                      draft={draft}
                      setDraft={setDraft}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      onEdit={() => startEdit(`feature::${f.id}`, f)}
                      onCopy={() => doCopy(`feature-${f.id}`, featureText(f))}
                      copied={copiedKey === `feature-${f.id}`}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs bg-black/20 rounded-2xl border border-dashed border-white/5">
                    No features defined yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Database Tables */}
          <div className="border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <span>🗄️</span> Database Schema
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                  {project.databaseTables?.length || 0}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Relational PostgreSQL schema models and data fields pre-configured for Prisma ORM integration.
              </p>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {project.databaseTables && project.databaseTables.length > 0 ? (
                  project.databaseTables.map((t) => (
                    <TableCard
                      key={t.id}
                      t={t}
                      isEditing={editingKey === `table::${t.id}`}
                      draft={draft}
                      setDraft={setDraft}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      onEdit={() => startEdit(`table::${t.id}`, t)}
                      onCopy={() => doCopy(`table-${t.id}`, tableText(t))}
                      copied={copiedKey === `table-${t.id}`}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs bg-black/20 rounded-2xl border border-dashed border-white/5">
                    No database schema models defined yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Call to Action Banner */}
        <div className="mt-12 rounded-3xl border border-orange-500/30 bg-gradient-to-r from-orange-950/40 via-black to-indigo-950/40 p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-2">Ready to enter The Forge?</h3>
            <p className="text-zinc-400 text-xs max-w-xl leading-relaxed">
              When you click Enter The Forge, Shang Tsung will read this architectural blueprint and instantly generate real, downloadable Next.js + Tailwind CSS code files.
            </p>
          </div>
          <button
            onClick={handleEnterForge}
            disabled={generating}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 font-bold text-white text-sm shadow-2xl shadow-orange-600/30 transition-all duration-300 whitespace-nowrap disabled:opacity-50"
          >
            {generating ? "⚡ Generating Real Code..." : "⚡ Enter The Forge Now →"}
          </button>
        </div>
      </main>

      {/* Shang Tsung Planning Coach */}
      <button
        onClick={() => setCoachOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:-translate-y-0.5 transition"
      >
        🧠 Coach
      </button>

      {coachOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCoachOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-white/10 bg-[#0b0b0f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm font-bold text-orange-300">🧠 Shang Tsung — Planning Coach</div>
              <button onClick={() => setCoachOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {coachMsgs.length === 0 && (
                <p className="text-xs text-zinc-500">Ask Shang Tsung to help you plan or design — e.g. "Add a login route and a user profile feature." He&apos;ll propose changes you can apply.</p>
              )}
              {coachMsgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-violet-600 text-white" : "border border-slate-700 bg-slate-800 text-slate-100"}`}>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.planChanges && m.planChanges.length > 0 &&
                      m.planChanges.map((c: any, ci: number) => (
                        <ApplyCard key={ci} change={c} onApply={() => applyChange(c)} />
                      ))}
                  </div>
                </div>
              ))}
              {coachSending && <div className="text-xs text-zinc-500">Shang Tsung is thinking…</div>}
            </div>
            <div className="flex items-center gap-2 border-t border-white/10 p-3">
              <input
                value={coachInput}
                onChange={(e) => setCoachInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && coachSend()}
                placeholder="Ask your planning coach…"
                className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button onClick={coachSend} disabled={coachSending} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50">Send</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
