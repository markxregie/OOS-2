import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaClock,
  FaUser,
  FaMapMarkerAlt,
  FaBox,
  FaTruckPickup,
  FaTruckMoving,
  FaUndo,
  FaTimesCircle,
  FaExchangeAlt,

  FaCog,
  FaCreditCard,
  FaUserTie,
  FaMapMarkedAlt,
  FaChevronRight,
  FaChevronUp,
  FaCheckCircle,
  FaBoxOpen
} from "react-icons/fa";
import { Container, Card, Button, Modal } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import logoImage from "../../assets/logo.png";
import "./riderhome.css";
import RiderSidebar from "./RiderSidebar";
import RiderHeaderSummary from "./RiderHeaderSummary";

import Swal from 'sweetalert2';

  // Simple in-memory caches to avoid repeating expensive external requests
  const geocodeCache = new Map(); // address -> { lat, lng }
  const pendingGeocode = new Map(); // address -> Promise

  async function geocodeAddress(address) {
    if (!address) return null;
    const key = address.trim().toLowerCase();
    if (geocodeCache.has(key)) return geocodeCache.get(key);
    if (pendingGeocode.has(key)) return pendingGeocode.get(key);

    const p = new Promise((resolve) => {
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            const val = { lat: location.lat(), lng: location.lng() };
            geocodeCache.set(key, val);
            resolve(val);
          } else {
            resolve(null);
          }
        });
      } else {
        resolve(null);
      }
    });

    pendingGeocode.set(key, p);
    return p;
  }

  async function fetchCustomerLocationFromBackend(orderId) {
    if (!orderId) return null;
    const tries = [
        `http://localhost:7004/delivery/order/${orderId}/customer/location`,
        `http://localhost:7004/delivery/order/${orderId}/customer`,
        `http://localhost:4000/users/orders/${orderId}/customer/location`
    ];

    for (const url of tries) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (!data) continue;
            const lat = data.lat || data.latitude || data.Lat;
            const lng = data.lng || data.longitude || data.Lng;
            if (lat && lng && Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng))) {
                return [parseFloat(lat), parseFloat(lng)];
            }
        } catch (e) {
            // ignore
        }
    }
    return null;
  }

  function RiderDashboard() {
    // We'll initialize a Google Maps map when the modal opens to show route from rider to customer.
    const riderMapRef = useRef(null);
    const [riderMap, setRiderMap] = useState(null);
    const [riderMarker, setRiderMarker] = useState(null);
    const [customerMarker, setCustomerMarker] = useState(null);
    const [routePolyline, setRoutePolyline] = useState(null);
    const [scriptLoaded, setScriptLoaded] = useState(!!(window.google && window.google.maps));

    // Load Google Maps API script if not already loaded
    useEffect(() => {
      if (!scriptLoaded) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
        script.async = true;
        script.defer = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => console.error('Failed to load Google Maps API');
        document.head.appendChild(script);
      }
    }, [scriptLoaded]);

    const [userRole, setUserRole] = useState("");
    const [userName, setUserName] = useState("");

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 991);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth > 991);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // NEW: State for mobile bottom menu
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [currentOrderToDeliver, setCurrentOrderToDeliver] = useState(null);
    const [showMapModal, setShowMapModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [riderLocation, setRiderLocation] = useState(null);
    const [customerLocation, setCustomerLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [expandedOrders, setExpandedOrders] = useState(new Set());

    const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
    const [riderId, setRiderId] = useState(localStorage.getItem("riderId") || "");
    const [riderName, setRiderName] = useState(localStorage.getItem("riderName") || "");
    const [riderPhone, setRiderPhone] = useState(localStorage.getItem("riderPhone") || "");
    const [userLoading, setUserLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

    useEffect(() => {
      const queryParams = new URLSearchParams(location.search);
      const tokenFromUrl = queryParams.get("authorization");
      const usernameFromUrl = queryParams.get("username");

      if (tokenFromUrl) {
        localStorage.setItem("authToken", tokenFromUrl);
        setAuthToken(tokenFromUrl);
      }
      if (usernameFromUrl) {
        localStorage.setItem("riderUsername", usernameFromUrl);
      }
    }, [location.search]);

    useEffect(() => {
      const handleResize = () => {
        setIsSidebarOpen(window.innerWidth > 991);
        setIsDesktop(window.innerWidth > 991);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
      const handleClickOutside = (event) => {
        const dropdown = document.querySelector('.dropdown-icon');
        if (dropdown && !dropdown.contains(event.target)) {
          setDropdownOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const [toggle, setToggle] = useState("active");
    const [earningsFilter, setEarningsFilter] = useState("Daily");
    const [orders, setOrders] = useState([]);
    const [earnings, setEarnings] = useState(null);

    useEffect(() => {
      const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`http://localhost:7004/delivery/rider/${riderId}/orders`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log('✅ Orders fetched:', data);
          setOrders(data);
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };
      if (riderId && authToken) {
        fetchOrders();
      }
    }, [riderId, authToken]);

    useEffect(() => {
      if (authToken) {
        setUserLoading(true);
        fetch("http://localhost:4000/auth/users/me", {
          headers: { "Authorization": `Bearer ${authToken}` }
        })
          .then(res => {
            if (res.status === 401) {
              handleLogout();
              return;
            }
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
          })
          .then(async data => {
            if (!data) return;
            const userId = data.userId || "";
            const userRoleData = data.userRole || "";
            const fallbackName = (data.fullName && data.fullName.trim() !== "")
              ? data.fullName
              : (data.username && data.username.trim() !== "")
                ? data.username
                : "Rider";
            const fallbackPhone = data.phone || "";

            setRiderId(userId);
            localStorage.setItem("riderId", userId);
            setUserRole(userRoleData);
            setUserName(fallbackName);

            if (userId) {
              try {
                const riderRes = await fetch(`http://localhost:4000/users/riders/${userId}`, {
                  headers: { "Authorization": `Bearer ${authToken}` }
                });
                if (riderRes.ok) {
                  const riderData = await riderRes.json();
                  const riderFullName = riderData.FullName || fallbackName;
                  const riderPhone = riderData.Phone || fallbackPhone;
                  setRiderName(riderFullName);
                  localStorage.setItem("riderName", riderFullName);
                  setRiderPhone(riderPhone);
                  localStorage.setItem("riderPhone", riderPhone);
                  setUserName(riderFullName);
                } else {
                  setRiderName(fallbackName);
                  localStorage.setItem("riderName", fallbackName);
                  setRiderPhone(fallbackPhone);
                  localStorage.setItem("riderPhone", fallbackPhone);
                }
              } catch (err) {
                console.error("Failed to fetch rider info:", err);
                setRiderName(fallbackName);
                localStorage.setItem("riderName", fallbackName);
                setRiderPhone(fallbackPhone);
                localStorage.setItem("riderPhone", fallbackPhone);
              }
            }
            setUserLoading(false);
          })
          .catch(err => {
            console.error("Failed to fetch user info:", err);
            setUserLoading(false);
          });
      }
    }, [authToken]);

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentDate(new Date());
      }, 60000);

      return () => clearInterval(timer);
    }, []);

    useEffect(() => {
      const fetchEarnings = async () => {
        if (!riderId || !authToken) {
          return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // JS months are 0-indexed
        const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

        let url = '';
        if (earningsFilter === 'Daily') {
          url = `http://localhost:7004/delivery/rider/${riderId}/earnings/daily?target_date=${today}`;
        } else if (earningsFilter === 'Weekly') {
          url = `http://localhost:7004/delivery/rider/${riderId}/earnings/weekly?target_date=${today}`;
        } else if (earningsFilter === 'Monthly') {
          url = `http://localhost:7004/delivery/rider/${riderId}/earnings/monthly?year=${year}&month=${month}`;
        }

        if (!url) return;

        try {
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` },
          });
          if (!response.ok) throw new Error(`Failed to fetch earnings: ${response.status}`);
          const data = await response.json();
          setEarnings(data);
        } catch (e) {
          console.error('Earnings fetch error:', e);
          setEarnings({ totalEarnings: 0.0 }); // Set a default on error
        }
      };

      fetchEarnings();
    }, [riderId, authToken, earningsFilter]);

    // Update rider location to backend every 5 seconds
    useEffect(() => {
      if (!riderId || !authToken) return;

      const updateLocation = async (lat, lng) => {
        try {
          const response = await fetch(`http://localhost:7004/delivery/rider/${riderId}/location`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ lat, lng })
          });
          if (!response.ok) {
            console.warn('Failed to update rider location:', response.status);
          }
        } catch (e) {
          console.warn('Error updating rider location:', e);
        }
      };

      const interval = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              updateLocation(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
              console.warn('Geolocation error:', error);
            },
            { maximumAge: 60000, timeout: 5000 }
          );
        }
      }, 5000);

      return () => clearInterval(interval);
    }, [riderId, authToken]);

    const getGreeting = () => {
      const hour = currentDate.getHours();
      if (hour < 12) return "Good morning";
      if (hour < 18) return "Good afternoon";
      return "Good evening";
    };

    const currentDateFormatted = currentDate.toLocaleString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "numeric", minute: "numeric",
    });

    const getStatusStyle = (status) => {
      switch (status) {
        case "pending":
          return { color: "#d39e00", backgroundColor: "#fff3cd", text: "PENDING" };
        case "confirmed":
          return { color: "#198754", backgroundColor: "#d1e7dd", text: "Confirmed" };
        case "preparing":
          return { color: "#2980b9", backgroundColor: "#cfe2ff", text: "Preparing" };
        case "waitingforpickup":
          return { color: "#ffffff", backgroundColor: "#9c27b0", text: "Waiting for Pickup" };
        case "pickedup":
          return { color: "#0d6efd", backgroundColor: "#cfe2ff", text: "Picked Up" };
        case "delivering":
          return { color: "#ffffff", backgroundColor: "rgb(63, 81, 181)", text: "DELIVERING" };
        case "completed":
          return { color: "rgb(25, 135, 84)", backgroundColor: "rgb(209, 231, 221)", text: "COMPLETED" };
        case "delivered":
          return { color: "#198754", backgroundColor: "#d1e7dd", text: "Delivered" };
        case "cancelled":
          return { color: "#dc3545", backgroundColor: "#f8d7da", text: "Cancelled" };
        case "returned":
          return { color: "#fd7e14", backgroundColor: "#ffe5d0", text: "Cancelled/Returned" };
        default:
          return { color: "black", backgroundColor: "transparent", text: status };
      }
    };

    const filteredOrders = orders
      .filter(order => {
        if (toggle === "active") {
          return !["delivered", "completed", "cancelled", "returned"].includes(order.currentStatus.toLowerCase());
        } else if (toggle === "completed") {
          return ["delivered", "completed"].includes(order.currentStatus.toLowerCase());
        }
        return true;
      });

    const updateOrderStatus = async (orderId, newStatus) => {
      try {
        // Find the order to get the reference number
        const order = orders.find(o => o.id === orderId);
        if (!order) {
          throw new Error('Order not found');
        }

        const referenceNumber = order.referenceNumber;
        if (!referenceNumber) {
          throw new Error('Reference number not found for this order');
        }

        // PATCH to cart/rider/orders
        const cartResponse = await fetch(`http://localhost:7004/cart/rider/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ new_status: newStatus })
        });
        if (!cartResponse.ok) {
          throw new Error(`Failed to update cart status: ${cartResponse.status}`);
        }

        // PUT to delivery/orders
        const deliveryResponse = await fetch(`http://localhost:7004/delivery/orders/${orderId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ status: newStatus })
        });
        if (!deliveryResponse.ok) {
          throw new Error(`Failed to update delivery status: ${deliveryResponse.status}`);
        }

        // Update POS status based on delivery status
        let posStatus = null;
        if (newStatus === 'pickedup') {
          posStatus = "picked up";
        } else if (newStatus === 'delivering') {
          posStatus = "delivering";
        } else if (newStatus === 'delivered') {
          posStatus = "completed";
        }

        if (posStatus) {
          console.log(`Updating POS for reference: ${referenceNumber}, status: ${posStatus}`);
          const posResponse = await fetch(`http://127.0.0.1:9000/auth/purchase_orders/online/${referenceNumber}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ newStatus: posStatus })
          });
          if (!posResponse.ok) {
            throw new Error(`Failed to update POS status: ${posResponse.status}`);
          }
        }

        // Update local state
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, currentStatus: newStatus } : o));

        // Success message
        Swal.fire("Success", "Order marked as " + newStatus, "success");
      } catch (e) {
        Swal.fire('Error', e.message, 'error');
      }
    };

    const handleProgressiveStatusChange = (orderId, currentStatus) => {
      let nextStatus;
      if (currentStatus === 'waitingforpickup') nextStatus = 'pickedup';
      else if (currentStatus === 'pickedup') nextStatus = 'delivering';
      else if (currentStatus === 'delivering') nextStatus = 'delivered';
      else return;

      if (nextStatus === 'delivered') {
        Swal.fire({
          title: 'Proof of Delivery',
          html: '<input type="file" id="delivery-photo" accept="image/*" class="swal2-file-input">',
          showCancelButton: true,
          confirmButtonText: 'Mark as Delivered',
          showLoaderOnConfirm: true,
          allowOutsideClick: () => !Swal.isLoading(),
          preConfirm: async () => {
            const file = document.getElementById('delivery-photo').files[0];
            if (!file) {
              Swal.showValidationMessage('Please upload a photo.');
              return false;
            }
            
            // Upload the image to backend
            try {
              const formData = new FormData();
              formData.append('image', file);
              
              const uploadResponse = await fetch(`http://localhost:7004/cart/rider/orders/${orderId}/delivery-image`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                },
                body: formData
              });
              
              if (!uploadResponse.ok) {
                throw new Error('Failed to upload delivery image');
              }
              
              const uploadResult = await uploadResponse.json();
              console.log('Image uploaded successfully:', uploadResult.image_url);
              return uploadResult.image_url;
            } catch (error) {
              console.error('Error uploading image:', error);
              Swal.showValidationMessage('Failed to upload image. Please try again.');
              return false;
            }
          }
        }).then((result) => {
          if (result.isConfirmed) {
            updateOrderStatus(orderId, 'delivered');
          }
        });
      } else {
        let confirmationText = `Are you sure you want to mark this order as ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}?`;
        Swal.fire({
          title: 'Confirm Status Change',
          text: confirmationText,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, change it!'
        }).then((result) => {
          if (result.isConfirmed) {
            updateOrderStatus(orderId, nextStatus);
          }
        });
      }
    };

    const statusIcons = {
      pending: <FaClock />,
      confirmed: <FaCheckCircle />,
      preparing: <FaBox />,
      waitingforpickup: <FaTruckPickup />,
      pickedup: <FaTruckMoving />,
      completed: <FaCheckCircle />,
      delivering: <FaTruckMoving />,
      delivered: <FaCheckCircle />,
      cancelled: <FaTimesCircle />,
      returned: <FaUndo />,
    };

    const getButtonText = (currentStatus) => {
      if (currentStatus === 'waitingforpickup') return 'Picked Up';
      else if (currentStatus === 'pickedup') return 'Delivering';
      else if (currentStatus === 'delivering') return 'Delivered';
      return '';
    };

    const shouldRenderButton = (currentStatus) => {
      return ['waitingforpickup', 'pickedup', 'delivering'].includes(currentStatus);
    };

    const getButtonClass = (currentStatus) => {
      if (currentStatus === 'delivering') return 'delivered';
      else return 'pickedUp';
    };

    const navigateToDashboard = () => {
      navigate("/rider/home");
    };

    const navigateToHistory = () => {
      navigate("/rider/riderhistory");
    };

    const navigateToNotifications = () => {
      navigate("/rider/notifications");
    };

    const navigateToRoute = (order) => {
      setSelectedOrder(order);
      // Get rider's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const riderLat = position.coords.latitude;
            const riderLng = position.coords.longitude;
            setRiderLocation([riderLat, riderLng]);
            // Try to fetch customer location from backend first, then geocode if needed
            (async () => {
              try {
                let custLoc = await fetchCustomerLocationFromBackend(order.id);
                if (!custLoc) {
                  const g = await geocodeAddress(order.address);
                  if (g) custLoc = [g.lat, g.lng];
                }
                if (custLoc) setCustomerLocation(custLoc);
                else setCustomerLocation([14.5995, 120.9842]);
              } catch (e) {
                console.error('Customer location fetch/geocoding error:', e);
                setCustomerLocation([14.5995, 120.9842]);
              } finally {
                setShowMapModal(true);
              }
            })();
          },
          (error) => {
            console.error('Geolocation error:', error);
            Swal.fire('Location Access Required', 'Please enable location services in your browser to navigate the route.', 'warning');
          }
        );
      } else {
        Swal.fire('Location Not Supported', 'Geolocation is not supported by this browser. Please enable location services.', 'warning');
      }
    };

    // Initialize Google Maps map when modal opens and rider/customer locations are available
    useEffect(() => {
      const initMap = async () => {
        try {
          if (!showMapModal || !selectedOrder) return;
          if (!riderLocation || !customerLocation) return;

          // ensure valid numbers
          const [riderLat, riderLng] = riderLocation;
          const [custLat, custLng] = customerLocation;
          if (![riderLat, riderLng, custLat, custLng].every(v => Number.isFinite(v))) return;

          // remove previous map if any
          if (riderMap) {
            setRiderMap(null);
          }
          if (riderMarker) {
            riderMarker.setMap(null);
            setRiderMarker(null);
          }
          if (customerMarker) {
            customerMarker.setMap(null);
            setCustomerMarker(null);
          }
          if (routePolyline) {
            routePolyline.setMap(null);
            setRoutePolyline(null);
          }

          const center = { lat: (riderLat + custLat) / 2, lng: (riderLng + custLng) / 2 };
          const map = new window.google.maps.Map(riderMapRef.current, {
            center: center,
            zoom: 12,
            mapTypeId: window.google.maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
          });
          setRiderMap(map);

          // add markers
          const riderMarkerInstance = new window.google.maps.Marker({
            position: { lat: riderLat, lng: riderLng },
            map: map,
            title: 'Rider',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="8" fill="#007bff" stroke="white" stroke-width="2"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(20, 20),
            },
          });
          setRiderMarker(riderMarkerInstance);

          const customerMarkerInstance = new window.google.maps.Marker({
            position: { lat: custLat, lng: custLng },
            map: map,
            title: 'Customer',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="8" fill="#ff4d4f" stroke="white" stroke-width="2"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(20, 20),
            },
          });
          setCustomerMarker(customerMarkerInstance);

          // request directions from Google Maps
          const directionsService = new window.google.maps.DirectionsService();
          const directionsRenderer = new window.google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true, // we have our own markers
            polylineOptions: {
              strokeColor: '#1d7fa6',
              strokeWeight: 6,
            },
          });

          const request = {
            origin: { lat: riderLat, lng: riderLng },
            destination: { lat: custLat, lng: custLng },
            travelMode: window.google.maps.TravelMode.DRIVING,
          };

          directionsService.route(request, (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              directionsRenderer.setDirections(result);
              setRoutePolyline(directionsRenderer);
            } else {
              console.error('Directions request failed due to ' + status);
            }
          });

          // fit bounds
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(new window.google.maps.LatLng(riderLat, riderLng));
          bounds.extend(new window.google.maps.LatLng(custLat, custLng));
          map.fitBounds(bounds, 60);

        } catch (err) {
          console.error('Map init error (riderhome):', err);
        }
      };

      initMap();

      // cleanup when modal closes
      return () => {
        if (riderMap) {
          setRiderMap(null);
        }
        if (riderMarker) {
          riderMarker.setMap(null);
          setRiderMarker(null);
        }
        if (customerMarker) {
          customerMarker.setMap(null);
          setCustomerMarker(null);
        }
        if (routePolyline) {
          routePolyline.setMap(null);
          setRoutePolyline(null);
        }
      };
    }, [showMapModal, selectedOrder, riderLocation, customerLocation]);

    const toggleOrderExpansion = (orderId) => {
      setExpandedOrders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(orderId)) {
          newSet.delete(orderId);
        } else {
          newSet.add(orderId);
        }
        return newSet;
      });
    };

    const handleLogout = () => {
      setAuthToken(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("riderId");
      localStorage.removeItem("riderName");
      localStorage.removeItem("riderPhone");
      window.location.href = "http://localhost:4002/";
    };

    return (
      <div className="rider-dashboard-container">
        <RiderSidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigateToDashboard={navigateToDashboard}
          navigateToHistory={navigateToHistory}
          navigateToNotifications={navigateToNotifications}
          handleLogout={handleLogout}
          userName={userName}
          userRole={userRole}
          riderName={riderName}
          riderPhone={riderPhone}
        />

        <div className="main-content">
          <RiderHeaderSummary
            currentDateFormatted={currentDateFormatted}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            getGreeting={getGreeting}
            userRole={userRole}
            userName={userName}
            dropdownOpen={dropdownOpen}
            setDropdownOpen={setDropdownOpen}
            handleLogout={handleLogout}
            riderName={riderName}
            orders={orders}
            earningsFilter={earningsFilter}
            setEarningsFilter={setEarningsFilter}
            earnings={earnings}
          />

          <div className="toggle-buttons-container">
            <button
              className={`toggle-button ${toggle === "active" ? "active" : ""}`}
              onClick={() => setToggle("active")}
            >
              Active Orders
            </button>
            <button
              className={`toggle-button ${toggle === "all" ? "active" : ""}`}
              onClick={() => setToggle("all")}
            >
              All Orders
            </button>
            <button
              className={`toggle-button ${toggle === "completed" ? "active" : ""}`}
              onClick={() => setToggle("completed")}
            >
              Completed
            </button>
          </div>

          <div className="order-list-heading">
            {toggle === "active" && <div> Active Orders</div>}
            {toggle === "all" && <div> All Orders</div>}
            {toggle === "completed" && <div> Completed Orders</div>}
          </div>

          <div className="order-cards-container">
            {loading ? (
              <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                  </div>
              </div>
            ) : error ? (
              <div className="alert alert-danger">Error: {error}</div>
            ) : filteredOrders.length === 0 ? (
              <div className="no-orders-message">
                <FaBoxOpen size={50} color="#ccc" />
                <p>No orders to show.</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <Card key={order.id} className="order-card">
                  <div className="order-header">
                    <h5 className="order-id">Order #{order.id}</h5>

                    <div className="status-tag" style={{ color: getStatusStyle(order.currentStatus).color, backgroundColor: getStatusStyle(order.currentStatus).backgroundColor }}>
                      {statusIcons[order.currentStatus]} {getStatusStyle(order.currentStatus).text}
                    </div>
                  </div>
                  <div className="order-details mobile-stack"> 
                    <p className="detail-item"><FaClock color="#4b929d" /> <strong>Ordered:</strong> <span className="detail-value">{new Date(order.orderedAt).toLocaleString()}</span></p>
                    <p className="detail-item"><FaUser color="#4b929d" /> <strong>Customer:</strong> <span className="detail-value">{(() => { const parts = order.customerName.split(' '); return parts.length > 0 && /\d/.test(parts[0]) ? parts.slice(1).join(' ') : order.customerName; })()}</span></p>
                    
                    {/* Collapsible Address/Phone for cleaner mobile view */}
                    <p className="detail-item"><FaMapMarkerAlt color="#4b929d" /> <strong>Address:</strong> <span className="detail-value">{order.address}</span></p>
                    
                    <div style={{ marginTop: '10px', border: '1px solid #eee', padding: '8px', borderRadius: '5px' }}>
                        {isDesktop ? (
                            <>
                                <div style={{ color: '#4a9ba5', fontWeight: 'bold' }}>
                                    <FaBox color="#4b929d" /> {order.items?.length || 0} Items
                                </div>
                                <ul className="item-list" style={{ marginTop: '10px', paddingLeft: '0', listStyle: 'none' }}>
                                {order.items?.map((item, i) => {
                                  const promoName = item.promo_name || item.applied_promo || "";
                                  const promoDiscount = item.discount || 0;
                                  const hasPromo = promoName || promoDiscount > 0;

                                  return (
                                    <React.Fragment key={i}>
                                      <li className="item-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', padding: '5px 0' }}>
                                        <span>{item.quantity}x {item.name}</span>
                                        <span>₱{item.price.toFixed(2)}</span>
                                      </li>
                                      {hasPromo && (
                                        <li style={{ paddingLeft: '1rem', fontSize: '0.9em', color: '#28a745', fontWeight: '500', marginTop: '2px', marginBottom: '5px' }}>
                                          🎉 {promoName} - ₱{promoDiscount.toFixed(2)} OFF
                                        </li>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                                <li className="item-row" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '5px' }}>
                                    <span>Delivery Fee</span>
                                    <span>₱{Number(order.deliveryFee || order.delivery_fee || Math.max(0, (order.total || 0) - (order.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) || 0))).toFixed(2)}</span>
                                </li>
                                </ul>
                            </>
                        ) : (
                            <>
                                <div
                                    style={{ cursor: 'pointer', color: '#4a9ba5', fontWeight: 'bold' }}
                                    onClick={() => toggleOrderExpansion(order.id)}
                                >
                                    <FaBox color="#4b929d" /> {order.items?.length || 0} Items (Click to View)
                                    {expandedOrders.has(order.id) ? <FaChevronUp style={{ marginLeft: '5px' }} /> : <FaChevronRight style={{ marginLeft: '5px' }} />}
                                </div>
                                {expandedOrders.has(order.id) && (
                                    <ul className="item-list" style={{ marginTop: '10px', paddingLeft: '0', listStyle: 'none' }}>
                                    {order.items?.map((item, i) => {
                                      const promoName = item.promo_name || item.applied_promo || "";
                                      const promoDiscount = item.discount || 0;
                                      const hasPromo = promoName || promoDiscount > 0;

                                      return (
                                        <React.Fragment key={i}>
                                          <li className="item-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', padding: '5px 0' }}>
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>₱{item.price.toFixed(2)}</span>
                                          </li>
                                          {hasPromo && (
                                            <li style={{ paddingLeft: '1rem', fontSize: '0.9em', color: '#28a745', fontWeight: '500', marginTop: '2px', marginBottom: '5px' }}>
                                              🎉 {promoName} - ₱{promoDiscount.toFixed(2)} OFF
                                            </li>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                    <li className="item-row" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '5px' }}>
                                        <span>Delivery Fee</span>
                                        <span>₱{Number(order.deliveryFee || order.delivery_fee || Math.max(0, (order.total || 0) - (order.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) || 0))).toFixed(2)}</span>
                                    </li>
                                    </ul>
                                )}
                            </>
                        )}
                    </div>

                    {order.notes && (
                      <p style={{ backgroundColor: "#fff3cd", padding: "10px", borderRadius: "4px", marginTop: "10px", color: "#856404", fontSize: '0.9rem' }}>
                        <strong>Note:</strong> {order.notes}
                      </p>
                    )}
                  </div>
                  <hr className="divider" style={{ margin: '10px 0' }} />
                  <div className="order-total-section mobile-total" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px' }}>
                    <span className="total-label">Total:</span>
                    <span className="total-value">₱{order.total?.toFixed(2) || "0.00"}</span>
                  </div>
                  
                  {/* FIXED: Use the centralized action button container */}
                  <div className="order-actions">
                    {(order.currentStatus === 'pickedup' || order.currentStatus === 'delivering') && (
                      <Button
                        variant="success"
                        className="navigate-route-button action-btn"
                        onClick={() => navigateToRoute(order)}
                      >
                        <FaMapMarkedAlt className="me-2" /> Navigate Route
                      </Button>
                    )}
                    
                    {shouldRenderButton(order.currentStatus) && (
                      <Button
                        variant="primary"
                        className={`status-change-button action-btn ${getButtonClass(order.currentStatus)}`}
                        onClick={() => handleProgressiveStatusChange(order.id, order.currentStatus)}
                      >
                        {getButtonText(order.currentStatus)}
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          {showMapModal && selectedOrder && (
            <Modal centered show={showMapModal} onHide={() => setShowMapModal(false)} size="xl" scrollable>
              <Modal.Header closeButton>
                <Modal.Title>Navigate to {(() => { const parts = selectedOrder.customerName.split(' '); return parts.length > 0 && /\d/.test(parts[0]) ? parts.slice(1).join(' ') : selectedOrder.customerName; })()}'s Address</Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ maxHeight: '200vh', overflowY: 'auto' }}>
                <div ref={riderMapRef} style={{ height: '650px', width: '100%' }} />
              </Modal.Body>
            </Modal>
          )}
        </div>
      </div>
    );
  }

  export default RiderDashboard;