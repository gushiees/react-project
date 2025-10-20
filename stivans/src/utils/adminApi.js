// src/utils/adminApi.js
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

/**
 * Helper function to fetch data from admin API endpoints.
 * Handles getting the latest auth token and redirecting on auth errors.
 *
 * @param {string} endpoint - The API endpoint path (e.g., '/api/admin/users/list').
 * @param {object} options - Fetch options (method, headers, body, etc.).
 * @param {function} logoutAndRedirect - Function to call on auth error (e.g., logout() from useAuth).
 * @returns {Promise<any>} - The JSON response data.
 * @throws {Error} - Throws an error for non-auth failures.
 */
export async function fetchAdminAPI(endpoint, options = {}, logoutAndRedirect) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('No active session. Please log in.');
    }

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };

    const mergedOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers, // Allow overriding headers if needed
      },
    };

    // Ensure body is stringified if it's an object
    if (mergedOptions.body && typeof mergedOptions.body === 'object') {
      mergedOptions.body = JSON.stringify(mergedOptions.body);
    }

    const response = await fetch(endpoint, mergedOptions);

    // Check for auth errors FIRST
    if (response.status === 401 || response.status === 403) {
      toast.error('Session expired or invalid. Please log in again.');
      if (typeof logoutAndRedirect === 'function') {
         // Use a slight delay to allow toast to show before redirect potentially unmounts it
         setTimeout(logoutAndRedirect, 500);
      }
      // Throw a specific error type or message if needed downstream,
      // but the redirect should handle it.
      throw new Error('Authentication required');
    }

    // Try to parse JSON, handle potential errors
    let responseData;
    try {
        // Handle potential empty responses (e.g., for DELETE)
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            responseData = { ok: true }; // Simulate a successful response object
        } else {
            responseData = await response.json();
        }
    } catch (parseError) {
        // If JSON parsing fails but status was OK (e.g., 200 OK with non-JSON body)
        if (response.ok) {
           console.warn(`Non-JSON response received from ${endpoint}`, await response.text());
           responseData = { ok: true, message: 'Received non-JSON success response.' };
        } else {
          // If parsing fails AND status was not OK, throw the parsing error
          console.error(`Failed to parse JSON response from ${endpoint}`, parseError);
          throw new Error(`Failed to parse response from server (Status: ${response.status})`);
        }
    }


    // Handle other non-OK responses that weren't auth errors
    if (!response.ok) {
      const errorMessage = responseData?.error || `HTTP error! Status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return responseData; // Return the parsed JSON data

  } catch (error) {
    // Re-throw the error to be caught by the calling component
    // unless it was the specific auth error we already handled with redirect
    if (error.message !== 'Authentication required') {
        console.error(`API call failed for ${endpoint}:`, error);
    }
    throw error; // Let calling component handle UI feedback (e.g., setError state)
  }
}