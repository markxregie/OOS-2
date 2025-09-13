import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import AppHeader from './components/header';

import ForgotPassword from './components/forgotpassword'; 
import Menu from './components/menulanding';
import About from './components/aboutus';  
import Services from './components/services'; 
import Menus from './components/menu';
import HomePage from './components/HomePage';
import Footer from './components/footer';
import Cart from './components/cart';
import CheckoutPage from './components/checkoutpage';
import Dashboard from './components/admin2/dashboard';
import ManageOrders from './components/admin2/manageorders';
import Sidebar from './components/admin2/sidebar';
import ProfilePage from './components/ProfilePage';
import ProfileSidebar from './components/ProfileSidebar';
import OrderHistory from './components/OrderHistory';
import Notification from './components/Notification';
import Products from './components/admin2/products'; 
import Staff from './components/admin2/Staff';
import DeliveryManagement from './components/admin2/deliverymanagement';
import Inbox from './components/admin2/inbox';
import Report from './components/admin2/report';
import RiderDashboard from './components/admin2/riderdashboard';
import RiderHome from './components/admin2/riderhome';
import NotFound from './components/NotFound';
import Resetpassword from './components/Resetpassword';

import { BrowserRouter as Router, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';  // <-- Import AuthProvider
import { CartProvider } from './contexts/CartContext';  // Import CartProvider



function App() {
  return (
    <Router>
      {/* Wrap the entire app in CartProvider and AuthProvider so context is shared */}
      <CartProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </CartProvider>
    </Router>
  );
}

// Admin Layout Component
const AdminLayout = () => {
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Outlet /> {/* This is where child routes will render */}
      </div>
    </div>
  );
};

// Profile Layout Component
const ProfileLayout = () => {
  return (
    <div className="d-flex">
      <ProfileSidebar />
      <div className="flex-grow-1">
        <Outlet /> {/* This is where ProfilePage or nested routes will render */} 
      </div>
    </div>
  );
};

function MainApp() {
  const location = useLocation();
  const hideHeaderPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/Reset-password', '/admin', '/admin/*', '/rider/home', '/usermanagement'];
  const shouldHideHeader = hideHeaderPaths.some(path => 
    location.pathname.startsWith(path)
  );
  
  return (
    <div className='App'>
      {!shouldHideHeader && !location.pathname.startsWith('/admin') && (
        <header id='header'>
          <AppHeader />
        </header>
      )}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          
          <Route path="/menu" element={<Menus />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          {/* <Route path="/login" element={<LoginPage />} /> */}
          {/* <Route path="/signup" element={<Signup />} /> */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<Resetpassword />} />
          <Route element={<ProfileLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/orderhistory" element={<OrderHistory />} />
            <Route path="/profile/notification" element={<Notification />} />
          </Route>
          {/* Admin Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/products" element={<Products />} />
            <Route path="/admin/manageorders" element={<ManageOrders />} />
            <Route path="/admin/inbox" element={<Inbox />} />
            <Route path="/admin/delivery" element={<DeliveryManagement />} />
            <Route path="/admin/riderdashboard" element={<RiderDashboard />} />
            <Route path="/admin/staff" element={<Staff />} />
            <Route path="/admin/report" element={<Report />} />
          </Route>
  
          {/* Rider Home Route without header/sidebar */} 
          <Route path="/rider/home" element={<RiderHome />} />
          {/* 404 Not Found Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!location.pathname.startsWith('/admin') && <Footer />}
    </div>
  );
}

export default App;
