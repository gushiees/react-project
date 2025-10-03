import React, { useState, useEffect, useCallback, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./chapel.css";

import chapelImage from "../../assets/stivanschapels.png";
import cubaoImage from "../../assets/chapelcubao1.png";
import commonwealthImage from "../../assets/chapelcommonwealth.png";
import kamuningImage from "../../assets/chapelkamuning.png";
import { useUser } from "../../contexts/UserContext";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";

// Reusable Button Component with variants
const Button = ({ children, variant = "primary", className = "", disabled = false, ...props }) => {
  const baseClass = "btn";
  const variantClass = `btn-${variant}`;
  const disabledClass = disabled ? "btn-disabled" : "";
  
  return (
    <button 
      type="button" 
      className={`${baseClass} ${variantClass} ${disabledClass} ${className}`} 
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Modal Component for confirmations
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="spinner"></div>
    <p>Loading chapel information...</p>
  </div>
);

// Chapel Card Component
const ChapelCard = ({ chapel, activeChapel, setActiveChapel, bookings, selectedDate, setSelectedDate, duration, setDuration, durationOptions, handleBooking }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`chapel-card ${activeChapel === chapel.name ? 'active' : ''}`}>
      <div className="chapel-image-container">
        <img src={chapel.img} alt={chapel.name} />
        <div className="chapel-availability">
          {bookings[chapel.name]?.length > 0 ? 
            <span className="availability-indicator busy">Some dates booked</span> : 
            <span className="availability-indicator available">Fully available</span>
          }
        </div>
      </div>
      <div className="chapel-info">
        <h3>{chapel.name}</h3>
        <p>{chapel.desc}</p>
        <div className="chapel-features">
          {chapel.features?.map((feature, index) => (
            <span key={index} className="feature-tag">{feature}</span>
          ))}
        </div>
      </div>
      
      {activeChapel === chapel.name ? (
        <BookingForm 
          chapel={chapel}
          bookings={bookings}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          duration={duration}
          setDuration={setDuration}
          durationOptions={durationOptions}
          handleBooking={handleBooking}
          onCancel={() => setActiveChapel(null)}
        />
      ) : (
        <div className="chapel-actions">
          <Button 
            className="book-btn" 
            onClick={() => setActiveChapel(chapel.name)}
          >
            📅 Book this Chapel
          </Button>
          <Button 
            variant="outline" 
            className="details-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide Details' : 'View Details'}
          </Button>
        </div>
      )}
      
      {isExpanded && (
        <div className="chapel-details">
          <h4>Chapel Details</h4>
          <ul>
            <li>Capacity: {chapel.capacity} guests</li>
            <li>Location: {chapel.location}</li>
            <li>Contact: {chapel.contact}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

// Booking Form Component
const BookingForm = ({ chapel, bookings, selectedDate, setSelectedDate, duration, setDuration, durationOptions, handleBooking, onCancel }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleConfirmBooking = async () => {
    setIsProcessing(true);
    await handleBooking(chapel.name);
    setIsProcessing(false);
  };
  
  return (
    <div className="booking-form">
      <h4>Select Date:</h4>
      <Calendar
        onChange={setSelectedDate}
        value={selectedDate}
        tileDisabled={({ date }) => {
          const dateStr = date.toISOString().split("T")[0];
          return bookings[chapel.name]?.some((b) =>
            getBookedDates(b).includes(dateStr)
          );
        }}
        tileClassName={({ date }) => {
          const dateStr = date.toISOString().split("T")[0];
          return bookings[chapel.name]?.some((b) =>
            getBookedDates(b).includes(dateStr)
          )
            ? "booked-date"
            : null;
        }}
      />

      <div className="duration-section">
        <h4>Select Duration:</h4>
        <div className="duration-options">
          {durationOptions.map((option) => (
            <div
              key={option}
              className={`duration-option ${duration === option ? "active" : ""}`}
              onClick={() => setDuration(option)}
            >
              {option}
            </div>
          ))}
        </div>
      </div>

      <div className="booking-summary">
        <h4>Booking Summary</h4>
        <p>Chapel: {chapel.name}</p>
        <p>Date: {selectedDate.toLocaleDateString()}</p>
        <p>Duration: {duration}</p>
      </div>

      <div className="booking-buttons">
        <Button
          className="confirm-btn"
          onClick={handleConfirmBooking}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Confirm Booking'}
        </Button>
        <Button
          variant="outline"
          className="cancel-btn"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Helper function to get booked dates
const getBookedDates = (booking) => {
  const start = new Date(booking.date);
  const days = getDurationDays(booking.duration);
  let bookedDates = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    bookedDates.push(d.toISOString().split("T")[0]);
  }
  return bookedDates;
};

// Helper function to convert duration label to days
const getDurationDays = (durationLabel) => {
  if (durationLabel === "1 Week") return 7;
  return parseInt(durationLabel);
};

const Chapels = () => {
  const { user } = useUser();
  
  // State management
  const [bookings, setBookings] = useState({});
  const [activeChapel, setActiveChapel] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [duration, setDuration] = useState("1 Day");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [userBookings, setUserBookings] = useState([]);
  
  // Duration options
  const durationOptions = [
    "1 Day",
    "2 Days",
    "3 Days",
    "4 Days",
    "5 Days",
    "6 Days",
    "1 Week"
  ];
  
  // Chapel data with additional properties
  const chapelList = useMemo(() => [
    {
      name: "Cubao Chapel",
      img: cubaoImage,
      desc: "Located near major transport hubs, peaceful space for 100 guests.",
      capacity: 100,
      location: "Cubao, Quezon City",
      contact: "(02) 123-4567",
      features: ["Parking", "Wheelchair Accessible", "Audio System"]
    },
    {
      name: "Commonwealth Chapel",
      img: commonwealthImage,
      desc: "Flagship location with modern interiors and AV equipment.",
      capacity: 150,
      location: "Commonwealth, Quezon City",
      contact: "(02) 234-5678",
      features: ["Parking", "Catering Service", "Live Streaming"]
    },
    {
      name: "Kamuning Chapel",
      img: kamuningImage,
      desc: "Intimate gatherings with private viewing rooms.",
      capacity: 80,
      location: "Kamuning, Quezon City",
      contact: "(02) 345-6789",
      features: ["Private Rooms", "Garden View", "Audio System"]
    }
  ], []);
  
  // Fetch bookings data
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        // Simulate API call
        const mockData = {
          "Cubao Chapel": [
            { date: "2025-10-03", bookedBy: "Maria Clara", duration: "3 Days" }
          ],
          "Commonwealth Chapel": [
            { date: "2025-10-02", bookedBy: "Jose Rizal", duration: "1 Week" }
          ],
          "Kamuning Chapel": []
        };
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setBookings(mockData);
        
        // Extract user bookings if user is logged in
        if (user) {
          const userBookingsData = [];
          Object.entries(mockData).forEach(([chapelName, chapelBookings]) => {
            chapelBookings.forEach(booking => {
              if (booking.bookedBy === user.name) {
                userBookingsData.push({ ...booking, chapelName });
              }
            });
          });
          setUserBookings(userBookingsData);
        }
        
        setIsLoading(false);
      } catch (err) {
        setError("Failed to load chapel information. Please try again later.");
        setIsLoading(false);
      }
    };
    
    fetchBookings();
  }, [user]);
  
  // Filter chapels based on selected filter
  const filteredChapels = useMemo(() => {
    if (filter === "all") return chapelList;
    
    return chapelList.filter(chapel => {
      if (filter === "available") {
        return !bookings[chapel.name] || bookings[chapel.name].length === 0;
      }
      return true;
    });
  }, [chapelList, filter, bookings]);
  
  // Handle booking
  const handleBooking = useCallback(async (chapelName) => {
    const formattedDate = selectedDate.toISOString().split("T")[0];
    
    const newBooking = {
      date: formattedDate,
      duration,
      bookedBy: user?.name || "Guest"
    };
    
    // Get all dates in requested booking
    const newBookingDates = getBookedDates(newBooking);
    
    // Check conflicts
    const chapelBookings = bookings[chapelName] || [];
    const conflict = chapelBookings.some((b) =>
      getBookedDates(b).some((d) => newBookingDates.includes(d))
    );
    
    if (conflict) {
      setConfirmationMessage("Selected dates conflict with an existing booking!");
      setShowConfirmation(true);
      return;
    }
    
    // Save booking
    setBookings({
      ...bookings,
      [chapelName]: [...chapelBookings, newBooking]
    });
    
    // Update user bookings if user is logged in
    if (user) {
      setUserBookings([...userBookings, { ...newBooking, chapelName }]);
    }
    
    setConfirmationMessage(`Successfully booked ${chapelName} starting ${formattedDate} for ${duration}.`);
    setShowConfirmation(true);
    setActiveChapel(null);
    
    // In a real app, you would save to a database here
  }, [bookings, selectedDate, duration, user, userBookings]);
  
  // Cancel user booking
  const cancelBooking = useCallback((chapelName, bookingDate) => {
    const updatedBookings = { ...bookings };
    updatedBookings[chapelName] = updatedBookings[chapelName].filter(
      booking => booking.date !== bookingDate
    );
    
    setBookings(updatedBookings);
    
    // Update user bookings
    const updatedUserBookings = userBookings.filter(
      booking => !(booking.chapelName === chapelName && booking.date === bookingDate)
    );
    setUserBookings(updatedUserBookings);
    
    setConfirmationMessage(`Your booking for ${chapelName} on ${bookingDate} has been cancelled.`);
    setShowConfirmation(true);
  }, [bookings, userBookings]);
  
  return (
    <>
      <Header />
      <div className="chapels-page">
        {/* Banner Section */}
        <header className="chapels-banner">
          <div className="banner-text">
            <h1>Honoring Every Life with Grace and Meaning</h1>
            <p>
              At ST. IVANS, we offer more than memorial services - we provide a
              sanctuary for remembrance, healing, and heartfelt farewells.
            </p>
            <div className="banner-stats">
              <div className="stat">
                <span className="stat-number">3</span>
                <span className="stat-label">Chapels</span>
              </div>
              <div className="stat">
                <span className="stat-number">1000+</span>
                <span className="stat-label">Services</span>
              </div>
              <div className="stat">
                <span className="stat-number">25+</span>
                <span className="stat-label">Years</span>
              </div>
            </div>
          </div>
          <div className="banner-image">
            <img src={chapelImage} alt="ST. IVANS Chapel Building" />
          </div>
        </header>

        {/* User Bookings Section */}
        {user && userBookings.length > 0 && (
          <section className="user-bookings-section">
            <h2>Your Bookings</h2>
            <div className="user-bookings">
              {userBookings.map((booking, index) => (
                <div key={index} className="user-booking-card">
                  <h4>{booking.chapelName}</h4>
                  <p>Date: {new Date(booking.date).toLocaleDateString()}</p>
                  <p>Duration: {booking.duration}</p>
                  <Button 
                    variant="outline" 
                    className="cancel-booking-btn"
                    onClick={() => cancelBooking(booking.chapelName, booking.date)}
                  >
                    Cancel Booking
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filter Section */}
        <section className="filter-section">
          <h2>Browse Our Chapels</h2>
          <div className="filter-controls">
            <div className="filter-tabs">
              <button 
                className={`filter-tab ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All Chapels
              </button>
              <button 
                className={`filter-tab ${filter === "available" ? "active" : ""}`}
                onClick={() => setFilter("available")}
              >
                Available Now
              </button>
            </div>
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Search chapels..." 
                className="search-input"
              />
              <button className="search-btn">Search</button>
            </div>
          </div>
        </section>

        {/* Chapel Gallery */}
        <section className="chapels-section">
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : (
            <div className="chapel-gallery">
              {filteredChapels.map((chapel) => (
                <ChapelCard
                  key={chapel.name}
                  chapel={chapel}
                  activeChapel={activeChapel}
                  setActiveChapel={setActiveChapel}
                  bookings={bookings}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  duration={duration}
                  setDuration={setDuration}
                  durationOptions={durationOptions}
                  handleBooking={handleBooking}
                />
              ))}
            </div>
          )}
        </section>

        {/* Testimonials Section */}
        <section className="testimonials-section">
          <h2>What Our Families Say</h2>
          <div className="testimonials">
            <div className="testimonial">
              <p>"The staff at ST. IVANS made a difficult time much easier to handle. Their compassion and professionalism were outstanding."</p>
              <div className="testimonial-author">
                <span>- Maria Santos</span>
              </div>
            </div>
            <div className="testimonial">
              <p>"The chapel was beautiful and serene. It provided the perfect setting for our family to say goodbye."</p>
              <div className="testimonial-author">
                <span>- Juan Dela Cruz</span>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="contact-section">
          <h2>Have Questions?</h2>
          <p>Our team is available 24/7 to assist you with your needs.</p>
          <Button className="contact-btn">Contact Us</Button>
        </section>
      </div>
      
      {/* Confirmation Modal */}
      <Modal 
        isOpen={showConfirmation} 
        onClose={() => setShowConfirmation(false)}
        title="Booking Status"
      >
        <p>{confirmationMessage}</p>
        <Button onClick={() => setShowConfirmation(false)}>Close</Button>
      </Modal>
      
      <Footer />
    </>
  );
};

export default Chapels;