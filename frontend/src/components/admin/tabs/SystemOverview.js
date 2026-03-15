import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Button, Alert, ProgressBar, Spinner } from 'react-bootstrap';
import api from '../../../services/api';

const SystemOverview = ({ stats, onRefresh }) => {
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemHealth, setSystemHealth] = useState({});
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivities();
    fetchSystemHealth();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      const response = await api.get('/admin/recent-activities');
      setRecentActivities(response.data.activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await api.get('/admin/system-health');
      setSystemHealth(response.data);
    } catch (error) {
      console.error('Error fetching system health:', error);
    }
  };

  const getHealthVariant = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>System Overview</h4>
        <Button variant="outline-primary" onClick={() => {
          onRefresh();
          fetchRecentActivities();
          fetchSystemHealth();
        }}>
          Refresh Data
        </Button>
      </div>

      {/* System Health */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">System Health Monitor</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <div className="text-center">
                    <h6>Server Uptime</h6>
                    <ProgressBar 
                      variant={getHealthVariant(systemHealth.server_uptime)} 
                      now={systemHealth.server_uptime || 0} 
                      label={`${systemHealth.server_uptime || 0}%`} 
                    />
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h6>Database Performance</h6>
                    <ProgressBar 
                      variant={getHealthVariant(systemHealth.database_performance)} 
                      now={systemHealth.database_performance || 0} 
                      label={`${systemHealth.database_performance || 0}%`} 
                    />
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h6>Payment Gateway</h6>
                    <ProgressBar 
                      variant={getHealthVariant(systemHealth.payment_gateway_health)} 
                      now={systemHealth.payment_gateway_health || 0} 
                      label={`${systemHealth.payment_gateway_health || 0}%`} 
                    />
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h6>AI System</h6>
                    <ProgressBar 
                      variant={getHealthVariant(systemHealth.ai_system_health)} 
                      now={systemHealth.ai_system_health || 0} 
                      label={`${systemHealth.ai_system_health || 0}%`} 
                    />
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Recent Activities */}
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Recent System Activities</h5>
            </Card.Header>
            <Card.Body>
              {activitiesLoading ? (
                <div className="text-center">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : recentActivities.length === 0 ? (
                <p className="text-muted text-center">No recent activities</p>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {recentActivities.map(activity => (
                    <div key={activity.id} className="border-bottom pb-2 mb-2">
                      <div className="d-flex justify-content-between">
                        <div>
                          <strong>{activity.action}</strong>
                          <small className="d-block text-muted">
                            By: {activity.user_name} • {new Date(activity.created_at).toLocaleString()}
                          </small>
                        </div>
                        <Badge bg="secondary">{activity.resource_type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="outline-primary" size="sm">
                  Generate Monthly Report
                </Button>
                <Button variant="outline-success" size="sm">
                  Backup Database
                </Button>
                <Button variant="outline-warning" size="sm">
                  System Maintenance
                </Button>
                <Button variant="outline-danger" size="sm">
                  Emergency Shutdown
                </Button>
                <Button variant="outline-info" size="sm">
                  Clear Cache
                </Button>
              </div>

              {/* System Alerts */}
              <div className="mt-4">
                <h6>System Alerts</h6>
                {systemHealth.alerts && systemHealth.alerts.length > 0 ? (
                  systemHealth.alerts.map((alert, index) => (
                    <Alert key={index} variant="warning" className="py-2">
                      <small>{alert.message}</small>
                    </Alert>
                  ))
                ) : (
                  <Alert variant="success" className="py-2">
                    <small>All systems operational</small>
                  </Alert>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemOverview;