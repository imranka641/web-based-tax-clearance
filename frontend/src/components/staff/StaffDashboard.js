import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const StaffDashboard = () => {
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'staff') {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/staff/applications');
      setApplications(response.data.applications);
    } catch (err) {
      setError('Failed to load applications');
    } finally {
      setLoading(false);
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

  const getApplicationsByStatus = (status) => {
    return applications.filter(app => app.status === status);
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
              <h2>Staff Dashboard</h2>
              <p className="text-muted">
                Welcome, {user?.full_name} | Ministry of Revenue
              </p>
            </div>
            <Badge bg="primary" className="fs-6">
              {getApplicationsByStatus('Submitted').length} Pending Reviews
            </Badge>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center border-primary">
                <Card.Body>
                  <h4 className="text-primary">{getApplicationsByStatus('Submitted').length}</h4>
                  <p className="mb-0">New Applications</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-warning">
                <Card.Body>
                  <h4 className="text-warning">{getApplicationsByStatus('Under Review').length}</h4>
                  <p className="mb-0">Under Review</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-success">
                <Card.Body>
                  <h4 className="text-success">{getApplicationsByStatus('Approved').length}</h4>
                  <p className="mb-0">Approved</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-danger">
                <Card.Body>
                  <h4 className="text-danger">{getApplicationsByStatus('Rejected').length}</h4>
                  <p className="mb-0">Rejected</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="shadow-sm">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">TCC Applications Queue</h5>
              <Button variant="outline-primary" size="sm" onClick={fetchApplications}>
                Refresh
              </Button>
            </Card.Header>
            <Card.Body>
              {applications.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No TCC applications found.</p>
                </div>
              ) : (
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>App ID</th>
                      <th>Taxpayer</th>
                      <th>TIN</th>
                      <th>Business</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id}>
                        <td>#{app.id}</td>
                        <td>{app.taxpayer_name}</td>
                        <td>{app.tin}</td>
                        <td>{app.business_name || 'N/A'}</td>
                        <td>{new Date(app.submitted_at).toLocaleDateString()}</td>
                        <td>
                          <Badge bg={getStatusVariant(app.status)}>
                            {app.status}
                          </Badge>
                        </td>
                        <td>
                          <Link 
                            to={`/staff/applications/${app.id}`}
                            className="btn btn-outline-primary btn-sm"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default StaffDashboard;