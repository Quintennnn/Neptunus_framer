import * as React from "react"
import { Frame, Override } from "framer"
import { useEffect, useState } from "react"

interface TokenHandlerProps {
  onAuthComplete?: (success: boolean, error?: string) => void
  redirectAfterAuth?: string
}

/**
 * Hidden component that handles Cognito OAuth callback tokens
 * Place this component on any page that might receive OAuth redirects
 */
function TokenHandlerManager({ onAuthComplete, redirectAfterAuth }: TokenHandlerProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      handleTokens()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const handleTokens = async () => {
    try {
      setIsProcessing(true)
      
      // Force console logs to appear even in production
      const log = (...args: any[]) => {
        console.log(...args)
        // Also try to show in DOM for debugging
        if (typeof window !== 'undefined') {
          const debugDiv = document.getElementById('auth-debug') || document.createElement('div')
          if (!document.getElementById('auth-debug')) {
            debugDiv.id = 'auth-debug'
            debugDiv.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;background:rgba(0,0,0,0.9);color:white;padding:10px;font-size:10px;max-height:300px;overflow-y:auto;max-width:400px;border:2px solid #fff;'
            document.body.prepend(debugDiv)
          }
          debugDiv.innerHTML += args.join(' ') + '<br>'
        }
      }
      
      log('🔍 TokenHandler: Starting authentication check')
      log('🔍 Current URL:', window.location.href)
      log('🔍 URL Search:', window.location.search)
      log('🔍 URL Hash:', window.location.hash)
      
      // Check for authorization code in URL (Authorization Code Grant)
      const urlParams = new URLSearchParams(window.location.search)
      const authCode = urlParams.get('code')
      const error = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')

      // Check for tokens in URL fragment (Implicit Grant)
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const idToken = hashParams.get('id_token')
      const accessToken = hashParams.get('access_token')

      // Check existing tokens first
      const existingIdToken = sessionStorage.getItem('idToken')
      const existingAccessToken = sessionStorage.getItem('accessToken')
      
      log('🔍 Existing tokens in storage:')
      log('  - ID Token:', existingIdToken ? 'Present' : 'Not found')
      log('  - Access Token:', existingAccessToken ? 'Present' : 'Not found')
      
      log('🔍 URL Parameters:')
      log('  - Auth code:', authCode || 'Not found')
      log('  - Error:', error || 'None')
      log('  - Error description:', errorDescription || 'None')
      
      log('🔍 URL Hash Parameters:')
      log('  - ID Token:', idToken ? 'Present' : 'Not found')
      log('  - Access Token:', accessToken ? 'Present' : 'Not found')

      // Handle errors first
      if (error) {
        const errorMsg = `Authentication failed: ${error} - ${errorDescription || 'Unknown error'}`
        log('❌ Auth Error:', errorMsg)
        onAuthComplete?.(false, errorMsg)
        return
      }

      // Handle implicit grant tokens (direct from URL fragment)
      if (idToken && accessToken) {
        log('✅ Processing implicit grant tokens')
        await storeTokensFromImplicit(idToken, accessToken, log)
        cleanUrl(log)
        onAuthComplete?.(true)
        handleRedirection()
        return
      }

      // Handle authorization code (needs token exchange)
      if (authCode) {
        log('✅ Processing authorization code:', authCode)
        await exchangeCodeForTokens(authCode, log)
        cleanUrl(log)
        onAuthComplete?.(true)
        handleRedirection()
        return
      }

      // No new tokens found - check if we already have valid tokens
      if (existingIdToken && existingAccessToken) {
        log('✅ Using existing tokens from storage')
        onAuthComplete?.(true)
        return
      }

      // No tokens found - this might be a regular page load
      log('ℹ️ No OAuth tokens found in URL or storage')
      
    } catch (error) {
      console.error('❌ Error processing authentication:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown authentication error'
      onAuthComplete?.(false, errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Store tokens from implicit grant flow
   */
  const storeTokensFromImplicit = async (idToken: string, accessToken: string, log: Function) => {
    try {
      log('💾 Storing implicit grant tokens...')
      
      // Store tokens
      sessionStorage.setItem('idToken', idToken)
      sessionStorage.setItem('accessToken', accessToken)
      log('💾 Tokens stored in sessionStorage')

      // Extract and store user info from ID token
      const userInfo = parseJwtToken(idToken, log)
      log('👤 Parsed user info:', userInfo)
      
      if (userInfo && userInfo.sub) {
        sessionStorage.setItem('userId', userInfo.sub)
        log('💾 User ID stored:', userInfo.sub)
      }

      log('✅ Tokens stored successfully from implicit grant')
      
      // Verify storage
      log('🔍 Verification - tokens in storage:')
      log('  - ID Token:', sessionStorage.getItem('idToken') ? 'Present' : 'Missing')
      log('  - Access Token:', sessionStorage.getItem('accessToken') ? 'Present' : 'Missing')
      log('  - User ID:', sessionStorage.getItem('userId') || 'Not set')
    } catch (error) {
      log('❌ Error storing implicit tokens:', error)
      throw error
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  const exchangeCodeForTokens = async (code: string, log: Function) => {
    try {
      // Determine environment based on hostname
      // For now, force dev environment since you're testing
      const isProduction = false // window.location.hostname.includes('framer.app')
      const environment = isProduction ? 'prod' : 'dev'
      const cognitoDomain = `https://${environment}-neptunus-auth.auth.eu-west-1.amazoncognito.com`
      
      log('🔧 Environment detection:')
      log('  - Hostname:', window.location.hostname)
      log('  - Detected environment:', environment)
      log('  - Using Cognito domain:', cognitoDomain)
      
      // Your app client ID from CDK
      const clientId = '68adagbjt8cfm45h5n2bge17p0'
      
      // Current callback URL (should match what's configured in Cognito)
      const redirectUri = window.location.origin + window.location.pathname

      const tokenEndpoint = `${cognitoDomain}/oauth2/token`
      
      log('🔄 Token exchange details:')
      log('  - Environment:', environment)
      log('  - Cognito domain:', cognitoDomain)
      log('  - Client ID:', clientId)
      log('  - Redirect URI:', redirectUri)
      log('  - Token endpoint:', tokenEndpoint)
      
      const requestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        code: code,
        redirect_uri: redirectUri,
      })
      
      log('🔄 Request body:', requestBody.toString())
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody,
        mode: 'cors',
        credentials: 'omit',
      })
      
      log('🔄 Token exchange response status:', response.status)

      if (!response.ok) {
        let errorText = 'No response body'
        try {
          errorText = await response.text()
        } catch (e) {
          log('❌ Could not read error response:', e)
        }
        log('❌ Token exchange failed:', response.status, response.statusText)
        log('❌ Error response:', errorText)
        
        // If CORS error, suggest using Implicit Grant instead
        if (response.status === 0 || errorText.includes('CORS')) {
          log('💡 CORS error detected - consider using Implicit Grant flow instead')
        }
        
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const tokens = await response.json()
      log('✅ Token exchange successful')
      log('🔍 Received tokens:', {
        id_token: tokens.id_token ? 'Present' : 'Missing',
        access_token: tokens.access_token ? 'Present' : 'Missing',
        refresh_token: tokens.refresh_token ? 'Present' : 'Missing'
      })

      // Store tokens
      log('💾 Storing exchanged tokens...')
      sessionStorage.setItem('idToken', tokens.id_token)
      sessionStorage.setItem('accessToken', tokens.access_token)
      
      if (tokens.refresh_token) {
        sessionStorage.setItem('refreshToken', tokens.refresh_token)
        log('💾 Refresh token stored')
      }

      // Extract and store user info
      const userInfo = parseJwtToken(tokens.id_token, log)
      log('👤 Parsed user info from exchanged token:', userInfo)
      
      if (userInfo && userInfo.sub) {
        sessionStorage.setItem('userId', userInfo.sub)
        log('💾 User ID stored:', userInfo.sub)
      }

      log('✅ Tokens exchanged and stored successfully')
      
      // Verify storage
      log('🔍 Verification - tokens in storage:')
      log('  - ID Token:', sessionStorage.getItem('idToken') ? 'Present' : 'Missing')
      log('  - Access Token:', sessionStorage.getItem('accessToken') ? 'Present' : 'Missing')
      log('  - Refresh Token:', sessionStorage.getItem('refreshToken') ? 'Present' : 'Missing')
      log('  - User ID:', sessionStorage.getItem('userId') || 'Not set')
    } catch (error) {
      log('❌ Error exchanging code for tokens:', error)
      throw error
    }
  }

  /**
   * Parse JWT token to extract user information
   */
  const parseJwtToken = (token: string, log: Function) => {
    try {
      log('🔍 Parsing JWT token...')
      const payload = token.split('.')[1]
      const decoded = atob(payload)
      const parsed = JSON.parse(decoded)
      log('✅ JWT token parsed successfully')
      log('🔍 Token payload (sanitized):', {
        sub: parsed.sub,
        email: parsed.email,
        exp: parsed.exp,
        iat: parsed.iat,
        aud: parsed.aud
      })
      return parsed
    } catch (error) {
      log('❌ Error parsing JWT token:', error)
      return null
    }
  }

  /**
   * Clean OAuth parameters from URL
   */
  const cleanUrl = (log: Function) => {
    const url = new URL(window.location.href)
    
    log('🧹 Cleaning URL parameters...')
    log('🧹 Original URL:', url.toString())
    
    // Remove query parameters
    url.searchParams.delete('code')
    url.searchParams.delete('state')
    url.searchParams.delete('error')
    url.searchParams.delete('error_description')
    
    // Remove hash parameters
    url.hash = ''
    
    log('🧹 Cleaned URL:', url.toString())
    
    // Update URL without page reload
    window.history.replaceState({}, document.title, url.toString())
    log('✅ URL cleaned successfully')
  }

  /**
   * Handle post-authentication redirection
   */
  const handleRedirection = () => {
    if (redirectAfterAuth) {
      // Redirect to specified path
      window.location.href = redirectAfterAuth
    }
    // Otherwise stay on current page with clean URL
  }

  // Component is invisible - no UI needed
  return (
    <Frame
      width="100%"
      height="100%"
      background="transparent"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: -1
      }}
    >
      {isProcessing && (
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          background: 'rgba(0,0,0,0.7)', 
          color: 'white', 
          padding: '8px 12px', 
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999,
          pointerEvents: 'auto'
        }}>
          Processing authentication...
        </div>
      )}
    </Frame>
  )
}

