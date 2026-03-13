"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Only show the Create button on the workspace/boards home page
  const isHomePage = pathname === "/" || pathname === "/boards";

  const [showCreate, setShowCreate] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const createRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (createRef.current && !createRef.current.contains(e.target)) {
        setShowCreate(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCreateBoard = async (e) => {
  e.preventDefault();
  if (!newBoardTitle.trim()) return;

  try {
    const { default: api } = await import("@/lib/api");

    const res = await api.post("/boards", { title: newBoardTitle }); // CHANGE

    setNewBoardTitle("");
    setShowCreate(false);

    router.push(`/b/${res.data.id}`); // IMPORTANT CHANGE
  } catch (err) {
    console.error(err);
  }
};
  return (
    <nav className="h-12 w-full bg-black/30 backdrop-blur-sm border-b border-white/10 flex items-center px-4 justify-between sticky top-0 z-[1000]">
      {/* Left: Logo + Nav buttons */}
      <div className="flex items-center gap-3">
        {/* Logo → home */}
        <Link href="/" className="text-white font-bold text-xl hover:bg-white/20 px-2 py-1 rounded transition-colors select-none">
          Trellia
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {/* Workspaces → navigates to root/boards page */}
          <button
            onClick={() => router.push("/")}
            className="text-white hover:bg-white/20 px-3 py-1.5 rounded text-sm transition-colors font-medium"
          >
            Workspaces
          </button>

          {/* Conditionally show Create button only on home/boards page */}
          {isHomePage && (
            <div className="relative" ref={createRef}>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="bg-white text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded text-sm transition-colors font-semibold"
              >
                + Create
              </button>

              {showCreate && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-2xl border border-gray-200 z-[1100] p-4 text-gray-800">
                  <h3 className="font-semibold mb-1">Create board</h3>
                  <p className="text-xs text-gray-500 mb-3">A board is made up of cards ordered on lists. Use it to manage projects, track information, or organize anything.</p>
                  <form onSubmit={handleCreateBoard} className="flex flex-col gap-2">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Board title *"
                      className="text-sm border-2 border-blue-500 rounded px-3 py-2 w-full focus:outline-none"
                      value={newBoardTitle}
                      onChange={(e) => setNewBoardTitle(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      disabled={!newBoardTitle.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm py-2 rounded font-medium transition-colors"
                    >
                      Create
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Search + Avatar */}
      <div className="flex items-center gap-2">
        {/* <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-white/70 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search"
            className="bg-white/20 hover:bg-white/30 focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:outline-none text-white placeholder-white/70 text-sm rounded-md pl-8 pr-3 py-1.5 w-40 md:w-48 transition-all focus:w-56 md:focus:w-64"
          />
        </div> */}
        <div className="h-8 w-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-sm select-none cursor-pointer hover:bg-blue-600 transition-colors">
          D
        </div>
      </div>
    </nav>
  );
}
