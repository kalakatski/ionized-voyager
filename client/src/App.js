import React, { useState, useEffect } from 'react';

// --- Utility Functions ---

const formatDate = (date) => date.toISOString().split('T')[0];

const getMonthDates = () => {
    const dates = [];
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    let current = new Date(start);
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return { dates, startStr: formatDate(start), endStr: formatDate(end) };
};

// --- Components ---

const BookingModal = ({ isOpen, onClose, preselectedDate, carId, onSuccess }) => {
    const [formData, setFormData] = useState({
        eventName: '',
        eventType: 'Marketing',
        clientName: '',
        clientEmail: '',
        startDate: preselectedDate || formatDate(new Date()),
        endDate: preselectedDate || formatDate(new Date()),
        carIds: carId ? [carId] : [],
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                startDate: preselectedDate || prev.startDate,
                endDate: preselectedDate || prev.endDate,
                carIds: carId ? [carId] : []
            }));
            setError(null);
        }
    }, [isOpen, preselectedDate, carId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3000/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Booking failed');
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2 className="modal-title">New Booking</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {error && <div style={{ color: 'red', marginBottom: 15, fontSize: 13 }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Event Name</label>
                        <input
                            required
                            className="form-input"
                            value={formData.eventName}
                            onChange={e => setFormData({ ...formData, eventName: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Client Name</label>
                        <input
                            required
                            className="form-input"
                            value={formData.clientName}
                            onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Start Date</label>
                            <input
                                type="date"
                                required
                                className="form-input"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">End Date</label>
                            <input
                                type="date"
                                required
                                className="form-input"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Client Email</label>
                        <input
                            type="email"
                            required
                            className="form-input"
                            value={formData.clientEmail}
                            onChange={e => setFormData({ ...formData, clientEmail: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Confirming...' : 'Create Booking'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const Calendar = () => {
    const [data, setData] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedCar, setSelectedCar] = useState(null);
    const [dates, setDates] = useState([]);

    const loadData = async () => {
        const { startStr, endStr, dates: dateObjs } = getMonthDates();
        setDates(dateObjs);

        try {
            const res = await fetch(`http://localhost:3000/api/calendar?startDate=${startStr}&endDate=${endStr}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error("Failed to load calendar", err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCellClick = (carId, dateStr) => {
        setSelectedDate(dateStr);
        setSelectedCar(carId);
        setModalOpen(true);
    };

    const getDayDetails = (car, dateStr) => {
        return car.availability.find(av => av.date === dateStr);
    };

    // Helper to calculate bar spanning
    const renderBars = (car) => {
        // This is a simplified logic. In a real app we'd group availability into ranges.
        // Here we'll just return items for the first day of a booking/block for visual simplicity in this MVP.
        const bars = [];
        car.availability.forEach((day, index) => {
            const d = new Date(day.date);
            // Determine if this is the start of a booking
            if (day.booking) {
                // Check if previous day was same booking
                const prevDay = car.availability[index - 1];
                if (!prevDay || !prevDay.booking || prevDay.booking.booking_reference !== day.booking.booking_reference) {
                    // Find length
                    let duration = 1;
                    let i = index + 1;
                    while (i < car.availability.length) {
                        const next = car.availability[i];
                        if (next.booking && next.booking.booking_reference === day.booking.booking_reference) {
                            duration++;
                            i++;
                        } else break;
                    }

                    bars.push(
                        <div
                            key={`booking-${day.date}`}
                            className="booking-bar"
                            style={{
                                left: `${index * 100 / dates.length}%`,
                                width: `${(duration * 100 / dates.length) - 0.5}%`
                            }}
                        >
                            {day.booking.event_name}
                        </div>
                    );
                }
            } else if (day.block) {
                // Similar logic for blocks but skipped for brevity in MVP
                const prevDay = car.availability[index - 1];
                // Simple check: render single block for now
                if (!prevDay || !prevDay.block || prevDay.block.block_reason !== day.block.block_reason) {
                    bars.push(
                        <div
                            key={`block-${day.date}`}
                            className="booking-bar block"
                            style={{ left: `${index * 100 / dates.length}%`, width: `${(100 / dates.length) - 0.2}%` }}
                        >
                            {day.block.block_reason}
                        </div>
                    );
                }
            }
        });
        return bars;
    };

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <h1>Juggernaut Event Calendar</h1>
                <button className="btn btn-primary" onClick={() => { setSelectedCar(null); setSelectedDate(null); setModalOpen(true); }}>
                    + New Booking
                </button>
            </div>

            <div className="calendar-grid">
                <div className="calendar-dates-header">
                    {dates.map(date => (
                        <div key={date.toString()} className="date-cell-header">
                            {date.getDate()} <br /> {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                    ))}
                </div>

                {data.map(car => (
                    <div key={car.carId} className="car-row">
                        <div className="car-info">
                            <div className="car-name">{car.carName}</div>
                            <div className="car-reg">{car.registration}</div>
                            <span className={`car-status-badge status-${car.status.replace(' ', '-')}`}>
                                {car.status}
                            </span>
                        </div>

                        <div className="dates-row">
                            {dates.map(date => {
                                const dateStr = formatDate(date);
                                const details = getDayDetails(car, dateStr);
                                return (
                                    <div
                                        key={dateStr}
                                        className="date-cell"
                                        onClick={() => handleCellClick(car.carId, dateStr)}
                                        title={details?.isAvailable ? "Available" : "Booked/Blocked"}
                                    />
                                );
                            })}

                            {/* Overlay bars */}
                            {renderBars(car)}
                        </div>
                    </div>
                ))}
            </div>

            <BookingModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                preselectedDate={selectedDate}
                carId={selectedCar}
                onSuccess={loadData}
            />
        </div>
    );
};

export default Calendar;
