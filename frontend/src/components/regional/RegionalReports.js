import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Alert, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getUser } from '../../../utils/auth';

const RegionalReports = () => {
    const [user, setUser] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || (currentUser.role !== 'regional_admin' && !currentUser.is_super_admin)) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        generateReport();
    }, []);

    const generateReport = async () => {
        try {
            setGenerating(true);
            setError('');
            const response = await api.get('/regional-admin/performance-report', {
                params: {
                    month: dateRange.month,
                    year: dateRange.year
                }
            });
            setReportData(response.data);
        } catch (error) {
            console.error('Error generating report:', error);
            setError(error.response?.data?.error || 'Failed to generate report');
        } finally {
            setLoading(false);
            setGenerating(false);
        }
    };

    const handleMonthChange = (e) => {
        setDateRange({
            ...dateRange,
            month: parseInt(e.target.value)
        });
    };

    const handleYearChange = (e) => {
        setDateRange({
            ...dateRange,
            year: parseInt(e.target.value)
        });
    };

    const handleGenerate = () => {
        generateReport();
    };

    const exportToCSV = () => {
        if (!reportData) return;

        let csv = 'Town,Target,Collected,Transactions,Taxpayers\n';
        reportData.towns.forEach(town => {
            csv += `${town.town_name},${town.target},${town.collected},${town.transactions},${town.taxpayers}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `regional-report-${dateRange.month}-${dateRange.year}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" />
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            <Row className="mb-4">
                <Col>
                    <h2>📊 Regional Performance Report</h2>
                    <p className="text-muted">Generate and view tax collection reports</p>
                </Col>
            </Row>

            <Card className="mb-4">
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Month</Form.Label>
                                <Form.Select value={dateRange.month} onChange={handleMonthChange}>
                                    <option value="1">January</option>
                                    <option value="2">February</option>
                                    <option value="3">March</option>
                                    <option value="4">April</option>
                                    <option value="5">May</option>
                                    <option value="6">June</option>
                                    <option value="7">July</option>
                                    <option value="8">August</option>
                                    <option value="9">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Year</Form.Label>
                                <Form.Select value={dateRange.year} onChange={handleYearChange}>
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-end">
                            <Button variant="primary" onClick={handleGenerate} disabled={generating}>
                                {generating ? 'Generating...' : 'Generate Report'}
                            </Button>
                        </Col>
                        <Col md={3} className="d-flex align-items-end justify-content-end">
                            {reportData && (
                                <Button variant="success" onClick={exportToCSV}>
                                    Export to CSV
                                </Button>
                            )}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {error && <Alert variant="danger">{error}</Alert>}

            {reportData && (
                <>
                    {/* Summary Cards */}
                    <Row className="mb-4">
                        <Col md={3}>
                            <Card className="border-primary">
                                <Card.Body>
                                    <h6>Total Collected</h6>
                                    <h3>ETB {reportData.totals.total_collected?.toLocaleString()}</h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-success">
                                <Card.Body>
                                    <h6>Total Target</h6>
                                    <h3>ETB {reportData.totals.total_target?.toLocaleString()}</h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-info">
                                <Card.Body>
                                    <h6>Transactions</h6>
                                    <h3>{reportData.totals.total_transactions}</h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-warning">
                                <Card.Body>
                                    <h6>Active Taxpayers</h6>
                                    <h3>{reportData.totals.total_taxpayers}</h3>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Town Performance Table */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5>Town Performance - {dateRange.month}/{dateRange.year}</h5>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive striped hover>
                                <thead>
                                    <tr>
                                        <th>Town</th>
                                        <th>Target</th>
                                        <th>Collected</th>
                                        <th>Achievement</th>
                                        <th>Transactions</th>
                                        <th>Taxpayers</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.towns.map((town, index) => {
                                        const percentage = town.target > 0 ? (town.collected / town.target) * 100 : 0;
                                        return (
                                            <tr key={index}>
                                                <td>{town.town_name}</td>
                                                <td>ETB {town.target?.toLocaleString()}</td>
                                                <td>ETB {town.collected?.toLocaleString()}</td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="progress flex-grow-1" style={{ height: '10px' }}>
                                                            <div 
                                                                className={`progress-bar bg-${percentage >= 80 ? 'success' : percentage >= 50 ? 'warning' : 'danger'}`}
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="ms-2">{Math.round(percentage)}%</span>
                                                    </div>
                                                </td>
                                                <td>{town.transactions}</td>
                                                <td>{town.taxpayers}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>

                    {/* Admin Performance Table */}
                    <Card>
                        <Card.Header>
                            <h5>Admin Performance</h5>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive striped hover>
                                <thead>
                                    <tr>
                                        <th>Admin</th>
                                        <th>Town</th>
                                        <th>Processed</th>
                                        <th>Approved</th>
                                        <th>Avg Response Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.admin_performance.map((admin, index) => (
                                        <tr key={index}>
                                            <td>{admin.full_name}</td>
                                            <td>{admin.town_name}</td>
                                            <td>{admin.processed || 0}</td>
                                            <td>{admin.approved || 0}</td>
                                            <td>{Math.round(admin.avg_response_hours)} hours</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </>
            )}
        </Container>
    );
};

export default RegionalReports;