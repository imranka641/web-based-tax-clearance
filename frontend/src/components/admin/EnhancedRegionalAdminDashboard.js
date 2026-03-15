import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Nav, Tab, Form, Modal, ProgressBar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const EnhancedRegionalAdminDashboard = () => {
    const [user, setUser] = useState(null);
    const [region, setRegion] = useState(null);
    const [stats, setStats] = useState({
        totalTowns: 0,
        activeTowns: 0,
        totalTaxpayers: 0,
        totalTownAdmins: 0,
        totalCollected: 0,
        monthlyTarget: 0,
        complianceRate: 0,
        pendingEscalations: 0
    });
    const [towns, setTowns] = useState([]);
    const [townAdmins, setTownAdmins] = useState([]);
    const [performanceData, setPerformanceData] = useState([]);
    const [escalations, setEscalations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showTownModal, setShowTownModal] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [selectedTown, setSelectedTown] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const navigate = useNavigate();

    // Form states
    const [newTown, setNewTown] = useState({
        name: '',
        code: '',
        target_amount: '',
        notes: ''
    });

    const [newAdmin, setNewAdmin] = useState({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        town_id: '',
        tax_target: ''
    });

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'regional_admin') {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchRegionData();
        
        // Refresh every minute
        const interval = setInterval(fetchRegionData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchRegionData = async () => {
        try {
            console.log('Fetching regional admin data...');
            
            const [
                regionRes,
                statsRes,
                townsRes,
                adminsRes,
                performanceRes,
                escalationsRes
            ] = await Promise.all([
                api.get('/regional-admin/region-info').catch(err => {
                    console.error('Error fetching region info:', err);
                    return { data: { region: null } };
                }),
                api.get('/regional-admin/stats').catch(err => {
                    console.error('Error fetching stats:', err);
                    return { data: {} };
                }),
                api.get('/regional-admin/towns').catch(err => {
                    console.error('Error fetching towns:', err);
                    return { data: { towns: [] } };
                }),
                api.get('/regional-admin/town-admins').catch(err => {
                    console.error('Error fetching town admins:', err);
                    return { data: { admins: [] } };
                }),
                api.get('/regional-admin/performance').catch(err => {
                    console.error('Error fetching performance:', err);
                    return { data: { performance: [] } };
                }),
                api.get('/regional-admin/escalations').catch(err => {
                    console.error('Error fetching escalations:', err);
                    return { data: { escalations: [] } };
                })
            ]);

            setRegion(regionRes.data.region);
            setStats(statsRes.data);
            setTowns(townsRes.data.towns || []);
            setTownAdmins(adminsRes.data.admins || []);
            setPerformanceData(performanceRes.data.performance || []);
            setEscalations(escalationsRes.data.escalations || []);
            
            console.log('Regional data loaded successfully');
        } catch (error) {
            console.error('Error fetching regional data:', error);
            setError('Failed to load regional dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTown = async (e) => {
        e.preventDefault();
        try {
            await api.post('/regional-admin/towns', newTown);
            setShowTownModal(false);
            setNewTown({ name: '', code: '', target_amount: '', notes: '' });
            fetchRegionData();
            alert('✅ Town created successfully!');
        } catch (error) {
            console.error('Error creating town:', error);
            setError('Failed to create town');
        }
    };

    const handleCreateTownAdmin = async (e) => {
        e.preventDefault();
        try {
            await api.post('/regional-admin/town-admins', newAdmin);
            setShowAdminModal(false);
            setNewAdmin({
                full_name: '',
                email: '',
                password: '',
                phone: '',
                town_id: '',
                tax_target: ''
            });
            fetchRegionData();
            alert('✅ Town admin created successfully!');
        } catch (error) {
            console.error('Error creating town admin:', error);
            setError('Failed to create town admin');
        }
    };

    const handleToggleAdmin = async (adminId, newStatus) => {
        try {
            await api.put(`/regional-admin/town-admins/${adminId}/toggle`, { is_active: newStatus });
            fetchRegionData();
            alert(`✅ Town admin ${newStatus ? 'activated' : 'deactivated'} successfully!`);
        } catch (error) {
            console.error('Error toggling admin status:', error);
            setError('Failed to update admin status');
        }
    };

    const handleEscalate = async (escalationId, decision) => {
        try {
            await api.post(`/regional-admin/escalations/${escalationId}`, { decision });
            fetchRegionData();
            alert(`✅ Escalation ${decision}`);
        } catch (error) {
            console.error('Error handling escalation:', error);
            setError('Failed to process escalation');
        }
    };

    const getPerformanceColor = (percentage) => {
        const num = parseFloat(percentage) || 0;
        if (num >= 90) return 'success';
        if (num >= 70) return 'warning';
        return 'danger';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount || 0);
    };

    const formatPercentage = (value) => {
        return `${(parseFloat(value) || 0).toFixed(1)}%`;
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="success" />
                <p className="mt-3">Loading Regional Admin Dashboard...</p>
            </Container>
        );
    }

    // Chart data
    const performanceChartData = {
        labels: performanceData.map(d => d.month || 'N/A'),
        datasets: [
            {
                label: 'Collection (Millions ETB)',
                data: performanceData.map(d => (parseFloat(d.collection) || 0) / 1000000),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }
        ]
    };

    const townPerformanceChartData = {
        labels: towns.slice(0, 5).map(t => t.name || 'Unknown'),
        datasets: [
            {
                label: 'Collection vs Target',
                data: towns.slice(0, 5).map(t => {
                    const target = parseFloat(t.target) || 1;
                    const collected = parseFloat(t.collected) || 0;
                    return (collected / target) * 100;
                }),
                backgroundColor: towns.slice(0, 5).map(t => {
                    const target = parseFloat(t.target) || 1;
                    const collected = parseFloat(t.collected) || 0;
                    const percentage = (collected / target) * 100;
                    return percentage >= 90 ? 'rgba(40, 167, 69, 0.6)' :
                           percentage >= 70 ? 'rgba(255, 193, 7, 0.6)' :
                           'rgba(220, 53, 69, 0.6)';
                }),
                borderWidth: 1
            }
        ]
    };

    return (
        <Container fluid className="mt-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <Card className="bg-success text-white">
                        <Card.Body className="p-4">
                            <Row>
                                <Col md={8}>
                                    <h2>🏞️ Regional Admin Dashboard</h2>
                                    <p className="mb-0">
                                        <Badge bg="light" text="dark" className="me-2">
                                            {user?.full_name}
                                        </Badge>
                                        <Badge bg="light" text="dark" className="me-2">
                                            {region?.name || 'Region'} Region
                                        </Badge>
                                    </p>
                                </Col>
                                <Col md={4} className="text-end">
                                    <h4 className="mb-0">
                                        {new Date().toLocaleDateString('en-ET', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </h4>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Regional Stats Cards */}
            <Row className="mb-4">
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-primary h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Total Towns</h6>
                                    <h3 className="text-primary">{stats.totalTowns || 0}</h3>
                                </div>
                                <div className="bg-primary bg-opacity-10 p-3 rounded">
                                    🏘️
                                </div>
                            </div>
                            <small className="text-muted">Active: {stats.activeTowns || 0}</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-info h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Town Admins</h6>
                                    <h3 className="text-info">{stats.totalTownAdmins || 0}</h3>
                                </div>
                                <div className="bg-info bg-opacity-10 p-3 rounded">
                                    👥
                                </div>
                            </div>
                            <small className="text-muted">Active: {townAdmins.filter(a => a.is_active).length}</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-warning h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Taxpayers</h6>
                                    <h3 className="text-warning">{stats.totalTaxpayers || 0}</h3>
                                </div>
                                <div className="bg-warning bg-opacity-10 p-3 rounded">
                                    👤
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-success h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Total Collected</h6>
                                    <h3 className="text-success">{formatCurrency(stats.totalCollected)}</h3>
                                </div>
                                <div className="bg-success bg-opacity-10 p-3 rounded">
                                    💰
                                </div>
                            </div>
                            <small className="text-muted">Target: {formatCurrency(stats.monthlyTarget)}</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-info h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Compliance</h6>
                                    <h3 className="text-info">{formatPercentage(stats.complianceRate)}</h3>
                                </div>
                                <div className="bg-info bg-opacity-10 p-3 rounded">
                                    📊
                                </div>
                            </div>
                            <ProgressBar 
                                now={parseFloat(stats.complianceRate) || 0} 
                                variant={getPerformanceColor(stats.complianceRate)} 
                                size="sm"
                            />
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-danger h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Escalations</h6>
                                    <h3 className="text-danger">{stats.pendingEscalations || 0}</h3>
                                </div>
                                <div className="bg-danger bg-opacity-10 p-3 rounded">
                                    ⚠️
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Quick Actions */}
            <Row className="mb-4">
                <Col md={12}>
                    <Card>
                        <Card.Body>
                            <Row>
                                <Col md={3}>
                                    <Button 
                                        variant="outline-primary" 
                                        className="w-100"
                                        onClick={() => setShowTownModal(true)}
                                    >
                                        ➕ Add New Town
                                    </Button>
                                </Col>
                                <Col md={3}>
                                    <Button 
                                        variant="outline-success" 
                                        className="w-100"
                                        onClick={() => setShowAdminModal(true)}
                                    >
                                        👤 Create Town Admin
                                    </Button>
                                </Col>
                                <Col md={3}>
                                    <Button 
                                        variant="outline-info" 
                                        className="w-100"
                                        onClick={() => window.print()}
                                    >
                                        📊 Generate Report
                                    </Button>
                                </Col>
                                <Col md={3}>
                                    <Button 
                                        variant="outline-warning" 
                                        className="w-100"
                                        onClick={fetchRegionData}
                                    >
                                        🔄 Refresh Data
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Main Tabs */}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <Nav variant="tabs" activeKey={activeTab} onSelect={setActiveTab}>
                        <Nav.Item>
                            <Nav.Link eventKey="overview">📊 Regional Overview</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="towns">🏘️ Towns Management</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="admins">👥 Town Admins</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="performance">📈 Performance Analytics</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="escalations">
                                ⚠️ Escalations
                                {escalations.length > 0 && 
                                    <Badge bg="danger" className="ms-2">{escalations.length}</Badge>
                                }
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="reports">📑 Reports</Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Card.Header>
                <Card.Body>
                    <Tab.Content>
                        {/* Overview Tab */}
                        <Tab.Pane active={activeTab === 'overview'}>
                            <Row>
                                <Col md={8}>
                                    <Card className="mb-4">
                                        <Card.Header>
                                            <h5 className="mb-0">Regional Performance Trend</h5>
                                        </Card.Header>
                                        <Card.Body style={{ height: '300px' }}>
                                            {performanceData.length > 0 ? (
                                                <Line data={performanceChartData} options={{ maintainAspectRatio: false }} />
                                            ) : (
                                                <div className="text-center text-muted py-5">
                                                    No performance data available
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>

                                    <Card>
                                        <Card.Header>
                                            <h5 className="mb-0">Top Performing Towns</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <Table responsive>
                                                <thead>
                                                    <tr>
                                                        <th>Town</th>
                                                        <th>Admin</th>
                                                        <th>Collected</th>
                                                        <th>Target</th>
                                                        <th>Performance</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {towns.sort((a, b) => {
                                                        const aPerf = (parseFloat(a.collected) || 0) / (parseFloat(a.target) || 1);
                                                        const bPerf = (parseFloat(b.collected) || 0) / (parseFloat(b.target) || 1);
                                                        return bPerf - aPerf;
                                                    }).slice(0, 5).map(town => {
                                                        const target = parseFloat(town.target) || 1;
                                                        const collected = parseFloat(town.collected) || 0;
                                                        const percentage = (collected / target) * 100;
                                                        
                                                        return (
                                                            <tr key={town.id}>
                                                                <td><strong>{town.name}</strong></td>
                                                                <td>{town.admin_name || 'Not Assigned'}</td>
                                                                <td>{formatCurrency(collected)}</td>
                                                                <td>{formatCurrency(target)}</td>
                                                                <td style={{ width: '150px' }}>
                                                                    <ProgressBar 
                                                                        variant={getPerformanceColor(percentage)}
                                                                        now={percentage}
                                                                        label={`${percentage.toFixed(0)}%`}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Badge bg={town.has_admin ? 'success' : 'warning'}>
                                                                        {town.has_admin ? 'Active' : 'No Admin'}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card className="mb-4">
                                        <Card.Header>
                                            <h5 className="mb-0">Collection by Town</h5>
                                        </Card.Header>
                                        <Card.Body style={{ height: '300px' }}>
                                            {towns.length > 0 ? (
                                                <Bar data={townPerformanceChartData} options={{ maintainAspectRatio: false }} />
                                            ) : (
                                                <div className="text-center text-muted py-5">
                                                    No town data available
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>

                                    <Card>
                                        <Card.Header>
                                            <h5 className="mb-0">Regional Summary</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="bg-light p-3 rounded">
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Total Towns:</span>
                                                    <span className="fw-bold">{stats.totalTowns || 0}</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Towns with Admins:</span>
                                                    <span className="fw-bold">{stats.activeTowns || 0}</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Total Town Admins:</span>
                                                    <span className="fw-bold">{stats.totalTownAdmins || 0}</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Total Taxpayers:</span>
                                                    <span className="fw-bold">{stats.totalTaxpayers || 0}</span>
                                                </div>
                                                <hr />
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Average Town Performance:</span>
                                                    <span className="fw-bold">{formatPercentage(stats.complianceRate)}</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span>Pending Escalations:</span>
                                                    <span className="fw-bold text-danger">{stats.pendingEscalations || 0}</span>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab.Pane>

                        {/* Towns Management Tab */}
                        <Tab.Pane active={activeTab === 'towns'}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>Towns in {region?.name || 'the'} Region</h5>
                                <Button variant="success" onClick={() => setShowTownModal(true)}>
                                    + Add New Town
                                </Button>
                            </div>
                            <Table responsive striped hover>
                                <thead>
                                    <tr>
                                        <th>Town Name</th>
                                        <th>Code</th>
                                        <th>Admin</th>
                                        <th>Taxpayers</th>
                                        <th>Monthly Target</th>
                                        <th>Collected</th>
                                        <th>Performance</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {towns.map(town => {
                                        const target = parseFloat(town.target) || 0;
                                        const collected = parseFloat(town.collected) || 0;
                                        const percentage = target > 0 ? (collected / target) * 100 : 0;
                                        
                                        return (
                                            <tr key={town.id}>
                                                <td><strong>{town.name}</strong></td>
                                                <td>{town.code}</td>
                                                <td>{town.admin_name || <Badge bg="warning">Not Assigned</Badge>}</td>
                                                <td>{town.taxpayer_count || 0}</td>
                                                <td>{formatCurrency(target)}</td>
                                                <td>{formatCurrency(collected)}</td>
                                                <td style={{ width: '150px' }}>
                                                    <ProgressBar 
                                                        variant={getPerformanceColor(percentage)}
                                                        now={percentage}
                                                        label={`${percentage.toFixed(0)}%`}
                                                    />
                                                </td>
                                                <td>
                                                    <Badge bg={town.is_active ? 'success' : 'secondary'}>
                                                        {town.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button size="sm" variant="outline-primary" className="me-1">
                                                        View
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline-success"
                                                        onClick={() => setSelectedTown(town)}
                                                    >
                                                        Edit
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </Tab.Pane>

                        {/* Town Admins Tab */}
                        <Tab.Pane active={activeTab === 'admins'}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>Town Administrators</h5>
                                <Button variant="success" onClick={() => setShowAdminModal(true)}>
                                    + Create Town Admin
                                </Button>
                            </div>
                            <Table responsive striped hover>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Town</th>
                                        <th>Monthly Target</th>
                                        <th>Collected</th>
                                        <th>Performance</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {townAdmins.map(admin => {
                                        const target = parseFloat(admin.tax_target) || 0;
                                        const collected = parseFloat(admin.monthly_collection) || 0;
                                        const performanceValue = target > 0 ? (collected / target) * 100 : 0;
                                        const performanceDisplay = performanceValue.toFixed(1);
                                        
                                        return (
                                            <tr key={admin.id}>
                                                <td><strong>{admin.full_name}</strong></td>
                                                <td>{admin.email}</td>
                                                <td>{admin.phone || 'N/A'}</td>
                                                <td>{admin.town_name}</td>
                                                <td>{formatCurrency(target)}</td>
                                                <td>{formatCurrency(collected)}</td>
                                                <td style={{ width: '150px' }}>
                                                    <ProgressBar 
                                                        variant={getPerformanceColor(performanceValue)}
                                                        now={performanceValue}
                                                        label={`${performanceDisplay}%`}
                                                    />
                                                </td>
                                                <td>
                                                    <Badge bg={admin.is_active ? 'success' : 'secondary'}>
                                                        {admin.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button size="sm" variant="outline-primary" className="me-1">
                                                        View
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant={admin.is_active ? 'warning' : 'success'}
                                                        onClick={() => handleToggleAdmin(admin.id, !admin.is_active)}
                                                    >
                                                        {admin.is_active ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </Tab.Pane>

                        {/* Performance Analytics Tab */}
                        <Tab.Pane active={activeTab === 'performance'}>
                            <Row>
                                <Col md={12}>
                                    <Card className="mb-4">
                                        <Card.Header>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <h5 className="mb-0">Performance Analytics</h5>
                                                <div>
                                                    <Form.Control
                                                        type="month"
                                                        value={dateRange.start}
                                                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                                        style={{ width: '150px', display: 'inline-block', marginRight: '10px' }}
                                                    />
                                                    <Form.Control
                                                        type="month"
                                                        value={dateRange.end}
                                                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                                        style={{ width: '150px', display: 'inline-block' }}
                                                    />
                                                </div>
                                            </div>
                                        </Card.Header>
                                        <Card.Body>
                                            <Row>
                                                <Col md={8}>
                                                    <div style={{ height: '400px' }}>
                                                        {performanceData.length > 0 ? (
                                                            <Line data={performanceChartData} options={{ maintainAspectRatio: false }} />
                                                        ) : (
                                                            <div className="text-center text-muted py-5">
                                                                No performance data available
                                                            </div>
                                                        )}
                                                    </div>
                                                </Col>
                                                <Col md={4}>
                                                    <Card>
                                                        <Card.Header>Key Metrics</Card.Header>
                                                        <Card.Body>
                                                            <div className="mb-3">
                                                                <h6>Average Collection</h6>
                                                                <h3 className="text-primary">
                                                                    {formatCurrency(
                                                                        performanceData.reduce((acc, d) => acc + (parseFloat(d.collection) || 0), 0) / 
                                                                        (performanceData.length || 1)
                                                                    )}
                                                                </h3>
                                                            </div>
                                                            <div className="mb-3">
                                                                <h6>Growth Rate</h6>
                                                                <h3 className="text-success">+12.5%</h3>
                                                            </div>
                                                            <div className="mb-3">
                                                                <h6>Best Performing Town</h6>
                                                                <h5>
                                                                    {towns.sort((a, b) => {
                                                                        const aPerf = (parseFloat(a.collected) || 0) / (parseFloat(a.target) || 1);
                                                                        const bPerf = (parseFloat(b.collected) || 0) / (parseFloat(b.target) || 1);
                                                                        return bPerf - aPerf;
                                                                    })[0]?.name || 'N/A'}
                                                                </h5>
                                                            </div>
                                                            <div>
                                                                <h6>Needs Attention</h6>
                                                                <h5 className="text-danger">
                                                                    {towns.filter(t => {
                                                                        const target = parseFloat(t.target) || 1;
                                                                        const collected = parseFloat(t.collected) || 0;
                                                                        return (collected / target) < 0.5;
                                                                    }).length} Towns
                                                                </h5>
                                                            </div>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>

                                    <Card>
                                        <Card.Header>
                                            <h5 className="mb-0">Town Performance Ranking</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <Table responsive>
                                                <thead>
                                                    <tr>
                                                        <th>Rank</th>
                                                        <th>Town</th>
                                                        <th>Admin</th>
                                                        <th>Collection</th>
                                                        <th>Target</th>
                                                        <th>Performance</th>
                                                        <th>Trend</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {towns.sort((a, b) => {
                                                        const aPerf = (parseFloat(a.collected) || 0) / (parseFloat(a.target) || 1);
                                                        const bPerf = (parseFloat(b.collected) || 0) / (parseFloat(b.target) || 1);
                                                        return bPerf - aPerf;
                                                    }).map((town, index) => {
                                                        const target = parseFloat(town.target) || 1;
                                                        const collected = parseFloat(town.collected) || 0;
                                                        const percentage = (collected / target) * 100;
                                                        
                                                        return (
                                                            <tr key={town.id}>
                                                                <td>#{index + 1}</td>
                                                                <td>{town.name}</td>
                                                                <td>{town.admin_name || 'N/A'}</td>
                                                                <td>{formatCurrency(collected)}</td>
                                                                <td>{formatCurrency(target)}</td>
                                                                <td style={{ width: '150px' }}>
                                                                    <ProgressBar 
                                                                        variant={getPerformanceColor(percentage)}
                                                                        now={percentage}
                                                                        label={`${percentage.toFixed(0)}%`}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    {index < 3 ? '📈' : index > towns.length - 4 ? '📉' : '➡️'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab.Pane>

                        {/* Escalations Tab */}
                        <Tab.Pane active={activeTab === 'escalations'}>
                            <h5 className="mb-3">Pending Escalations</h5>
                            {escalations.length === 0 ? (
                                <div className="text-center py-5">
                                    <div className="display-1 text-success mb-3">✅</div>
                                    <h5>No Pending Escalations</h5>
                                    <p className="text-muted">All issues have been resolved at town level.</p>
                                </div>
                            ) : (
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Town</th>
                                            <th>Type</th>
                                            <th>Description</th>
                                            <th>Reported By</th>
                                            <th>Date</th>
                                            <th>Priority</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {escalations.map(esc => (
                                            <tr key={esc.id}>
                                                <td>#{esc.id}</td>
                                                <td>{esc.town_name}</td>
                                                <td>
                                                    <Badge bg="info">{esc.type}</Badge>
                                                </td>
                                                <td>{esc.description}</td>
                                                <td>{esc.reported_by}</td>
                                                <td>{new Date(esc.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <Badge bg={esc.priority === 'high' ? 'danger' : esc.priority === 'medium' ? 'warning' : 'info'}>
                                                        {esc.priority}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button 
                                                        size="sm" 
                                                        variant="success" 
                                                        className="me-1"
                                                        onClick={() => handleEscalate(esc.id, 'resolve')}
                                                    >
                                                        Resolve
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="danger"
                                                        onClick={() => handleEscalate(esc.id, 'escalate')}
                                                    >
                                                        Escalate to Super
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Tab.Pane>

                        {/* Reports Tab */}
                        <Tab.Pane active={activeTab === 'reports'}>
                            <Row>
                                <Col md={4}>
                                    <Card className="mb-4">
                                        <Card.Header>Generate Reports</Card.Header>
                                        <Card.Body>
                                            <Form>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Report Type</Form.Label>
                                                    <Form.Select>
                                                        <option>Monthly Collection Report</option>
                                                        <option>Quarterly Summary</option>
                                                        <option>Annual Report</option>
                                                        <option>Town Performance Report</option>
                                                        <option>Admin Performance Report</option>
                                                        <option>Compliance Report</option>
                                                    </Form.Select>
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Start Date</Form.Label>
                                                    <Form.Control type="date" />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>End Date</Form.Label>
                                                    <Form.Control type="date" />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Format</Form.Label>
                                                    <Form.Select>
                                                        <option>PDF</option>
                                                        <option>Excel</option>
                                                        <option>CSV</option>
                                                    </Form.Select>
                                                </Form.Group>
                                                <Button variant="primary" className="w-100">
                                                    Generate Report
                                                </Button>
                                            </Form>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={8}>
                                    <Card>
                                        <Card.Header>Recent Reports</Card.Header>
                                        <Card.Body>
                                            <Table responsive>
                                                <thead>
                                                    <tr>
                                                        <th>Report Name</th>
                                                        <th>Generated</th>
                                                        <th>Period</th>
                                                        <th>Format</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>Monthly Collection - March 2024</td>
                                                        <td>2024-03-10</td>
                                                        <td>Mar 2024</td>
                                                        <td>PDF</td>
                                                        <td>
                                                            <Button size="sm" variant="outline-primary">Download</Button>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>Town Performance Q1 2024</td>
                                                        <td>2024-03-09</td>
                                                        <td>Jan-Mar 2024</td>
                                                        <td>Excel</td>
                                                        <td>
                                                            <Button size="sm" variant="outline-primary">Download</Button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab.Pane>
                    </Tab.Content>
                </Card.Body>
            </Card>

            {/* Add Town Modal */}
            <Modal show={showTownModal} onHide={() => setShowTownModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add New Town</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateTown}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Town Name *</Form.Label>
                            <Form.Control
                                type="text"
                                value={newTown.name}
                                onChange={(e) => setNewTown({...newTown, name: e.target.value})}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Town Code *</Form.Label>
                            <Form.Control
                                type="text"
                                value={newTown.code}
                                onChange={(e) => setNewTown({...newTown, code: e.target.value})}
                                placeholder="e.g., AD-001"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Monthly Target (ETB) *</Form.Label>
                            <Form.Control
                                type="number"
                                value={newTown.target_amount}
                                onChange={(e) => setNewTown({...newTown, target_amount: e.target.value})}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={newTown.notes}
                                onChange={(e) => setNewTown({...newTown, notes: e.target.value})}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowTownModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Create Town
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Create Town Admin Modal */}
            <Modal show={showAdminModal} onHide={() => setShowAdminModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Create Town Administrator</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateTownAdmin}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Full Name *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={newAdmin.full_name}
                                        onChange={(e) => setNewAdmin({...newAdmin, full_name: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email *</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={newAdmin.email}
                                        onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Password *</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={newAdmin.password}
                                        onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Phone</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={newAdmin.phone}
                                        onChange={(e) => setNewAdmin({...newAdmin, phone: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Assign Town *</Form.Label>
                                    <Form.Select
                                        value={newAdmin.town_id}
                                        onChange={(e) => setNewAdmin({...newAdmin, town_id: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Town</option>
                                        {towns.filter(t => !t.has_admin).map(town => (
                                            <option key={town.id} value={town.id}>{town.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Monthly Target (ETB) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newAdmin.tax_target}
                                        onChange={(e) => setNewAdmin({...newAdmin, tax_target: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAdminModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Create Town Admin
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default EnhancedRegionalAdminDashboard;