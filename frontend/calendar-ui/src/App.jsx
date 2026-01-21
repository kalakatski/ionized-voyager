import { useState, useEffect } from 'react';
import API_BASE_URL from './config/api';

// --- Utility Functions ---

const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
    eventType: 'REDBULL_EVENT',
    clientName: '',
    clientEmail: '',
    startDate: preselectedDate || formatDate(new Date()),
    endDate: preselectedDate || formatDate(new Date()),
    carId: carId || null,
    region: 'North',
    notes: ''
  });
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cars list for the form
  useEffect(() => {
    // We can use the calendar endpoint to get car metadata
    const today = new Date().toISOString().split('T')[0];
    fetch(`${API_BASE_URL}/api/calendar?startDate=${today}&endDate=${today}`)
      .then(res => res.json())
      .then(data => setCars(data))
      .catch(err => console.error("Failed to fetch cars", err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        startDate: preselectedDate || prev.startDate,
        endDate: preselectedDate || prev.endDate,
        carId: carId || prev.carId
      }));
      setError(null);
    }
  }, [isOpen, preselectedDate, carId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Map form data to integers
    const payload = {
      ...formData,
      carId: Number(formData.carId)
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(`Conflict: ${data.conflicts.map(c => c.block_reason || c.booking_reference).join(', ')}`);
        }
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

        {error && <div style={{ color: 'red', marginBottom: 15, fontSize: 13, background: '#ffebe6', padding: 8, borderRadius: 4 }}>{error}</div>}

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
            <label className="form-label">Event Type</label>
            <select
              required
              className="form-select"
              value={formData.eventType}
              onChange={e => setFormData({ ...formData, eventType: e.target.value })}
            >
              <option value="REDBULL_EVENT">Red Bull Event</option>
              <option value="THIRD_PARTY_EVENT">Third Party Event</option>
              <option value="COLLEGE_FEST">College Fest</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Region</label>
            <select
              required
              className="form-select"
              value={formData.region}
              onChange={e => setFormData({ ...formData, region: e.target.value })}
            >
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
            </select>
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

          <div className="form-group">
            <label className="form-label">Select Car</label>
            <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #dfe1e6', padding: 8, borderRadius: 3 }}>
              {cars.length > 0 ? (
                cars.map(car => (
                  <label key={car.carId} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="carSelection"
                      value={car.carId}
                      checked={formData.carId === car.carId}
                      onChange={() => setFormData({ ...formData, carId: car.carId })}
                      style={{ marginRight: 8 }}
                      required
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>{car.carName}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>{car.registration}</div>
                    </div>
                  </label>
                ))
              ) : (
                <span style={{ fontSize: 12, color: '#666' }}>Loading cars...</span>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Confirming...' : 'Create Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};

const BookingDetailsModal = ({ isOpen, onClose, booking, onAction }) => {
  if (!isOpen || !booking) return null;
  const car = booking.car; // Simplified access

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Booking Details</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="form-group" style={{ background: '#f4f5f7', padding: '12px', borderRadius: 6, marginBottom: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: '#5e6c84', fontWeight: 700, letterSpacing: '0.5px' }}>STATUS</div>
            <div style={{ color: booking.status === 'Confirmed' ? '#006644' : '#de350b', fontWeight: 'bold', fontSize: 14 }}>{booking.status.toUpperCase()}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#5e6c84', fontWeight: 700, letterSpacing: '0.5px' }}>ID: {booking.id}</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 14 }}>{booking.booking_reference}</div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Event</label>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#172b4d' }}>{booking.event_name}</div>
          <div style={{ fontSize: 12, color: '#5e6c84' }}>Type: {booking.event_type}</div>
        </div>

        <div className="form-group">
          <label className="form-label">Client</label>
          <div style={{ fontWeight: 500 }}>{booking.client_name}</div>
          <div style={{ fontSize: 13, color: '#5e6c84' }}>{booking.client_email}</div>
        </div>

        {car && (
          <div className="form-group" style={{ borderTop: '1px solid #ebecf0', paddingTop: 10 }}>
            <label className="form-label">Assigned Vehicle</label>
            <div style={{ background: '#fafbfc', padding: 8, borderRadius: 4 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{car.carName} (#{car.carNumber})</div>
              <div style={{ fontSize: 12, color: '#5e6c84' }}>{car.registration}</div>
              <div style={{ fontSize: 12, color: '#5e6c84', marginTop: 4 }}>
                <span style={{ fontWeight: 500 }}>Event Region:</span> {booking.region || 'N/A'}
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Dates</label>
          <div style={{ fontSize: 14 }}>
            {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {booking.status !== 'Cancelled' && (
            <button
              className="btn cancel-btn"
              style={{ color: '#d32f2f', border: '1px solid #ffebe6', background: '#fff' }}
              onClick={() => {
                if (window.confirm('Are you sure you want to CANCEL this booking? This action cannot be undone.')) {
                  onAction('cancel', booking);
                }
              }}
            >
              Cancel Booking
            </button>
          )}
          <button className="btn btn-primary" onClick={() => alert('Editing will be enabled in the next update.')}>
            Edit Details
          </button>
        </div>
      </div>
    </div>
  );
};

const Calendar = () => {
  const [data, setData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);

  // Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());

  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getVisibleDates = (baseDate) => {
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    const days = [];
    let current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return { days, startStr: formatDate(start), endStr: formatDate(end) };
  };

  const loadData = async () => {
    setLoading(true);
    const { startStr, endStr, days } = getVisibleDates(currentDate);
    setDates(days);

    try {
      const res = await fetch(`${API_BASE_URL}/api/calendar?startDate=${startStr}&endDate=${endStr}`);
      if (!res.ok) throw new Error('Failed to fetch calendar');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load calendar", err);
      setError("Failed to load calendar data. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('📅 Loading calendar data from:', API_BASE_URL);
    loadData();
  }, [currentDate]); // Reload when month changes

  const handleCellClick = (carId, dateStr, dayDetails) => {
    if (dayDetails?.booking) {
      fetch(`${API_BASE_URL}/api/bookings/${dayDetails.booking.booking_reference}`)
        .then(res => res.json())
        .then(booking => {
          setSelectedBooking(booking);
          setDetailsModalOpen(true);
        })
        .catch(err => alert("Failed to load booking details"));
      return;
    }

    // Open new booking modal
    setSelectedDate(dateStr);
    setSelectedCar(carId);
    setModalOpen(true);
  };

  const handleBookingAction = async (action, booking) => {
    if (action === 'cancel') {
      try {
        const res = await fetch(`${API_BASE_URL}/api/bookings/${booking.booking_reference}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setDetailsModalOpen(false);
          loadData(); // Refresh calendar
        } else {
          alert("Failed to cancel");
        }
      } catch (e) { alert("Network error"); }
    }
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const handleMonthSelect = (e) => {
    const newMonth = parseInt(e.target.value);
    const newDate = new Date(currentDate);
    newDate.setMonth(newMonth);
    setCurrentDate(newDate);
  };

  const getDayDetails = (car, dateStr) => {
    if (!car || !car.availability) return null;
    return car.availability.find(av => av.date === dateStr);
  };

  // Helper to calculate bar spanning
  const renderBars = (car) => {
    if (!car || !car.availability) return [];

    const bars = [];
    car.availability.forEach((day, index) => {
      if (day.booking) {
        const prevDay = car.availability[index - 1];
        if (!prevDay || !prevDay.booking || prevDay.booking.booking_reference !== day.booking.booking_reference) {
          let duration = 1;
          let i = index + 1;
          while (i < car.availability.length) {
            const next = car.availability[i];
            if (next.booking && next.booking.booking_reference === day.booking.booking_reference) {
              duration++;
              i++;
            } else break;
          }

          const durationDays = duration;
          const endD = new Date(day.date);
          endD.setDate(endD.getDate() + durationDays - 1);
          const endDateStr = formatDate(endD);

          bars.push(
            <div
              key={`booking-${day.date}`}
              className="booking-bar"
              style={{
                left: `${index * 100 / dates.length}%`,
                width: `${(durationDays * 100 / dates.length) - 0.5}%`,
                pointerEvents: 'auto',
                cursor: 'pointer'
              }}
              title={`Event: ${day.booking.event_name}\nRef: ${day.booking.booking_reference}\nClient: ${day.booking.client_name || 'N/A'}\nDates: ${day.date} to ${endDateStr}`}
              onClick={(e) => {
                e.stopPropagation();
                handleCellClick(car.carId, day.date, day);
              }}
            >
              {day.booking.event_name}
            </div>
          );
        }
      } else if (day.block) {
        const prevDay = car.availability[index - 1];
        if (!prevDay || !prevDay.block || prevDay.block.block_reason !== day.block.block_reason) {
          let duration = 1;
          let i = index + 1;
          while (i < car.availability.length) {
            const next = car.availability[i];
            if (next.block && next.block.block_reason === day.block.block_reason) {
              duration++;
              i++;
            } else break;
          }

          bars.push(
            <div
              key={`block-${day.date}`}
              className="booking-bar block"
              style={{
                left: `${index * 100 / dates.length}%`,
                width: `${(duration * 100 / dates.length) - 0.2}%`
              }}
              title={`Block: ${day.block.block_reason}\nDates: ${day.date} for ${duration} days`}
            >
              {day.block.block_reason}
            </div>
          );
        }
      }
    });
    return bars;
  };

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  }

  const todayStr = formatDate(new Date());

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <img
            src="/juggernaut-logo.png?v=2"
            alt="Juggernaut Logo"
            style={{ height: '125px', width: 'auto' }}
          />
          <h1 style={{ margin: 0 }}>Red Bull Juggernaut Calendar</h1>

          <div className="calendar-controls" style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => changeMonth(-1)}>&lt;</button>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 10px' }}
              value={currentDate.getMonth()}
              onChange={handleMonthSelect}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 10px' }}
              value={currentDate.getFullYear()}
              onChange={() => { }} // Read only for now per req
            >
              <option value="2026">2026</option>
            </select>

            <button className="btn" onClick={() => changeMonth(1)}>&gt;</button>
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => { setSelectedCar(null); setSelectedDate(null); setModalOpen(true); }}>
          + New Booking
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f4f5f7', borderRadius: 8, margin: '20px 0' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#172b4d' }}>Loading Juggernaut Calendar...</h3>
          <p style={{ margin: 0, color: '#6b778c' }}>Waking up the database. This may take a few seconds.</p>
        </div>
      ) : (
        <div className="calendar-grid">
          <div className="calendar-dates-header" style={{ gridTemplateColumns: `repeat(${dates.length}, 1fr)` }}>
            {dates.map(date => {
              const isToday = formatDate(date) === todayStr;
              return (
                <div
                  key={date.toString()}
                  className="date-cell-header"
                  style={{
                    background: isToday ? '#e3fcef' : 'transparent',
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isToday ? '#006644' : '#5e6c84',
                    borderBottom: isToday ? '2px solid #36b37e' : '1px solid #dfe1e6'
                  }}
                >
                  {date.getDate()} <br /> {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
              );
            })}
          </div>

          {data.map(car => (
            <div key={car.carId} className="car-row">
              <div className="car-info">
                <div className="car-name">{car.carName}</div>
                <div className="car-reg">{car.registration}</div>
                <span className={`car-status-badge status-${(car.status || 'Available').replace(' ', '-')}`}>
                  {car.status || 'Available'}
                </span>
              </div>

              <div className="dates-row">
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const details = getDayDetails(car, dateStr);
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={dateStr}
                      className="date-cell"
                      style={{
                        background: isToday ? '#f4fff4' : 'white',
                        borderRight: isToday ? '1px solid #36b37e' : '1px solid #dfe1e6',
                        borderLeft: isToday ? '1px solid #36b37e' : 'none'
                      }}
                      onClick={() => handleCellClick(car.carId, dateStr, details)}
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
      )}

      <div style={{ marginTop: 20, padding: '12px 16px', background: '#f4f5f7', borderRadius: 8, fontSize: 13, display: 'flex', gap: 24, color: '#42526e', border: '1px solid #ebecf0' }}>
        <div style={{ fontWeight: 600, color: '#172b4d' }}>LEGEND:</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, background: '#3b82f6', borderRadius: 3 }}></span>
          Confirmed Booking
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            border: '1px solid #ff991f',
            background: 'repeating-linear-gradient(45deg, #fffae6, #fffae6 6px, #fff0b3 6px, #fff0b3 12px)',
            borderRadius: 3
          }}></span>
          Blocked / Service
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, background: '#e3fcef', border: '1px solid #36b37e', borderRadius: 3 }}></span>
          Today's Date
        </div>
      </div>

      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        preselectedDate={selectedDate}
        carId={selectedCar}
        onSuccess={loadData}
      />

      <BookingDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        booking={selectedBooking}
        onAction={handleBookingAction}
      />
    </div >
  );
};

export default Calendar;
