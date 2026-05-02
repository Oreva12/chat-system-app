import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: "40vh" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;