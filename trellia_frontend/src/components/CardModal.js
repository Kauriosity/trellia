"use client";
import { useState, useEffect, useRef } from "react";
import {
  X, AlignLeft, Calendar, Tag, CheckSquare, Trash2, Users,
  Paperclip, MessageSquare, Activity, Image, ChevronDown
} from "lucide-react";
import api from "@/lib/api";

// Helper: get initial card state with defaults
function initCard(card) {
  return {
    ...card,
    labels: card.labels || [],
    members: card.members || [],
    checklists: card.checklists || [],
    comments: card.comments || [],
    attachments: card.attachments || [],
  };
}

export default function CardModal({ card: initialCard, onClose, fetchBoard }) {
  const [card, setCard] = useState(initCard(initialCard));
  const [title, setTitle] = useState(initialCard.title || "");
  const [description, setDescription] = useState(initialCard.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const [allLabels, setAllLabels] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showLabelsMenu, setShowLabelsMenu] = useState(false);
  const [showMembersMenu, setShowMembersMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [activities, setActivities] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newAttachUrl, setNewAttachUrl] = useState("");
  const [newAttachName, setNewAttachName] = useState("");
  const [showAttachForm, setShowAttachForm] = useState(false);
  const [attachTab, setAttachTab] = useState("url"); // "url" | "file"
  const [uploadingCover, setUploadingCover] = useState(false);
  const [activeSection, setActiveSection] = useState("details"); // details | activity
  const sidebarRef = useRef(null);
  const coverFileRef = useRef(null);

  // Cover color presets
  const COVER_COLORS = ["#0079bf", "#d29034", "#519839", "#b04632", "#89609e", "#cd5a91", "#4bbf6b", "#00aecc", "#838c91"];

  useEffect(() => {
    fetchLabels();
    fetchUsers();
    fetchActivity();
  }, []);

  // Sync if card prop changes (parent re-renders)
  useEffect(() => {
    setCard(initCard(initialCard));
  }, [initialCard.updatedAt]);

  const fetchLabels = async () => {
    try {
      const res = await api.get("/labels");
      setAllLabels(res.data);
    } catch (_) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setAllUsers(res.data);
    } catch (_) {}
  };

  const fetchActivity = async () => {
    try {
      const res = await api.get(`/activity/card/${initialCard.id}`);
      setActivities(res.data);
    } catch (_) {}
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Title ────────────────────────────────────────────────
  const saveTitle = async () => {
    if (!title.trim() || title === card.title) return;
    try {
      const res = await api.put(`/cards/${card.id}`, { title });
      setCard(prev => ({ ...prev, title: res.data.title }));
      fetchBoard();
    } catch (err) { console.error(err); }
  };

  // ── Description ──────────────────────────────────────────
  const saveDescription = async () => {
    try {
      await api.put(`/cards/${card.id}`, { description });
      setCard(prev => ({ ...prev, description }));
      setIsEditingDesc(false);
      fetchBoard();
    } catch (err) { console.error(err); }
  };

  // ── Delete Card ──────────────────────────────────────────
  const deleteCard = async () => {
    if (!confirm("Delete this card?")) return;
    try {
      await api.delete(`/cards/${card.id}`);
      fetchBoard();
      onClose();
    } catch (err) { console.error(err); }
  };

  // ── Labels ───────────────────────────────────────────────
  const toggleLabel = async (labelId) => {
    const currentIds = card.labels.map(l => l.id);
    const newIds = currentIds.includes(labelId)
      ? currentIds.filter(id => id !== labelId)
      : [...currentIds, labelId];
    const newLabels = allLabels.filter(l => newIds.includes(l.id));
    // Optimistic update
    setCard(prev => ({ ...prev, labels: newLabels }));
    try {
      await api.put(`/cards/${card.id}`, { labelIds: newIds });
      fetchBoard();
    } catch (err) {
      console.error(err);
      setCard(prev => ({ ...prev, labels: card.labels })); // revert
    }
  };

  // ── Members ──────────────────────────────────────────────
  const toggleMember = async (userId) => {
    const currentIds = card.members.map(m => m.id);
    const newIds = currentIds.includes(userId)
      ? currentIds.filter(id => id !== userId)
      : [...currentIds, userId];
    const newMembers = allUsers.filter(u => newIds.includes(u.id));
    // Optimistic update
    setCard(prev => ({ ...prev, members: newMembers }));
    try {
      await api.put(`/cards/${card.id}`, { memberIds: newIds });
      fetchBoard();
    } catch (err) {
      console.error(err);
      setCard(prev => ({ ...prev, members: card.members })); // revert
    }
  };

  // ── Due Date ─────────────────────────────────────────────
  const handleSetDueDate = async (e) => {
    e.preventDefault();
    const date = new FormData(e.target).get("dueDate");
    if (!date) return;
    const iso = new Date(date).toISOString();
    // Optimistic
    setCard(prev => ({ ...prev, dueDate: iso }));
    setShowDateMenu(false);
    try {
      await api.put(`/cards/${card.id}`, { dueDate: iso });
      fetchBoard();
    } catch (err) {
      console.error(err);
      setCard(prev => ({ ...prev, dueDate: card.dueDate }));
    }
  };

  const removeDueDate = async () => {
    setCard(prev => ({ ...prev, dueDate: null }));
    try {
      await api.put(`/cards/${card.id}`, { dueDate: null });
      fetchBoard();
    } catch (err) { console.error(err); }
  };

  // ── Cover ────────────────────────────────────────────────
  const setCoverColor = async (color) => {
    setCard(prev => ({ ...prev, coverColor: color, coverUrl: null }));
    setShowCoverMenu(false);
    try {
      await api.put(`/cards/${card.id}`, { coverColor: color, coverUrl: null });
      fetchBoard();
    } catch (err) { console.error(err); }
  };

  const removeCover = async () => {
    setCard(prev => ({ ...prev, coverColor: null, coverUrl: null }));
    setShowCoverMenu(false);
    try {
      await api.put(`/cards/${card.id}`, { coverColor: null, coverUrl: null });
      fetchBoard();
    } catch (err) { console.error(err); }
  };

  // ── Checklists ───────────────────────────────────────────
  const addChecklist = async () => {
    try {
      const res = await api.post("/checklists", { title: "Checklist", cardId: card.id });
      const newChecklist = { ...res.data, items: [] };
      setCard(prev => ({ ...prev, checklists: [...prev.checklists, newChecklist] }));
    } catch (err) { console.error(err); }
  };

  const deleteChecklist = async (checklistId) => {
    setCard(prev => ({ ...prev, checklists: prev.checklists.filter(c => c.id !== checklistId) }));
    try {
      await api.delete(`/checklists/${checklistId}`);
      fetchBoard();
    } catch (err) { console.error(err); }
  };

  const addChecklistItem = async (e, checklistId) => {
    if (e.key !== "Enter" || !e.target.value.trim()) return;
    const title = e.target.value.trim();
    e.target.value = "";
    try {
      const res = await api.post(`/checklists/${checklistId}/items`, { title });
      setCard(prev => ({
        ...prev,
        checklists: prev.checklists.map(c =>
          c.id === checklistId ? { ...c, items: [...c.items, res.data] } : c
        )
      }));
    } catch (err) { console.error(err); }
  };

  const toggleChecklistItem = async (checklistId, itemId, isCompleted) => {
    // Optimistic
    setCard(prev => ({
      ...prev,
      checklists: prev.checklists.map(c =>
        c.id === checklistId
          ? { ...c, items: c.items.map(it => it.id === itemId ? { ...it, isCompleted } : it) }
          : c
      )
    }));
    try {
      await api.put(`/checklists/items/${itemId}`, { isCompleted });
    } catch (err) { console.error(err); }
  };

  // ── Comments ─────────────────────────────────────────────
  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post("/comments", { text: newComment, cardId: card.id });
      setCard(prev => ({ ...prev, comments: [...prev.comments, res.data] }));
      setNewComment("");
      fetchActivity();
    } catch (err) { console.error(err); }
  };

  const deleteComment = async (commentId) => {
    setCard(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== commentId) }));
    try {
      await api.delete(`/comments/${commentId}`);
    } catch (err) { console.error(err); }
  };

  const addAttachment = async (e) => {
    e.preventDefault();
    if (!newAttachUrl.trim()) return;
    try {
      const res = await api.post("/attachments/url", {
        name: newAttachName || newAttachUrl,
        url: newAttachUrl,
        cardId: card.id
      });
      setCard(prev => ({ ...prev, attachments: [res.data, ...prev.attachments] }));
      setNewAttachUrl("");
      setNewAttachName("");
      setShowAttachForm(false);
    } catch (err) { console.error(err); }
  };

  const uploadAttachmentFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("cardId", card.id);
    try {
      const res = await api.post("/attachments/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setCard(prev => ({ ...prev, attachments: [res.data, ...prev.attachments] }));
      setShowAttachForm(false);
    } catch (err) { console.error(err); }
  };

  const uploadCoverImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const formData = new FormData();
    formData.append("cover", file);
    try {
      const res = await api.post(`/attachments/cover/${card.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setCard(prev => ({ ...prev, coverUrl: res.data.coverUrl, coverColor: null }));
      setShowCoverMenu(false);
      fetchBoard();
    } catch (err) { console.error(err); } finally {
      setUploadingCover(false);
    }
  };

  const deleteAttachment = async (attachId) => {
    setCard(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attachId) }));
    try {
      await api.delete(`/attachments/${attachId}`);
    } catch (err) { console.error(err); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-start justify-center overflow-y-auto py-12 px-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-[#f4f5f7] rounded-xl shadow-2xl w-full max-w-3xl flex flex-col md:flex-row overflow-hidden relative">

        {/* Cover Image */}
        {card.coverColor && (
          <div
            className="absolute top-0 left-0 right-0 h-32 rounded-t-xl"
            style={{ backgroundColor: card.coverColor }}
          />
        )}

        {/* Main Content */}
        <div className={`flex-1 p-6 relative ${card.coverColor ? "pt-36" : ""} overflow-y-auto max-h-[85vh]`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 text-gray-600 z-10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title */}
          <div className="mb-6 pr-10">
            <input
              className="text-2xl font-semibold bg-transparent border-2 border-transparent focus:border-blue-500 focus:bg-white rounded px-2 w-full outline-none text-gray-900"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            />
            <p className="text-sm text-gray-500 px-2 mt-1">
              in list <span className="underline font-medium">{initialCard.list?.title || "Unknown"}</span>
            </p>
          </div>

          {/* Header Badges */}
          <div className="flex flex-wrap gap-5 mb-6">
            {card.members.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Members</h3>
                <div className="flex gap-1">
                  {card.members.map(m => (
                    <div
                      key={m.id}
                      title={m.name}
                      className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white select-none cursor-default"
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {card.labels.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Labels</h3>
                <div className="flex flex-wrap gap-1">
                  {card.labels.map(l => (
                    <span
                      key={l.id}
                      className="px-3 py-1 rounded text-white text-xs font-semibold shadow-sm"
                      style={{ backgroundColor: l.color }}
                    >
                      {l.title || "Label"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {card.dueDate && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Due date</h3>
                <button
                  onClick={removeDueDate}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold ${
                    isOverdue ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-800"
                  }`}
                  title="Click to remove due date"
                >
                  📅 {formatDate(card.dueDate)}
                  {isOverdue && <span className="text-xs bg-red-500 text-white px-1.5 rounded-full">Overdue</span>}
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <AlignLeft className="w-5 h-5 text-gray-600 shrink-0" />
              <h3 className="font-semibold text-gray-800 text-base">Description</h3>
            </div>
            <div className="pl-8">
              {isEditingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    autoFocus
                    className="w-full text-sm p-3 bg-white border-2 border-blue-500 rounded-md focus:outline-none min-h-[100px] resize-none text-gray-800"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a more detailed description..."
                  />
                  <div className="flex gap-2">
                    <button onClick={saveDescription} className="bg-blue-600 text-white font-medium px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition">
                      Save
                    </button>
                    <button
                      onClick={() => { setIsEditingDesc(false); setDescription(card.description || ""); }}
                      className="text-gray-600 hover:bg-gray-200 px-4 py-1.5 rounded font-medium text-sm transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  className={`text-sm p-3 rounded-md cursor-pointer transition min-h-[50px] ${
                    description ? "bg-white text-gray-800 shadow-sm" : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                  }`}
                >
                  {description || "Add a more detailed description..."}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {(card.attachments.length > 0 || showAttachForm) && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Paperclip className="w-5 h-5 text-gray-600 shrink-0" />
                <h3 className="font-semibold text-gray-800 text-base">Attachments</h3>
              </div>
              <div className="pl-8 flex flex-col gap-2">
                {card.attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-3 bg-white rounded-lg p-2 shadow-sm group">
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-500 shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block">
                        {att.name}
                      </a>
                      <p className="text-xs text-gray-400">{formatDate(att.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => deleteAttachment(att.id)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition text-xs px-2 py-1 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}

                {showAttachForm && (
                  <div className="bg-white rounded-lg p-3 shadow-sm flex flex-col gap-2">
                    {/* Tabs: URL vs File */}
                    <div className="flex gap-1 border-b pb-2 mb-1">
                      <button
                        type="button"
                        onClick={() => setAttachTab("url")}
                        className={`text-xs px-3 py-1 rounded ${attachTab === "url" ? "bg-blue-100 text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100"}`}
                      >
                        Link / URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttachTab("file")}
                        className={`text-xs px-3 py-1 rounded ${attachTab === "file" ? "bg-blue-100 text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100"}`}
                      >
                        Upload file
                      </button>
                    </div>

                    {attachTab === "url" ? (
                      <form onSubmit={addAttachment} className="flex flex-col gap-2">
                        <input
                          type="url"
                          placeholder="Paste URL..."
                          className="text-sm border-2 border-blue-500 rounded px-3 py-1.5 w-full focus:outline-none text-gray-800"
                          value={newAttachUrl}
                          onChange={e => setNewAttachUrl(e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          placeholder="Display name (optional)"
                          className="text-sm border border-gray-200 rounded px-3 py-1.5 w-full focus:outline-none text-gray-800"
                          value={newAttachName}
                          onChange={e => setNewAttachName(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">Attach</button>
                          <button type="button" onClick={() => setShowAttachForm(false)} className="text-gray-500 text-sm px-3 py-1.5 rounded hover:bg-gray-100">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                          <span className="text-sm text-gray-500 mb-1">Click to select a file</span>
                          <span className="text-xs text-gray-400">Images, PDFs, docs, up to 10MB</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv"
                            onChange={uploadAttachmentFile}
                          />
                        </label>
                        <button type="button" onClick={() => setShowAttachForm(false)} className="text-gray-500 text-sm px-3 py-1.5 rounded hover:bg-gray-100 text-center">Cancel</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Checklists */}
          {card.checklists.map(checklist => {
            const items = checklist.items || [];
            const percent = items.length === 0 ? 0 : Math.round((items.filter(i => i.isCompleted).length / items.length) * 100);
            return (
              <div key={checklist.id} className="mb-6">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-gray-600 shrink-0" />
                    <h3 className="font-semibold text-gray-800 text-base">{checklist.title}</h3>
                  </div>
                  <button onClick={() => deleteChecklist(checklist.id)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-3 py-1 rounded text-sm transition">
                    Delete
                  </button>
                </div>

                <div className="pl-8 mb-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">{percent}%</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${percent === 100 ? "bg-green-500" : "bg-blue-500"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="pl-8 flex flex-col gap-1">
                  {items.map(item => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-1.5 rounded -mx-1.5 transition"
                    >
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={(e) => toggleChecklistItem(checklist.id, item.id, e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-blue-600"
                      />
                      <span className={`text-sm ${item.isCompleted ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {item.title}
                      </span>
                    </label>
                  ))}

                  <div className="mt-1">
                    <input
                      type="text"
                      placeholder="Add an item... (press Enter)"
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded focus:outline-none focus:border-blue-500 text-sm text-gray-800 bg-white"
                      onKeyDown={(e) => addChecklistItem(e, checklist.id)}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Section Tabs: Comments / Activity */}
          <div className="mb-4 flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveSection("details")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t transition ${activeSection === "details" ? "bg-white border-b-2 border-blue-500 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
            >
              <MessageSquare className="w-4 h-4" /> Comments ({card.comments.length})
            </button>
            <button
              onClick={() => { setActiveSection("activity"); fetchActivity(); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t transition ${activeSection === "activity" ? "bg-white border-b-2 border-blue-500 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
            >
              <Activity className="w-4 h-4" /> Activity
            </button>
          </div>

          {/* Comments Section */}
          {activeSection === "details" && (
            <div className="flex flex-col gap-3">
              {card.comments.map(c => (
                <div key={c.id} className="flex gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {c.user ? c.user.name.charAt(0) : "?"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-800">{c.user?.name || "Someone"}</span>
                      <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 shadow-sm text-sm text-gray-800">{c.text}</div>
                    <button
                      onClick={() => deleteComment(c.id)}
                      className="text-xs text-gray-400 hover:text-red-500 mt-0.5 opacity-0 group-hover:opacity-100 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Comment */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-bold shrink-0">
                  Y
                </div>
                <div className="flex-1">
                  <textarea
                    placeholder="Write a comment..."
                    className="w-full text-sm p-3 bg-white border-2 border-gray-200 rounded-md focus:outline-none focus:border-blue-500 min-h-[60px] resize-none text-gray-800"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addComment();
                      }
                    }}
                  />
                  {newComment.trim() && (
                    <button onClick={addComment} className="mt-2 bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700 transition">
                      Save
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity Section */}
          {activeSection === "activity" && (
            <div className="flex flex-col gap-2">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No activity yet.</p>
              ) : (
                activities.map(act => (
                  <div key={act.id} className="flex gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0 mt-0.5">
                      {act.user ? act.user.name.charAt(0) : "?"}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">{act.user?.name || "Someone"} </span>
                      <span className="text-gray-600">{act.text}</span>
                      <div className="text-xs text-gray-400 mt-0.5">{formatDate(act.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={`w-full md:w-48 bg-gray-100 p-4 flex flex-col gap-3 border-t md:border-t-0 md:border-l border-gray-200 relative ${card.coverColor ? "md:pt-36" : ""} shrink-0`} ref={sidebarRef}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase">Add to card</h4>

          {/* Members */}
          <div className="relative">
            <button
              onClick={() => { setShowMembersMenu(!showMembersMenu); setShowLabelsMenu(false); setShowDateMenu(false); setShowCoverMenu(false); }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left"
            >
              <Users className="w-4 h-4 shrink-0" /> Members
            </button>
            {showMembersMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded shadow-lg border border-gray-200 z-[1000] p-3 md:left-auto md:right-full md:mr-2 md:top-0">
                <h4 className="text-center font-semibold text-gray-600 border-b pb-2 mb-2 text-sm">Assign Members</h4>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {allUsers.map(user => {
                    const isSelected = card.members.some(m => m.id === user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleMember(user.id)}
                        className={`flex items-center gap-2 cursor-pointer p-2 rounded transition ${isSelected ? "bg-blue-50" : "hover:bg-gray-100"}`}
                      >
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <span className="flex-1 text-sm text-gray-800">{user.name}</span>
                        {isSelected && <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />}
                      </div>
                    );
                  })}
                  {allUsers.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No users found</p>}
                </div>
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="relative">
            <button
              onClick={() => { setShowLabelsMenu(!showLabelsMenu); setShowMembersMenu(false); setShowDateMenu(false); setShowCoverMenu(false); }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left"
            >
              <Tag className="w-4 h-4 shrink-0" /> Labels
            </button>
            {showLabelsMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded shadow-lg border border-gray-200 z-[1000] p-3 md:left-auto md:right-full md:mr-2 md:top-0">
                <h4 className="text-center font-semibold text-gray-600 border-b pb-2 mb-2 text-sm">Labels</h4>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {allLabels.map(label => {
                    const isSelected = card.labels.some(l => l.id === label.id);
                    return (
                      <div
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className={`flex items-center gap-2 cursor-pointer rounded transition ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                      >
                        <div
                          className="flex-1 h-8 rounded px-3 flex items-center text-white text-sm font-medium"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.title}
                        </div>
                        {isSelected && <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Checklist */}
          <button
            onClick={addChecklist}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left"
          >
            <CheckSquare className="w-4 h-4 shrink-0" /> Checklist
          </button>

          {/* Due Date */}
          <div className="relative">
            <button
              onClick={() => { setShowDateMenu(!showDateMenu); setShowMembersMenu(false); setShowLabelsMenu(false); setShowCoverMenu(false); }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left"
            >
              <Calendar className="w-4 h-4 shrink-0" /> Dates
            </button>
            {showDateMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded shadow-lg border border-gray-200 z-[1000] p-3 md:left-auto md:right-full md:mr-2 md:top-0">
                <h4 className="text-center font-semibold text-gray-600 border-b pb-2 mb-2 text-sm">Due Date</h4>
                <form onSubmit={handleSetDueDate} className="flex flex-col gap-2">
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""}
                    className="border-2 border-gray-200 p-2 rounded text-sm w-full focus:border-blue-500 focus:outline-none text-gray-800"
                  />
                  <button type="submit" className="bg-blue-600 text-white p-2 rounded text-sm font-medium hover:bg-blue-700">Set Date</button>
                  {card.dueDate && (
                    <button type="button" onClick={removeDueDate} className="text-sm text-gray-500 hover:text-red-500 text-center">Remove date</button>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* Attachment */}
          <button
            onClick={() => setShowAttachForm(true)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left"
          >
            <Paperclip className="w-4 h-4 shrink-0" /> Attachment
          </button>

          {/* Cover */}
          <div className="relative">
            <button
              onClick={() => { setShowCoverMenu(!showCoverMenu); setShowMembersMenu(false); setShowLabelsMenu(false); setShowDateMenu(false); }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left"
            >
              <Image className="w-4 h-4 shrink-0" /> Cover
            </button>
            {showCoverMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded shadow-lg border border-gray-200 z-[1000] p-3 md:left-auto md:right-full md:mr-2 md:top-0">
                <h4 className="text-center font-semibold text-gray-600 border-b pb-2 mb-2 text-sm">Card Cover</h4>
                <p className="text-xs text-gray-400 mb-2">Colors</p>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {COVER_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setCoverColor(color)}
                      className={`w-full h-8 rounded-md transition hover:scale-110 ${card.coverColor === color ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Cover image upload */}
                <p className="text-xs text-gray-400 mb-1">Upload image</p>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition mb-2">
                  {uploadingCover ? (
                    <span className="text-xs text-gray-500">Uploading...</span>
                  ) : (
                    <>
                      <Image className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Choose image</span>
                    </>
                  )}
                  <input
                    ref={coverFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={uploadCoverImage}
                    disabled={uploadingCover}
                  />
                </label>

                {(card.coverColor || card.coverUrl) && (
                  <button onClick={removeCover} className="w-full text-sm text-gray-500 hover:text-red-500 py-1">
                    Remove cover
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="my-1 border-t border-gray-200" />

          <h4 className="text-xs font-semibold text-gray-500 uppercase">Actions</h4>
          <button
            onClick={deleteCard}
            className="bg-red-50 hover:bg-red-100 text-red-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left"
          >
            <Trash2 className="w-4 h-4 shrink-0" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
