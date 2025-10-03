// src/pages/contact/Contact.jsx
import React, { useState } from "react";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import "./contact.css";

export default function Contact() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    message: ""
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
    setSuccess("");
  };

  // Validation rules
  const validate = () => {
    let newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = "Enter a valid email address.";
    if (!formData.message.trim()) newErrors.message = "Message cannot be empty.";
    return newErrors;
  };

  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSuccess("");
    } else {
      console.log("Form Submitted:", formData);
      setSuccess("✅ Message Sent Successfully!");
      setErrors({});
      setFormData({
        fullName: "",
        email: "",
        message: ""
      });
    }
  };

  return (
    <>
      <Header />

      <section className="contact-section">
        <div className="container">
          <h1 className="contact-title">📩 Contact Us</h1>
          <p className="contact-subtitle">
            Need assistance? Fill out the form and we’ll get back to you.
          </p>

          <div className="contact-form">
            {success && <p className="success-message">{success}</p>}
            <form onSubmit={handleSubmit}>
              <label>
                Full Name
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
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
                  onChange={handleChange}
                  placeholder="Your Email"
                />
                {errors.email && <small className="error">{errors.email}</small>}
              </label>

              <label>
                Message
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Write your message..."
                ></textarea>
                {errors.message && <small className="error">{errors.message}</small>}
              </label>

              <button type="submit" className="btn-submit">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
