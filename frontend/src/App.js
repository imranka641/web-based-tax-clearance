import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import Navigation from './components/common/Navigation';
import Login from './components/auth/Login';
import RegisterWithLocation from './components/auth/RegisterWithLocation';
import TaxpayerDashboard from './components/dashboard/TaxpayerDashboard';
import TCCApplication from './components/dashboard/TCCApplication';
import StaffDashboard from './components/staff/StaffDashboard';
import ApplicationReview from './components/staff/ApplicationReview';
import TaxPaymentDashboard from './components/tax/TaxPaymentDashboard';
import EnhancedTaxPaymentForm from './components/tax/EnhancedTaxPaymentForm';
import TaxDeadlines from './components/tax/TaxDeadlines';
import PaymentHistory from './components/tax/PaymentHistory';
import TaxCalculator from './components/tax/TaxCalculator';
import TaxProfile from './components/tax/TaxProfile';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import RegionalAdminDashboard from './components/admin/RegionalAdminDashboard';
import TownAdminDashboard from './components/admin/TownAdminDashboard';
import RegionalTowns from './components/admin/regional/RegionalTowns';
import RegionalAdmins from './components/admin/regional/RegionalAdmins';
import RegionalReports from './components/admin/regional/RegionalReports';
import ReceiptReviewQueue from './components/staff/ReceiptReviewQueue';
import ReceiptReviewDetail from './components/staff/ReceiptReviewDetail';
import TCCReviewDetail from './components/staff/TCCReviewDetail';
import UserProfile from './components/common/UserProfile';
import TownManagement from './components/admin/regional/TownManagement';
import TaxPredictionDashboard from './components/tax/TaxPredictionDashboard';
import TestVerification from './components/verification/TestVerification';
import PlaceholderPage from './components/PlaceholderPage';
import TaxpayerInitialSubmission from './components/tax/TaxpayerInitialSubmission';
import PendingVerification from './components/tax/PendingVerification';
import TownTaxManager from './components/admin/TownTaxManager';
import TCCApplicationPage from './components/tcc/TCCApplicationPage';
import MyTCCApplications from './components/tcc/MyTCCApplications';
import TCCCertificate from './components/tcc/TCCCertificate';
import EnhancedTaxpayerDashboard from './components/tax/EnhancedTaxpayerDashboard';
import TaxPaymentPage from './components/tax/TaxPaymentPage';
import TownTCCReview from './components/admin/TownTCCReview';

// ========== NEW IMPORTS FOR MISSING PAGES ==========
import TownStatistics from './components/town/TownStatistics';
import TownReports from './components/town/TownReports';
import RegionalTaxTypes from './components/regional/RegionalTaxTypes';
import RegionalPerformance from './components/regional/RegionalPerformance';
import TCCApplicationDetails from './components/tcc/TCCApplicationDetails';
import TaxFinancialDashboard from './components/tax/TaxFinancialDashboard';
import VerifyCertificate from './components/verification/VerifyCertificate';

import './App.css';

