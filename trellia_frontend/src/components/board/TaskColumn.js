"use client";

import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, X } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import TaskCard from "./TaskCard";

/**
 * TaskColumn Component
 * Represents a vertical list/column of task cards.
 */
export default function TaskColumn({ columnData, index, onDataUpdate, onSelectTask, searchQuery, filterLabelId, filterMemberId, filterDueDate }) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [columnTitle, setColumnTitle] = useState(columnData.title);

  const handleTitleStorage = async () => {
    if (!columnTitle.trim() || columnTitle === columnData.title) {
      setColumnTitle(columnData.title);
      setIsEditingTitle(false);
      return;
    }
    try {
      await api.put(`/lists/${columnData.id}`, { title: columnTitle });
      setIsEditingTitle(false);
      onDataUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExcision = async () => {
    if (!confirm(`Permanently remove column "${columnData.title}" and its contents?`)) return;
    try {
      await api.delete(`/lists/${columnData.id}`);
      onDataUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskInsertion = async (e) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    const currentCards = columnData.cards || [];
    const highestPos = currentCards.length > 0 ? Math.max(...currentCards.map(c => c.position)) : 0;

    try {
      await api.post("/cards", {
        title: newCardTitle,
        listId: columnData.id,
        position: highestPos + 1000
      });
      setNewCardTitle("");
      setIsAddingCard(false);
      onDataUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Draggable draggableId={columnData.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "w-full md:w-[272px] shrink-0 flex flex-col bg-[#ebecf0] rounded-xl",
            "max-h-[calc(100vh-120px)]",
            snapshot.isDragging && "shadow-xl ring-2 ring-blue-400 rotate-2"
          )}
        >
          {/* Column Header */}
          <div {...provided.dragHandleProps} className="px-3 pt-3 pb-2 flex items-center gap-1 group">
            {isEditingTitle ? (
              <input
                autoFocus
                className="font-semibold text-gray-800 text-sm px-2 py-1 w-full bg-white border-2 border-blue-500 rounded focus:outline-none"
                value={columnTitle}
                onChange={(e) => setColumnTitle(e.target.value)}
                onBlur={handleTitleStorage}
                onKeyDown={(e) => e.key === "Enter" && handleTitleStorage()}
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="font-semibold text-gray-800 text-sm px-1 truncate cursor-pointer flex-1 hover:bg-white/50 rounded py-1"
              >
                {columnData.title}
              </h2>
            )}
            <button
              onClick={handleExcision}
              title="Remove Column"
              className="text-gray-400 hover:bg-gray-300 hover:text-red-600 p-1.5 rounded transition opacity-0 group-hover:opacity-100 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable Tasks Area */}
          <Droppable droppableId={columnData.id} type="card">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 min-h-[30px]",
                  snapshot.isDraggingOver && "bg-blue-100/40 rounded-lg transition-colors"
                )}
              >
                {(columnData.cards || []).map((card, idx) => {
                  const queryMatch = !searchQuery || card.title.toLowerCase().includes(searchQuery.toLowerCase());
                  const labelMatch = !filterLabelId || (card.labels || []).some(l => l.id === filterLabelId);
                  const memberMatch = !filterMemberId || (card.members || []).some(m => m.id === filterMemberId);

                  let dateMatch = true;
                  if (filterDueDate) {
                    if (!card.dueDate) {
                      dateMatch = filterDueDate === "";
                    } else {
                      const dueTimestamp = new Date(card.dueDate).getTime();
                      const currentMillis = Date.now();
                      const dayBuffer = 24 * 60 * 60 * 1000;
                      if (filterDueDate === "overdue") dateMatch = dueTimestamp < currentMillis;
                      else if (filterDueDate === "nextDay") dateMatch = dueTimestamp >= currentMillis && dueTimestamp <= currentMillis + dayBuffer;
                      else if (filterDueDate === "hasDate") dateMatch = true;
                    }
                  }

                  const shouldShow = queryMatch && labelMatch && memberMatch && dateMatch;

                  return (
                    <TaskCard
                      key={card.id}
                      taskData={card}
                      index={idx}
                      onDataRefresh={onDataUpdate}
                      onSelectTask={onSelectTask}
                      shouldShow={shouldShow}
                    />
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Interaction Footer */}
          <div className="px-2 pt-1 pb-2">
            {isAddingCard ? (
              <form onSubmit={handleTaskInsertion} className="pb-1">
                <textarea
                  autoFocus
                  className="w-full text-sm p-2 bg-white text-gray-800 rounded shadow-sm focus:outline-none resize-none min-h-[60px] border-2 border-blue-500"
                  placeholder="Task title..."
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleTaskInsertion(e);
                    }
                  }}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button type="submit" className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
                    Create Card
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
                Add a task
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
