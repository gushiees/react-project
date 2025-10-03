import React, { useState, useEffect } from "react";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import "./contact.css";

export default function Contact() {
  // Contact Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    message: ""
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({
    name: "",
    email: "",
    rating: 5,
    title: "",
    comment: ""
  });
  const [reviewErrors, setReviewErrors] = useState({});
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [expandedSection, setExpandedSection] = useState("contact");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  // Mock reviews data
  useEffect(() => {
    const mockReviews = [
      {
        id: 1,
        name: "Maria Santos",
        email: "maria@example.com",
        rating: 5,
        title: "Exceptional Service",
        comment: "The service provided was exceptional. The staff was compassionate and professional during our difficult time. They handled all arrangements with dignity and respect. The chapel was beautiful and the service was exactly what our family wanted. I would highly recommend their services to anyone in need.",
        date: "2023-10-15",
        verified: true,
        helpful: 12
      },
      {
        id: 2,
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        rating: 4,
        title: "Good Overall Experience",
        comment: "Good overall service. The plan was comprehensive and the staff was helpful. My only suggestion would be to improve communication during the planning process. Otherwise, everything went smoothly and we were satisfied with the service provided.",
        date: "2023-09-22",
        verified: true,
        helpful: 8
      },
      {
        id: 3,
        name: "Ana Reyes",
        email: "ana@example.com",
        rating: 5,
        title: "Very Satisfied",
        comment: "I'm very satisfied with our choice. They handled everything with dignity and respect. The staff went above and beyond to ensure our needs were met. The facilities were clean and well-maintained. Thank you for making a difficult time more bearable.",
        date: "2023-08-10",
        verified: true,
        helpful: 15
      },
      {
        id: 4,
        name: "Roberto Garcia",
        email: "roberto@example.com",
        rating: 3,
        title: "Adequate Service",
        comment: "The service was adequate but there were some delays in the arrangements. The staff was polite but seemed overwhelmed during peak times. The facilities were nice but could use some updates. Overall, it was an acceptable experience.",
        date: "2023-07-05",
        verified: false,
        helpful: 3
      }
    ];
    setReviews(mockReviews);
  }, []);

  // Handle contact form input change
  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
    setSuccess("");
  };

  // Handle review form input change
  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReviewForm({ ...reviewForm, [name]: value });
    setReviewErrors({ ...reviewErrors, [name]: "" });
    setReviewSuccess("");
  };

  // Handle rating change
  const handleRatingChange = (rating) => {
    setReviewForm({ ...reviewForm, rating });
    setReviewErrors({ ...reviewErrors, rating: "" });
  };

  // Contact form validation
  const validateContact = () => {
    let newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = "Enter a valid email address.";
    if (!formData.message.trim()) newErrors.message = "Message cannot be empty.";
    return newErrors;
  };

  // Review form validation
  const validateReview = () => {
    let newErrors = {};
    if (!reviewForm.name.trim()) newErrors.name = "Name is required.";
    if (!reviewForm.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = "Enter a valid email address.";
    if (!reviewForm.title.trim()) newErrors.title = "Review title is required.";
    if (!reviewForm.comment.trim()) newErrors.comment = "Review cannot be empty.";
    return newErrors;
  };

  // Submit contact form
  const handleContactSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateContact();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSuccess("");
    } else {
      console.log("Contact Form Submitted:", formData);
      setSuccess("✅ Message Sent Successfully!");
      setErrors({});
      setFormData({
        fullName: "",
        email: "",
        message: ""
      });
    }
  };

  // Submit review form
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateReview();
    if (Object.keys(validationErrors).length > 0) {
      setReviewErrors(validationErrors);
      setReviewSuccess("");
    } else {
      const newReview = {
        ...reviewForm,
        id: reviews.length + 1,
        date: new Date().toISOString().split("T")[0],
        verified: false,
        helpful: 0
      };
      setReviews([newReview, ...reviews]);
      setReviewSuccess("✅ Review Submitted Successfully!");
      setReviewErrors({});
      setReviewForm({
        name: "",
        email: "",
        rating: 5,
        title: "",
        comment: ""
      });
    }
  };

  // Toggle section expansion
  const toggleSectionExpansion = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter(review => {
      if (filter === "all") return true;
      return review.rating === parseInt(filter);
    })
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.date) - new Date(a.date);
      if (sortBy === "helpful") return b.helpful - a.helpful;
      if (sortBy === "rating-high") return b.rating - a.rating;
      if (sortBy === "rating-low") return a.rating - b.rating;
      return 0;
    });

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  // Star rating component
  const StarRating = ({ rating, interactive = false, onRatingChange }) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? "filled" : ""}`}
            onClick={() => interactive && onRatingChange(star)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      <Header />

      <section className="contact-reviews-section">
        <div className="contact-reviews-container">
          {/* Left Column - Image and Title */}
          <div className="contact-reviews-left">
            <div className="contact-reviews-image-wrapper">
              <img 
                src="https://picsum.photos/seed/contact/600/800.jpg" 
                alt="Contact & Reviews" 
                className="contact-reviews-image"
              />
              <div className="contact-reviews-overlay">
                <img 
                  src="https://picsum.photos/seed/logo/180/80.jpg" 
                  alt="ST. IVANS Logo" 
                  className="contact-reviews-logo"
                />
                <div className="contact-reviews-slogan">Get in Touch & Share Your Experience</div>
              </div>
            </div>
          </div>

          {/* Right Column - Accordion Content */}
          <div className="contact-reviews-right">
            {/* Contact Form Block */}
            <div className="contact-reviews-block">
              <button 
                className="accordion-toggle"
                onClick={() => toggleSectionExpansion("contact")}
              >
                <span>Contact Us</span>
                <span className={`arrow ${expandedSection === "contact" ? "open" : ""}`}>▼</span>
              </button>
              {expandedSection === "contact" && (
                <div className="contact-reviews-block-content">
                  {success && <p className="success-message">{success}</p>}
                  <form onSubmit={handleContactSubmit} className="contact-form">
                    <label>
                      Full Name
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleContactChange}
                        placeholder="Your Full Name"
                      />
                      {errors.fullName && <small className="error">{errors.fullName}</small>}
                    </label>

                    <label>
                      Email
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleContactChange}
                        placeholder="Your Email"
                      />
                      {errors.email && <small className="error">{errors.email}</small>}
                    </label>

                    <label>
                      Message
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleContactChange}
                        placeholder="Write your message..."
                      ></textarea>
                      {errors.message && <small className="error">{errors.message}</small>}
                    </label>

                    <button type="submit" className="btn-submit">
                      Send Message
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Review Summary Block */}
            <div className="contact-reviews-block">
              <button 
                className="accordion-toggle"
                onClick={() => toggleSectionExpansion("summary")}
              >
                <span>Reviews Summary</span>
                <span className={`arrow ${expandedSection === "summary" ? "open" : ""}`}>▼</span>
              </button>
              {expandedSection === "summary" && (
                <div className="contact-reviews-block-content">
                  <div className="reviews-summary">
                    <div className="average-rating">
                      <span className="rating-number">{averageRating.toFixed(1)}</span>
                      <StarRating rating={Math.round(averageRating)} />
                      <span className="review-count">({reviews.length} reviews)</span>
                    </div>
                    <div className="rating-breakdown">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="rating-row">
                          <span className="rating-label">{rating} star</span>
                          <div className="rating-bar-container">
                            <div
                              className="rating-bar"
                              style={{
                                width: `${reviews.length > 0 ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 : 0}%`,
                              }}
                            ></div>
                          </div>
                          <span className="rating-count">{reviews.filter(r => r.rating === rating).length}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Review Block */}
            <div className="contact-reviews-block">
              <button 
                className="accordion-toggle"
                onClick={() => toggleSectionExpansion("submit")}
              >
                <span>Submit Your Review</span>
                <span className={`arrow ${expandedSection === "submit" ? "open" : ""}`}>▼</span>
              </button>
              {expandedSection === "submit" && (
                <div className="contact-reviews-block-content">
                  {reviewSuccess && <p className="success-message">{reviewSuccess}</p>}
                  <form onSubmit={handleReviewSubmit} className="review-form">
                    <label>
                      Name
                      <input
                        type="text"
                        name="name"
                        value={reviewForm.name}
                        onChange={handleReviewChange}
                        placeholder="Your Name"
                      />
                      {reviewErrors.name && <small className="error">{reviewErrors.name}</small>}
                    </label>

                    <label>
                      Email
                      <input
                        type="email"
                        name="email"
                        value={reviewForm.email}
                        onChange={handleReviewChange}
                        placeholder="Your Email"
                      />
                      {reviewErrors.email && <small className="error">{reviewErrors.email}</small>}
                    </label>

                    <label>
                      Review Title
                      <input
                        type="text"
                        name="title"
                        value={reviewForm.title}
                        onChange={handleReviewChange}
                        placeholder="Brief summary of your experience"
                      />
                      {reviewErrors.title && <small className="error">{reviewErrors.title}</small>}
                    </label>

                    <label>
                      Rating
                      <StarRating
                        rating={reviewForm.rating}
                        interactive={true}
                        onRatingChange={handleRatingChange}
                      />
                    </label>

                    <label>
                      Your Review
                      <textarea
                        name="comment"
                        value={reviewForm.comment}
                        onChange={handleReviewChange}
                        placeholder="Share your experience..."
                      ></textarea>
                      {reviewErrors.comment && <small className="error">{reviewErrors.comment}</small>}
                    </label>

                    <button type="submit" className="btn-submit">
                      Submit Review
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Filter and Sort Block */}
            <div className="contact-reviews-block">
              <button 
                className="accordion-toggle"
                onClick={() => toggleSectionExpansion("filter")}
              >
                <span>Filter & Sort Reviews</span>
                <span className={`arrow ${expandedSection === "filter" ? "open" : ""}`}>▼</span>
              </button>
              {expandedSection === "filter" && (
                <div className="contact-reviews-block-content">
                  <div className="reviews-controls">
                    <div className="filter-controls">
                      <label htmlFor="filter">Filter by Rating:</label>
                      <select
                        id="filter"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">All Reviews</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                      </select>
                    </div>
                    <div className="sort-controls">
                      <label htmlFor="sort">Sort by:</label>
                      <select
                        id="sort"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <option value="recent">Most Recent</option>
                        <option value="helpful">Most Helpful</option>
                        <option value="rating-high">Highest Rating</option>
                        <option value="rating-low">Lowest Rating</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Reviews Block */}
            <div className="contact-reviews-block">
              <button 
                className="accordion-toggle"
                onClick={() => toggleSectionExpansion("reviews")}
              >
                <span>Customer Reviews</span>
                <span className={`arrow ${expandedSection === "reviews" ? "open" : ""}`}>▼</span>
              </button>
              {expandedSection === "reviews" && (
                <div className="contact-reviews-block-content">
                  <div className="reviews-list">
                    {filteredReviews.length > 0 ? (
                      filteredReviews.map((review) => (
                        <div key={review.id} className="review-item">
                          <div className="review-header">
                            <div className="reviewer-info">
                              <div className="reviewer-avatar">
                                {review.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="reviewer-name">{review.name}</h4>
                                <div className="review-date">
                                  {new Date(review.date).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                  })}
                                </div>
                              </div>
                            </div>
                            <StarRating rating={review.rating} />
                          </div>
                          <h5 className="review-title">{review.title}</h5>
                          <div className="review-content">
                            <p className="review-text">{review.comment}</p>
                            {review.verified && (
                              <div className="verified-purchase">
                                <span className="verified-icon">✓</span> Verified Purchase
                              </div>
                            )}
                          </div>
                          <div className="review-actions">
                            <button className="review-action-btn">
                              Helpful ({review.helpful || 0})
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-reviews">
                        No reviews match your current filters.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}