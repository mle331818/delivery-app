import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Auth.css'

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState('')

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'

    // Initialize Google Sign-In (guard for availability)
    if (window.google && document.getElementById('google-signin-button')) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleSignIn,
        })

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'large', width: '100%' }
        )
      } catch (err) {
        console.error('Google init error:', err)
      }
    }

    // Initialize Facebook SDK
    if (window.FB) {
      try {
        window.FB.init({
          appId: import.meta.env.VITE_FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID',
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        })
      } catch (err) {
        console.error('Facebook init error:', err)
      }
    }
  }, [])

  const handleGoogleSignIn = async (response) => {
    setOauthLoading('google')
    setError('')
    
    try {
      const result = await axios.post('/api/auth/google', { token: response.credential })
      onLogin(result.data.token, result.data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed. Please try again.')
      setOauthLoading('')
    }
  }

  const handleFacebookSignIn = () => {
    setOauthLoading('facebook')
    setError('')
    
    if (!window.FB) {
      setError('Facebook SDK not loaded. Please refresh the page.')
      setOauthLoading('')
      return
    }

    window.FB.login(async (response) => {
      if (response.authResponse) {
        try {
          // Get user info from Facebook
          window.FB.api('/me', { fields: 'name,email' }, async (userInfo) => {
            try {
              const result = await axios.post('/api/auth/facebook', {
                accessToken: response.authResponse.accessToken,
                userID: response.authResponse.userID,
                email: userInfo.email,
                name: userInfo.name
              })
              onLogin(result.data.token, result.data.user)
            } catch (err) {
              setError(err.response?.data?.error || 'Facebook sign-in failed. Please try again.')
              setOauthLoading('')
            }
          })
        } catch (err) {
          setError('Failed to get Facebook user info.')
          setOauthLoading('')
        }
      } else {
        setError('Facebook login was cancelled.')
        setOauthLoading('')
      }
    }, { scope: 'email' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/login', formData)
      onLogin(response.data.token, response.data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Login</h2>
        <p className="auth-subtitle">Welcome back! Please login to continue.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading || oauthLoading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="oauth-divider">
          <span>or</span>
        </div>

        <div className="oauth-buttons">
          <div id="google-signin-button" className="oauth-button-wrapper"></div>
          <button
            type="button"
            onClick={handleFacebookSignIn}
            disabled={!!oauthLoading}
            className="btn btn-facebook"
          >
            {oauthLoading === 'facebook' ? (
              <>⏳ Signing in...</>
            ) : (
              <>📘 Continue with Facebook</>
            )}
          </button>
        </div>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

        <div className="test-credentials">
          <p><strong>Test Account:</strong></p>
          <p>Email: customer@test.com</p>
          <p>Password: password123</p>
        </div>
      </div>
    </div>
  )
}

export default Login

