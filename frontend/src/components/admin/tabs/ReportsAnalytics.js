import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Form, Badge, Alert } from 'react-bootstrap';
import api from '../../../services/api';

const ReportsAnalytics = () => {
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);

  const [reportParams, setReportParams] = useState({
    report_type: 'monthly',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchReports();
    fetchAnalytics();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.get('/admin/reports');
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/admin/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/generate-report', reportParams);
      fetchReports();
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Reports & Analytics</h4>
        <Badge bg="info">Real-time Data</Badge>
      </div>

      <Row>
        {/* Report Generator */}
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Generate Report</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={generateReport}>
                <Form.Group className="mb-3">
                  <Form.Label>Report Type</Form.Label>
                  <Form.Select
                    value={reportParams.report_type}
                    onChange={(e) => setReportParams({...reportParams, report_type: e.target.value})}
                  >
                    <option value="monthly">Monthly Revenue</option>
                    <option value="quarterly">Quarterly Summary</option>
                    <option value="annual">Annual Report</option>
                    <option value="compliance">Compliance Report</option>
                    <option value="taxpayer">Taxpayer Activity</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={reportParams.start_date}
                    onChange={(e) => setReportParams({...reportParams, start_date: e.target.value})}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={reportParams.end_date}
                    onChange={(e) => setReportParams({...reportParams, end_date: e.target.value})}
                  />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100">
                  Generate Report
                </Button>
              </Form>
            </Card.Body>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-4">
            <Card.Header>
              <h5 className="mb-0">Quick Stats</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center">
                <h4 className="text-primary">ETB {analytics.total_revenue?.toLocaleString() || 0}</h4>
                <p className="text-muted">Total Revenue</p>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <small>This Month:</small>
                <small>ETB {analytics.monthly_revenue?.toLocaleString() || 0}</small>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <small>Active Taxpayers:</small>
                <small>{analytics.active_taxpayers || 0}</small>
              </div>
              <div className="d-flex justify-content-between">
                <small>Compliance Rate:</small>
                <small>{analytics.compliance_rate || 0}%</small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Generated Reports */}
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Generated Reports</h5>
            </Card.Header>
            <Card.Body>
              {reports.length === 0 ? (
                <p className="text-muted text-center">No reports generated yet</p>
              ) : (
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Report Type</th>
                      <th>Period</th>
                      <th>Generated</th>
                      <th>Total Collected</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report.id}>
                        <td>
                          <Badge bg="primary">{report.report_type}</Badge>
                        </td>
                        <td>
                          {report.period_start && report.period_end ? 
                            `${new Date(report.period_start).toLocaleDateString()} - ${new Date(report.period_end).toLocaleDateString()}` 
                            : 'N/A'
                          }
                        </td>
                        <td>{new Date(report.generated_at).toLocaleDateString()}</td>
                        <td>ETB {report.total_collected?.toLocaleString() || 0}</td>
                        <td>
                          <Button size="sm" variant="outline-primary" className="me-1">
                            View
                          </Button>
                          <Button size="sm" variant="outline-success">
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {/* Analytics Overview */}
          <Card className="mt-4">
            <Card.Header>
              <h5 className="mb-0">Revenue Analytics</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="text-center">
                  <h5 className="text-success">ETB {analytics.today_revenue?.toLocaleString() || 0}</h5>
                  <small className="text-muted">Today</small>
                </Col>
                <Col md={4} className="text-center">
                  <h5 className="text-primary">ETB {analytics.week_revenue?.toLocaleString() || 0}</h5>
                  <small className="text-muted">This Week</small>
                </Col>
                <Col md={4} className="text-center">
                  <h5 className="text-warning">ETB {analytics.month_revenue?.toLocaleString() || 0}</h5>
                  <small className="text-muted">This Month</small>
                </Col>
              </Row>
              
              <hr />
              
              <h6>Top Tax Types</h6>
              {analytics.top_tax_types?.map((taxType, index) => (
                <div key={index} className="d-flex justify-content-between mb-2">
                  <small>{taxType.name}</small>
                  <small>ETB {taxType.amount?.toLocaleString()}</small>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ReportsAnalytics;