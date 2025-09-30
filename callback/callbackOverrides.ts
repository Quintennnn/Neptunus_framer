import React, { useEffect } from "react"
import { Override } from "framer"

// Import utils to maintain consistency with existing code
import { API_BASE_URL, API_PATHS, determineRedirectPath } from "../utils"

// Helper function to decode JWT and extract sub (user ID) - same as login
function decodeJWT(token: string): any {
    try {
        const base64Url = token.split(".")[1]
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(
                    (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                )
                .join("")
        )
        return JSON.parse(jsonPayload)
    } catch (error) {
        console.error("Error decoding JWT:", error)
        return null
    }
}

// Callback handler component
export function callbackHandler(): Override {
    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Extract authorization code from URL
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const state = urlParams.get('state');
                const error = urlParams.get('error');
                
                // Handle error case
                if (error) {
                    console.error('OAuth error:', error);
                    const errorDescription = urlParams.get('error_description');
                    alert(`Login error: ${error}${errorDescription ? ' - ' + errorDescription : ''}`);
                    window.location.href = "https://neptunus.framer.website";
                    return;
                }
                
                // Handle authorization code
                if (code) {
                    console.log('Authorization code received, exchanging for tokens...');
                    
                    // Exchange code for tokens via backend API
                    console.log(`Making request to: ${API_BASE_URL}${API_PATHS.EXCHANGE_CODE}`);
                    console.log(`Request payload:`, { code, state });
                    
                    const response = await fetch(`${API_BASE_URL}${API_PATHS.EXCHANGE_CODE}`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ code, state })
                    });
                    
                    console.log(`Response status: ${response.status}`);
                    console.log(`Response headers:`, [...response.headers.entries()]);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`Response error body:`, errorText);
                        throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
                    }
                    
                    const tokens = await response.json();
                    console.log('Tokens received successfully');
                    
                    // Store tokens using existing sessionStorage pattern
                    if (tokens.id_token) {
                        sessionStorage.setItem('idToken', tokens.id_token);
                    }
                    if (tokens.access_token) {
                        sessionStorage.setItem('accessToken', tokens.access_token);
                    }
                    if (tokens.refresh_token) {
                        sessionStorage.setItem('refreshToken', tokens.refresh_token);
                    }
                    
                    // Extract userId from JWT (same as existing login flow)
                    const decoded = decodeJWT(tokens.id_token);
                    if (decoded?.sub) {
                        sessionStorage.setItem('userId', decoded.sub);
                        console.log('→ [sessionStorage] userId:', decoded.sub);
                    }
                    
                    console.log('Session storage updated successfully');

                    // Determine optimal redirect path based on user role and organization access
                    console.log('Determining optimal redirect path...');
                    const redirectPath = await determineRedirectPath();
                    console.log(`Redirecting to: ${redirectPath}`);
                    window.location.href = `https://neptunus.framer.website${redirectPath}`;
                    
                } else {
                    // No code parameter found
                    console.error('No authorization code found in callback URL');
                    alert('No authorization code found in callback URL');
                    window.location.href = "https://neptunus.framer.website";
                }
                
            } catch (error) {
                console.error('Callback processing failed:', error);
                
                // Show error and redirect to home
                alert(`Login failed: ${(error as Error).message || 'Callback processing failed'}`);
                window.location.href = "https://neptunus.framer.website";
            }
        };
        
        // Execute callback handling
        handleCallback();
    }, []);

    return {
        children: (
            <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: '50px',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <div style={{
                    fontSize: '18px',
                    fontWeight: '500',
                    marginBottom: '16px',
                    color: '#1d4ed8'
                }}>
                    Inloggen verwerken...
                </div>
                <div style={{
                    fontSize: '14px',
                    color: '#666',
                    textAlign: 'center',
                    maxWidth: '400px',
                    lineHeight: '1.5'
                }}>
                    Een moment geduld terwijl we uw sessie opzetten en u doorverwijzen naar de applicatie.
                </div>
                
                {/* Loading spinner */}
                <div style={{
                    marginTop: '24px',
                    width: '32px',
                    height: '32px',
                    border: '3px solid #f3f4f6',
                    borderTop: '3px solid #1d4ed8',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}>
                </div>
                
                {/* Add CSS animation for spinner */}
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    };
}