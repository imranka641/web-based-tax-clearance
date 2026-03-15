import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Nav, Tab } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TownDashboard = () => {
  const [user, setUser] = useState(null);
  const [townStats, setTownStats] = useState({});
  const [pendingApplications, setPendingApplications] = useState([]);
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.user_type !== 'town_admin') {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    fetchTownData();
  }, []);

  const fetchTownData = async () => {
    try {
      const [statsRes, applicationsRes, receiptsRes] = await Promise.all([
        api.get('/town/stats'),
        api.get('/town/pending-applications'),
        api.get('/town/pending-receipts')
      ]);

      setTownStats(statsRes.data);
      setPendingApplications(applicationsRes.data.applications);
      setPendingReceipts(receiptsRes.data.payments);
    } catch (error) {
      console.error('Error fetching town data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Submitted': return 'warning';
      case 'Under Review': return 'info';
      case 'Approved': return 'success';
      case 'Rejected': return 'danger';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-3">
      <Row>
        <Col>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Town Admin Dashboard</h2>
              <p className="text-muted mb-0">
                Welcome, {user?.full_name} | Managing: {townStats.town_name}, {townStats.region_name}
              </p>
            </div>
            <Badge bg="success" className="fs-6">
              Town Admin
            </Badge>
          </div>

          {/* Quick Stats */}
          <Row className="mb-4">
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-primary">
                <Card.Body className="text-center">
                  <h4 className="text-primary">{townStats.total_taxpayers || 0}</h4>
                  <p className="mb-0">Total Taxpayers</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-warning">
                <Card.Body className="text-center">
                  <h4 className="text-warning">{pendingApplications.length}</h4>
                  <p className="mb-0">Pending TCC</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-info">
                <Card.Body className="text-center">
                  <h4 className="text-info">{pendingReceipts.length}</h4>
                  <p className="mb-0">Pending Receipts</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-success">
                <Card.Body className="text-center">
                  <h4 className="text-success">ETB {townStats.collected_tax?.toLocaleString() || 0}</h4>
                  <p className="mb-0">Tax Collected</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-danger">
                <Card.Body className="text-center">
                  <h4 className="text-danger">{townStats.completed_tcc || 0}</h4>
                  <p className="mb-0">TCC Approved</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-secondary">
                <Card.Body className="text-center">
                  <h4 className="text-secondary">{townStats.compliance_rate?.toLocaleString() || 0}%</h4>
                  <p className="mb-0">Compliance Rate</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Main Dashboard Tabs */}
          <Card className="shadow">
            <Card.Header className="bg-light">
              <Nav variant="tabs" activeKey={activeTab} onSelect={setActiveTab}>
                <Nav.Item>
                  <Nav.Link eventKey="overview">📊 Town Overview</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="tcc">📋 TCC Applications</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="receipts">💰 Payment Receipts</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="taxpayers">👥 Taxpayers</Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>
            <Card.Body>
              <Tab.Content>
                <Tab.Pane active={activeTab === 'overview'}>
                  <TownOverview 
                    stats={townStats} 
                    pendingApplications={pendingApplications}
                    pendingReceipts={pendingReceipts}
                    onRefresh={fetchTownData}
                  />
                </Tab.Pane>
                <Tab.Pane active={activeTab === 'tcc'}>
                  <TCCApplications 
                    applications={pendingApplications}
                    onRefresh={fetchTownData}
                  />
                </Tab.Pane>
                <Tab.Pane active={activeTab === 'receipts'}>
                  <PaymentReceipts 
                    receipts={pendingReceipts}
                    onRefresh={fetchTownData}
                  />
                </Tab.Pane>
                <Tab.Pane active={activeTab === 'taxpayers'}>
                  <TaxpayersList 
                    townId={user?.town_id}
                    onRefresh={fetchTownData}
                  />
                </Tab.Pane>
              </Tab.Content>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

// Placeholder components - you'll need to create these
const TownOverview = ({ stats, pendingApplications, pendingReceipts, onRefresh }) => (
  <div>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h4>Town Overview - {stats.town_name}</h4>
      <Button variant="outline-primary" onClick={onRefresh}>
        Refresh Data
      </Button>
    </div>
    
    <Row>
      <Col md={6}>
        <Card>
          <Card.Header>
            <h5 className="mb-0">Quick Actions</h5>
          </Card.Header>
          <Card.Body>
            <div className="d-grid gap-2">
              <Button variant="warning" as={Link} to="/town/tcc-applications">
                Review TCC Applications ({pendingApplications.length})
              </Button>
              <Button variant="info" as={Link} to="/town/payment-receipts">
                Verify Payment Receipts ({pendingReceipts.length})
              </Button>
              <Button variant="success" as={Link} to="/town/taxpayers">
                View Taxpayers ({stats.total_taxpayers || 0})
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6}>
        <Card>
          <Card.Header>
            <h5 className="mb-0">Tax Collection Progress</h5>
          </Card.Header>
          <Card.Body>
            <p><strong>Target:</strong> ETB {stats.target_tax_amount?.toLocaleString() || 0}</p>
            <p><strong>Collected:</strong> ETB {stats.collected_tax?.toLocaleString() || 0}</p>
            <div className="progress mb-2">
              <div 
                className="progress-bar bg-success" 
                style={{ 
                  width: `${stats.collected_tax && stats.target_tax_amount ? 
                    Math.min(100, (stats.collected_tax / stats.target_tax_amount) * 100) : 0}%` 
                }}
              ></div>
            </div>
            <small className="text-muted">
              {stats.collected_tax && stats.target_tax_amount ? 
                ((stats.collected_tax / stats.target_tax_amount) * 100).toFixed(1) : 0}% Complete
            </small>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </div>
);

const TCCApplications = ({ applications, onRefresh }) => (
  <div>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h4>TCC Applications Pending Review</h4>
      <Button variant="outline-primary" onClick={onRefresh}>
        Refresh
      </Button>
    </div>

    {applications.length === 0 ? (
      <Alert variant="success">
        🎉 No pending TCC applications! All caught up.
      </Alert>
    ) : (
      <Table responsive striped>
        <thead>
          <tr>
            <th>Application ID</th>
            <th>Taxpayer</th>
            <th>TIN</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map(app => (
            <tr key={app.id}>
              <td>#{app.id}</td>
              <td>{app.taxpayer_name}</td>
              <td>{app.taxpayer_tin}</td>
              <td>{new Date(app.submitted_at).toLocaleDateString()}</td>
              <td>
                <Badge bg="warning">Pending Review</Badge>
              </td>
              <td>
                <Link 
                  to={`/town/tcc-review/${app.id}`}
                  className="btn btn-primary btn-sm"
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    )}
  </div>
);

const PaymentReceipts = ({ receipts, onRefresh }) => (
  <div>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h4>Payment Receipts Pending Verification</h4>
      <Button variant="outline-primary" onClick={onRefresh}>
        Refresh
      </Button>
    </div>

    {receipts.length === 0 ? (
      <Alert variant="success">
        🎉 No pending payment receipts! All caught up.
      </Alert>
    ) : (
      <Table responsive striped>
        <thead>
          <tr>
            <th>Payment ID</th>
            <th>Taxpayer</th>
            <th>Tax Type</th>
            <th>Amount</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map(payment => (
            <tr key={payment.id}>
              <td>#{payment.id}</td>
              <td>{payment.taxpayer_name}</td>
              <td>{payment.tax_type_name}</td>
              <td>ETB {payment.declared_amount?.toLocaleString()}</td>
              <td>{new Date(payment.created_at).toLocaleDateString()}</td>
              <td>
                <Link 
                  to={`/town/receipt-review/${payment.id}`}
                  className="btn btn-info btn-sm"
                >
                  Verify Receipt
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    )}
  </div>
);

const TaxpayersList = ({ townId, onRefresh }) => (
  <div>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h4>Taxpayers in Your Town</h4>
      <Button variant="outline-primary" onClick={onRefresh}>
        Refresh
      </Button>
    </div>
    
    <Alert variant="info">
      Taxpayer list functionality will be implemented here. This will show all taxpayers registered in your town.
    </Alert>
  </div>
);

export default TownDashboard;