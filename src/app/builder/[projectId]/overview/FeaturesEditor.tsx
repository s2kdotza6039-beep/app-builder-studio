"use client";

import { useState } from "react";

interface Feature {
  id: string;
  feature_name: string;
  priority: string;
  complexity: string;
}

export default function FeaturesEditor({
  projectId,
  initialFeatures,
}: {
  projectId: string;
  initialFeatures: Feature[];
}) {
  const [features, setFeatures] = useState<Feature[]>(
    (initialFeatures || []).filter((f): f is Feature => f != null && !!f.id)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ feature_name: "", priority: "Should Have", complexity: "Medium" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ feature_name: "", priority: "Should Have", complexity: "Medium" });
  const [message, setMessage] = useState("");

  const showMessage = (text: string, isError = false) => {
    setMessage(isError ? "❌ " + text : "✅ " + text);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleEdit = (feature: Feature) => {
    setEditingId(feature.id);
    setEditForm({
      feature_name: feature.feature_name || "",
      priority: feature.priority || "Should Have",
      complexity: feature.complexity || "Medium",
    });
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/features`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.feature) {
          setFeatures(features.map((f) => (f.id === editingId ? data.feature : f)));
        }
        setEditingId(null);
        showMessage("Feature updated");
      } else {
        showMessage("Failed to update feature", true);
      }
    } catch (err: any) {
      showMessage("Error: " + err.message, true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this feature?")) return;

    const res = await fetch(`/api/projects/${projectId}/features`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setFeatures(features.filter((f) => f.id !== id));
      showMessage("Feature deleted");
    }
  };

  const handleAdd = async () => {
    if (!addForm.feature_name.trim()) {
      showMessage("Please enter a feature name", true);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.feature && data.feature.id) {
          setFeatures([...features, data.feature]);
        }
        setAddForm({ feature_name: "", priority: "Should Have", complexity: "Medium" });
        setShowAddForm(false);
        showMessage("Feature added");
      } else {
        showMessage("Failed to add feature", true);
      }
    } catch (err: any) {
      showMessage("Error: " + err.message, true);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Core Features</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm text-orange-400 hover:text-orange-300"
        >
          + Add Feature
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
            placeholder="Feature Name"
            value={addForm.feature_name}
            onChange={(e) => setAddForm({ ...addForm, feature_name: e.target.value })}
            className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-2 mb-2">
            <select
              value={addForm.priority}
              onChange={(e) => setAddForm({ ...addForm, priority: e.target.value })}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            >
              <option>Must Have</option>
              <option>Should Have</option>
              <option>Future</option>
            </select>
            <select
              value={addForm.complexity}
              onChange={(e) => setAddForm({ ...addForm, complexity: e.target.value })}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 rounded text-sm">Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-700 rounded text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {features.map((feature) => (
          <div key={feature.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            {editingId === feature.id ? (
              <div>
                <input
                  type="text"
                  value={editForm.feature_name}
                  onChange={(e) => setEditForm({ ...editForm, feature_name: e.target.value })}
                  className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                />
                <div className="flex gap-2 mb-2">
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                  >
                    <option>Must Have</option>
                    <option>Should Have</option>
                    <option>Future</option>
                  </select>
                  <select
                    value={editForm.complexity}
                    onChange={(e) => setEditForm({ ...editForm, complexity: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="px-3 py-1 bg-emerald-600 rounded text-xs">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-slate-700 rounded text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-white font-medium">{feature.feature_name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {feature.priority} • {feature.complexity}
                </p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleEdit(feature)} className="text-xs text-blue-400">Edit</button>
                  <button onClick={() => handleDelete(feature.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}