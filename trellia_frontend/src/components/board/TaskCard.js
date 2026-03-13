"use client";

import { Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";

/**
 * TaskCard Component
 * Represents a single task item within a column.
 */
export default function TaskCard({ taskData, index, onDataRefresh, onSelectTask, shouldShow = true }) {
  const isExpired = taskData.dueDate && new Date(taskData.dueDate) < new Date();

  return (
    <Draggable draggableId={taskData.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelectTask(taskData)}
          style={{
            ...provided.draggableProps.style,
            display: shouldShow ? undefined : "none"
          }}
          className={cn(
            "bg-white rounded-lg shadow-sm mb-2 cursor-pointer group hover:ring-2 hover:ring-blue-400 focus:outline-none relative overflow-hidden",
            snapshot.isDragging && "shadow-lg rotate-2 ring-2 ring-blue-500"
          )}
        >
          {/* Visual Cover */}
          {taskData.coverUrl ? (
            <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${taskData.coverUrl})` }} />
          ) : taskData.coverColor ? (
            <div className="h-8 w-full" style={{ backgroundColor: taskData.coverColor }} />
          ):<></>}

          <div className="p-2">
            {/* Tag Identifiers */}
            {taskData.labels && taskData.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {taskData.labels.map(label => (
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
              {taskData.title}
            </div>

            {/* Status Indicators */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {taskData.dueDate && (
                <span className={`text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium ${
                  isExpired ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                }`}>
                  📅 {new Date(taskData.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {taskData.checklists && taskData.checklists.some(c => c.items?.length > 0) && (() => {
                const total = taskData.checklists.reduce((a, c) => a + (c.items?.length || 0), 0);
                const done = taskData.checklists.reduce((a, c) => a + (c.items?.filter(i => i.isCompleted).length || 0), 0);
                return (
                  <span className={`text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded ${done === total ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    ✅ {done}/{total}
                  </span>
                );
              })()}
              {taskData.comments && taskData.comments.length > 0 && (
                <span className="text-xs flex items-center gap-0.5 text-gray-500">
                  💬 {taskData.comments.length}
                </span>
              )}
              {taskData.attachments && taskData.attachments.length > 0 && (
                <span className="text-xs flex items-center gap-0.5 text-gray-500">
                  📎 {taskData.attachments.length}
                </span>
              )}
            </div>

            {/* Assigned Personnel */}
            {taskData.members && taskData.members.length > 0 && (
              <div className="flex justify-end gap-0.5 mt-1.5">
                {taskData.members.slice(0, 3).map(m => (
                  <div
                    key={m.id}
                    title={m.name}
                    className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white"
                  >
                    {m.name.charAt(0)}
                  </div>
                ))}
                {taskData.members.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
                    +{taskData.members.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Edit Overlay */}
          <button
            className="absolute top-2 right-2 p-1 text-gray-500 bg-white hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition z-10 shadow-sm"
            onClick={(e) => { e.stopPropagation(); onSelectTask(taskData); }}
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
