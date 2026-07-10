"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Field {
  key: string;
  label: string;
  placeholder: string;
}

interface EditableSectionProps {
  title: string;
  items: any[];
  entity: string;
  projectId: string;
  fields: Field[];
  nameField: string;
  subField?: string;
  accent?: "blue" | "emerald" | "white";
}

const accentMap: Record<string, string> = {
  blue: "text-blue-400",
  emerald: "text-emerald-400",
  white: "text-white",
};

export default function EditableSection({
  title,
  items: initialItems,
  entity,
  projectId,
  fields,
  nameField,
  subField,
  accent = "white",
}: EditableSectionProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newData, setNewData] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const accentClass = accentMap[accent] || "text-white";

  async function callApi(action: string, payloadData?: any, itemId?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/projects/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action,
          entity,
          data: payloadData,
          id: itemId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Request failed");
      }

      return result;
    } catch (err: any) {
      alert(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    const result = await callApi("create", newData);
    if (result?.item) {
      setItems([...items, result.item]);
      setNewData({});
      setIsAdding(false);
      router.refresh();
    }
  }

  async function handleSave(itemId: string) {
    const result = await callApi("update", editData, itemId);
    if (result?.item) {
      setItems(items.map((item) => (item.id === itemId ? result.item : item)));
      setEditingId(null);
      setEditData({});
      router.refresh();
    }
  }

  async function handleDelete(itemId: string) {
    const confirmed = window.confirm("Are you sure you want to delete this?");
    if (!confirmed) return;

    const result = await callApi("delete", null, itemId);
    if (result?.success) {
      setItems(items.filter((item) => item.id !== itemId));
      router.refresh();
    }
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    const data: Record<string, string> = {};
    fields.forEach((f) => {
      data[f.key] = item[f.key] || "";
    });
    setEditData(data);
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      <div className="grid gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-slate-950 p-4 rounded-xl border border-slate-800"
          >
            {editingId === item.id ? (
              <div className="space-y-3">
                {fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-slate-400 mb-1">
                      {f.label}
                    </label>
                    <input
                      value={editData[f.key] || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, [f.key]: e.target.value })
                      }
                      placeholder={f.placeholder}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleSave(item.id)}
                    disabled={busy}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditData({});
                    }}
                    className="px-4 py-1.5 rounded-lg border border-slate-700 text-sm hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-bold ${accentClass}`}>
                    {item[nameField] || "Untitled"}
                  </p>

                  {subField && (
                    <p className="text-xs text-slate-500 mt-1">
                      {item[subField]}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 shrink-0 ml-4">
                  <button
                    onClick={() => startEdit(item)}
                    className="text-slate-400 hover:text-orange-400 text-sm transition"
                    title="Edit"
                  >
                    ✎
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-400 hover:text-red-400 text-sm transition"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-dashed border-slate-700 space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-slate-400 mb-1">
                {f.label}
              </label>
              <input
                value={newData[f.key] || ""}
                onChange={(e) =>
                  setNewData({ ...newData, [f.key]: e.target.value })
                }
                placeholder={f.placeholder}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={busy}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? "Adding..." : "Add"}
            </button>

            <button
              onClick={() => {
                setIsAdding(false);
                setNewData({});
              }}
              className="px-4 py-1.5 rounded-lg border border-slate-700 text-sm hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-4 w-full py-3 rounded-xl border border-dashed border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition"
        >
          + Add New
        </button>
      )}
    </section>
  );
}