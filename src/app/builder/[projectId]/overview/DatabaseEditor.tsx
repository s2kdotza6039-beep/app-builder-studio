"use client";

import { useState } from "react";

interface DbTable {
  id: string;
  table_name: string;
  purpose: string;
  fields_json: any;
}

export default function DatabaseEditor({
  projectId,
  initialTables,
}: {
  projectId: string;
  initialTables: DbTable[];
}) {
  const [tables, setTables] = useState<DbTable[]>(
    (initialTables || []).filter((t): t is DbTable => t != null && !!t.id)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ table_name: "", purpose: "", fields: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ table_name: "", purpose: "", fields: "" });
  const [message, setMessage] = useState("");

  const showMessage = (text: string, isError = false) => {
    setMessage(isError ? "❌ " + text : "✅ " + text);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleEdit = (table: DbTable) => {
    setEditingId(table.id);
    const fieldsStr = Array.isArray(table.fields_json)
      ? table.fields_json.map((f: any) => f.name || "").join(", ")
      : "";
    setEditForm({ table_name: table.table_name || "", purpose: table.purpose || "", fields: fieldsStr });
  };

  const handleSave = async () => {
    const fieldsArray = editForm.fields
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean)
      .map((name) => ({ name, type: "String" }));

    try {
      const res = await fetch(`/api/projects/${projectId}/database`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, table_name: editForm.table_name, purpose: editForm.purpose, fields: fieldsArray }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.table) {
          setTables(tables.map((t) => (t.id === editingId ? data.table : t)));
        }
        setEditingId(null);
        showMessage("Table updated");
      } else {
        showMessage("Failed to update table", true);
      }
    } catch (err: any) {
      showMessage("Error: " + err.message, true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this table?")) return;

    const res = await fetch(`/api/projects/${projectId}/database`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setTables(tables.filter((t) => t.id !== id));
      showMessage("Table deleted");
    }
  };

  const handleAdd = async () => {
    if (!addForm.table_name.trim()) {
      showMessage("Please enter a table name", true);
      return;
    }

    const fieldsArray = addForm.fields
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean)
      .map((name) => ({ name, type: "String" }));

    try {
      const res = await fetch(`/api/projects/${projectId}/database`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_name: addForm.table_name, purpose: addForm.purpose, fields: fieldsArray }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.table && data.table.id) {
          setTables([...tables, data.table]);
        }
        setAddForm({ table_name: "", purpose: "", fields: "" });
        setShowAddForm(false);
        showMessage("Table added");
      } else {
        showMessage("Failed to add table", true);
      }
    } catch (err: any) {
      showMessage("Error: " + err.message, true);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Database Structure</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm text-orange-400 hover:text-orange-300"
        >
          + Add Table
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
            placeholder="Table Name (e.g., users)"
            value={addForm.table_name}
            onChange={(e) => setAddForm({ ...addForm, table_name: e.target.value })}
            className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Purpose (e.g., Stores user accounts)"
            value={addForm.purpose}
            onChange={(e) => setAddForm({ ...addForm, purpose: e.target.value })}
            className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Fields (comma separated: id, email, name)"
            value={addForm.fields}
            onChange={(e) => setAddForm({ ...addForm, fields: e.target.value })}
            className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 rounded text-sm">Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-700 rounded text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {tables.map((table) => (
          <div key={table.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            {editingId === table.id ? (
              <div>
                <input
                  type="text"
                  value={editForm.table_name}
                  onChange={(e) => setEditForm({ ...editForm, table_name: e.target.value })}
                  className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={editForm.purpose}
                  onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                  className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={editForm.fields}
                  onChange={(e) => setEditForm({ ...editForm, fields: e.target.value })}
                  className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} className="px-3 py-1 bg-emerald-600 rounded text-xs">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-slate-700 rounded text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-bold text-emerald-400 font-mono">{table.table_name}</p>
                <p className="text-xs text-slate-500 mt-1">{table.purpose}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Array.isArray(table.fields_json) &&
                    table.fields_json.map((f: any, i: number) => (
                      <span key={i} className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {f.name}
                      </span>
                    ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleEdit(table)} className="text-xs text-blue-400">Edit</button>
                  <button onClick={() => handleDelete(table.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}