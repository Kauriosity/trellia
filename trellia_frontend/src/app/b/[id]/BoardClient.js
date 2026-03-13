"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import api from "@/lib/api";
import { Plus, Filter, X, Palette, Search } from "lucide-react";
import TaskColumn from "@/components/board/TaskColumn";
import CardModal from "@/components/CardModal";

// Board background presets
const THEME_PRESETS = [
  "#0079bf", "#d29034", "#519839", "#b04632", "#89609e",
  "#cd5a91", "#4bbf6b", "#00aecc", "#838c91", "#172b4d"
];

const IMAGE_PRESETS = [
  "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
];

export default function BoardClient({ boardId }) {
  const [activeBoard, setActiveBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [focusedTask, setFocusedTask] = useState(null);

  // Filter Configuration
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTagId, setActiveTagId] = useState("");
  const [activeMemberId, setActiveMemberId] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("");
  const [availableTags, setAvailableTags] = useState([]);
  const [availablePersonnel, setAvailablePersonnel] = useState([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  // Column Addition State
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [columnDraftTitle, setColumnDraftTitle] = useState("");

  const synchronizeBoardData = useCallback(async () => {
    try {
      const response = await api.get(`/boards/${boardId}`);
      setActiveBoard(response.data);
      setColumns(response.data.lists || []);
    } catch (error) {
      console.error("Board sync failure:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [boardId]);

  const loadMetadata = useCallback(async () => {
    try {
      const [tagsResponse, personnelResponse] = await Promise.all([
        api.get("/labels"),
        api.get("/users")
      ]);
      setAvailableTags(tagsResponse.data);
      setAvailablePersonnel(personnelResponse.data);
    } catch (error) {
      console.error("Metadata load failure:", error);
    }
  }, []);

  useEffect(() => {
    synchronizeBoardData();
    loadMetadata();
  }, [synchronizeBoardData, loadMetadata]);

  const updateFocusedTaskRef = useCallback((taskId) => {
    if (!taskId) return;
    for (const column of columns) {
      const target = (column.cards || []).find(c => c.id === taskId);
      if (target) {
        setFocusedTask({ ...target, list: column });
        return;
      }
    }
  }, [columns]);

  useEffect(() => {
    if (focusedTask) {
      updateFocusedTaskRef(focusedTask.id);
    }
  }, [columns]);

  const onDragEnd = async (interaction) => {
    const { destination, source, type } = interaction;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === "list") {
      const reorderedColumns = Array.from(columns);
      const [removed] = reorderedColumns.splice(source.index, 1);
      reorderedColumns.splice(destination.index, 0, removed);

      const updatedColumns = reorderedColumns.map((col, idx) => ({
        ...col,
        position: (idx + 1) * 1000,
      }));
      setColumns(updatedColumns);

      try {
        await api.put("/lists/reorder/all", {
          items: updatedColumns.map((c) => ({ id: c.id, position: c.position }))
        });
      } catch (err) {
        synchronizeBoardData();
      }
      return;
    }

    const sourceIdx = columns.findIndex((c) => c.id === source.droppableId);
    const destIdx = columns.findIndex((c) => c.id === destination.droppableId);

    if (sourceIdx === -1 || destIdx === -1) return;

    const sourceCol = columns[sourceIdx];
    const destCol = columns[destIdx];

    const sourceTasks = Array.from(sourceCol.cards || []);
    const [movedTask] = sourceTasks.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      sourceTasks.splice(destination.index, 0, movedTask);
      const updatedTasks = sourceTasks.map((t, i) => ({ ...t, position: (i + 1) * 1000 }));
      const newState = [...columns];
      newState[sourceIdx] = { ...sourceCol, cards: updatedTasks };
      setColumns(newState);

      try {
        await api.put("/cards/reorder/all", {
          items: updatedTasks.map((t) => ({ id: t.id, position: t.position }))
        });
      } catch (err) {
        synchronizeBoardData();
      }
    } else {
      const destTasks = Array.from(destCol.cards || []);
      movedTask.listId = destination.droppableId;
      destTasks.splice(destination.index, 0, movedTask);

      const sourceFinal = sourceTasks.map((t, i) => ({ ...t, position: (i + 1) * 1000 }));
      const destFinal = destTasks.map((t, i) => ({ ...t, position: (i + 1) * 1000 }));

      const newState = [...columns];
      newState[sourceIdx] = { ...sourceCol, cards: sourceFinal };
      newState[destIdx] = { ...destCol, cards: destFinal };
      setColumns(newState);

      try {
        await api.put("/cards/reorder/all", {
          items: destFinal.map((t) => ({ id: t.id, position: t.position, listId: t.listId }))
        });
      } catch (err) {
        synchronizeBoardData();
      }
    }
  };

  const createNewColumn = async (e) => {
    e.preventDefault();
    if (!columnDraftTitle.trim()) return;

    const maxPos = columns.length > 0 ? Math.max(...columns.map((c) => c.position)) : 0;
    
    try {
      const response = await api.post("/lists", { 
        title: columnDraftTitle, 
        boardId, 
        position: maxPos + 1000 
      });
      setColumns([...columns, { ...response.data, cards: [] }]);
      setColumnDraftTitle("");
      setIsCreatingColumn(false);
    } catch (err) {
      console.error(err);
    }
  };

  const applyBoardBackground = async ({ color, backgroundUrl }) => {
    setActiveBoard(prev => ({ ...prev, color, backgroundUrl }));
    setIsThemePickerOpen(false);
    try {
      await api.put(`/boards/${boardId}`, { color, backgroundUrl });
    } catch (err) {
      console.error(err);
    }
  };

  const isFilteringActive = searchTerm || activeTagId || activeMemberId || deadlineFilter;

  if (isProcessing) return <div className="p-4 text-white">Initializing workspace...</div>;
  if (!activeBoard) return <div className="p-4 text-white">Project not found.</div>;

  return (
    <div
      className="flex flex-col h-full bg-cover bg-center"
      style={{ backgroundColor: activeBoard.color, backgroundImage: activeBoard.backgroundUrl ? `url(${activeBoard.backgroundUrl})` : undefined }}
    >
      {/* Workspace Navigation Bar */}
      <div className="relative h-auto min-h-12 w-full bg-black/20 backdrop-blur-sm flex flex-wrap items-center px-4 py-2 gap-3 z-10">
        <h1 className="text-white font-bold text-lg hover:bg-white/20 px-2 py-1 rounded cursor-pointer transition select-none">
          {activeBoard.title}
        </h1>
        <div className="h-6 w-px bg-white/30 hidden sm:block" />

        <div className="flex flex-wrap gap-2 text-sm text-white font-medium relative">
          {/* Query Controls */}
          <button
            onClick={() => { setIsFilterPanelOpen(!isFilterPanelOpen); setIsThemePickerOpen(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
              isFilterPanelOpen || isFilteringActive ? "bg-white text-blue-800" : "bg-white/20 hover:bg-white/30"
            }`}
          >
            <Filter className="w-4 h-4" /> Refine
            {isFilteringActive && (
              <span className="bg-blue-600 text-white text-xs px-1.5 rounded-full ml-1">Active</span>
            )}
          </button>

          {/* Configuration Overlay */}
          {isFilterPanelOpen && (
            <div className="fixed top-20 left-6 w-72 bg-white rounded-md shadow-xl border border-gray-200 p-4 z-[9999] text-gray-800 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-800">Filter View</h4>
                <button onClick={() => setIsFilterPanelOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Text Search */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Full-text Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    className="w-full pl-8 pr-2 py-1.5 text-sm border-2 border-gray-200 rounded focus:border-blue-500 focus:outline-none text-gray-800"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2" />
                </div>
              </div>

              {/* Contributor Filter */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Contributors</label>
                <div className="flex flex-col gap-1">
                  <div
                    onClick={() => setActiveMemberId("")}
                    className={`text-sm py-1.5 px-2 rounded cursor-pointer ${activeMemberId === "" ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                  >
                    All members
                  </div>
                  {availablePersonnel.map(usr => (
                    <div
                      key={usr.id}
                      onClick={() => setActiveMemberId(activeMemberId === usr.id ? "" : usr.id)}
                      className={`text-sm py-1.5 px-2 rounded cursor-pointer flex items-center gap-2 ${activeMemberId === usr.id ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                        {usr.name.charAt(0)}
                      </div>
                      {usr.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Tags */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Category Tags</label>
                <div className="flex flex-col gap-1">
                  <div
                    onClick={() => setActiveTagId("")}
                    className={`text-sm py-1.5 px-2 rounded cursor-pointer ${activeTagId === "" ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                  >
                    All tags
                  </div>
                  {availableTags.map(tag => (
                    <div
                      key={tag.id}
                      onClick={() => setActiveTagId(activeTagId === tag.id ? "" : tag.id)}
                      className={`text-sm py-1.5 px-2 rounded cursor-pointer flex items-center gap-2 ${activeTagId === tag.id ? "bg-blue-50 font-medium" : "hover:bg-gray-50"} text-gray-700`}
                    >
                      <span className="w-4 h-4 rounded shadow-sm shrink-0" style={{ backgroundColor: tag.color }} />
                      {tag.title}
                    </div>
                  ))}
                </div>
              </div>

              {/* Temporal Filter */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Timeline</label>
                <div className="flex flex-col gap-1">
                  {[["", "Anytime"], ["overdue", "Expired"], ["nextDay", "Next 24h"], ["hasDate", "Dated Tasks"]].map(([val, label]) => (
                    <div
                      key={val}
                      onClick={() => setDeadlineFilter(deadlineFilter === val ? "" : val)}
                      className={`text-sm py-1.5 px-2 rounded cursor-pointer ${deadlineFilter === val ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {isFilteringActive && (
                <button
                  onClick={() => { setSearchTerm(""); setActiveTagId(""); setActiveMemberId(""); setDeadlineFilter(""); }}
                  className="mt-4 w-full text-sm text-center text-red-600 hover:bg-red-50 py-1.5 rounded transition"
                >
                  Reset all modifications
                </button>
              )}
            </div>
          )}

          {/* Theme Switcher */}
          <div className="relative">
            <button
              onClick={() => { setIsThemePickerOpen(!isThemePickerOpen); setIsFilterPanelOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded transition bg-white/20 hover:bg-white/30"
            >
              <Palette className="w-4 h-4" /> Theme
            </button>
            {isThemePickerOpen && (
              <div className="fixed top-20 left-40 w-72 bg-white rounded-md shadow-xl border border-gray-200 p-3 z-[9999]">
                <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Color Palettes</h4>
                <div className="grid grid-cols-5 gap-1.5 mb-4">
                  {THEME_PRESETS.map(color => (
                    <button
                      key={color}
                      onClick={() => applyBoardBackground({ color, backgroundUrl: null })}
                      className={`w-full h-8 rounded-md transition hover:scale-110 ${activeBoard.color === color && !activeBoard.backgroundUrl ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Workspace Imagery</h4>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_PRESETS.map(url => (
                    <button
                      key={url}
                      onClick={() => applyBoardBackground({ color: "#555", backgroundUrl: url })}
                      className={`w-full h-12 rounded-md bg-cover bg-center transition hover:opacity-80 ${activeBoard.backgroundUrl === url ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
                      style={{ backgroundImage: `url(${url})` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary Workspace Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="workspace" type="list" direction="horizontal">
            {(provided) => (
              <div
                className="flex flex-col md:flex-row items-start gap-4 h-full md:min-w-max"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {columns.map((column, index) => (
                  <TaskColumn
                    key={column.id}
                    columnData={column}
                    index={index}
                    onDataUpdate={synchronizeBoardData}
                    onSelectTask={(task) => setFocusedTask({ ...task, list: column })}
                    searchQuery={searchTerm}
                    filterLabelId={activeTagId}
                    filterMemberId={activeMemberId}
                    filterDueDate={deadlineFilter}
                  />
                ))}
                {provided.placeholder}

                {/* Column Initialization Tool */}
                <div className="w-full md:w-[272px] md:min-w-[272px] shrink-0">
                  {isCreatingColumn ? (
                    <form onSubmit={createNewColumn} className="bg-[#ebecf0] rounded-xl p-2 shadow-sm">
                      <input
                        autoFocus
                        className="w-full text-sm p-2 border-2 border-blue-500 rounded focus:outline-none mb-2 bg-white text-gray-800"
                        placeholder="Column title..."
                        value={columnDraftTitle}
                        onChange={(e) => setColumnDraftTitle(e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <button type="submit" className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
                          Add Column
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsCreatingColumn(false); setColumnDraftTitle(""); }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setIsCreatingColumn(true)}
                      className="w-full flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-xl transition font-medium"
                    >
                      <Plus className="w-5 h-5" />
                      Append Column
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Task Modal Interface */}
      {focusedTask && (
        <CardModal
          card={focusedTask}
          onClose={() => setFocusedTask(null)}
          fetchBoard={synchronizeBoardData}
        />
      )}
    </div>
  );
}
