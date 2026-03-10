import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Auth.css'

function Register({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState('')

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'

    // Initialize Google Sign-In for register page
    if (window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleSignIn,
        })
        
        const buttonElement = document.getElementById('google-signin-button-register')
        if (buttonElement) {
          window.google.accounts.id.renderButton(
            buttonElement,
            { theme: 'outline', size: 'large', width: '100%' }
          )
        }
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
      const response = await axios.post('/api/auth/register', formData)
      onLogin(response.data.token, response.data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Sign up to start ordering delicious sushi!</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="Minimum 8 characters"
              minLength="8"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading || oauthLoading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="oauth-divider">
          <span>or</span>
        </div>

        <div className="oauth-buttons">
          <div id="google-signin-button-register" className="oauth-button-wrapper"></div>
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
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  )
}

export default Register

