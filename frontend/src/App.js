import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  return (
    <div className="App">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <span className="navbar-brand">
            🇪🇹 Ethiopian Tax Clearance Certificate System
          </span>
        </div>
      </nav>

      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow">
              <div className="card-header bg-success text-white text-center">
                <h3 className="mb-0">Welcome to Tax Clearance System</h3>
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
                        <button className="btn btn-primary">Taxpayer Login</button>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="card h-100 border-success">
                      <div className="card-body text-center">
                        <h5 className="card-title text-success">For Ministry Staff</h5>
                        <p className="card-text">
                          Review applications, verify taxpayer compliance, and issue digital certificates efficiently.
                        </p>
                        <button className="btn btn-success">Staff Login</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-4">
                  <div className="alert alert-info">
                    <strong>System Status:</strong> Backend API is running on port 5000
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;