export default function PINModal({
  showPINModal,
  setShowPINModal,
  otp,
  setOtp,
  pinLoading,
  otpTimer = 0,
  onPINSubmit,
  onResendOtp
}) {
  if (!showPINModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-[#FF9500] mb-6">Verify OTP</h2>
        <p className="text-gray-600 mb-6">Please enter the OTP sent to your email:</p>
        <form onSubmit={onPINSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => {
                // allow only digits and strip whitespace
                const cleaned = e.target.value.replace(/\D/g, "").trim();
                setOtp(cleaned);
              }}
              onKeyPress={(e) => e.key === 'Enter' && onPINSubmit(e)}
              placeholder="Enter OTP"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] bg-cream-100"
              autoFocus
              required
            />
          </div>

          {/* Resend OTP Section */}
          <div className="flex items-center justify-between bg-cream-100 p-3 rounded-xl">
            <span className="text-sm text-gray-600">
              {otpTimer > 0 ? `Resend in ${otpTimer}s` : "OTP expired?"}
            </span>
            <button
              type="button"
              onClick={onResendOtp}
              disabled={otpTimer > 0 || pinLoading}
              className="text-xs bg-[#FF9500] hover:bg-[#FF8500] text-white px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resend OTP
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowPINModal(false);
                setOtp("");
              }}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-black py-3 rounded-xl font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pinLoading}
              className="flex-1 bg-[#FF9500] hover:bg-[#FF8500] text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pinLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                "Verify OTP"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

