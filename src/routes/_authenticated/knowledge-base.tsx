if (typeof global === "undefined") {
  (window as any).global = window;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Search, BookOpen, Plus, Tag, User, FileText, X, Edit2, Trash2, Calendar, RefreshCcw, AlertTriangle } from "lucide-react";
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
  // ✅ FIXED: Staged confirmation toggle variable prevents native browser prompt alerts entirely
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Form input hooks for Creation
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newContent, setNewContent] = useState("");
  
  // Form input hooks for Editing
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("General");
  const [editContent, setEditContent] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // GUARANTEES ALL DATA IS VISIBLE IMMEDIATELY WHEN BROWSING TO SECTION
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

  // UPDATE OPERATIONS HANDLER
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
      const updatedPayload: KBArticle = {
        id: selectedArticle.id,
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory
      };

      if (kbApi.updateArticle) {
        await kbApi.updateArticle(selectedArticle.id, updatedPayload);
        setIsEditModalOpen(false);
        await fetchInitialArticles();
      } else {
        const host = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
        const targetPath = `${host}/articles/${selectedArticle.id}`; 
        const response = await fetch(targetPath, {
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
          alert("Failed to save asset parameter update changes. Verify backend API route structure mapping handles.");
        }
      }
    } catch (err) {
      console.error("Critical update channel exception trace: ", err);
      alert("An error occurred while transmitting structural schema changes.");
    } finally {
      setIsSaving(false);
    }
  }

  // ✅ DESTRUCTION CORE OPERATIONAL HANDLER: Fully stateless backend invocation passthrough
  async function confirmAndExecuteDeletion() {
    if (!selectedArticle?.id) return;

    try {
      setIsSaving(true);
      if (kbApi.deleteArticle) {
        await kbApi.deleteArticle(selectedArticle.id);
        setSelectedArticle(null);
        setIsDeleteConfirmOpen(false); // Close application modal container
        await fetchInitialArticles();
      } else {
        const host = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
        const targetPath = `${host}/articles/${selectedArticle.id}`;
        const response = await fetch(targetPath, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
          }
        });

        if (response.ok) {
          setSelectedArticle(null); 
          setIsDeleteConfirmOpen(false);
          await fetchInitialArticles();
        } else {
          alert("Authorization exception validation check failure during deletion.");
        }
      }
    } catch (err) {
      console.error("Data drop pipeline crash: ", err);
      alert("A system network error occurred while executing data drop requests.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 flex overflow-hidden font-sans antialiased text-gray-800 rounded-xl border border-gray-200/80 shadow-sm">
      
      {/* MASTER SIDEBAR LIST VIEW PANEL */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-1.5">
              <BookOpen className="text-blue-600" size={18} /> Knowledge Base
            </h1>
            <button 
              onClick={() => setIsNewModalOpen(true)}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm flex items-center justify-center focus:outline-none"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-blue-500 focus-within:bg-white transition-all h-8">
            <Search size={14} className="text-gray-400 mr-1.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation catalog..."
              className="w-full bg-transparent text-xs font-semibold outline-none text-gray-800 placeholder-gray-400"
            />
          </div>
        </div>

        {/* HIGH-DENSITY SIDEBAR ROW ITEMS */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 bg-white">
          {searchedArticles.length === 0 ? (
            <div className="p-6 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-relaxed bg-gray-50/20">
              No entries located.
            </div>
          ) : (
            searchedArticles.map((article) => {
              const isSelected = selectedArticle?.id === article.id;
              return (
                <button
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className={`w-full px-4 py-3 flex flex-col text-left transition-all border-l-2 relative overflow-hidden ${
                    isSelected 
                      ? "bg-blue-50/40 border-blue-600 shadow-inner" 
                      : "border-transparent hover:bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide uppercase border ${
                      isSelected ? "bg-white/50 border-blue-200 text-blue-700" : "bg-gray-100 border-gray-200 text-gray-600"
                    }`}>
                      {article.category}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-0.5 truncate max-w-[50%] capitalize">
                      <User size={10} className="text-gray-300" /> {article.createdBy || "System"}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-gray-900 mt-2 line-clamp-1">{article.title}</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-normal font-medium">{article.content}</p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* DETAIL WORKSPACE PREVIEW VIEWPORT AREA */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
        {!selectedArticle ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 font-bold uppercase tracking-wider text-[10px] gap-1 select-none">
            <FileText size={22} className="text-gray-300" />
            <span>Select an article to review parameter values</span>
          </div>
        ) : (
          <div className="p-6 max-w-4xl w-full mx-auto space-y-4">
            
            {/* RICH DETAIL HEADER BOARD */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0 flex-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black tracking-wide uppercase inline-flex items-center gap-1 shrink-0">
                  <Tag size={10} /> {selectedArticle.category}
                </span>
                <h1 className="text-lg font-extrabold text-gray-900 tracking-tight leading-snug">{selectedArticle.title}</h1>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-gray-400 font-semibold border-t border-gray-50 mt-2">
                  <div className="flex items-center gap-1 capitalize">
                    <User size={12} className="text-gray-300" />
                    <span>Created by: <strong className="text-gray-700">{selectedArticle.createdBy || "System"}</strong></span>
                  </div>
                  {(selectedArticle.updatedBy || selectedArticle.updatedAt) && (
                    <div className="flex items-center gap-1 border-l border-gray-200 pl-4 capitalize">
                      <RefreshCcw size={11} className="text-gray-300" />
                      <span>Updated by: <strong className="text-gray-700">{selectedArticle.updatedBy || selectedArticle.createdBy || "Agent"}</strong></span>
                      {selectedArticle.updatedAt && (
                        <span className="text-gray-400 font-medium lowercase">
                          ({new Date(selectedArticle.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* CRUD CONTROL INTERACTIONS HUB BUTTONS */}
              <div className="flex items-center gap-1.5 shrink-0 sm:pt-1">
                <button 
                  onClick={openEditModal}
                  className="h-7 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold px-2.5 rounded-md text-[10px] shadow-sm transition-all flex items-center gap-1 focus:outline-none uppercase tracking-wider"
                >
                  <Edit2 size={11} /> Update
                </button>
                <button 
                  // ✅ FIXED: Toggles safe application-level state modal tracker flag instantly
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="h-7 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-bold px-2.5 rounded-md text-[10px] shadow-sm transition-all flex items-center gap-1 focus:outline-none uppercase tracking-wider"
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>

            {/* TEXT MARKUP CONTEXT VIEW PANEL */}
            <div className="text-xs font-semibold leading-relaxed text-gray-700 whitespace-pre-wrap font-sans bg-white border border-gray-200/80 p-5 rounded-xl shadow-sm shadow-gray-50/50">
              {selectedArticle.content}
            </div>
          </div>
        )}
      </div>

      {/* ✅ ADDED: CUSTOM APPLICATION-LEVEL DELETION CONFIRMATION DIALOG MODAL PROMPT */}
      {isDeleteConfirmOpen && selectedArticle && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-100">
            <div className="p-4 flex flex-col items-center text-center space-y-3 bg-white border-b border-gray-50">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100">
                <AlertTriangle size={22} className="animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Confirm Resource Deletion</h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed px-4">
                  Are you absolutely sure you want to permanently remove <strong className="text-gray-900 font-bold">"{selectedArticle.title}"</strong> from the central knowledge engine repository?
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2 shrink-0 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setIsDeleteConfirmOpen(false)} 
                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 border border-gray-200 bg-white rounded-lg transition-all focus:outline-none"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={isSaving}
                onClick={confirmAndExecuteDeletion} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow-sm transition-all focus:outline-none uppercase tracking-wider"
              >
                {isSaving ? "Dropping..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL OVERLAY PORTAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Add Knowledge Asset Node</h2>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-gray-600 focus:outline-none"><X size={15} /></button>
            </div>
            <form onSubmit={handleCreateArticle} className="p-4 space-y-3.5 bg-white">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Document Summary Title</label>
                <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., MySQL Timeout Fix" className="w-full border border-gray-300 rounded-lg bg-gray-50/50 px-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all h-8 shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Operational Category</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2.5 py-1 bg-white outline-none focus:border-blue-500 h-8 text-xs font-semibold text-gray-600">
                  <option value="General">General Inquiries</option>
                  <option value="Database">Database Services</option>
                  <option value="Network">Network Protocols</option>
                  <option value="Authentication">Authentication / Access Control</option>
                  <option value="Server-Error">Server Infrastructure Layouts</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Troubleshooting Note Logs</label>
                <textarea required rows={5} value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Write technical baseline instructions summary details here directly..." className="w-full border border-gray-300 rounded-lg bg-gray-50/50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium text-gray-800 resize-none leading-relaxed shadow-inner" />
              </div>
              <div className="pt-2 flex justify-end gap-2 shrink-0">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-lg transition-all border border-gray-200 bg-white focus:outline-none">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow-sm transition-all focus:outline-none">{isSaving ? "Publishing..." : "Publish Article"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE MODAL OVERLAY PORTAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Update Technical Article</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 focus:outline-none"><X size={15} /></button>
            </div>
            <form onSubmit={handleUpdateArticle} className="p-4 space-y-3.5 bg-white">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Document Summary Title</label>
                <input type="text" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg bg-gray-50/50 px-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all h-8 shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Operational Category</label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2.5 py-1 bg-white outline-none focus:border-blue-500 h-8 text-xs font-semibold text-gray-600">
                  <option value="General">General Inquiries</option>
                  <option value="Database">Database Services</option>
                  <option value="Network">Network Protocols</option>
                  <option value="Authentication">Authentication / Access Control</option>
                  <option value="Server-Error">Server Infrastructure Layouts</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Troubleshooting Note Logs</label>
                <textarea required rows={5} value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full border border-gray-300 rounded-lg bg-gray-50/50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium text-gray-800 resize-none leading-relaxed shadow-inner" />
              </div>
              <div className="pt-2 flex justify-end gap-2 shrink-0">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-lg transition-all border border-gray-200 bg-white focus:outline-none">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow-sm transition-all focus:outline-none">{isSaving ? "Updating..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}