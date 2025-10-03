import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css"; // calendar styles
import "./chapel.css";

import chapelImage from "../../assets/stivanschapels.png";
import cubaoImage from "../../assets/chapelcubao1.png";
import commonwealthImage from "../../assets/chapelcommonwealth.png";
import kamuningImage from "../../assets/chapelkamuning.png";
import { useUser } from "../../contexts/UserContext";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";

// ✅ Local Button Component
const Button = ({ children, className, ...props }) => {
  return (
    <button type="button" className={className} {...props}>
      {children}
    </button>
  );
};


const Chapels = () => {
  const { user } = useUser();

  // ✅ Bookings state (simulate database)
  const [bookings, setBookings] = useState({
    "Cubao Chapel": [],
    "Commonwealth Chapel": [],
    "Kamuning Chapel": []
  });

  const [activeChapel, setActiveChapel] = useState(null); // which chapel is open
  const [selectedDate, setSelectedDate] = useState(new Date()); // date picked
  const [duration, setDuration] = useState("1 Day"); // duration picked

  // ✅ Duration Options
  const durationOptions = [
    "1 Day",
    "2 Days",
    "3 Days",
    "4 Days",
    "5 Days",
    "6 Days",
    "1 Week"
  ];

  // ✅ Simulated DB fetch
  useEffect(() => {
    const fetchBookings = async () => {
      const mockData = {
        "Cubao Chapel": [
          { date: "2025-10-03", bookedBy: "Maria Clara", duration: "3 Days" }
        ],
        "Commonwealth Chapel": [
          { date: "2025-10-02", bookedBy: "Jose Rizal", duration: "1 Week" }
        ],
        "Kamuning Chapel": []
      };
      setTimeout(() => setBookings(mockData), 500);
    };
    fetchBookings();
  }, []);

  // ✅ Convert label → number of days
  const getDurationDays = (durationLabel) => {
    if (durationLabel === "1 Week") return 7;
    return parseInt(durationLabel); // "3 Days" → 3
  };

  // ✅ Get all dates covered by a booking
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

  // ✅ Book chapel handler
  const handleBooking = (chapel) => {
    const formattedDate = selectedDate.toISOString().split("T")[0];

    const newBooking = {
      date: formattedDate,
      duration,
      bookedBy: user?.name || "Guest"
    };

    // Get all dates in requested booking
    const newBookingDates = getBookedDates(newBooking);

    // Check conflicts
    const chapelBookings = bookings[chapel] || [];
    const conflict = chapelBookings.some((b) =>
      getBookedDates(b).some((d) => newBookingDates.includes(d))
    );

    if (conflict) {
      alert("Selected dates conflict with an existing booking!");
      return;
    }

    // Save booking
    setBookings({
      ...bookings,
      [chapel]: [...chapelBookings, newBooking]
    });

    alert(
      `Booked ${chapel} starting ${formattedDate} for ${duration}.`
    );
    setActiveChapel(null);

    // 🔗 Later: Save booking to DB
  };

  // ✅ Chapel list
  const chapelList = [
    {
      name: "Cubao Chapel",
      img: cubaoImage,
      desc: "Located near major transport hubs, peaceful space for 100 guests."
    },
    {
      name: "Commonwealth Chapel",
      img: commonwealthImage,
      desc: "Flagship location with modern interiors and AV equipment."
    },
    {
      name: "Kamuning Chapel",
      img: kamuningImage,
      desc: "Intimate gatherings with private viewing rooms."
    }
  ];

  return (
    <>
      <Header />
      <div className="chapels-page">
        {/* 🔷 Banner */}
        <header className="chapels-banner">
          <div className="banner-text">
            <h1>Honoring Every Life with Grace and Meaning</h1>
            <p>
              At ST. IVANS, we offer more than memorial services - we provide a
              sanctuary for remembrance, healing, and heartfelt farewells.
            </p>
          </div>
          <div className="banner-image">
            <img src={chapelImage} alt="ST. IVANS Chapel Building" />
          </div>
        </header>

        {/* 🔷 Chapel Gallery */}
        <section className="chapels-section">
          <h2>Featured Chapels</h2>
          <div className="chapel-gallery">
            {chapelList.map((chapel) => (
              <div className="chapel-card" key={chapel.name}>
                <img src={chapel.img} alt={chapel.name} />
                <h3>{chapel.name}</h3>
                <p>{chapel.desc}</p>

                {/* Booking Form */}
                {activeChapel === chapel.name ? (
                  <div className="booking-form">
                    {/* Date Picker */}
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

                    {/* Duration Selector */}
                    <div className="duration-section">
                      <h4>Select Duration:</h4>
                      <ul className="duration-list">
                        {durationOptions.map((option) => (
                          <li
                            key={option}
                            className={`duration-item ${
                              duration === option ? "active" : ""
                            }`}
                            onClick={() => setDuration(option)}
                          >
                            {option}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Booking Buttons */}
                    <div className="booking-buttons">
                      <Button
                        className="confirm-btn"
                        onClick={() => handleBooking(chapel.name)}
                      >
                        Confirm Booking
                      </Button>
                      <Button
                        className="cancel-btn"
                        onClick={() => setActiveChapel(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="book-btn"
                    onClick={() => setActiveChapel(chapel.name)}
                  >
                    📅 Book this Chapel
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default Chapels;
