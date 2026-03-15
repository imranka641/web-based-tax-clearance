import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Nav, Tab, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import RegionalManagement from './tabs/RegionalManagement';

// Import all tab components
import SystemOverview from './tabs/SystemOverview';
import TaxManagement from './tabs/TaxManagement';
import PaymentManagement from './tabs/PaymentManagement';
import AIManagement from './tabs/AIManagement';
import UserManagement from './tabs/UserManagement';
import ReportsAnalytics from './tabs/ReportsAnalytics';
import StampManagement from './tabs/StampManagement'; // Add this import

const SuperAdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [systemStats, setSystemStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || !currentUser.is_super_admin) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const response = await api.get('/admin/system-stats');
      setSystemStats(response.data);
    } catch (error) {
      console.error('Error fetching system stats:', error);
    } finally {
      setLoading(false);
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
              <h2>Super Admin Dashboard</h2>
              <p className="text-muted mb-0">
                Welcome, {user?.full_name} | Ministry of Revenue - System Administration
              </p>
            </div>
            <Badge bg="danger" className="fs-6">
              Super Admin
            </Badge>
          </div>

          {/* Quick Stats */}
          <Row className="mb-4">
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-primary">
                <Card.Body className="text-center">
                  <h4 className="text-primary">{systemStats.total_users?.toLocaleString() || 0}</h4>
                  <p className="mb-0">Total Users</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-success">
                <Card.Body className="text-center">
                  <h4 className="text-success">ETB {systemStats.total_revenue?.toLocaleString() || 0}</h4>
                  <p className="mb-0">Total Revenue</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-warning">
                <Card.Body className="text-center">
                  <h4 className="text-warning">{systemStats.pending_applications?.toLocaleString() || 0}</h4>
                  <p className="mb-0">Pending TCC</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-info">
                <Card.Body className="text-center">
                  <h4 className="text-info">{systemStats.ai_verifications?.toLocaleString() || 0}</h4>
                  <p className="mb-0">AI Verifications</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-danger">
                <Card.Body className="text-center">
                  <h4 className="text-danger">{systemStats.failed_payments?.toLocaleString() || 0}</h4>
                  <p className="mb-0">Failed Payments</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={2} lg={4} md={6} className="mb-3">
              <Card className="border-secondary">
                <Card.Body className="text-center">
                  <h4 className="text-secondary">{systemStats.compliance_rate?.toLocaleString() || 0}%</h4>
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
                  <Nav.Link eventKey="overview">📊 System Overview</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="tax">💰 Tax Management</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="payment">💳 Payment Methods</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="ai">🤖 AI Management</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="stamps">🏛️ Stamp Management</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="users">👥 User Management</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="reports">📈 Reports & Analytics</Nav.Link>
                </Nav.Item>
                <Nav.Item>
    <Nav.Link eventKey="regional">🌍 Regional Management</Nav.Link>
  </Nav.Item>
              </Nav>
            </Card.Header>
            <Card.Body>
              <Tab.Content>
                <Tab.Pane active={activeTab === 'overview'}>
                  <SystemOverview stats={systemStats} onRefresh={fetchSystemStats} />
                </Tab.Pane>
                <Tab.Pane active={activeTab === 'tax'}>
                  <TaxManagement />
                </Tab.Pane>
                <Tab.Pane active={activeTab === 'payment'}>
                  <PaymentManagement />
                </Tab.Pane>
                <Tab.Pane active={activeTab === 'ai'}>
                  <AIManagement />
                </Tab.Pane>
                <Tab.Pane active={activeTab === 'stamps'}>
                  <StampManagement />
                </Tab.Pane>
                <Tab.Pane active={activeTab === 'users'}>
                  <UserManagement />
                </Tab.Pane>
                <Tab.Pane active={activeTab === 'reports'}>
                  <ReportsAnalytics />
                </Tab.Pane>
                <Tab.Pane active={activeTab === 'regional'}>
  <RegionalManagement />
</Tab.Pane>
              </Tab.Content>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SuperAdminDashboard;