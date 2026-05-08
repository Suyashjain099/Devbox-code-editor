import { Navigate } from 'react-router-dom';

// If no token in localStorage, redirect to /login. Otherwise, render children.
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
