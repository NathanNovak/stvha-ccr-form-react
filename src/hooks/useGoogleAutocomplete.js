import { useEffect, useRef } from 'react';

/**
 * Custom hook for Google Places Autocomplete
 * @param {Function} onPlaceSelected - Callback function when a place is selected
 * @returns {Object} - Returns ref to attach to input element
 */
const useGoogleAutocomplete = (onPlaceSelected) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    // Wait for Google Maps API to load
    const initAutocomplete = () => {
      if (!window.google || !inputRef.current) {
        return;
      }

      try {
        // Create autocomplete instance
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'us' }, // Restrict to US addresses
            fields: ['formatted_address', 'address_components', 'geometry']
          }
        );

        // Add listener for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();

          if (place.formatted_address) {
            onPlaceSelected(place.formatted_address);
          }
        });
      } catch (error) {
        console.error('Error initializing Google Autocomplete:', error);
      }
    };

    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      initAutocomplete();
    } else {
      // Wait for the script to load
      const checkGoogleLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkGoogleLoaded);
          initAutocomplete();
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogleLoaded), 10000);

      return () => clearInterval(checkGoogleLoaded);
    }

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onPlaceSelected]);

  return inputRef;
};

export default useGoogleAutocomplete;