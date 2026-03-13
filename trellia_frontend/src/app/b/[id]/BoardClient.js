"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "@/lib/api";
import { MoreHorizontal, Plus, Search, Filter, X, Palette, Calendar, Users, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import CardModal from "@/components/CardModal";

// Board background presets
const BG_COLORS = [
  "#0079bf", "#d29034", "#519839", "#b04632", "#89609e",
  "#cd5a91", "#4bbf6b", "#00aecc", "#838c91", "#172b4d"
];

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
];

export default function BoardClient({ boardId }) {
  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLabelId, setFilterLabelId] = useState("");
  const [filterMemberId, setFilterMemberId] = useState("");
  const [filterDueDate, setFilterDueDate] = useState("");
  const [allLabels, setAllLabels] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);

  // New list state
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.get(`/boards/${boardId}`);
      setBoard(res.data);
      setLists(res.data.lists || []);
    } catch (error) {
      console.error("Failed to fetch board:", error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await api.get("/labels");
      setAllLabels(res.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users");
      setAllUsers(res.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
    fetchLabels();
    fetchUsers();
  }, [fetchBoard, fetchLabels, fetchUsers]);

  // When activeCard changes (opened), look it up from lists for fresh data
  const refreshActiveCard = useCallback((cardId) => {
    if (!cardId) return;
    for (const list of lists) {
      const found = (list.cards || []).find(c => c.id === cardId);
      if (found) {
        setActiveCard({ ...found, list });
        return;
      }
    }
  }, [lists]);

  // After fetchBoard, refresh active card if modal is open
  useEffect(() => {
    if (activeCard) {
      refreshActiveCard(activeCard.id);
    }
  }, [lists]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === "list") {
      const newLists = Array.from(lists);
      const [movedList] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, movedList);

      const updatedLists = newLists.map((list, index) => ({
        ...list,
        position: (index + 1) * 1000,
      }));
      setLists(updatedLists);

      try {
        await api.put("/lists/reorder/all", {
          items: updatedLists.map((l) => ({ id: l.id, position: l.position }))
        });
      } catch (err) {
        console.error("Failed to reorder lists", err);
        fetchBoard();
      }
      return;
    }

    const sourceListIndex = lists.findIndex((l) => l.id === source.droppableId);
    const destListIndex = lists.findIndex((l) => l.id === destination.droppableId);

    if (sourceListIndex === -1 || destListIndex === -1) return;

    const sourceList = lists[sourceListIndex];
    const destList = lists[destListIndex];

    const newSourceCards = Array.from(sourceList.cards || []);
    const [movedCard] = newSourceCards.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      newSourceCards.splice(destination.index, 0, movedCard);
      const updatedCards = newSourceCards.map((c, i) => ({ ...c, position: (i + 1) * 1000 }));
      const newLists = [...lists];
      newLists[sourceListIndex] = { ...sourceList, cards: updatedCards };
      setLists(newLists);

      try {
        await api.put("/cards/reorder/all", {
          items: updatedCards.map((c) => ({ id: c.id, position: c.position }))
        });
      } catch (err) {
        console.error("Failed to reorder cards", err);
        fetchBoard();
      }
    } else {
      const newDestCards = Array.from(destList.cards || []);
      movedCard.listId = destination.droppableId;
      newDestCards.splice(destination.index, 0, movedCard);

      const finalSourceCards = newSourceCards.map((c, i) => ({ ...c, position: (i + 1) * 1000 }));
      const finalDestCards = newDestCards.map((c, i) => ({ ...c, position: (i + 1) * 1000 }));

      const newLists = [...lists];
      newLists[sourceListIndex] = { ...sourceList, cards: finalSourceCards };
      newLists[destListIndex] = { ...destList, cards: finalDestCards };
      setLists(newLists);

      try {
        await api.put("/cards/reorder/all", {
          items: finalDestCards.map((c) => ({ id: c.id, position: c.position, listId: c.listId }))
        });
      } catch (err) {
        console.error("Failed to move card", err);
        fetchBoard();
      }
    }
  };

  const addList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    const maxPos = lists.length > 0 ? Math.max(...lists.map((l) => l.position)) : 0;
    const newList = { title: newListTitle, boardId, position: maxPos + 1000 };

    try {
      const res = await api.post("/lists", newList);
      setLists([...lists, { ...res.data, cards: [] }]);
      setNewListTitle("");
      setIsAddingList(false);
    } catch (err) {
      console.error(err);
    }
  };

  const setBoardBackground = async ({ color, backgroundUrl }) => {
    setBoard(prev => ({ ...prev, color, backgroundUrl }));
    setShowBgPicker(false);
    try {
      await api.put(`/boards/${boardId}`, { color, backgroundUrl });
    } catch (err) {
      console.error(err);
    }
  };

  const hasActiveFilters = searchQuery || filterLabelId || filterMemberId || filterDueDate;

  if (loading) return <div className="p-4 text-white">Loading board...</div>;
  if (!board) return <div className="p-4 text-white">Board not found.</div>;

  return (
    <div
      className="flex flex-col h-full bg-cover bg-center"
      style={{ backgroundColor: board.color, backgroundImage: board.backgroundUrl ? `url(${board.backgroundUrl})` : undefined }}
    >
      {/* Board Header */}
      <div className="relative h-auto min-h-12 w-full bg-black/20 backdrop-blur-sm flex flex-wrap items-center px-4 py-2 gap-3 z-10">
        <h1 className="text-white font-bold text-lg hover:bg-white/20 px-2 py-1 rounded cursor-pointer transition select-none">
          {board.title}
        </h1>
        <div className="h-6 w-px bg-white/30 hidden sm:block" />

        <div className="flex flex-wrap gap-2 text-sm text-white font-medium relative">
          {/* Filters Button */}
          <button
            onClick={() => { setShowFilters(!showFilters); setShowBgPicker(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
              showFilters || hasActiveFilters ? "bg-white text-blue-800" : "bg-white/20 hover:bg-white/30"
            }`}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs px-1.5 rounded-full ml-1">Active</span>
            )}
          </button>

          {/* Filter Dropdown */}
          {showFilters && (
            <div className="fixed top-20 left-6 w-72 bg-white rounded-md shadow-xl border border-gray-200 p-4 z-[9999] text-gray-800 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-800">Filter Cards</h4>
                <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Keyword */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Keyword</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search cards..."
                    className="w-full pl-8 pr-2 py-1.5 text-sm border-2 border-gray-200 rounded focus:border-blue-500 focus:outline-none text-gray-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2" />
                </div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-xs text-blue-600 hover:underline mt-1">Clear</button>
                )}
              </div>

              {/* Members */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Members</label>
                <div className="flex flex-col gap-1">
                  <div
                    onClick={() => setFilterMemberId("")}
                    className={`text-sm py-1.5 px-2 rounded cursor-pointer ${filterMemberId === "" ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                  >
                    Any member
                  </div>
                  {allUsers.map(usr => (
                    <div
                      key={usr.id}
                      onClick={() => setFilterMemberId(filterMemberId === usr.id ? "" : usr.id)}
                      className={`text-sm py-1.5 px-2 rounded cursor-pointer flex items-center gap-2 ${filterMemberId === usr.id ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                        {usr.name.charAt(0)}
                      </div>
                      {usr.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Labels */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Labels</label>
                <div className="flex flex-col gap-1">
                  <div
                    onClick={() => setFilterLabelId("")}
                    className={`text-sm py-1.5 px-2 rounded cursor-pointer ${filterLabelId === "" ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                  >
                    Any label
                  </div>
                  {allLabels.map(lbl => (
                    <div
                      key={lbl.id}
                      onClick={() => setFilterLabelId(filterLabelId === lbl.id ? "" : lbl.id)}
                      className={`text-sm py-1.5 px-2 rounded cursor-pointer flex items-center gap-2 ${filterLabelId === lbl.id ? "bg-blue-50 font-medium" : "hover:bg-gray-50"} text-gray-700`}
                    >
                      <span className="w-4 h-4 rounded shadow-sm shrink-0" style={{ backgroundColor: lbl.color }} />
                      {lbl.title}
                    </div>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Due Date</label>
                <div className="flex flex-col gap-1">
                  {[["", "Any date"], ["overdue", "Overdue"], ["nextDay", "Due in next 24 hours"], ["hasDate", "Has a due date"]].map(([val, label]) => (
                    <div
                      key={val}
                      onClick={() => setFilterDueDate(filterDueDate === val ? "" : val)}
                      className={`text-sm py-1.5 px-2 rounded cursor-pointer ${filterDueDate === val ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => { setSearchQuery(""); setFilterLabelId(""); setFilterMemberId(""); setFilterDueDate(""); }}
                  className="mt-4 w-full text-sm text-center text-red-600 hover:bg-red-50 py-1.5 rounded transition"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Board Background */}
          <div className="relative">
            <button
              onClick={() => { setShowBgPicker(!showBgPicker); setShowFilters(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded transition bg-white/20 hover:bg-white/30"
            >
              <Palette className="w-4 h-4" /> Background
            </button>
            {showBgPicker && (
              <div className="fixed top-20 left-40 w-72 bg-white rounded-md shadow-xl border border-gray-200 p-3 z-[9999]">
                <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Colors</h4>
                <div className="grid grid-cols-5 gap-1.5 mb-4">
                  {BG_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setBoardBackground({ color, backgroundUrl: null })}
                      className={`w-full h-8 rounded-md transition hover:scale-110 ${board.color === color && !board.backgroundUrl ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Photos</h4>
                <div className="grid grid-cols-2 gap-2">
                  {BG_IMAGES.map(url => (
                    <button
                      key={url}
                      onClick={() => setBoardBackground({ color: "#555", backgroundUrl: url })}
                      className={`w-full h-12 rounded-md bg-cover bg-center transition hover:opacity-80 ${board.backgroundUrl === url ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
                      style={{ backgroundImage: `url(${url})` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lists Canvas */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" type="list" direction="horizontal">
            {(provided) => (
              <div
                className="flex flex-row flex-nowrap items-start gap-4 h-full min-w-max"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {lists.map((list, index) => (
                  <List
                    key={list.id}
                    list={list}
                    index={index}
                    fetchBoard={fetchBoard}
                    setActiveCard={(card) => setActiveCard({ ...card, list })}
                    searchQuery={searchQuery}
                    filterLabelId={filterLabelId}
                    filterMemberId={filterMemberId}
                    filterDueDate={filterDueDate}
                  />
                ))}
                {provided.placeholder}

                {/* Add New List */}
                <div className="min-w-[272px] w-[272px] shrink-0">
                  {isAddingList ? (
                    <form onSubmit={addList} className="bg-[#ebecf0] rounded-xl p-2 shadow-sm">
                      <input
                        autoFocus
                        className="w-full text-sm p-2 border-2 border-blue-500 rounded focus:outline-none mb-2 bg-white text-gray-800"
                        placeholder="Enter list title..."
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <button type="submit" className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
                          Add list
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsAddingList(false); setNewListTitle(""); }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setIsAddingList(true)}
                      className="w-full flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-xl transition font-medium"
                    >
                      <Plus className="w-5 h-5" />
                      Add another list
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Card Modal */}
      {activeCard && (
        <CardModal
          card={activeCard}
          onClose={() => setActiveCard(null)}
          fetchBoard={fetchBoard}
        />
      )}
    </div>
  );
}

// ─── List Component ─────────────────────────────────────────────────────────
function List({ list, index, fetchBoard, setActiveCard, searchQuery, filterLabelId, filterMemberId, filterDueDate }) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [listTitle, setListTitle] = useState(list.title);

  const saveListTitle = async () => {
    if (!listTitle.trim() || listTitle === list.title) {
      setListTitle(list.title);
      setIsEditingTitle(false);
      return;
    }
    try {
      await api.put(`/lists/${list.id}`, { title: listTitle });
      setIsEditingTitle(false);
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteList = async () => {
    if (!confirm(`Delete list "${list.title}" and all its cards?`)) return;
    try {
      await api.delete(`/lists/${list.id}`);
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const addCard = async (e) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    const cards = list.cards || [];
    const maxPos = cards.length > 0 ? Math.max(...cards.map(c => c.position)) : 0;

    try {
      await api.post("/cards", {
        title: newCardTitle,
        listId: list.id,
        position: maxPos + 1000
      });
      setNewCardTitle("");
      setIsAddingCard(false);
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Draggable draggableId={list.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "w-[272px] shrink-0 flex flex-col bg-[#ebecf0] rounded-xl",
            "max-h-[calc(100vh-120px)]",
            snapshot.isDragging && "shadow-xl ring-2 ring-blue-400 rotate-2"
          )}
        >
          {/* List Header */}
          <div {...provided.dragHandleProps} className="px-3 pt-3 pb-2 flex items-center gap-1 group">
            {isEditingTitle ? (
              <input
                autoFocus
                className="font-semibold text-gray-800 text-sm px-2 py-1 w-full bg-white border-2 border-blue-500 rounded focus:outline-none"
                value={listTitle}
                onChange={(e) => setListTitle(e.target.value)}
                onBlur={saveListTitle}
                onKeyDown={(e) => e.key === "Enter" && saveListTitle()}
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="font-semibold text-gray-800 text-sm px-1 truncate cursor-pointer flex-1 hover:bg-white/50 rounded py-1"
              >
                {list.title}
              </h2>
            )}
            <button
              onClick={deleteList}
              title="Delete List"
              className="text-gray-400 hover:bg-gray-300 hover:text-red-600 p-1.5 rounded transition opacity-0 group-hover:opacity-100 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cards Container */}
          <Droppable droppableId={list.id} type="card">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 min-h-[30px]",
                  snapshot.isDraggingOver && "bg-blue-100/40 rounded-lg transition-colors"
                )}
              >
                {(list.cards || []).map((card, idx) => {
                  const matchesSearch = !searchQuery || card.title.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesLabel = !filterLabelId || (card.labels || []).some(l => l.id === filterLabelId);
                  const matchesMember = !filterMemberId || (card.members || []).some(m => m.id === filterMemberId);

                  let matchesDate = true;
                  if (filterDueDate) {
                    if (!card.dueDate) {
                      matchesDate = filterDueDate === "";
                    } else {
                      const dueTime = new Date(card.dueDate).getTime();
                      const now = Date.now();
                      const oneDay = 24 * 60 * 60 * 1000;
                      if (filterDueDate === "overdue") matchesDate = dueTime < now;
                      else if (filterDueDate === "nextDay") matchesDate = dueTime >= now && dueTime <= now + oneDay;
                      else if (filterDueDate === "hasDate") matchesDate = true;
                    }
                  }

                  const isVisible = matchesSearch && matchesLabel && matchesMember && matchesDate;

                  return (
                    <Card
                      key={card.id}
                      card={card}
                      index={idx}
                      fetchBoard={fetchBoard}
                      setActiveCard={setActiveCard}
                      isVisible={isVisible}
                    />
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Add Card Footer */}
          <div className="px-2 pt-1 pb-2">
            {isAddingCard ? (
              <form onSubmit={addCard} className="pb-1">
                <textarea
                  autoFocus
                  className="w-full text-sm p-2 bg-white text-gray-800 rounded shadow-sm focus:outline-none resize-none min-h-[60px] border-2 border-blue-500"
                  placeholder="Enter a title for this card..."
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addCard(e);
                    }
                  }}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button type="submit" className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
                    Add card
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingCard(false); setNewCardTitle(""); }}
                    className="text-gray-500 hover:text-gray-700 p-1.5 rounded hover:bg-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingCard(true)}
                className="flex items-center gap-2 w-full text-left text-gray-600 hover:bg-gray-200 hover:text-gray-800 p-2 rounded-md transition text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add a card
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Card Component ──────────────────────────────────────────────────────────
function Card({ card, index, fetchBoard, setActiveCard, isVisible = true }) {
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => setActiveCard(card)}
          style={{
            ...provided.draggableProps.style,
            display: isVisible ? undefined : "none"
          }}
          className={cn(
            "bg-white rounded-lg shadow-sm mb-2 cursor-pointer group hover:ring-2 hover:ring-blue-400 focus:outline-none relative overflow-hidden",
            snapshot.isDragging && "shadow-lg rotate-2 ring-2 ring-blue-500"
          )}
        >
          {/* Cover */}
          {card.coverUrl ? (
            <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${card.coverUrl})` }} />
          ) : card.coverColor ? (
            <div className="h-8 w-full" style={{ backgroundColor: card.coverColor }} />
          ):<></>}

          <div className="p-2">
            {/* Labels */}
            {card.labels && card.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {card.labels.map(label => (
                  <span
                    key={label.id}
                    className="h-2 w-8 rounded-full"
                    style={{ backgroundColor: label.color }}
                    title={label.title}
                  />
                ))}
              </div>
            )}

            <div className="text-sm text-gray-800 whitespace-pre-wrap break-words pr-6">
              {card.title}
            </div>

            {/* Card Badges Row */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {card.dueDate && (
                <span className={`text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium ${
                  isOverdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                }`}>
                  📅 {new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {card.checklists && card.checklists.some(c => c.items?.length > 0) && (() => {
                const total = card.checklists.reduce((a, c) => a + (c.items?.length || 0), 0);
                const done = card.checklists.reduce((a, c) => a + (c.items?.filter(i => i.isCompleted).length || 0), 0);
                return (
                  <span className={`text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded ${done === total ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    ✅ {done}/{total}
                  </span>
                );
              })()}
              {card.comments && card.comments.length > 0 && (
                <span className="text-xs flex items-center gap-0.5 text-gray-500">
                  💬 {card.comments.length}
                </span>
              )}
              {card.attachments && card.attachments.length > 0 && (
                <span className="text-xs flex items-center gap-0.5 text-gray-500">
                  📎 {card.attachments.length}
                </span>
              )}
            </div>

            {/* Member Avatars */}
            {card.members && card.members.length > 0 && (
              <div className="flex justify-end gap-0.5 mt-1.5">
                {card.members.slice(0, 3).map(m => (
                  <div
                    key={m.id}
                    title={m.name}
                    className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white"
                  >
                    {m.name.charAt(0)}
                  </div>
                ))}
                {card.members.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
                    +{card.members.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit icon — appears on hover */}
          <button
            className="absolute top-2 right-2 p-1 text-gray-500 bg-white hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition z-10 shadow-sm"
            onClick={(e) => { e.stopPropagation(); setActiveCard(card); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      )}
    </Draggable>
  );
}
