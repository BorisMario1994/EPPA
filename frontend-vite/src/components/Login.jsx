import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://192.168.52.27:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Login response:', data);
        onLogin(data);
      } else {
        // Handle different types of errors
        if (response.status === 500) {
          setError('Server error. Please try again later or contact support.');
        } else if (response.status === 401) {
          setError('Invalid username or password');
        } else {
          setError(data.message || 'An error occurred. Please try again.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>EPPA</h1>
          <p>Environmental Project Planning Application</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              disabled={isLoading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
            {!isLoading && <span className="button-arrow">→</span>}
          </button>
        </form>
        <div className="login-footer">
          <p>© 2024 EPPA. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login; 