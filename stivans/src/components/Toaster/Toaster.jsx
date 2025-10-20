// src/components/Toaster/Toaster.jsx
import React from 'react';
import { Toaster } from 'react-hot-toast';
import './Toaster.css'; // We'll create this CSS file for styling

const ToasterComponent = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName="toast-container-wrapper" // Custom class for positioning
      toastOptions={{
        // Define default options
        className: '',
        duration: 5000,
        
        // Default style
        style: {
          background: '#363636',
          color: '#fff',
        },

        // Custom types
        success: {
          className: 'toast-success',
          iconTheme: {
            primary: 'white',
            secondary: '#16a34a',
          },
        },
        error: {
          className: 'toast-error',
           iconTheme: {
            primary: 'white',
            secondary: '#dc2626',
          },
        },
        loading: {
          className: 'toast-loading',
        },
      }}
    />
  );
};

export default ToasterComponent;