/**
 * Utility function to redirect to Cognito login
 */
export const redirectToCognitoLogin = (useImplicitGrant = false) => {
  // Determine environment based on hostname
  // For now, force dev environment since you're testing
  const isProduction = false // window.location.hostname.includes('framer.app')
  const environment = isProduction ? 'prod' : 'dev'
  const cognitoDomain = `https://${environment}-neptunus-auth.auth.eu-west-1.amazoncognito.com`
  const clientId = '68adagbjt8cfm45h5n2bge17p0'
  const redirectUri = encodeURIComponent(window.location.origin + '/insured_objects')
  
  // Use implicit grant if CORS issues with authorization code
  const responseType = useImplicitGrant ? 'token' : 'code'
  
  const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&response_type=${responseType}&scope=email+openid+profile&redirect_uri=${redirectUri}`
  
  console.log('🔄 Redirecting to login with response_type:', responseType)
  window.location.href = loginUrl
}

/**
 * Utility function to logout from Cognito
 */
export const logoutFromCognito = () => {
  // Clear local storage
  sessionStorage.removeItem('idToken')
  sessionStorage.removeItem('accessToken')
  sessionStorage.removeItem('refreshToken')
  sessionStorage.removeItem('userId')
  
  // Redirect to Cognito logout
  // For now, force dev environment since you're testing
  const isProduction = false // window.location.hostname.includes('framer.app')
  const environment = isProduction ? 'prod' : 'dev'
  const cognitoDomain = `https://${environment}-neptunus-auth.auth.eu-west-1.amazoncognito.com`
  const clientId = '68adagbjt8cfm45h5n2bge17p0'
  const logoutUri = encodeURIComponent(window.location.origin)
  
  const logoutUrl = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`
  
  window.location.href = logoutUrl
}

// Export Override for Framer
export function TokenHandler(): Override {
  return {
    children: <TokenHandlerManager />,
  }
}