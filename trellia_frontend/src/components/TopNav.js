export default function TopNav() {
  return (
    <nav className="h-12 w-full bg-[var(--color-board-header)] backdrop-blur-sm border-b border-white/20 flex items-center px-4 justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <h1 className="text-white font-bold text-xl hover:bg-white/20 px-2 py-1 rounded cursor-pointer transition-colors">
          Trellia
        </h1>
        <div className="hidden md:flex items-center gap-2">
          <button className="text-white hover:bg-white/20 px-3 py-1.5 rounded text-sm transition-colors">Workspaces</button>
          <button className="text-white hover:bg-white/20 px-3 py-1.5 rounded text-sm transition-colors">Recent</button>
          <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded text-sm transition-colors cursor-pointer">
            Create
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative relative-search group">
          <input
            type="text"
            placeholder="Search"
            className="bg-white/20 hover:bg-white/30 focus:bg-white focus:text-gray-900 focus:outline-none text-white text-sm rounded-md px-3 py-1.5 w-48 transition-all group-hover:w-64"
          />
        </div>
        <div className="h-8 w-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-sm select-none cursor-pointer">
          D
        </div>
      </div>
    </nav>
  );
}
