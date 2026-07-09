import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute    from "./components/ProtectedRoute";
import LiveAnnouncer     from "./components/LiveAnnouncer";

// Eagerly load auth pages — small and needed immediately
import Login    from "./pages/page.login";
import Register from "./pages/Register";

// Lazy load Chat — large bundle, only needed after login
const Chat = lazy(() => import("./pages/Chat"));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-dark flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-blue border-t-transparent
                      rounded-full animate-spin" />
      <p className="text-muted text-sm">Loading...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LiveAnnouncer />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat"     element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;