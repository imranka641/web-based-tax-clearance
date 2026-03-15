import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Nav, Tab, Form, Modal, ProgressBar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler);

const EnhancedSuperAdminDashboard = () => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalRegions: 0,
        totalTowns: 0,
        totalUsers: 0,
        totalTaxpayers: 0,
        totalAdmins: 0,
        totalCollected: 0,
        monthlyTarget: 0,
        systemUptime: 99.9,
        activeSessions: 0,
        pendingIssues: 0
    });
    const [regions, setRegions] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);
    const [systemHealth, setSystemHealth] = useState({});
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showRegionModal, setShowRegionModal] = useState(false);
    const [showSystemModal, setShowSystemModal] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [dateRange, setDateRange] = useState({ 
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const navigate = useNavigate();

    // Form states
    const [newRegion, setNewRegion] = useState({
        name: '',
        name_am: '',
        name_om: '',
        name_so: '',
        code: '',
        capital: '',
        population: '',
        tax_target: ''
    });

    const [systemSettings, setSystemSettings] = useState({
        system_name: 'Ethiopian Tax Clearance System',
        currency: 'ETB',
        tax_year_start: '',
        tax_year_end: '',
        default_growth_rate: '10',
        max_under_reporting: '3',
        payment_timeout: '30',
        maintenance_mode: false
    });

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || !currentUser.is_super_admin) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchSystemData();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchSystemData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchSystemData = async () => {
        try {
            const [
                statsRes,
                regionsRes,
                activitiesRes,
                healthRes,
                auditRes
            ] = await Promise.all([
                api.get('/admin/system-stats'),
                api.get('/admin/regions'),
                api.get('/admin/recent-activities'),
                api.get('/admin/system-health'),
                api.get('/admin/audit-logs')
            ]);

            setStats(statsRes.data);
            setRegions(regionsRes.data.regions || []);
            setRecentActivities(activitiesRes.data.activities || []);
            setSystemHealth(healthRes.data);
            setAuditLogs(auditRes.data.logs || []);
        } catch (error) {
            console.error('Error fetching system data:', error);
            setError('Failed to load system data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRegion = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/regions', newRegion);
            setShowRegionModal(false);
            setNewRegion({
                name: '', name_am: '', name_om: '', name_so: '',
                code: '', capital: '', population: '', tax_target: ''
            });
            fetchSystemData();
            alert('✅ Region created successfully!');
        } catch (error) {
            console.error('Error creating region:', error);
            setError('Failed to create region');
        }
    };

    const handleSystemSettingChange = async (key, value) => {
        try {
            await api.put('/admin/system-settings', { key, value });
            setSystemSettings({...systemSettings, [key]: value});
            alert('✅ System setting updated');
        } catch (error) {
            console.error('Error updating system setting:', error);
            setError('Failed to update setting');
        }
    };

    const handleToggleMaintenance = async () => {
        try {
            const newMode = !systemSettings.maintenance_mode;
            await api.post('/admin/maintenance-mode', { enabled: newMode });
            setSystemSettings({...systemSettings, maintenance_mode: newMode});
            alert(`Maintenance mode ${newMode ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling maintenance mode:', error);
            setError('Failed to toggle maintenance mode');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount || 0);
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-ET').format(num || 0);
    };

    const getHealthColor = (value) => {
        if (value >= 90) return 'success';
        if (value >= 70) return 'warning';
        return 'danger';
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="danger" />
                <p className="mt-3">Loading Super Admin Dashboard...</p>
            </Container>
        );
    }

    // Chart data
    const collectionChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Collection (Millions ETB)',
                data: [45.2, 48.5, 52.3, 55.8, 58.2, 62.5],
                borderColor: 'rgb(220, 53, 69)',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    };

    const regionalChartData = {
        labels: regions.slice(0, 8).map(r => r.code),
        datasets: [
            {
                label: 'Collection by Region',
                data: regions.slice(0, 8).map(r => r.collection / 1000000),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(199, 199, 199, 0.6)',
                    'rgba(83, 102, 255, 0.6)'
                ],
                borderWidth: 1
            }
        ]
    };

    const userChartData = {
        labels: ['Taxpayers', 'Town Admins', 'Regional Admins', 'Super Admins'],
        datasets: [
            {
                data: [
                    stats.totalTaxpayers || 0,
                    stats.totalAdmins || 0,
                    regions.length || 0,
                    1
                ],
                backgroundColor: [
                    'rgba(40, 167, 69, 0.6)',
                    'rgba(23, 162, 184, 0.6)',
                    'rgba(255, 193, 7, 0.6)',
                    'rgba(220, 53, 69, 0.6)'
                ],
                borderWidth: 1
            }
        ]
    };

    return (
        <Container fluid className="mt-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <Card className="bg-danger text-white">
                        <Card.Body className="p-4">
                            <Row>
                                <Col md={8}>
                                    <h2>⚡ Super Admin Dashboard</h2>
                                    <p className="mb-0">
                                        <Badge bg="light" text="dark" className="me-2">
                                            {user?.full_name}
                                        </Badge>
                                        <Badge bg="light" text="dark" className="me-2">
                                            System Administrator
                                        </Badge>
                                        <Badge bg="warning" text="dark">
                                            National Level Access
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
                                    <Badge bg={systemSettings.maintenance_mode ? 'warning' : 'success'} className="mt-2">
                                        {systemSettings.maintenance_mode ? '⚠️ Maintenance Mode' : '✅ System Online'}
                                    </Badge>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* National Statistics Cards */}
            <Row className="mb-4">
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-primary h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Total Regions</h6>
                                    <h3 className="text-primary">{formatNumber(stats.totalRegions)}</h3>
                                </div>
                                <div className="bg-primary bg-opacity-10 p-3 rounded">
                                    🗺️
                                </div>
                            </div>
                            <small className="text-muted">+ {stats.totalTowns} towns</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-info h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Total Users</h6>
                                    <h3 className="text-info">{formatNumber(stats.totalUsers)}</h3>
                                </div>
                                <div className="bg-info bg-opacity-10 p-3 rounded">
                                    👥
                                </div>
                            </div>
                            <small className="text-muted">Taxpayers: {formatNumber(stats.totalTaxpayers)}</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-success h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Total Collection</h6>
                                    <h3 className="text-success">{formatCurrency(stats.totalCollected)}</h3>
                                </div>
                                <div className="bg-success bg-opacity-10 p-3 rounded">
                                    💰
                                </div>
                            </div>
                            <ProgressBar 
                                now={(stats.totalCollected / stats.monthlyTarget) * 100} 
                                variant="success" 
                                size="sm"
                                label={`${((stats.totalCollected / stats.monthlyTarget) * 100).toFixed(1)}%`}
                            />
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-warning h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">System Uptime</h6>
                                    <h3 className="text-warning">{stats.systemUptime}%</h3>
                                </div>
                                <div className="bg-warning bg-opacity-10 p-3 rounded">
                                    ⚡
                                </div>
                            </div>
                            <ProgressBar now={stats.systemUptime} variant="warning" size="sm" />
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-info h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Active Sessions</h6>
                                    <h3 className="text-info">{formatNumber(stats.activeSessions)}</h3>
                                </div>
                                <div className="bg-info bg-opacity-10 p-3 rounded">
                                    🟢
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-danger h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Pending Issues</h6>
                                    <h3 className="text-danger">{formatNumber(stats.pendingIssues)}</h3>
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
                                <Col md={2}>
                                    <Button 
                                        variant="outline-primary" 
                                        className="w-100"
                                        onClick={() => setShowRegionModal(true)}
                                    >
                                        ➕ Add Region
                                    </Button>
                                </Col>
                                <Col md={2}>
                                    <Button 
                                        variant="outline-success" 
                                        className="w-100"
                                        onClick={() => navigate('/admin/regions')}
                                    >
                                        🗺️ Manage Regions
                                    </Button>
                                </Col>
                                <Col md={2}>
                                    <Button 
                                        variant="outline-info" 
                                        className="w-100"
                                        onClick={() => navigate('/admin/users')}
                                    >
                                        👥 Manage Users
                                    </Button>
                                </Col>
                                <Col md={2}>
                                    <Button 
                                        variant="outline-warning" 
                                        className="w-100"
                                        onClick={() => setShowSystemModal(true)}
                                    >
                                        ⚙️ System Settings
                                    </Button>
                                </Col>
                                <Col md={2}>
                                    <Button 
                                        variant="outline-danger" 
                                        className="w-100"
                                        onClick={handleToggleMaintenance}
                                    >
                                        {systemSettings.maintenance_mode ? '🔴 Disable Maintenance' : '🟢 Enable Maintenance'}
                                    </Button>
                                </Col>
                                <Col md={2}>
                                    <Button 
                                        variant="outline-secondary" 
                                        className="w-100"
                                        onClick={fetchSystemData}
                                    >
                                        🔄 Refresh
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
                            <Nav.Link eventKey="overview">📊 National Overview</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="regions">🗺️ Regions Management</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="users">👥 User Management</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="system">⚙️ System Configuration</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="audit">📋 Audit Logs</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="reports">📑 National Reports</Nav.Link>
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
                                            <div className="d-flex justify-content-between align-items-center">
                                                <h5 className="mb-0">National Collection Trend</h5>
                                                <div>
                                                    <Form.Control
                                                        type="date"
                                                        value={dateRange.start}
                                                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                                        style={{ width: '150px', display: 'inline-block', marginRight: '10px' }}
                                                    />
                                                    <Form.Control
                                                        type="date"
                                                        value={dateRange.end}
                                                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                                        style={{ width: '150px', display: 'inline-block' }}
                                                    />
                                                </div>
                                            </div>
                                        </Card.Header>
                                        <Card.Body style={{ height: '300px' }}>
                                            <Line data={collectionChartData} options={{ maintainAspectRatio: false }} />
                                        </Card.Body>
                                    </Card>

                                    <Row>
                                        <Col md={6}>
                                            <Card className="mb-4">
                                                <Card.Header>Collection by Region</Card.Header>
                                                <Card.Body style={{ height: '300px' }}>
                                                    <Bar data={regionalChartData} options={{ maintainAspectRatio: false }} />
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={6}>
                                            <Card className="mb-4">
                                                <Card.Header>User Distribution</Card.Header>
                                                <Card.Body style={{ height: '300px' }}>
                                                    <Doughnut data={userChartData} options={{ maintainAspectRatio: false }} />
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>

                                    <Card>
                                        <Card.Header>
                                            <h5 className="mb-0">Recent System Activities</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                {recentActivities.map(activity => (
                                                    <div key={activity.id} className="border-bottom pb-2 mb-2">
                                                        <div className="d-flex justify-content-between">
                                                            <div>
                                                                <strong>{activity.action}</strong>
                                                                <br />
                                                                <small className="text-muted">
                                                                    By: {activity.user_name} • {new Date(activity.created_at).toLocaleString()}
                                                                </small>
                                                            </div>
                                                            <Badge bg={activity.resource_type === 'error' ? 'danger' : 'info'}>
                                                                {activity.resource_type}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card className="mb-4">
                                        <Card.Header>System Health</Card.Header>
                                        <Card.Body>
                                            <div className="mb-3">
                                                <h6>Server Status</h6>
                                                <ProgressBar 
                                                    variant={getHealthColor(systemHealth.server_uptime)} 
                                                    now={systemHealth.server_uptime || 95} 
                                                    label={`${systemHealth.server_uptime || 95}%`}
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <h6>Database Performance</h6>
                                                <ProgressBar 
                                                    variant={getHealthColor(systemHealth.database_performance)} 
                                                    now={systemHealth.database_performance || 88} 
                                                    label={`${systemHealth.database_performance || 88}%`}
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <h6>API Response Time</h6>
                                                <ProgressBar 
                                                    variant={getHealthColor(systemHealth.api_response)} 
                                                    now={systemHealth.api_response || 92} 
                                                    label={`${systemHealth.api_response || 92}%`}
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <h6>Storage Usage</h6>
                                                <ProgressBar 
                                                    variant="info" 
                                                    now={65} 
                                                    label="65%"
                                                />
                                            </div>
                                            <hr />
                                            <h6>Active Alerts</h6>
                                            {systemHealth.alerts?.length > 0 ? (
                                                systemHealth.alerts.map((alert, idx) => (
                                                    <Alert key={idx} variant={alert.type} className="py-2">
                                                        <small>{alert.message}</small>
                                                    </Alert>
                                                ))
                                            ) : (
                                                <Alert variant="success" className="py-2">
                                                    <small>✅ All systems operational</small>
                                                </Alert>
                                            )}
                                        </Card.Body>
                                    </Card>

                                    <Card>
                                        <Card.Header>Quick Stats</Card.Header>
                                        <Card.Body>
                                            <div className="bg-light p-3 rounded">
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Total Transactions:</span>
                                                    <span className="fw-bold">145,789</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Avg Transaction Value:</span>
                                                    <span className="fw-bold">{formatCurrency(12500)}</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Peak Hour:</span>
                                                    <span className="fw-bold">10:00 - 14:00</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Success Rate:</span>
                                                    <span className="fw-bold text-success">98.5%</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span>Error Rate:</span>
                                                    <span className="fw-bold text-danger">1.5%</span>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab.Pane>

                        {/* Regions Management Tab */}
                        <Tab.Pane active={activeTab === 'regions'}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>Ethiopian Regions Management</h5>
                                <Button variant="success" onClick={() => setShowRegionModal(true)}>
                                    + Add New Region
                                </Button>
                            </div>
                            <Table responsive striped hover>
                                <thead>
                                    <tr>
                                        <th>Region</th>
                                        <th>Code</th>
                                        <th>Capital</th>
                                        <th>Towns</th>
                                        <th>Admins</th>
                                        <th>Taxpayers</th>
                                        <th>Collection</th>
                                        <th>Target</th>
                                        <th>Performance</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {regions.map(region => (
                                        <tr key={region.id}>
                                            <td>
                                                <strong>{region.name}</strong>
                                                <br />
                                                <small className="text-muted">አማርኛ: {region.name_am}</small>
                                            </td>
                                            <td><Badge bg="dark">{region.code}</Badge></td>
                                            <td>{region.capital}</td>
                                            <td>{region.town_count || 0}</td>
                                            <td>{region.admin_count || 0}</td>
                                            <td>{formatNumber(region.taxpayer_count || 0)}</td>
                                            <td>{formatCurrency(region.collection || 0)}</td>
                                            <td>{formatCurrency(region.target || 0)}</td>
                                            <td style={{ width: '150px' }}>
                                                <ProgressBar 
                                                    variant={getHealthColor((region.collection / region.target) * 100)}
                                                    now={(region.collection / region.target) * 100}
                                                    label={`${((region.collection / region.target) * 100).toFixed(0)}%`}
                                                />
                                            </td>
                                            <td>
                                                <Button size="sm" variant="outline-primary" className="me-1">
                                                    View
                                                </Button>
                                                <Button size="sm" variant="outline-warning">
                                                    Edit
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Tab.Pane>

                        {/* User Management Tab */}
                        <Tab.Pane active={activeTab === 'users'}>
                            <Row>
                                <Col md={3}>
                                    <Card className="mb-4">
                                        <Card.Body className="text-center">
                                            <h1 className="text-primary">{formatNumber(stats.totalUsers)}</h1>
                                            <p>Total Users</p>
                                            <Button variant="outline-primary" size="sm">View All</Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="mb-4">
                                        <Card.Body className="text-center">
                                            <h1 className="text-success">{formatNumber(stats.totalTaxpayers)}</h1>
                                            <p>Taxpayers</p>
                                            <Button variant="outline-success" size="sm">Manage</Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="mb-4">
                                        <Card.Body className="text-center">
                                            <h1 className="text-info">{formatNumber(stats.totalAdmins)}</h1>
                                            <p>Town Admins</p>
                                            <Button variant="outline-info" size="sm">Manage</Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="mb-4">
                                        <Card.Body className="text-center">
                                            <h1 className="text-warning">{regions.length}</h1>
                                            <p>Regional Admins</p>
                                            <Button variant="outline-warning" size="sm">Manage</Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            <Card>
                                <Card.Header>
                                    <h5 className="mb-0">User Activity Overview</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Table responsive>
                                        <thead>
                                            <tr>
                                                <th>User Type</th>
                                                <th>Active Today</th>
                                                <th>Active This Week</th>
                                                <th>Active This Month</th>
                                                <th>Total</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Taxpayers</td>
                                                <td>1,245</td>
                                                <td>5,678</td>
                                                <td>12,345</td>
                                                <td>{formatNumber(stats.totalTaxpayers)}</td>
                                                <td>
                                                    <Button size="sm" variant="outline-primary">View</Button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Town Admins</td>
                                                <td>89</td>
                                                <td>156</td>
                                                <td>189</td>
                                                <td>{formatNumber(stats.totalAdmins)}</td>
                                                <td>
                                                    <Button size="sm" variant="outline-primary">View</Button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Regional Admins</td>
                                                <td>8</td>
                                                <td>11</td>
                                                <td>13</td>
                                                <td>{regions.length}</td>
                                                <td>
                                                    <Button size="sm" variant="outline-primary">View</Button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Tab.Pane>

                        {/* System Configuration Tab */}
                        <Tab.Pane active={activeTab === 'system'}>
                            <Row>
                                <Col md={6}>
                                    <Card className="mb-4">
                                        <Card.Header>
                                            <h5 className="mb-0">System Settings</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <Form>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>System Name</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        value={systemSettings.system_name}
                                                        onChange={(e) => handleSystemSettingChange('system_name', e.target.value)}
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Currency</Form.Label>
                                                    <Form.Select
                                                        value={systemSettings.currency}
                                                        onChange={(e) => handleSystemSettingChange('currency', e.target.value)}
                                                    >
                                                        <option value="ETB">ETB - Ethiopian Birr</option>
                                                        <option value="USD">USD - US Dollar</option>
                                                    </Form.Select>
                                                </Form.Group>
                                                <Row>
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Tax Year Start</Form.Label>
                                                            <Form.Control
                                                                type="date"
                                                                value={systemSettings.tax_year_start}
                                                                onChange={(e) => handleSystemSettingChange('tax_year_start', e.target.value)}
                                                            />
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Tax Year End</Form.Label>
                                                            <Form.Control
                                                                type="date"
                                                                value={systemSettings.tax_year_end}
                                                                onChange={(e) => handleSystemSettingChange('tax_year_end', e.target.value)}
                                                            />
                                                        </Form.Group>
                                                    </Col>
                                                </Row>
                                                <Row>
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Default Growth Rate (%)</Form.Label>
                                                            <Form.Control
                                                                type="number"
                                                                value={systemSettings.default_growth_rate}
                                                                onChange={(e) => handleSystemSettingChange('default_growth_rate', e.target.value)}
                                                            />
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Max Under-reporting</Form.Label>
                                                            <Form.Control
                                                                type="number"
                                                                value={systemSettings.max_under_reporting}
                                                                onChange={(e) => handleSystemSettingChange('max_under_reporting', e.target.value)}
                                                            />
                                                        </Form.Group>
                                                    </Col>
                                                </Row>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Payment Timeout (minutes)</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        value={systemSettings.payment_timeout}
                                                        onChange={(e) => handleSystemSettingChange('payment_timeout', e.target.value)}
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Check
                                                        type="switch"
                                                        label="Maintenance Mode"
                                                        checked={systemSettings.maintenance_mode}
                                                        onChange={handleToggleMaintenance}
                                                    />
                                                </Form.Group>
                                            </Form>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="mb-4">
                                        <Card.Header>
                                            <h5 className="mb-0">Database Management</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="d-grid gap-2">
                                                <Button variant="outline-primary">
                                                    Backup Database
                                                </Button>
                                                <Button variant="outline-warning">
                                                    Restore Database
                                                </Button>
                                                <Button variant="outline-danger">
                                                    Clear Cache
                                                </Button>
                                                <Button variant="outline-info">
                                                    Optimize Tables
                                                </Button>
                                            </div>
                                        </Card.Body>
                                    </Card>

                                    <Card>
                                        <Card.Header>
                                            <h5 className="mb-0">System Information</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="bg-light p-3 rounded">
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Node Version:</span>
                                                    <span className="fw-bold">v18.17.0</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Database:</span>
                                                    <span className="fw-bold">PostgreSQL 15.3</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Last Backup:</span>
                                                    <span className="fw-bold">2024-03-10 03:00 AM</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>Storage Used:</span>
                                                    <span className="fw-bold">4.2 GB / 10 GB</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span>API Version:</span>
                                                    <span className="fw-bold">v2.1.0</span>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab.Pane>

                        {/* Audit Logs Tab */}
                        <Tab.Pane active={activeTab === 'audit'}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>System Audit Logs</h5>
                                <div>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search logs..."
                                        style={{ width: '300px', display: 'inline-block' }}
                                    />
                                </div>
                            </div>
                            <Table responsive striped hover>
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Action</th>
                                        <th>Resource</th>
                                        <th>IP Address</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map(log => (
                                        <tr key={log.id}>
                                            <td>{new Date(log.created_at).toLocaleString()}</td>
                                            <td>{log.user_name}</td>
                                            <td>
                                                <Badge bg={
                                                    log.user_role === 'super_admin' ? 'danger' :
                                                    log.user_role === 'regional_admin' ? 'success' :
                                                    log.user_role === 'town_admin' ? 'info' : 'secondary'
                                                }>
                                                    {log.user_role}
                                                </Badge>
                                            </td>
                                            <td>{log.action}</td>
                                            <td>{log.resource_type}</td>
                                            <td>{log.ip_address}</td>
                                            <td>
                                                <Badge bg={log.status === 'success' ? 'success' : 'danger'}>
                                                    {log.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Tab.Pane>

                        {/* Reports Tab */}
                        <Tab.Pane active={activeTab === 'reports'}>
                            <Row>
                                <Col md={3}>
                                    <Card className="mb-4">
                                        <Card.Body className="text-center">
                                            <i className="display-4">📊</i>
                                            <h6 className="mt-2">Monthly Report</h6>
                                            <Button size="sm" variant="outline-primary">Generate</Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="mb-4">
                                        <Card.Body className="text-center">
                                            <i className="display-4">📈</i>
                                            <h6 className="mt-2">Quarterly Report</h6>
                                            <Button size="sm" variant="outline-primary">Generate</Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="mb-4">
                                        <Card.Body className="text-center">
                                            <i className="display-4">📑</i>
                                            <h6 className="mt-2">Annual Report</h6>
                                            <Button size="sm" variant="outline-primary">Generate</Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="mb-4">
                                        <Card.Body className="text-center">
                                            <i className="display-4">📋</i>
                                            <h6 className="mt-2">Compliance Report</h6>
                                            <Button size="sm" variant="outline-primary">Generate</Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            <Card>
                                <Card.Header>
                                    <h5 className="mb-0">Recent Reports</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Table responsive>
                                        <thead>
                                            <tr>
                                                <th>Report Name</th>
                                                <th>Generated</th>
                                                <th>Period</th>
                                                <th>Size</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>National_Collection_Mar2024.pdf</td>
                                                <td>2024-03-10</td>
                                                <td>Mar 2024</td>
                                                <td>2.4 MB</td>
                                                <td>
                                                    <Button size="sm" variant="outline-primary">Download</Button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Regional_Performance_Q1_2024.xlsx</td>
                                                <td>2024-03-09</td>
                                                <td>Q1 2024</td>
                                                <td>1.8 MB</td>
                                                <td>
                                                    <Button size="sm" variant="outline-primary">Download</Button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Tab.Pane>
                    </Tab.Content>
                </Card.Body>
            </Card>

            {/* Add Region Modal */}
            <Modal show={showRegionModal} onHide={() => setShowRegionModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add New Region</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateRegion}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Region Name (English) *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={newRegion.name}
                                        onChange={(e) => setNewRegion({...newRegion, name: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Region Name (Amharic)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={newRegion.name_am}
                                        onChange={(e) => setNewRegion({...newRegion, name_am: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Region Code *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={newRegion.code}
                                        onChange={(e) => setNewRegion({...newRegion, code: e.target.value})}
                                        placeholder="e.g., AA, OR, AM"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Capital City *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={newRegion.capital}
                                        onChange={(e) => setNewRegion({...newRegion, capital: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Population</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newRegion.population}
                                        onChange={(e) => setNewRegion({...newRegion, population: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Annual Tax Target (ETB)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newRegion.tax_target}
                                        onChange={(e) => setNewRegion({...newRegion, tax_target: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowRegionModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="danger" type="submit">
                            Create Region
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default EnhancedSuperAdminDashboard;