"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function Home() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");

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
      const res = await api.post("/boards", { title: newTitle });
      setBoards([res.data, ...boards]);
      setNewTitle("");
      setShowCreate(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-white p-8">Loading boards...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <h2 className="text-white text-2xl font-bold mb-6">Your Workspaces</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {boards.map((board) => (
          <Link
            key={board.id}
            href={`/b/${board.id}`}
            className="h-24 rounded shadow hover:opacity-90 p-4 font-bold text-white transition-opacity block"
            style={{ backgroundColor: board.color || "#0079bf" }}
          >
            {board.title}
          </Link>
        ))}
        
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="h-24 bg-white/20 hover:bg-white/30 text-white rounded flex items-center justify-center transition-colors"
          >
            Create new board
          </button>
        ) : (
          <form
            onSubmit={createBoard}
            className="h-24 bg-white rounded p-3 flex flex-col justify-between"
          >
            <input
              autoFocus
              className="text-gray-900 font-bold border-b border-gray-300 focus:border-blue-500 focus:outline-none w-full pb-1 text-sm bg-transparent"
              placeholder="Board title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 font-medium"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-gray-500 hover:text-gray-700 text-xs px-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
