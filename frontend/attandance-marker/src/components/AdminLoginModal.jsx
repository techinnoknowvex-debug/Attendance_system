export default function AdminLoginModal({ 
  Adminshow, 
  setAdminshow, 
  adminEmpid, 
  setAdminEmpid, 
  password, 
  setPassword, 
  adminLoading, 
  onAdminSubmit 
}) {
  return (
    <>
      <div className="absolute top-5 right-5 z-10">
        <button
          className="bg-[#FF9500] hover:bg-[#FF8500] text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
          onClick={() => setAdminshow(!Adminshow)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Admin
        </button>

        {Adminshow && (
          <div className="glass-effect p-6 mt-4 rounded-2xl shadow-2xl w-80 backdrop-blur-lg animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Admin Login</h2>
              <button
                onClick={() => setAdminshow(false)}
                className="text-black hover:text-[#FF9500] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={onAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">Employee ID</label>
                <input
                  type="text"
                  placeholder="Enter Employee ID"
                  value={adminEmpid}
                  onChange={(e) => setAdminEmpid(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent transition-all bg-cream-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Password</label>
                <input
                  type="password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent transition-all bg-cream-100"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full bg-gradient-to-r from-black to-gray-800 hover:bg-[#FF8500] text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {adminLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

