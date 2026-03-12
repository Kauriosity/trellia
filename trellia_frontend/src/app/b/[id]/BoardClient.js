"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "@/lib/api";
import { MoreHorizontal, Plus, Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import CardModal from "@/components/CardModal";

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

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    if (type === "list") {
      // Reorder lists
      const newLists = Array.from(lists);
      const [movedList] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, movedList);
      
      // Update positions
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
        fetchBoard(); // Revert on failure
      }
      return;
    }

    // Card Reordering
    const sourceListIndex = lists.findIndex((l) => l.id === source.droppableId);
    const destListIndex = lists.findIndex((l) => l.id === destination.droppableId);
    
    if (sourceListIndex === -1 || destListIndex === -1) return;

    const sourceList = lists[sourceListIndex];
    const destList = lists[destListIndex];

    const newSourceCards = Array.from(sourceList.cards || []);
    const [movedCard] = newSourceCards.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      // Reorder within same list
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
      // Move between lists
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
    const newList = {
      title: newListTitle,
      boardId,
      position: maxPos + 1000,
    };

    try {
      const res = await api.post("/lists", newList);
      setLists([...lists, { ...res.data, cards: [] }]);
      setNewListTitle("");
      setIsAddingList(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-4 text-white">Loading board...</div>;
  if (!board) return <div className="p-4 text-white">Board not found.</div>;

  return (
    <div className="flex flex-col h-full bg-cover bg-center" style={{ backgroundColor: board.color }}>
      {/* Board Header */}
      <div className="h-auto min-h-12 w-full bg-black/20 flex flex-wrap items-center px-4 py-2 gap-4">
        <h1 className="text-white font-bold text-lg hover:bg-white/20 px-2 rounded cursor-pointer transition select-none">
          {board.title}
        </h1>
        <div className="h-6 w-px bg-white/30 hidden sm:block"></div>
        
        <div className="flex gap-2 text-sm text-white font-medium relative">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${showFilters || searchQuery || filterLabelId || filterMemberId || filterDueDate ? 'bg-white text-blue-800' : 'bg-white/20 hover:bg-white/30'}`}
          >
            <Filter className="w-4 h-4" /> Filters
            {(searchQuery || filterLabelId || filterMemberId || filterDueDate) && (
              <span className="bg-blue-600 text-white text-xs px-1.5 rounded-full ml-1">Active</span>
            )}
          </button>
          
          {showFilters && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-md shadow-xl border border-gray-200 p-4 z-50 text-gray-800 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Filter Cards</h4>
                <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mb-4 text-gray-800">
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Keyword</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search cards..."
                    className="w-full pl-8 pr-2 py-1.5 text-sm border-2 border-gray-200 rounded focus:border-blue-500 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2" />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Members</label>
                <div className="flex flex-col gap-1">
                  <div 
                    onClick={() => setFilterMemberId("")}
                    className={`text-sm py-1.5 px-2 rounded cursor-pointer ${filterMemberId === "" ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
                  >
                    Any member
                  </div>
                  {allUsers.map(usr => (
                    <div 
                      key={usr.id}
                      onClick={() => setFilterMemberId(usr.id)}
                      className={`text-sm py-1.5 px-2 rounded cursor-pointer flex items-center gap-2 ${filterMemberId === usr.id ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
                        {usr.name.charAt(0)}
                      </div>
                      {usr.name}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">Labels</label>
                <div className="flex flex-col gap-1">
                  <div 
                    onClick={() => setFilterLabelId("")}
                    className={`text-sm py-1.5 px-2 rounded cursor-pointer ${filterLabelId === "" ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
                  >
                    Any label
                  </div>
                  {allLabels.map(lbl => (
                    <div 
                      key={lbl.id}
                      onClick={() => setFilterLabelId(lbl.id)}
                      className={`text-sm py-1.5 px-2 rounded cursor-pointer flex items-center gap-2 ${filterLabelId === lbl.id ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
                    >
                      <span className="w-4 h-4 rounded shadow-sm" style={{ backgroundColor: lbl.color }} />
                      {lbl.title}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block mt-4">Due Date</label>
                <div className="flex flex-col gap-1">
                  {["", "overdue", "nextDay", "hasDate"].map((val) => {
                    const labels = {
                      "": "Any date",
                      "overdue": "Overdue",
                      "nextDay": "Due in next 24 hours",
                      "hasDate": "Has a due date"
                    };
                    return (
                      <div 
                        key={val}
                        onClick={() => setFilterDueDate(val)}
                        className={`text-sm py-1.5 px-2 rounded cursor-pointer ${filterDueDate === val ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
                      >
                        {labels[val]}
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
          
          <button className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded transition">Share</button>
        </div>
      </div>

      {/* Lists canvas */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {/* Same Lists canvas as above */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" type="list" direction="horizontal">
            {(provided) => (
              <div 
                className="flex items-start gap-4 h-full"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {lists.map((list, index) => (
                  <List
                    key={list.id}
                    list={list}
                    index={index}
                    fetchBoard={fetchBoard}
                    setActiveCard={setActiveCard}
                    searchQuery={searchQuery}
                    filterLabelId={filterLabelId}
                    filterMemberId={filterMemberId}
                    filterDueDate={filterDueDate}
                  />
                ))}
                {provided.placeholder}

                {/* Add New List Button */}
                <div className="min-w-[272px] shrink-0">
                  {isAddingList ? (
                    <form onSubmit={addList} className="bg-white rounded-md p-2 shadow-sm">
                      <input
                        autoFocus
                        className="w-full text-sm p-1.5 border-2 border-blue-500 rounded focus:outline-none mb-2"
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
                          onClick={() => setIsAddingList(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button 
                      onClick={() => setIsAddingList(true)}
                      className="w-full flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-md transition font-medium"
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
      {activeCard && (
        <CardModal 
          card={{...activeCard, list: lists.find(l => l.id === activeCard.listId)}} 
          onClose={() => setActiveCard(null)} 
          fetchBoard={fetchBoard} 
        />
      )}
    </div>
  );
}

// Inline List component for simplicity
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
    if (confirm("Are you sure you want to delete this list and all its cards?")) {
      try {
        await api.delete(`/lists/${list.id}`);
        fetchBoard();
      } catch (err) {
        console.error(err);
      }
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
            "w-[272px] shrink-0 flex flex-col bg-[#ebecf0] rounded-xl max-h-full",
            snapshot.isDragging && "shadow-xl ring-2 ring-blue-400 rotate-2"
          )}
        >
          {/* List Header */}
          <div {...provided.dragHandleProps} className="px-3 pt-3 pb-2 flex justify-between items-center group relative">
            {isEditingTitle ? (
              <input
                autoFocus
                className="font-semibold text-gray-800 text-sm px-1 w-full bg-white border-2 border-blue-500 rounded focus:outline-none"
                value={listTitle}
                onChange={(e) => setListTitle(e.target.value)}
                onBlur={saveListTitle}
                onKeyDown={(e) => e.key === "Enter" && saveListTitle()}
              />
            ) : (
              <h2 onClick={() => setIsEditingTitle(true)} className="font-semibold text-gray-800 text-sm px-1 truncate cursor-pointer flex-1">
                {list.title}
              </h2>
            )}
            <button onClick={deleteList} title="Delete List" className="text-gray-500 hover:bg-gray-300 hover:text-red-600 p-1.5 rounded transition opacity-0 group-hover:opacity-100 ml-2">
              <MoreHorizontal className="w-4 h-4 hidden" />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>

          {/* Cards Container */}
          <Droppable droppableId={list.id} type="card">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 min-h-[30px] custom-scrollbar",
                  snapshot.isDraggingOver && "bg-gray-200/50 rounded-lg transition-colors"
                )}
              >
                {(list.cards || []).map((card, idx) => {
                  const matchesSearch = !searchQuery || card.title.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesLabel = !filterLabelId || (card.labels || []).some(l => l.id === filterLabelId);
                  const matchesMember = !filterMemberId || (card.members || []).some(m => m.id === filterMemberId);
                  
                  let matchesDate = true;
                  if (filterDueDate) {
                    if (!card.dueDate) matchesDate = false;
                    else {
                      const dueTime = new Date(card.dueDate).getTime();
                      const now = Date.now();
                      const oneDay = 24 * 60 * 60 * 1000;
                      if (filterDueDate === "overdue") matchesDate = dueTime < now;
                      else if (filterDueDate === "nextDay") matchesDate = dueTime >= now && dueTime <= now + oneDay;
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
                  className="w-full text-sm p-2 bg-white text-gray-800 rounded shadow-sm focus:outline-none resize-none min-h-[60px]"
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
                    onClick={() => setIsAddingCard(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
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

// Inline Card component for simplicity
function Card({ card, index, fetchBoard, setActiveCard, isVisible = true }) {
  if (!isVisible && false) return null; // We are keeping them in DOM for DND to work, but we will hide or dim them

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
            display: isVisible ? 'block' : 'none'
          }}
          className={cn(
            "bg-white rounded-lg shadow-sm p-2 mb-2 cursor-pointer group hover:ring-2 hover:ring-blue-400 focus:outline-none relative",
            snapshot.isDragging && "shadow-lg rotate-3",
          )}
        >
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
          
          <div className="text-sm text-gray-800 whitespace-pre-wrap word-break">{card.title}</div>
          
          {/* Edit pencil icon (appears on hover) */}
          <button className="absolute top-2 right-2 p-1 text-gray-500 bg-gray-50 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition z-10">
            {/* Edit icon SVG */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
        </div>
      )}
    </Draggable>
  );
}
