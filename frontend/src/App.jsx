import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import DriverRegister from './pages/DriverRegister.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';
import DriverMessages from './pages/DriverMessages.jsx';
import TravelerDashboard from './pages/TravelerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import VehicleDetails from './pages/VehicleDetails.jsx';
import VehicleCatalog from './pages/VehicleCatalog.jsx';
import Checkout from './pages/Checkout.jsx';
import TourBriefsBoard from './pages/TourBriefsBoard.jsx';
import NavBar from './components/NavBar.jsx';
import DriversDirectory from './pages/DriversDirectory.jsx';
import DriverDetails from './pages/DriverDetails.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import TripCostCalculator from './pages/TripCostCalculator.jsx';
import { trackPageView } from './lib/analytics.js';
import Footer from './components/Footer.jsx';

const App = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}${location.hash}`);
  }, [location.pathname, location.search, location.hash]);

  const mainClasses = isHomePage
    ? 'w-full px-0 py-0'
    : 'mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <NavBar />
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-white text-slate-900',
          success: { iconTheme: { primary: '#059669', secondary: '#ffffff' } },
        }}
      />
      <main className={mainClasses}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<TravelerDashboard />} />
          <Route path="/portal/driver" element={<DriverDashboard />} />
          <Route path="/portal/driver/messages" element={<DriverMessages />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/register/driver" element={<DriverRegister />} />
          <Route path="/briefs" element={<TourBriefsBoard />} />
          <Route path="/vehicles" element={<VehicleCatalog />} />
          <Route path="/vehicles/:vehicleId" element={<VehicleDetails />} />
          <Route path="/checkout/:vehicleId" element={<Checkout />} />
          <Route path="/drivers" element={<DriversDirectory />} />
          <Route path="/drivers/:id" element={<DriverDetails />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/trip-cost-calculator" element={<TripCostCalculator />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
