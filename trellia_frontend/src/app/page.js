"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Star } from "lucide-react";
import api from "@/lib/api";

// Preset board colors to pick from when creating
const BOARD_COLORS = [
  "#0079bf", "#d29034", "#519839", "#b04632", "#89609e",
  "#cd5a91", "#4bbf6b", "#00aecc", "#838c91", "#172b4d"
];

export default function Home() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(BOARD_COLORS[0]);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const res = await api.get("/boards");
      setBoards(res.data);
    } catch (err) {
      console.error("Error fetching boards:", err);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await api.post("/boards", { title: newTitle, color: newColor });
      setBoards([res.data, ...boards]);
      setNewTitle("");
      setNewColor(BOARD_COLORS[0]);
      setShowCreate(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter boards by search query
  const filteredBoards = boards.filter(board =>
    board.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white text-lg font-medium animate-pulse">Loading boards...</div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {/* Workspace Header */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            {/* Workspace avatar */}
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              T
            </div>
            <div>
              <h2 className="text-white font-bold text-xl leading-tight">Trellia Workspace</h2>
              <p className="text-white/70 text-xs">Free plan</p>
            </div>
          </div>

          {/* Board search */}
          <div className="relative">
            <Search className="w-4 h-4 text-white/60 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Find boards by name..."
              className="pl-8 pr-4 py-2 bg-white/20 hover:bg-white/25 focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 rounded text-sm text-white placeholder-white/60 w-56 focus:w-72 transition-all focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Section title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 opacity-70">
              <svg viewBox="0 0 24 24" fill="currentColor" className="text-white">
                <path d="M20 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-9 9H4V9h7v6zm9 0h-7V9h7v6z"/>
              </svg>
            </div>
            <h3 className="text-white font-semibold text-sm">YOUR BOARDS</h3>
          </div>
        </div>

        {/* Board Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredBoards.map((board) => (
            <Link
              key={board.id}
              href={`/b/${board.id}`}
              className="group relative h-24 rounded-lg shadow-md hover:shadow-xl hover:scale-[1.02] transition-all p-3 font-bold text-white block overflow-hidden"
              style={{
                backgroundColor: board.color || "#0079bf",
                backgroundImage: board.backgroundUrl ? `url(${board.backgroundUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Dark overlay for readability */}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors rounded-lg" />
              <span className="relative z-10 text-sm font-semibold drop-shadow-sm leading-snug">{board.title}</span>
              {/* Star button */}
              <button
                onClick={(e) => { e.preventDefault(); }}
                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/80 hover:text-yellow-300 z-10"
              >
                <Star className="w-4 h-4" />
              </button>
            </Link>
          ))}

          {/* Create New Board tile */}
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="h-24 bg-white/15 hover:bg-white/25 text-white/80 hover:text-white rounded-lg flex flex-col items-center justify-center gap-1 transition-all text-sm font-medium"
            >
              <span className="text-2xl font-light">+</span>
              <span>Create new board</span>
            </button>
          ) : (
            <form
              onSubmit={createBoard}
              className="h-auto bg-white rounded-lg p-3 flex flex-col gap-2 shadow-md col-span-1"
            >
              {/* Color preview */}
              <div
                className="h-8 rounded w-full mb-1"
                style={{ backgroundColor: newColor }}
              />
              <input
                autoFocus
                className="text-gray-900 border-2 border-blue-500 rounded px-2 py-1 focus:outline-none w-full text-sm"
                placeholder="Board title *"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              {/* Color picker */}
              <div className="flex flex-wrap gap-1">
                {BOARD_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={`w-5 h-5 rounded-full transition hover:scale-125 ${newColor === color ? "ring-2 ring-offset-1 ring-gray-500" : ""}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 font-medium">
                  Create
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-700 text-xs px-2">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* No results message */}
        {filteredBoards.length === 0 && searchQuery && (
          <div className="text-center text-white/70 mt-8 text-sm">
            No boards found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
