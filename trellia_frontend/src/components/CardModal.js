import { useState, useEffect } from "react";
import { X, AlignLeft, Calendar, Tag, CheckSquare, Trash2, Users } from "lucide-react";
import api from "@/lib/api";

export default function CardModal({ card, onClose, fetchBoard }) {
  const [title, setTitle] = useState(card.title || "");
  const [description, setDescription] = useState(card.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [allLabels, setAllLabels] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showLabelsMenu, setShowLabelsMenu] = useState(false);
  const [showMembersMenu, setShowMembersMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  useEffect(() => {
    fetchLabels();
    fetchUsers();
  }, []);

  const fetchLabels = async () => {
    try {
      const res = await api.get("/labels");
      setAllLabels(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setAllUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Stop propagation to close modal when clicking outside
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const saveTitle = async () => {
    if (!title.trim() || title === card.title) return;
    try {
      await api.put(`/cards/${card.id}`, { title });
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const saveDescription = async () => {
    try {
      await api.put(`/cards/${card.id}`, { description });
      setIsEditingDesc(false);
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCard = async () => {
    if (confirm("Are you sure you want to delete this card?")) {
      try {
        await api.delete(`/cards/${card.id}`);
        fetchBoard();
        onClose();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleLabel = async (labelId) => {
    try {
      const currentLabelIds = (card.labels || []).map(l => l.id);
      let newLabelIds;
      if (currentLabelIds.includes(labelId)) {
        newLabelIds = currentLabelIds.filter(id => id !== labelId);
      } else {
        newLabelIds = [...currentLabelIds, labelId];
      }
      
      await api.put(`/cards/${card.id}`, { labelIds: newLabelIds });
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMember = async (userId) => {
    try {
      const currentMemberIds = (card.members || []).map(m => m.id);
      let newMemberIds = currentMemberIds.includes(userId)
        ? currentMemberIds.filter(id => id !== userId)
        : [...currentMemberIds, userId];
      
      await api.put(`/cards/${card.id}`, { memberIds: newMemberIds });
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const setDueDate = async (e) => {
    e.preventDefault();
    const date = new FormData(e.target).get("dueDate");
    if (!date) return;
    try {
      await api.put(`/cards/${card.id}`, { dueDate: new Date(date).toISOString() });
      setShowDateMenu(false);
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const addChecklist = async () => {
    try {
      await api.post("/checklists", { title: "Checklist", cardId: card.id });
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const addChecklistItem = async (e, checklistId) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      try {
        await api.post(`/checklists/${checklistId}/items`, { title: e.target.value.trim() });
        e.target.value = "";
        fetchBoard();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleChecklistItem = async (itemId, isCompleted) => {
    try {
      await api.put(`/checklists/items/${itemId}`, { isCompleted });
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteChecklist = async (checklistId) => {
    try {
      await api.delete(`/checklists/${checklistId}`);
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-start justify-center pt-16" onClick={handleOverlayClick}>
      <div className="bg-[#f4f5f7] rounded-xl shadow-2xl w-full max-w-3xl min-h-[600px] flex overflow-hidden">
        
        {/* Main Content */}
        <div className="flex-1 p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-8 pr-10">
            <input
              className="text-2xl font-semibold bg-transparent border-2 border-transparent focus:border-blue-500 focus:bg-white rounded px-2 w-full outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            />
            <p className="text-sm text-gray-500 px-2 mt-1">
              in list <span className="underline">{card.list?.title || "Unknown"}</span>
            </p>
          </div>

              <div className="flex flex-col gap-6">
            {/* Header badges section (Labels, Members, Due Date) */}
            <div className="flex flex-wrap gap-6 mb-2">
              {card.members && card.members.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-1">Members</h3>
                  <div className="flex gap-1">
                    {card.members.map(m => (
                      <div key={m.id} title={m.name} className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-700 select-none">
                        {m.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {card.labels && card.labels.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-1">Labels</h3>
                  <div className="flex flex-wrap gap-1">
                    {card.labels.map(l => (
                      <span key={l.id} className="px-3 py-1 rounded text-white text-sm font-medium shadow-sm" style={{ backgroundColor: l.color }}>
                        {l.title || "Label"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {card.dueDate && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-1">Due Date</h3>
                  <div className="bg-gray-200 px-3 py-1 rounded text-sm text-gray-800 font-medium">
                    {new Date(card.dueDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <AlignLeft className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-800 text-lg">Description</h3>
              </div>
              
              <div className="pl-8">
                {isEditingDesc ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      autoFocus
                      className="w-full text-sm p-3 bg-white border-2 border-blue-500 rounded-md focus:outline-none min-h-[100px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a more detailed description..."
                    />
                    <div className="flex gap-2">
                      <button onClick={saveDescription} className="bg-blue-600 text-white font-medium px-4 py-2 rounded text-sm hover:bg-blue-700 transition">
                        Save
                      </button>
                      <button onClick={() => { setIsEditingDesc(false); setDescription(card.description || ""); }} className="text-gray-600 hover:bg-gray-200 px-4 py-2 rounded font-medium text-sm transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className={`text-sm p-3 rounded-md cursor-pointer transition ${description ? "bg-white text-gray-800 shadow-sm" : "bg-gray-200 text-gray-700 hover:bg-gray-300 min-h-[50px]"}`}
                  >
                    {description || "Add a more detailed description..."}
                  </div>
                )}
              </div>
            </div>

            {/* Checklists */}
            {card.checklists && card.checklists.map(checklist => {
              const items = checklist.items || [];
              const percent = items.length === 0 ? 0 : Math.round((items.filter(i => i.isCompleted).length / items.length) * 100);
              
              return (
                <div key={checklist.id} className="mt-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-800 text-lg">{checklist.title}</h3>
                    </div>
                    <button onClick={() => deleteChecklist(checklist.id)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded text-sm transition">Delete</button>
                  </div>
                  
                  <div className="pl-8 mb-3 flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-8">{percent}%</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>

                  <div className="pl-8 flex flex-col gap-2">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 group relative cursor-pointer hover:bg-gray-100 p-1.5 rounded -mx-1.5 transition">
                        <input 
                          type="checkbox" 
                          checked={item.isCompleted} 
                          onChange={(e) => toggleChecklistItem(item.id, e.target.checked)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className={`text-sm text-gray-800 ${item.isCompleted ? 'line-through text-gray-400' : ''}`}>{item.title}</span>
                      </div>
                    ))}
                    
                    <div className="mt-2 text-sm text-gray-800">
                      <input 
                        type="text" 
                        placeholder="Add an item... (Press Enter text)"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => addChecklistItem(e, checklist.id)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-48 bg-gray-100 p-6 flex flex-col gap-4 border-l border-gray-200 relative">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Add to card</h4>
          
          <div className="relative">
            <button 
              onClick={() => setShowMembersMenu(!showMembersMenu)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left"
            >
              <Users className="w-4 h-4" /> Members
            </button>
            {showMembersMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded shadow-lg border border-gray-200 z-50 p-3">
                <h4 className="text-center font-semibold text-gray-600 border-b pb-2 mb-2 text-sm">Members</h4>
                <div className="flex flex-col gap-2">
                  {allUsers.map(user => {
                    const isSelected = (card.members || []).some(m => m.id === user.id);
                    return (
                      <div 
                        key={user.id} 
                        onClick={() => toggleMember(user.id)}
                        className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-100 rounded"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
                          {user.name.charAt(0)}
                        </div>
                        <span className="flex-1 text-sm text-gray-800">{user.name}</span>
                        {isSelected && <CheckSquare className="w-4 h-4 text-green-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowLabelsMenu(!showLabelsMenu)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left"
            >
              <Tag className="w-4 h-4" /> Labels
            </button>
            {showLabelsMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded shadow-lg border border-gray-200 z-50 p-3">
                <h4 className="text-center font-semibold text-gray-600 border-b pb-2 mb-2 text-sm">Labels</h4>
                <div className="flex flex-col gap-2">
                  {allLabels.map(label => {
                    const isSelected = (card.labels || []).some(l => l.id === label.id);
                    return (
                      <div 
                        key={label.id} 
                        onClick={() => toggleLabel(label.id)}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <div 
                          className={`flex-1 h-8 rounded px-3 flex items-center text-white text-sm font-medium hover:-translate-x-1 transition-transform ${isSelected ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                          style={{ backgroundColor: label.color }}
                        >
                          {label.title}
                        </div>
                        {isSelected && <CheckSquare className="w-4 h-4 text-green-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <button onClick={addChecklist} className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left">
            <CheckSquare className="w-4 h-4" /> Checklist
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left"
            >
              <Calendar className="w-4 h-4" /> Dates
            </button>
            {showDateMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded shadow-lg border border-gray-200 z-50 p-3">
                <h4 className="text-center font-semibold text-gray-600 border-b pb-2 mb-2 text-sm">Due Date</h4>
                <form onSubmit={setDueDate} className="flex flex-col gap-2">
                  <input 
                    type="date" 
                    name="dueDate" 
                    required 
                    defaultValue={card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : ""}
                    className="border p-2 rounded text-sm w-full"
                  />
                  <button type="submit" className="bg-blue-600 text-white p-2 rounded text-sm font-medium hover:bg-blue-700">Set Date</button>
                </form>
              </div>
            )}
          </div>
          
          <div className="my-2 border-t border-gray-300"></div>

          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Actions</h4>
          <button onClick={deleteCard} className="bg-red-100/50 hover:bg-red-100 text-red-700 rounded transition p-2 flex items-center gap-2 text-sm font-medium w-full text-left">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
