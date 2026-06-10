if (typeof global === "undefined") {
  (window as any).global = window;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Search, BookOpen, Plus, Tag, User, FileText, X, Edit2, Trash2 } from "lucide-react";
import { kbApi, KBArticle } from "@/lib/kb-api";

export const Route = createFileRoute("/_authenticated/knowledge-base")({
  component: KnowledgeBasePage,
});

function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  
  // Modal toggle states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form input hooks for Creation
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newContent, setNewContent] = useState("");
  
  // Form input hooks for Editing
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("General");
  const [editContent, setEditContent] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // ✅ 1. GUARANTEES ALL DATA IS VISIBLE IMMEDIATELY WHEN BROWSING TO SECTION
  useEffect(() => {
    fetchInitialArticles();
  }, []);

  async function fetchInitialArticles() {
    try {
      const data = await kbApi.getAllArticles();
      const resolvedList = Array.isArray(data) ? data : [];
      setArticles(resolvedList);
      
      // Keep selected article in sync if it still exists
      if (selectedArticle) {
        const updated = resolvedList.find(a => a.id === selectedArticle.id);
        setSelectedArticle(updated || null);
      }
    } catch (err) {
      console.error("Failed syncing documentation catalog indices: ", err);
    }
  }

  // Live client-side structural query search matcher matching titles, tags, and text content
  const searchedArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    return articles.filter(art => 
      art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articles, searchQuery]);

  // CREATE ACTION HANDLER
  async function handleCreateArticle(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      setIsSaving(true);
      const payload: KBArticle = {
        title: newTitle.trim(),
        category: newCategory.trim(),
        content: newContent.trim()
      };
      
      await kbApi.createArticle(payload);
      setNewTitle("");
      setNewContent("");
      setNewCategory("General");
      setIsNewModalOpen(false);
      await fetchInitialArticles(); // Pull fresh server baseline state
    } catch (err) {
      console.error("Documentation publication pipeline failure:", err);
    } finally {
      setIsSaving(false);
    }
  }

  // ✅ 2. UPDATE OPERATIONS HANDLER
  function openEditModal() {
    if (!selectedArticle) return;
    setEditTitle(selectedArticle.title || "");
    setEditCategory(selectedArticle.category || "General");
    setEditContent(selectedArticle.content || "");
    setIsEditModalOpen(true);
  }

  async function handleUpdateArticle(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedArticle?.id || !editTitle.trim() || !editContent.trim()) return;

    try {
      setIsSaving(true);
      // Constructing object mapping configuration inline matching your update REST contract parameters
      const updatedPayload = {
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory
      };

      // Match against your dynamic backend mapping string interpolation routes wrapper layer
      const host = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
      const response = await fetch(`${host}/articles/${selectedArticle.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        },
        body: JSON.stringify(updatedPayload)
      });

      if (response.ok) {
        setIsEditModalOpen(false);
        await fetchInitialArticles();
      } else {
        alert("Failed to save asset parameter update changes.");
      }
    } catch (err) {
      console.error("Critical update channel exception trace: ", err);
    } finally {
      setIsSaving(false);
    }
  }

  // ✅ 3. DELETE CHANNEL OPERATIONAL ACTION HANDLER
  async function handleDeleteArticle() {
    if (!selectedArticle?.id) return;
    if (!window.confirm(`Are you absolutely sure you want to permanently delete "${selectedArticle.title}"?`)) return;

    try {
      const host = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
      const response = await fetch(`${host}/articles/${selectedArticle.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      });

      if (response.ok) {
        setSelectedArticle(null); // Clear viewing viewport cleanly
        await fetchInitialArticles();
      } else {
        alert("Authorization exception validation check failure during deletion.");
      }
    } catch (err) {
      console.error("Data drop pipeline crash: ", err);
    }
  }

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden font-sans">
      
      {/* MASTER SIDEBAR LIST VIEW PANEL */}
      <div className="w-[380px] bg-white border-r border-gray-200 flex flex-col shrink-0 z-10">
        <div className="p-5 border-b border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <BookOpen className="text-blue-600" size={24} /> Knowledge Base
            </h1>
            <button 
              onClick={() => setIsNewModalOpen(true)}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm flex items-center justify-center"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-500 focus-within:bg-white transition-all">
            <Search size={16} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full bg-transparent text-sm font-medium outline-none text-gray-800"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 bg-slate-50/40">
          {searchedArticles.length === 0 ? (
            <div className="p-8 text-center text-xs font-medium text-gray-400 italic">
              No entries found. Press the "+" button above to add some notes!
            </div>
          ) : (
            searchedArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className={`w-full px-5 py-4 flex flex-col text-left transition-all border-l-4 ${
                  selectedArticle?.id === article.id 
                    ? "bg-blue-50/60 border-blue-600" 
                    : "border-transparent bg-white hover:bg-gray-50/80"
                }`}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    {article.category}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400 flex items-center gap-0.5 truncate max-w-[50%]">
                    <User size={10} /> {article.createdBy || "System"}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-800 mt-2 line-clamp-1">{article.title}</h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{article.content}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* DETAIL WORKSPACE PREVIEW VIEWPORT AREA */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        {!selectedArticle ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 font-medium gap-3 bg-gray-50/50">
            <FileText size={48} className="text-gray-300" />
            <span className="text-sm">Select an article out of the index pane directory list to inspect file parameters</span>
          </div>
        ) : (
          <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
            <div className="flex items-start justify-between border-b border-gray-100 pb-5 gap-4">
              <div className="space-y-2">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1.5">
                  <Tag size={12} /> {selectedArticle.category}
                </span>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{selectedArticle.title}</h1>
                <div className="text-xs font-medium text-gray-400 flex items-center gap-2">
                  <span>Authored by: <strong className="text-gray-600">{selectedArticle.createdBy || "System Agent"}</strong></span>
                </div>
              </div>

              {/* ✅ CRUD INTERACTION ACTION BAR */}
              <div className="flex items-center gap-2 shrink-0 pt-2">
                <button 
                  onClick={openEditModal}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                >
                  <Edit2 size={14} /> Update
                </button>
                <button 
                  onClick={handleDeleteArticle}
                  className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>

            <div className="text-sm font-medium leading-relaxed text-gray-700 whitespace-pre-wrap font-sans bg-slate-50 border border-slate-100 p-6 rounded-2xl">
              {selectedArticle.content}
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL OVERLAY PORTAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Add Information Entry</h2>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateArticle} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Document Summary Title</label>
                <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., MySQL Timeout Fix" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none font-medium text-gray-800" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Operational Category</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white font-semibold text-gray-700">
                  <option value="General">General Inquiries</option>
                  <option value="Database">Database Services</option>
                  <option value="Network">Network Protocols</option>
                  <option value="Authentication">Authentication / Access Control</option>
                  <option value="Server-Error">Server Infrastructure Layouts</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Troubleshooting Note Logs</label>
                <textarea required rows={5} value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Write technical brief notes..." className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none font-medium text-gray-800 resize-none" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-300 font-bold text-sm text-gray-500">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-xl bg-blue-600 font-bold text-sm text-white shadow-md">{isSaving ? "Saving..." : "Publish Article"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE MODAL OVERLAY PORTAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Update Technical Article</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateArticle} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Document Summary Title</label>
                <input type="text" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none font-medium text-gray-800" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Operational Category</label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white font-semibold text-gray-700">
                  <option value="General">General Inquiries</option>
                  <option value="Database">Database Services</option>
                  <option value="Network">Network Protocols</option>
                  <option value="Authentication">Authentication / Access Control</option>
                  <option value="Server-Error">Server Infrastructure Layouts</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Troubleshooting Note Logs</label>
                <textarea required rows={5} value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none font-medium text-gray-800 resize-none" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-300 font-bold text-sm text-gray-500">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-xl bg-blue-600 font-bold text-sm text-white shadow-md">{isSaving ? "Updating..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}