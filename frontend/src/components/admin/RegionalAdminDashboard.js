import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const RegionalAdminDashboard = () => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({});
    const [towns, setTowns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser) {
            navigate('/login');
            return;
        }
        
        if (currentUser.role !== 'regional_admin' && !currentUser.is_super_admin) {
            navigate('/dashboard');
            return;
        }
        
        setUser(currentUser);
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError('');
            
            console.log('Fetching regional admin data...');
            
            const [statsRes, townsRes] = await Promise.all([
                api.get('/regional-admin/stats'),
                api.get('/regional-admin/towns')
            ]);
            
            console.log('Stats response:', statsRes.data);
            console.log('Towns response:', townsRes.data);
            
            setStats(statsRes.data);
            setTowns(townsRes.data.towns || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            console.error('Error response:', error.response);
            setError(error.response?.data?.error || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const getPerformanceVariant = (percentage) => {
        if (percentage >= 80) return 'success';
        if (percentage >= 50) return 'warning';
        return 'danger';
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
        <Container fluid className="mt-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>🏞️ Regional Admin Dashboard</h2>
                            <p className="text-muted mb-0">
                                {user?.full_name} | Region: {user?.region_name || 'Not Assigned'}
                            </p>
                        </div>
                        <Button variant="outline-primary" onClick={fetchDashboardData}>
                            Refresh Data
                        </Button>
                    </div>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Regional Stats Cards */}
            <Row className="mb-4">
                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-primary h-100">
                        <Card.Body>
                            <h6 className="text-muted">Regional Target</h6>
                            <h3 className="text-primary">ETB {stats.regional_target?.toLocaleString() || 0}</h3>
                            <ProgressBar 
                                now={stats.regional_progress || 0} 
                                label={`${stats.regional_progress || 0}%`}
                                className="mt-2"
                            />
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-success h-100">
                        <Card.Body>
                            <h6 className="text-muted">Total Collected</h6>
                            <h3 className="text-success">ETB {stats.total_collected?.toLocaleString() || 0}</h3>
                            <small>vs target: {stats.regional_target > 0 ? 
                                Math.round((stats.total_collected / stats.regional_target) * 100) : 0}%
                            </small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-info h-100">
                        <Card.Body>
                            <h6 className="text-muted">Towns</h6>
                            <h3 className="text-info">{stats.active_towns || 0}/{stats.total_towns || 0}</h3>
                            <small>{stats.towns_with_admins || 0} have admins</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-warning h-100">
                        <Card.Body>
                            <h6 className="text-muted">Pending Actions</h6>
                            <h3 className="text-warning">{stats.pending_actions || 0}</h3>
                            <small>across all towns</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Towns Performance Table */}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <h5 className="mb-0">🏘️ Towns Performance</h5>
                </Card.Header>
                <Card.Body>
                    {towns.length === 0 ? (
                        <Alert variant="info">
                            No towns found in your region. Please contact super admin.
                        </Alert>
                    ) : (
                        <Table responsive striped hover>
                            <thead>
                                <tr>
                                    <th>Town</th>
                                    <th>Admin</th>
                                    <th>Target</th>
                                    <th>Collected</th>
                                    <th>Progress</th>
                                    <th>Pending Receipts</th>
                                    <th>Pending TCC</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {towns.map(town => (
                                    <tr key={town.id}>
                                        <td><strong>{town.name}</strong></td>
                                        <td>
                                            {town.admin_name || 
                                                <Badge bg="warning">No Admin</Badge>
                                            }
                                        </td>
                                        <td>ETB {town.target?.toLocaleString() || 0}</td>
                                        <td>ETB {town.collected?.toLocaleString() || 0}</td>
                                        <td style={{ minWidth: '150px' }}>
                                            <ProgressBar 
                                                variant={getPerformanceVariant(town.percentage)}
                                                now={town.percentage || 0} 
                                                label={`${town.percentage || 0}%`}
                                            />
                                        </td>
                                        <td>
                                            <Badge bg={town.pending > 0 ? 'warning' : 'success'}>
                                                {town.pending || 0}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge bg={town.pending_tcc > 0 ? 'warning' : 'success'}>
                                                {town.pending_tcc || 0}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge bg={town.has_admin ? 'success' : 'danger'}>
                                                {town.has_admin ? 'Active' : 'No Admin'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default RegionalAdminDashboard;