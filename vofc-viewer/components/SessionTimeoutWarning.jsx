import { useSessionTimeout } from '../lib/useSessionTimeout';

export default function SessionTimeoutWarning() {
  const { showWarning, timeLeft, resetTimeout } = useSessionTimeout();

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Session Timeout Warning
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Your session will expire in <span className="font-semibold text-red-600">{timeLeft} seconds</span> due to inactivity.
          </p>
          
          <p className="text-xs text-gray-500 mb-6">
            Click anywhere or perform any action to extend your session.
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={resetTimeout}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Extend Session
            </button>
            
            <button
              onClick={() => window.location.href = '/splash'}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

