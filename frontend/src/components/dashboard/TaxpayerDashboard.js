import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Table, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TaxpayerDashboard = () => {
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/applications/my-applications');
      setApplications(response.data.applications);
    } catch (err) {
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

const downloadCertificate = async (applicationId) => {
  try {
    console.log('📥 Attempting to download certificate for application:', applicationId);
    
    const response = await api.get(`/applications/${applicationId}/certificate`, {
      responseType: 'blob'
    });
    
    // Create blob and download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from response headers or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `TCC-Certificate-${applicationId}.pdf`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Certificate downloaded successfully');
    
  } catch (err) {
    console.error('❌ Download failed:', err);
    
    let errorMessage = 'Failed to download certificate';
    
    if (err.response) {
      // Server responded with error status
      if (err.response.status === 404) {
        errorMessage = 'Certificate not found. Please ensure your application is approved.';
      } else if (err.response.status === 400) {
        errorMessage = 'Application not yet approved. Certificate will be available after approval.';
      } else {
        errorMessage = err.response.data?.error || 'Download failed';
      }
    } else if (err.request) {
      // Request was made but no response received
      errorMessage = 'Network error. Please check your connection.';
    }
    
    setError(errorMessage);
    alert(`❌ ${errorMessage}`);
  }
};
  const getStatusVariant = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'danger';
      case 'Under Review': return 'warning';
      case 'Submitted': return 'info';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Taxpayer Dashboard</h2>
              <p className="text-muted">
                Welcome back, {user?.full_name} | TIN: {user?.tin}
              </p>
            </div>
            <Link to="/apply-tcc" className="btn btn-primary btn-lg">
              + Apply for New TCC
            </Link>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Row>
            <Col md={8}>
              <Card className="shadow-sm">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">My TCC Applications</h5>
                </Card.Header>
                <Card.Body>
                  {applications.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted">You haven't submitted any TCC applications yet.</p>
                      <Link to="/apply-tcc" className="btn btn-primary">
                        Apply for Your First TCC
                      </Link>
                    </div>
                  ) : (
                    <Table responsive striped>
                      <thead>
                        <tr>
                          <th>Application ID</th>
                          <th>Submitted Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => (
                          <tr key={app.id}>
                            <td>#{app.id}</td>
                            <td>{new Date(app.submitted_at).toLocaleDateString()}</td>
                            <td>
                              <Badge bg={getStatusVariant(app.status)}>
                                {app.status}
                              </Badge>
                            </td>
                           <td>
  {app.status === 'Approved' && (
    <Button 
      variant="outline-success" 
      size="sm"
      onClick={() => downloadCertificate(app.id)}
      title={`Download TCC Certificate for application #${app.id}`}
    >
      📄 Download TCC
    </Button>
  )}
  {app.status === 'Rejected' && app.rejection_reason && (
    <Button 
      variant="outline-danger" 
      size="sm"
      onClick={() => alert(`Rejection Reason: ${app.rejection_reason}`)}
    >
      ❌ View Reason
    </Button>
  )}
  {(app.status === 'Submitted' || app.status === 'Under Review') && (
    <Badge bg="warning" text="dark">
      ⏳ {app.status}
    </Badge>
  )}
</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-info text-white">
                  <h6 className="mb-0">Quick Stats</h6>
                </Card.Header>
                <Card.Body>
                  <div className="text-center">
                    <h4>{applications.length}</h4>
                    <p className="text-muted">Total Applications</p>
                  </div>
                  <hr />
                  <small>
                    <strong>Approved:</strong> {applications.filter(a => a.status === 'Approved').length}<br />
                    <strong>Pending:</strong> {applications.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length}<br />
                    <strong>Rejected:</strong> {applications.filter(a => a.status === 'Rejected').length}
                  </small>
                </Card.Body>
              </Card>

              <Card className="shadow-sm">
                <Card.Header className="bg-warning text-dark">
                  <h6 className="mb-0">Need Help?</h6>
                </Card.Header>
                <Card.Body>
                  <p className="small">
                    If you have issues with your TCC application, contact the Ministry of Revenue support.
                  </p>
                  <Button variant="outline-warning" size="sm" className="w-100">
                    Contact Support
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default TaxpayerDashboard;