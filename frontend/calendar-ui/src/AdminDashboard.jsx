import { useState, useEffect } from 'react';
import API_BASE_URL from './config/api';

const AdminDashboard = ({ token, onLogout }) => {
    const [activeTab, setActiveTab] = useState('pending');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch stats
            const statsRes = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData.stats);
            }

            // Fetch bookings based on tab
            const statusQuery = activeTab === 'all' ? '' : `?status=${activeTab}`;
            const bookingsRes = await fetch(`${API_BASE_URL}/api/admin/bookings${statusQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (bookingsRes.ok) {
                const bookingsData = await bookingsRes.json();
                setBookings(bookingsData.bookings);
            } else if (bookingsRes.status === 401) {
                onLogout();
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (bookingId, action, reason = null) => {
        if (!window.confirm(`Are you sure you want to ${action} this booking?`)) return;

        setActionLoading(bookingId);
        try {
            const endpoint = `${API_BASE_URL}/api/admin/bookings/${bookingId}/${action}`;
            const body = reason ? JSON.stringify({ reason }) : null;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            if (response.ok) {
                // Refresh data
                fetchData();
                alert(`Booking ${action}d successfully`);
            } else {
                const data = await response.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error(`Error performing ${action}:`, error);
            alert('Network error occurred');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#121212',
            color: '#e0e0e0',
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem',
                    borderBottom: '1px solid #333',
                    paddingBottom: '1rem'
                }}>
                    <h1 style={{ margin: 0, color: '#ffcc00' }}>Admin Dashboard</h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span>Admin</span>
                        <button
                            onClick={onLogout}
                            style={{
                                background: 'none',
                                border: '1px solid #666',
                                color: '#fff',
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Logout
                        </button>
                        <a
                            href="/"
                            style={{
                                textDecoration: 'none',
                                color: '#ffcc00',
                                border: '1px solid #ffcc00',
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                            }}
                        >
                            Go to Calendar
                        </a>
                    </div>
                </header>

                {/* Stats Cards */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <StatCard title="Pending" count={stats.pending} color="#ffcc00" active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} />
                    <StatCard title="Approved" count={stats.approved} color="#4caf50" active={activeTab === 'approved'} onClick={() => setActiveTab('approved')} />
                    <StatCard title="Rejected" count={stats.rejected} color="#f44336" active={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')} />
                    <StatCard title="All Bookings" count={Object.values(stats).reduce((a, b) => a + b, 0)} color="#2196f3" active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
                </div>

                {/* Booking List */}
                <div style={{ backgroundColor: '#1e1e1e', borderRadius: '8px', overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading bookings...</div>
                    ) : bookings.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No bookings found.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #333', backgroundColor: '#252525' }}>
                                        <th style={{ padding: '1rem' }}>Ref</th>
                                        <th style={{ padding: '1rem' }}>Event / Client</th>
                                        <th style={{ padding: '1rem' }}>Car</th>
                                        <th style={{ padding: '1rem' }}>Dates</th>
                                        <th style={{ padding: '1rem' }}>Location</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
                                        <th style={{ padding: '1rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map(booking => (
                                        <tr key={booking.id} style={{ borderBottom: '1px solid #2d2d2d' }}>
                                            <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{booking.booking_reference}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 'bold' }}>{booking.event_name}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{booking.client_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(booking.created_at).toLocaleDateString()}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div>{booking.car_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{booking.car_region}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {booking.city}, {booking.region}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <StatusBadge status={booking.status} />
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {booking.status === 'pending' && (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            disabled={actionLoading === booking.id}
                                                            onClick={() => handleAction(booking.id, 'approve')}
                                                            style={{
                                                                padding: '0.5rem 0.75rem',
                                                                backgroundColor: '#4caf50',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                opacity: actionLoading === booking.id ? 0.5 : 1
                                                            }}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            disabled={actionLoading === booking.id}
                                                            onClick={() => {
                                                                const reason = prompt("Enter rejection reason:");
                                                                if (reason) handleAction(booking.id, 'reject', reason);
                                                            }}
                                                            style={{
                                                                padding: '0.5rem 0.75rem',
                                                                backgroundColor: '#f44336',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                opacity: actionLoading === booking.id ? 0.5 : 1
                                                            }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {booking.status === 'rejected' && booking.rejection_reason && (
                                                    <div style={{ fontSize: '0.85rem', color: '#f44336', maxWidth: '150px' }}>
                                                        Reason: {booking.rejection_reason}
                                                    </div>
                                                )}
                                                {booking.status === 'approved' && booking.approved_by && (
                                                    <div style={{ fontSize: '0.85rem', color: '#4caf50' }}>
                                                        By: {booking.approved_by}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, count, color, active, onClick }) => (
    <div
        onClick={onClick}
        style={{
            backgroundColor: active ? '#2d2d2d' : '#1e1e1e',
            padding: '1.5rem',
            borderRadius: '8px',
            flex: 1,
            cursor: 'pointer',
            borderLeft: `4px solid ${color}`,
            boxShadow: active ? `0 0 10px ${color}33` : 'none',
            transition: 'all 0.2s'
        }}
    >
        <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem' }}>{title}</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color }}>{count}</div>
    </div>
);

const StatusBadge = ({ status }) => {
    let color = '#aaa';
    if (status === 'approved') color = '#4caf50';
    if (status === 'rejected') color = '#f44336';
    if (status === 'pending') color = '#ffcc00';

    return (
        <span style={{
            backgroundColor: `${color}22`,
            color: color,
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            border: `1px solid ${color}44`
        }}>
            {status ? status.toUpperCase() : 'UNKNOWN'}
        </span>
    );
};

export default AdminDashboard;
