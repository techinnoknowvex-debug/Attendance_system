export default function LOPModal({
  showLOPModal,
  setShowLOPModal,
  lopEmpId,
  setLopEmpId,
  lopReason,
  setLopReason,
  lopDate,
  setLopDate,
  lopLoading,
  onLOPSubmit
}) {
  if (!showLOPModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-[#FF9500] mb-6">Mark LOP</h2>
        <form onSubmit={onLOPSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">Employee ID</label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] bg-cream-100"
              value={lopEmpId}
              onChange={(e) => setLopEmpId(e.target.value)}
              placeholder="Enter Employee ID"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-2">Reason for LOP</label>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] bg-cream-100"
              value={lopReason}
              onChange={(e) => setLopReason(e.target.value)}
              placeholder="Enter reason for LOP"
              rows="3"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-2">LOP Marking Date</label>
            <input
              type="date"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] bg-cream-100"
              value={lopDate}
              onChange={(e) => setLopDate(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowLOPModal(false);
                setLopEmpId("");
                setLopReason("");
                setLopDate("");
              }}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-black py-3 rounded-xl font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={lopLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {lopLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Marking...
                </>
              ) : (
                "Mark LOP"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

