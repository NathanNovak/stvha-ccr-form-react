import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email || !password) {
      return setError('Please enter both email and password');
    }

    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
      navigate('/form');
    } catch (error) {
      let errorMsg = 'Failed to sign in. ';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMsg += 'Invalid email or password.';
          break;
        case 'auth/invalid-email':
          errorMsg += 'Invalid email format.';
          break;
        case 'auth/too-many-requests':
          errorMsg += 'Too many failed attempts. Try again later.';
          break;
        default:
          errorMsg += error.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  // async function handleGoogleSignIn() {
  //   try {
  //     setError('');
  //     setLoading(true);
  //     await signInWithGoogle();
  //     navigate('/form');
  //   } catch (error) {
  //     let errorMsg = 'Google sign in failed. ';
  //     if (error.code === 'auth/popup-closed-by-user') {
  //       errorMsg += 'Sign in cancelled.';
  //     } else if (error.code === 'auth/unauthorized-domain') {
  //       errorMsg += 'This domain is not authorized. Please add it in Firebase Console.';
  //     } else {
  //       errorMsg += error.message;
  //     }
  //     setError(errorMsg);
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Sunrise Territory Village</h1>
          <h2>CCR Compliance Review Checklist</h2>
        </div>

        <div className="login-box">
          <h3 className="login-title">🔐 Sign In Required</h3>
          <p className="login-subtitle">
            This form is restricted to authorized review team members only.
          </p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/*<div className="auth-divider">*/}
          {/*  <span>OR</span>*/}
          {/*</div>*/}

          {/*<button*/}
          {/*  className="auth-btn google-btn"*/}
          {/*  onClick={handleGoogleSignIn}*/}
          {/*  disabled={loading}*/}
          {/*>*/}
          {/*  <svg width="18" height="18" viewBox="0 0 24 24">*/}
          {/*    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>*/}
          {/*    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>*/}
          {/*    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>*/}
          {/*    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>*/}
          {/*  </svg>*/}
          {/*  Sign in with Google*/}
          {/*</button>*/}

          <p className="login-footer">
            Don't have an account? Contact the STVHA Board Administrator to get access.
          </p>

          {/*<div className="admin-link">*/}
          {/*  <Link to="/admin">📊 Admin Portal - View Submissions</Link>*/}
          {/*</div>*/}
        </div>
      </div>
    </div>
  );
}

export default Login;
