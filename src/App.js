import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import ComplianceForm from './components/ComplianceForm';
import AdminViewer from './components/AdminViewer';
import './styles/App.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/form"
              element={
                <ProtectedRoute>
                  <ComplianceForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={<AdminViewer />}
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
