import { useState } from 'react';
import API_BASE_URL from './config/api';

const AdminLogin = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('adminToken', data.token);
                onLogin(data.token);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#121212',
            color: '#e0e0e0',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <div style={{
                padding: '2rem',
                backgroundColor: '#1e1e1e',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <h2 style={{ marginTop: 0, textAlign: 'center', color: '#ffcc00' }}>Admin Login</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                border: '1px solid #333',
                                backgroundColor: '#2d2d2d',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                            placeholder="Enter admin password"
                        />
                    </div>

                    {error && (
                        <div style={{ color: '#ff4444', fontSize: '0.9rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.75rem',
                            backgroundColor: '#ffcc00',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <a href="/" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>
                        ← Back to Calendar
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
