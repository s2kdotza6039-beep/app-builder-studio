"use client";

import { useState } from "react";

interface Route {
  id: string;
  page_name: string;
  route_path: string;
  purpose: string;
}

export default function RoutesEditor({
  projectId,
  initialRoutes,
}: {
  projectId: string;
  initialRoutes: Route[];
}) {
  const [routes, setRoutes] = useState(initialRoutes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ page_name: "", route_path: "", purpose: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ page_name: "", route_path: "", purpose: "" });
  const [message, setMessage] = useState("");

  const showMessage = (text: string, isError = false) => {
    setMessage(isError ? "❌ " + text : "✅ " + text);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleEdit = (route: Route) => {
    setEditingId(route.id);
    setEditForm({ page_name: route.page_name, route_path: route.route_path, purpose: route.purpose || "" });
  };

  const handleSave = async () => {
    const res = await fetch(`/api/projects/${projectId}/routes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm }),
    });

    if (res.ok) {
      const data = await res.json();
      setRoutes(routes.map((r) => (r.id === editingId ? data.route : r)));
      setEditingId(null);
      showMessage("Route updated successfully");
    } else {
      showMessage("Failed to update route", true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this route?")) return;

    const res = await fetch(`/api/projects/${projectId}/routes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setRoutes(routes.filter((r) => r.id !== id));
      showMessage("Route deleted");
    } else {
      showMessage("Failed to delete route", true);
    }
  };

  const handleAdd = async () => {
    const res = await fetch(`/api/projects/${projectId}/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });

    if (res.ok) {
      const data = await res.json();
      setRoutes([...routes, data.route]);
      setAddForm({ page_name: "", route_path: "", purpose: "" });
      setShowAddForm(false);
      showMessage("Route added successfully");
    } else {
      showMessage("Failed to add route", true);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Proposed Pages (Routes)</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm text-orange-400 hover:text-orange-300"
        >
          + Add Route
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-xl text-sm ${message.startsWith("✅") ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
          {message}
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 p-4 bg-slate-950 rounded-xl border border-slate-700">
          <input
            type="text"
            placeholder="Page Name"
            value={addForm.page_name}
            onChange={(e) => setAddForm({ ...addForm, page_name: e.target.value })}
            className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="/route-path"
            value={addForm.route_path}
            onChange={(e) => setAddForm({ ...addForm, route_path: e.target.value })}
            className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Purpose"
            value={addForm.purpose}
            onChange={(e) => setAddForm({ ...addForm, purpose: e.target.value })}
            className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 rounded text-sm">Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-700 rounded text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {routes.map((route) => (
          <div key={route.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            {editingId === route.id ? (
              <div>
                <input
                  type="text"
                  value={editForm.page_name}
                  onChange={(e) => setEditForm({ ...editForm, page_name: e.target.value })}
                  className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={editForm.route_path}
                  onChange={(e) => setEditForm({ ...editForm, route_path: e.target.value })}
                  className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={editForm.purpose}
                  onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                  className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} className="px-3 py-1 bg-emerald-600 rounded text-xs">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-slate-700 rounded text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-bold">{route.page_name}</p>
                <p className="text-xs text-slate-500">{route.route_path}</p>
                <p className="text-xs text-slate-400 mt-1">{route.purpose}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleEdit(route)} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                  <button onClick={() => handleDelete(route.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}