// Home page component
const HomePage = () => (
  <div className="container mt-5">
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card shadow">
          <div className="card-header bg-success text-white text-center">
            <h3 className="mb-0">Welcome to Ethiopian Tax Clearance System</h3>
            <small>Ministry of Revenue - Ethiopia</small>
          </div>
          <div className="card-body">
            <p className="lead text-center">
              Streamlining tax compliance verification and certificate issuance through digital innovation.
            </p>
            
            <div className="row mt-4">
              <div className="col-md-6 mb-3">
                <div className="card h-100 border-primary">
                  <div className="card-body text-center">
                    <h5 className="card-title text-primary">For Taxpayers</h5>
                    <p className="card-text">
                      Apply for Tax Clearance Certificates online, track your application status, and download digital certificates.
                    </p>
                    <a href="/login" className="btn btn-primary">Taxpayer Login</a>
                  </div>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="card h-100 border-success">
                  <div className="card-body text-center">
                    <h5 className="card-title text-success">For Administrators</h5>
                    <p className="card-text">
                      Town, Regional, and Super Administrators can manage tax payments and TCC applications.
                    </p>
                    <a href="/login" className="btn btn-success">Admin Login</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Navigation />
          
          <Routes>
            {/* ========== PUBLIC ROUTES ========== */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterWithLocation />} />
            
            {/* ========== COMMON ROUTES ========== */}
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/verify-certificate" element={<VerifyCertificate />} />
            
            {/* ========== TAXPAYER ROUTES ========== */}
            <Route path="/dashboard" element={<TaxpayerDashboard />} />
            <Route path="/tax/financial-dashboard" element={<TaxFinancialDashboard />} />
            <Route path="/tax/dashboard" element={<EnhancedTaxpayerDashboard />} />
            <Route path="/tax/pay/current" element={<TaxPaymentPage />} />
            <Route path="/tax/pay/:taxTypeId" element={<EnhancedTaxPaymentForm />} />
            <Route path="/tax/deadlines" element={<TaxDeadlines />} />
            <Route path="/tax/history" element={<PaymentHistory />} />
            <Route path="/tax/calculator" element={<TaxCalculator />} />
            <Route path="/tax/predict" element={<TaxPredictionDashboard />} />
            <Route path="/verify/test" element={<TestVerification />} />
            
            {/* ========== TAXPAYER INITIAL SUBMISSION ========== */}
            <Route path="/taxpayer/initial-submission" element={<TaxpayerInitialSubmission />} />
            <Route path="/taxpayer/pending-verification" element={<PendingVerification />} />
            <Route path="/town-admin/tcc-review" element={<TownTCCReview />} />
            {/* ========== TCC ROUTES ========== */}
            <Route path="/tcc/apply" element={<TCCApplicationPage />} />
            <Route path="/my-tcc-applications" element={<MyTCCApplications />} />
            <Route path="/tcc/certificate/:id" element={<TCCCertificate />} />
            <Route path="/tcc/application/:id" element={<TCCApplicationDetails />} />
            
            {/* ========== STAFF/ADMIN REVIEW ROUTES ========== */}
            <Route path="/staff-dashboard" element={<StaffDashboard />} />
            <Route path="/staff/applications/:id" element={<ApplicationReview />} />
            <Route path="/staff/receipt-review" element={<ReceiptReviewQueue />} />
            <Route path="/staff/receipt-review/:paymentId" element={<ReceiptReviewDetail />} />
            <Route path="/staff/tcc-review/:applicationId" element={<TCCReviewDetail />} />
            
            {/* ========== TOWN ADMIN ROUTES ========== */}
            <Route path="/town/dashboard" element={<TownAdminDashboard />} />
            <Route path="/town/tax-manager" element={<TownTaxManager />} />
            <Route path="/town/statistics" element={<TownStatistics />} />
            <Route path="/town/reports" element={<TownReports />} />
            <Route path="/town/tax-types" element={<PlaceholderPage title="Town Tax Types" role="town" />} />
            <Route path="/town/receipt-review/:paymentId" element={<ReceiptReviewDetail />} />
            <Route path="/town/tcc-review/:applicationId" element={<TCCReviewDetail />} />
            
            {/* ========== REGIONAL ADMIN ROUTES ========== */}
            <Route path="/regional/dashboard" element={<RegionalAdminDashboard />} />
            <Route path="/regional/towns" element={<RegionalTowns />} />
            <Route path="/regional/admins" element={<RegionalAdmins />} />
            <Route path="/regional/reports" element={<RegionalReports />} />
            <Route path="/regional/tax-types" element={<RegionalTaxTypes />} />
            <Route path="/regional/performance" element={<RegionalPerformance />} />
            <Route path="/regional/town-management" element={<TownManagement />} />
            
            {/* ========== SUPER ADMIN ROUTES ========== */}
            <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/admin/regions" element={<PlaceholderPage title="Manage Regions" role="admin" />} />
            <Route path="/admin/towns" element={<PlaceholderPage title="Manage Towns" role="admin" />} />
            <Route path="/admin/users" element={<PlaceholderPage title="Manage Users" role="admin" />} />
            <Route path="/admin/settings" element={<PlaceholderPage title="System Settings" role="admin" />} />
            <Route path="/admin/reports" element={<PlaceholderPage title="National Reports" role="admin" />} />
            
            {/* ========== 404 CATCH-ALL ROUTE ========== */}
            <Route path="*" element={
              <PlaceholderPage 
                title="Page Not Found" 
                description="The page you are looking for does not exist." 
                role="public" 
              />
            } />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;