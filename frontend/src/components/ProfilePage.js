import React, { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { jwtDecode } from 'jwt-decode';
import Swal from 'sweetalert2';
import './ProfilePage.css';

const ProfilePage = () => {
  const [userData, setUserData] = useState({
    username: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    region: '',
    province: '',
    city: '',
    streetName: '',
    barangay: '',
    postalCode: '',
    landmark: '',
    birthday: '',
    lat: '',
    lng: '',
  });

  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);

  const reverseGeocode = (latLng) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const addressComponents = results[0].address_components;
        const addressData = {
          region: '',
          province: '',
          city: '',
          streetName: '',
          barangay: '',
          postalCode: '',
          lat: latLng.lat(),
          lng: latLng.lng(),
        };

        addressComponents.forEach(component => {
          const types = component.types;
          if (types.includes('administrative_area_level_1')) {
            addressData.region = component.long_name;
          } else if (types.includes('administrative_area_level_2')) {
            addressData.province = component.long_name;
          } else if (types.includes('locality') || types.includes('administrative_area_level_3')) {
            addressData.city = component.long_name;
          } else if (types.includes('route')) {
            addressData.streetName = component.long_name;
          } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
            addressData.barangay = component.long_name;
          } else if (types.includes('postal_code')) {
            addressData.postalCode = component.long_name;
          }
        });

        setUserData(prevData => ({
          ...prevData,
          ...addressData,
        }));
      } else {
        console.error('Geocoder failed due to: ' + status);
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const requestLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by this browser.');
        reject(new Error('Geolocation not supported.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const latLng = new window.google.maps.LatLng(latitude, longitude);

          if (map && marker) {
            map.setCenter(latLng);
            marker.setPosition(latLng);
            reverseGeocode(latLng);
          }
          resolve(position);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to retrieve your location. Please check your browser settings.');
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  };

  const handleGetCurrentLocation = async () => {
    try {
      await requestLocation();
      // Location was successfully obtained
    } catch (error) {
      // Handle cases where permission was denied or an error occurred
      if (error.code === 1) { // User denied permission
        Swal.fire('Location access denied', 'You denied the request for location access.', 'info');
      }
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview before upload
    setPreviewUrl(URL.createObjectURL(file));

    // Upload to backend
    const token = localStorage.getItem("authToken");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:4000/users/profile/upload-photo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setProfileImage(data.url); // save new profile picture URL
      toast.success("Profile picture updated!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('http://localhost:4000/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch user profile:', response.statusText);
          return;
        }

        const data = await response.json();
        setUserData({
          userID: data.userID || null,
          username: data.username || '',
          firstName: data.firstName || '',
          middleName: data.middleName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phoneNumber || data.phone || '',
          region: data.region || '',
          province: data.province || '',
          city: data.city || '',
          streetName: data.streetName || '',
          barangay: data.barangay || '',
          postalCode: data.postalCode || '',
          landmark: data.landmark || '',
          birthday: data.birthday || '',
          lat: data.lat || '',
          lng: data.lng || '',
          profileImage: data.profileImage || null,
        });
        setProfileImage(data.profileImage || null);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();

    // Load Google Maps API and initialize map
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap();
      } else {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
        script.async = true;
        script.defer = true;
        script.onload = initMap;
        document.head.appendChild(script);
      }
    };

    const initMap = () => {
      if (mapRef.current && window.google && window.google.maps) {
        // Default center: Manila, Philippines
        const defaultCenter = { lat: 14.5995, lng: 120.9842 };

        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 12,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const markerInstance = new window.google.maps.Marker({
          position: defaultCenter,
          map: mapInstance,
          draggable: true,
        });

        // Add click listener to map
        mapInstance.addListener('click', (event) => {
          markerInstance.setPosition(event.latLng);
          reverseGeocode(event.latLng);
        });

        // Add dragend listener to marker
        markerInstance.addListener('dragend', (event) => {
          reverseGeocode(event.latLng);
        });

        setMap(mapInstance);
        setMarker(markerInstance);
      }
    };

    loadGoogleMaps();
  }, []);

  // Center map on stored lat/lng when profile is loaded
  useEffect(() => {
    if (map && marker && userData.lat && userData.lng) {
      const latLng = { lat: parseFloat(userData.lat), lng: parseFloat(userData.lng) };
      map.setCenter(latLng);
      marker.setPosition(latLng);
    }
  }, [userData.lat, userData.lng, map, marker]);

  // Geocode address when address fields change (only if no lat/lng stored)
  useEffect(() => {
    if (!map || !marker) return;

    const { region, province, city, streetName, barangay, postalCode, lat, lng } = userData;
    if (lat && lng) return; // If lat/lng is stored, don't geocode

    if (!region || !province || !city || !streetName || !barangay) return; // Require at least these fields

    const address = `${streetName}, ${barangay}, ${city}, ${province}, ${region}, Philippines`;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        map.setCenter(location);
        marker.setPosition(location);
        setUserData(prevData => ({ ...prevData, lat: location.lat(), lng: location.lng() }));
      } else {
        console.error('Geocode failed due to: ' + status);
      }
    });
  }, [userData.region, userData.province, userData.city, userData.streetName, userData.barangay, userData.postalCode, userData.lat, userData.lng, map, marker]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const firstName = form.firstName.value.trim();
    const lastName = form.lastName.value.trim();
    const region = form.region.value.trim();
    const province = form.province.value.trim();
    const city = form.city.value.trim();
    const streetName = form.streetName.value.trim();
    const barangay = form.barangay.value.trim();
    const postalCode = form.postalCode.value.trim();
    const landmark = form.landmark.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const birthday = form.birthday.value.trim();

    // Basic sanitation already done by trim()

    // Check for empty required fields
    if (!username || !firstName || !lastName || !region || !province || !city || !streetName || !barangay || !postalCode || !landmark || !email || !phone /*|| !birthday*/) {
      toast.error('Please fill in all required fields.');
      return;
    }

    // Validation regex patterns
    const usernamePattern = /^[a-zA-Z0-9_]+$/;
    const namePattern = /^[a-zA-Z\s'-]+$/;
    const addressPattern = /^[a-zA-Z0-9\s'-]+$/;
    const postalCodePattern = /^\d{4}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // const phonePattern = /^\+63\d{10}$/;

    if (!usernamePattern.test(username)) {
      toast.error('Username can only contain letters, numbers, and underscores.');
      return;
    }

    if (!namePattern.test(firstName)) {
      toast.error('First name can only contain letters, spaces, apostrophes, and hyphens.');
      return;
    }

    if (!namePattern.test(lastName)) {
      toast.error('Last name can only contain letters, spaces, apostrophes, and hyphens.');
      return;
    }

    if (!namePattern.test(region)) {
      toast.error('Region can only contain letters, spaces, apostrophes, and hyphens.');
      return;
    }

    if (!namePattern.test(province)) {
      toast.error('Province can only contain letters, spaces, apostrophes, and hyphens.');
      return;
    }

    if (!namePattern.test(city)) {
      toast.error('City can only contain letters, spaces, apostrophes, and hyphens.');
      return;
    }

    if (!addressPattern.test(streetName)) {
      toast.error('Street can only contain letters, numbers, spaces, apostrophes, and hyphens.');
      return;
    }

    if (!namePattern.test(barangay)) {
      toast.error('Barangay can only contain letters, spaces, apostrophes, and hyphens.');
      return;
    }

    if (!postalCodePattern.test(postalCode)) {
      toast.error('Postal code must be exactly 4 digits.');
      return;
    }

    if (!namePattern.test(landmark)) {
      toast.error('Landmark can only contain letters, spaces, apostrophes, and hyphens.');
      return;
    }

    if (!emailPattern.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    // if (!phonePattern.test(phone)) {
    //   toast.error('Phone number must start with +63 followed by 10 digits.');
    //   return;
    // }

    // Validate birthday is a valid date and not in the future
    // const birthdayDate = new Date(birthday);
    // const today = new Date();
    // if (isNaN(birthdayDate.getTime())) {
    //   toast.error('Please enter a valid birthday.');
    //   return;
    // }
    // if (birthdayDate > today) {
    //   toast.error('Birthday cannot be in the future.');
    //   return;
    // }

    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('User not authenticated.');
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('region', region);
      formData.append('province', province);
      formData.append('city', city);
      formData.append('streetName', streetName);
      formData.append('barangay', barangay);
      formData.append('postalCode', postalCode);
      formData.append('landmark', landmark);
      formData.append('email', email);
      formData.append('phoneNumber', phone);
      formData.append('birthday', birthday);
      formData.append('lat', userData.lat);
      formData.append('lng', userData.lng);

      const response = await fetch('http://localhost:4000/users/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`,
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Update failed: ${errorData.detail || response.statusText}`);
        return;
      }

      toast.success('Changes saved successfully!');
    } catch (error) {
      toast.error(`Update failed: ${error.message}`);
    }
  };

  return (
    <div className="profile-container d-flex g-0">
      <div className="profile-picture-card card">
        <h3>Profile Picture</h3>
        <div className="profile-image-wrapper">
          <img
            src={previewUrl || profileImage || "default-avatar.png"}
            alt="Profile"
            className="profile-image"
          />
        </div>
        <p className="image-info">JPG or PNG no larger than 5 MB</p>
        <input
          type="file"
          accept="image/png, image/jpeg"
          style={{ display: "none" }}
          id="fileInput"
          onChange={handleFileChange}
        />
        <button
          className="profile-btn upload-btn"
          onClick={() => document.getElementById('fileInput').click()}
        >
          Upload new image
        </button>
      </div>

      <div className="account-details-card card">
        <h3>Account Details</h3>
        <form className="account-form" onSubmit={handleSubmit}>
          <label htmlFor="username" className="form-label">
            Username <span style={{color: 'red'}}>*</span> 
          </label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="username"
            className="form-input"
            value={userData.username}
            onChange={handleInputChange}
          />

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">First name <span style={{color: 'red'}}>*</span></label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            placeholder="First name"
            className="form-input"
            value={userData.firstName}
            onChange={handleInputChange}
          />
            </div>
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last name <span style={{color: 'red'}}>*</span></label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            placeholder="Last name"
            className="form-input"
            value={userData.lastName}
            onChange={handleInputChange}
          />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Pin Your Location on the Map <span style={{color: 'red'}}>*</span></label>
              <div id="map" ref={mapRef} style={{ height: '400px', width: '100%' }}></div>
              <p className="map-info">Click on the map or drag the marker to set your location. The address fields below will be auto-filled.</p>
              <button type="button" className="profile-btn location-btn" onClick={handleGetCurrentLocation}>Use My Current Location</button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="region" className="form-label">Region <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="region"
                name="region"
                placeholder="Region"
                className="form-input"
                value={userData.region || ''}
                onChange={handleInputChange}
                autoComplete="address-level1"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="province" className="form-label">Province <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="province"
                name="province"
                className="form-input"
                value={userData.province || ''}
                onChange={handleInputChange}
                autoComplete="address-level2"
                placeholder="Enter province"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city" className="form-label">City <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="city"
                name="city"
                className="form-input"
                value={userData.city || ''}
                onChange={handleInputChange}
                autoComplete="address-level3"
                placeholder="Enter city"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="streetName" className="form-label">Street <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="streetName"
                name="streetName"
                className="form-input"
                value={userData.streetName || ''}
                onChange={handleInputChange}
                autoComplete="address-line1"
                placeholder="Enter street"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="barangay" className="form-label">Barangay <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="barangay"
                name="barangay"
                className="form-input"
                value={userData.barangay || ''}
                onChange={handleInputChange}
                autoComplete="address-level4"
                placeholder="Enter Barangay"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="postalCode" className="form-label">Postal Code <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                className="form-input"
                value={userData.postalCode || ''}
                onChange={handleInputChange}
                autoComplete="postal-code"
                placeholder="Enter postal code"
                maxLength={4}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="landmark" className="form-label">Landmark <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="landmark"
                name="landmark"
                placeholder="Landmark"
                className="form-input"
                value={userData.landmark || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <label htmlFor="email" className="form-label">Email address <span style={{color: 'red'}}>*</span></label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="name@example.com"
            className="form-input"
            value={userData.email}
            onChange={handleInputChange}
          />

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone" className="form-label">Phone number <span style={{color: 'red'}}>*</span></label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="09"
            value={userData.phone}
            onChange={handleInputChange}
            maxLength={11}
            pattern="^(0)\d{10}$"
            title="Phone number must start with 0 followed by 10 digits"
            className="form-input"
          />
            </div>
            <div className="form-group">
              <label htmlFor="birthday" className="form-label">Birthday <span style={{color: 'red'}}>*</span></label>
          <input
            type="date"
            id="birthday"
            name="birthday"
            className="form-input"
            value={userData.birthday || ''}
            onChange={handleInputChange}
          />
            </div>
          </div>

          <button type="submit" className="profile-btn save-btn">Save changes</button>
        </form>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />
    </div>
  );
};

export default ProfilePage;