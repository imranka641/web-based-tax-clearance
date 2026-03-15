import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Nav, Tab, Form, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const EnhancedTownAdminDashboard = () => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalTaxpayers: 0,
        pendingVerifications: 0,
        pendingReceipts: 0,
        pendingTCC: 0,
        collectedThisMonth: 0,
        monthlyTarget: 0,
        unpaidTaxes: 0
    });
    const [pendingVerifications, setPendingVerifications] = useState([]);
    const [pendingReceipts, setPendingReceipts] = useState([]);
    const [pendingTCC, setPendingTCC] = useState([]);
    const [taxpayers, setTaxpayers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [verifyAction, setVerifyAction] = useState({ status: 'approved', notes: '' });
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'town_admin') {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchAllData();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAllData = async () => {
        try {
            const [
                statsRes,
                verificationsRes,
                receiptsRes,
                tccRes,
                taxpayersRes,
                categoriesRes
            ] = await Promise.all([
                api.get('/town-admin/stats'),
                api.get('/town-admin/pending-verifications'),
                api.get('/town-admin/pending-receipts'),
                api.get('/town-admin/pending-tcc'),
                api.get('/town-admin/taxpayers'),
                api.get('/town-admin/categories')
            ]);

            setStats(statsRes.data);
            setPendingVerifications(verificationsRes.data.pending || []);
            setPendingReceipts(receiptsRes.data.receipts || []);
            setPendingTCC(tccRes.data.applications || []);
            setTaxpayers(taxpayersRes.data.taxpayers || []);
            setCategories(categoriesRes.data.categories || []);
        } catch (error) {
            console.error('Error fetching town admin data:', error);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyProfile = async () => {
        try {
            await api.post(`/town-admin/verify-profile/${selectedItem.id}`, verifyAction);
            setShowVerifyModal(false);
            fetchAllData();
            alert('✅ Profile verification completed!');
        } catch (error) {
            console.error('Error verifying profile:', error);
            setError('Failed to verify profile');
        }
    };

    const handleVerifyReceipt = async () => {
        try {
            await api.post(`/town-admin/verify-receipt/${selectedItem.id}`, verifyAction);
            setShowVerifyModal(false);
            fetchAllData();
            alert('✅ Receipt verification completed!');
        } catch (error) {
            console.error('Error verifying receipt:', error);
            setError('Failed to verify receipt');
        }
    };

    const handleVerifyTCC = async () => {
        try {
            await api.post(`/town-admin/verify-tcc/${selectedItem.id}`, verifyAction);
            setShowVerifyModal(false);
            fetchAllData();
            alert('✅ TCC application processed!');
        } catch (error) {
            console.error('Error processing TCC:', error);
            setError('Failed to process TCC');
        }
    };

    const openVerifyModal = (item, type) => {
        setSelectedItem({ ...item, type });
        setVerifyAction({ status: 'approved', notes: '' });
        setShowVerifyModal(true);
    };

    const getStatusBadge = (status) => {
        const colors = {
            'pending': 'warning',
            'approved': 'success',
            'rejected': 'danger',
            'verified': 'success',
            'submitted': 'info',
            'processing': 'primary'
        };
        return colors[status] || 'secondary';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount || 0);
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading Town Admin Dashboard...</p>
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <Card className="bg-primary text-white">
                        <Card.Body className="p-4">
                            <Row>
                                <Col md={8}>
                                    <h2>🏛️ Town Admin Dashboard</h2>
                                    <p className="mb-0">
                                        <Badge bg="light" text="dark" className="me-2">
                                            {user?.full_name}
                                        </Badge>
                                        <Badge bg="light" text="dark" className="me-2">
                                            {user?.town_name || 'Town Administration'}
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

            {/* Stats Cards */}
            <Row className="mb-4">
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-primary h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Total Taxpayers</h6>
                                    <h3 className="text-primary">{stats.totalTaxpayers}</h3>
                                </div>
                                <div className="bg-primary bg-opacity-10 p-3 rounded">
                                    👥
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-warning h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Pending Profiles</h6>
                                    <h3 className="text-warning">{stats.pendingVerifications}</h3>
                                </div>
                                <div className="bg-warning bg-opacity-10 p-3 rounded">
                                    📋
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-info h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Pending Receipts</h6>
                                    <h3 className="text-info">{stats.pendingReceipts}</h3>
                                </div>
                                <div className="bg-info bg-opacity-10 p-3 rounded">
                                    📄
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
                                    <h6 className="text-muted">Monthly Collection</h6>
                                    <h3 className="text-success">{formatCurrency(stats.collectedThisMonth)}</h3>
                                </div>
                                <div className="bg-success bg-opacity-10 p-3 rounded">
                                    💰
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
                                    <h6 className="text-muted">Unpaid Taxes</h6>
                                    <h3 className="text-danger">{formatCurrency(stats.unpaidTaxes)}</h3>
                                </div>
                                <div className="bg-danger bg-opacity-10 p-3 rounded">
                                    ⚠️
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6} className="mb-3">
                    <Card className="border-secondary h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted">Pending TCC</h6>
                                    <h3 className="text-secondary">{stats.pendingTCC}</h3>
                                </div>
                                <div className="bg-secondary bg-opacity-10 p-3 rounded">
                                    📑
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Main Tabs */}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <Nav variant="tabs" activeKey={activeTab} onSelect={setActiveTab}>
                        <Nav.Item>
                            <Nav.Link eventKey="overview">📊 Overview</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="verifications">
                                👤 Profile Verifications 
                                {pendingVerifications.length > 0 && 
                                    <Badge bg="warning" className="ms-2">{pendingVerifications.length}</Badge>
                                }
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="receipts">
                                📄 Receipt Verifications
                                {pendingReceipts.length > 0 && 
                                    <Badge bg="warning" className="ms-2">{pendingReceipts.length}</Badge>
                                }
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="tcc">
                                📋 TCC Applications
                                {pendingTCC.length > 0 && 
                                    <Badge bg="warning" className="ms-2">{pendingTCC.length}</Badge>
                                }
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="categories">🏷️ Tax Categories</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="taxpayers">👥 Taxpayers</Nav.Link>
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
                                            <h5 className="mb-0">Quick Actions</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <Row>
                                                <Col md={4} className="mb-3">
                                                    <Button 
                                                        variant="outline-primary" 
                                                        className="w-100 py-3"
                                                        onClick={() => setActiveTab('verifications')}
                                                    >
                                                        <div className="display-6 mb-2">👤</div>
                                                        Verify Profiles
                                                        {pendingVerifications.length > 0 && 
                                                            <Badge bg="danger" className="ms-2">{pendingVerifications.length}</Badge>
                                                        }
                                                    </Button>
                                                </Col>
                                                <Col md={4} className="mb-3">
                                                    <Button 
                                                        variant="outline-success" 
                                                        className="w-100 py-3"
                                                        onClick={() => setActiveTab('receipts')}
                                                    >
                                                        <div className="display-6 mb-2">📄</div>
                                                        Verify Receipts
                                                        {pendingReceipts.length > 0 && 
                                                            <Badge bg="danger" className="ms-2">{pendingReceipts.length}</Badge>
                                                        }
                                                    </Button>
                                                </Col>
                                                <Col md={4} className="mb-3">
                                                    <Button 
                                                        variant="outline-info" 
                                                        className="w-100 py-3"
                                                        onClick={() => setActiveTab('tcc')}
                                                    >
                                                        <div className="display-6 mb-2">📋</div>
                                                        Process TCC
                                                        {pendingTCC.length > 0 && 
                                                            <Badge bg="danger" className="ms-2">{pendingTCC.length}</Badge>
                                                        }
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>

                                    <Card>
                                        <Card.Header>
                                            <h5 className="mb-0">Recent Activity</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="text-center text-muted py-4">
                                                <p>No recent activity to display</p>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card>
                                        <Card.Header>
                                            <h5 className="mb-0">Collection Target</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <h3 className="text-center text-primary">
                                                {formatCurrency(stats.collectedThisMonth)}
                                            </h3>
                                            <p className="text-center text-muted">
                                                of {formatCurrency(stats.monthlyTarget)} target
                                            </p>
                                            <div className="bg-light p-3 rounded">
                                                <small className="text-muted d-block mb-2">Category Breakdown:</small>
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span>Category A:</span>
                                                    <span className="fw-bold">ETB 450,000</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span>Category B:</span>
                                                    <span className="fw-bold">ETB 320,000</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span>Category C:</span>
                                                    <span className="fw-bold">ETB 180,000</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span>Category D/E:</span>
                                                    <span className="fw-bold">ETB 95,000</span>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab.Pane>

                        {/* Profile Verifications Tab */}
                        <Tab.Pane active={activeTab === 'verifications'}>
                            <h5 className="mb-3">Pending Profile Verifications</h5>
                            {pendingVerifications.length === 0 ? (
                                <div className="text-center py-5">
                                    <div className="display-1 text-success mb-3">✅</div>
                                    <h5>No Pending Verifications</h5>
                                    <p className="text-muted">All profiles have been verified.</p>
                                </div>
                            ) : (
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>Business Name</th>
                                            <th>Owner</th>
                                            <th>TIN</th>
                                            <th>Income</th>
                                            <th>Last Year Tax</th>
                                            <th>Suggested Category</th>
                                            <th>Submitted</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingVerifications.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.business_name}</td>
                                                <td>{item.full_name}</td>
                                                <td>{item.tin}</td>
                                                <td>{formatCurrency(item.last_year_income)}</td>
                                                <td>{formatCurrency(item.last_year_tax_paid)}</td>
                                                <td>
                                                    <Badge bg="info">{item.assigned_category || 'N/A'}</Badge>
                                                </td>
                                                <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <Button 
                                                        size="sm" 
                                                        variant="primary"
                                                        onClick={() => openVerifyModal(item, 'profile')}
                                                    >
                                                        Review
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Tab.Pane>

                        {/* Receipt Verifications Tab */}
                        <Tab.Pane active={activeTab === 'receipts'}>
                            <h5 className="mb-3">Pending Receipt Verifications</h5>
                            {pendingReceipts.length === 0 ? (
                                <div className="text-center py-5">
                                    <div className="display-1 text-success mb-3">✅</div>
                                    <h5>No Pending Receipts</h5>
                                    <p className="text-muted">All receipts have been verified.</p>
                                </div>
                            ) : (
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>Taxpayer</th>
                                            <th>TIN</th>
                                            <th>Tax Type</th>
                                            <th>Amount</th>
                                            <th>Payment Method</th>
                                            <th>Date</th>
                                            <th>Receipt</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingReceipts.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.taxpayer_name}</td>
                                                <td>{item.tin}</td>
                                                <td>{item.tax_type_name}</td>
                                                <td>{formatCurrency(item.amount)}</td>
                                                <td>{item.payment_method_name}</td>
                                                <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline-info"
                                                        onClick={() => window.open(`http://localhost:5000/${item.receipt_path}`, '_blank')}
                                                    >
                                                        View
                                                    </Button>
                                                </td>
                                                <td>
                                                    <Button 
                                                        size="sm" 
                                                        variant="primary"
                                                        onClick={() => openVerifyModal(item, 'receipt')}
                                                    >
                                                        Verify
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Tab.Pane>

                        {/* TCC Applications Tab */}
                        <Tab.Pane active={activeTab === 'tcc'}>
                            <h5 className="mb-3">Pending TCC Applications</h5>
                            {pendingTCC.length === 0 ? (
                                <div className="text-center py-5">
                                    <div className="display-1 text-success mb-3">✅</div>
                                    <h5>No Pending TCC Applications</h5>
                                    <p className="text-muted">All applications have been processed.</p>
                                </div>
                            ) : (
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>Application #</th>
                                            <th>Taxpayer</th>
                                            <th>Business</th>
                                            <th>Purpose</th>
                                            <th>Submitted</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingTCC.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.application_number}</td>
                                                <td>{item.taxpayer_name}</td>
                                                <td>{item.business_name}</td>
                                                <td>{item.purpose}</td>
                                                <td>{new Date(item.submitted_at).toLocaleDateString()}</td>
                                                <td>
                                                    <Badge bg={getStatusBadge(item.status)}>
                                                        {item.status}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button 
                                                        size="sm" 
                                                        variant="primary"
                                                        onClick={() => openVerifyModal(item, 'tcc')}
                                                    >
                                                        Review
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Tab.Pane>

                        {/* Tax Categories Tab */}
                        <Tab.Pane active={activeTab === 'categories'}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>Tax Categories Configuration</h5>
                                <Button variant="success" size="sm">
                                    + Add Category
                                </Button>
                            </div>
                            <Row>
                                {categories.map(cat => (
                                    <Col md={4} key={cat.id} className="mb-3">
                                        <Card className={`border-${cat.color || 'primary'}`}>
                                            <Card.Header className={`bg-${cat.color || 'primary'} text-white`}>
                                                <h5 className="mb-0">Category {cat.category_code}</h5>
                                            </Card.Header>
                                            <Card.Body>
                                                <p><strong>Income Range:</strong><br />
                                                    {cat.min_income?.toLocaleString()} - {cat.max_income?.toLocaleString() || 'Above'} ETB
                                                </p>
                                                <p><strong>Formula:</strong><br />
                                                    {cat.formula_type === 'percentage_of_last_year' && 
                                                        `${cat.multiplier}x of last year's tax`
                                                    }
                                                    {cat.formula_type === 'fixed_amount' && 
                                                        `Fixed ETB ${cat.fixed_amount?.toLocaleString()}`
                                                    }
                                                </p>
                                                <p><strong>Requires Review:</strong> {cat.requires_review ? 'Yes' : 'No'}</p>
                                                <Button variant="outline-primary" size="sm">Edit</Button>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Tab.Pane>

                        {/* Taxpayers Tab */}
                        <Tab.Pane active={activeTab === 'taxpayers'}>
                            <h5 className="mb-3">All Taxpayers</h5>
                            <Table responsive striped hover>
                                <thead>
                                    <tr>
                                        <th>Business Name</th>
                                        <th>Owner</th>
                                        <th>TIN</th>
                                        <th>Category</th>
                                        <th>Status</th>
                                        <th>Last Payment</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {taxpayers.map(tp => (
                                        <tr key={tp.id}>
                                            <td>{tp.business_name}</td>
                                            <td>{tp.full_name}</td>
                                            <td>{tp.tin}</td>
                                            <td>
                                                <Badge bg="info">{tp.category_code || 'N/A'}</Badge>
                                            </td>
                                            <td>
                                                <Badge bg={tp.is_active ? 'success' : 'secondary'}>
                                                    {tp.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td>{tp.last_payment ? new Date(tp.last_payment).toLocaleDateString() : 'Never'}</td>
                                            <td>
                                                <Button size="sm" variant="outline-primary">View</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Tab.Pane>
                    </Tab.Content>
                </Card.Body>
            </Card>

            {/* Verification Modal */}
            <Modal show={showVerifyModal} onHide={() => setShowVerifyModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {selectedItem?.type === 'profile' && 'Verify Taxpayer Profile'}
                        {selectedItem?.type === 'receipt' && 'Verify Payment Receipt'}
                        {selectedItem?.type === 'tcc' && 'Process TCC Application'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedItem && (
                        <>
                            {/* Summary Card */}
                            <Card className="bg-light mb-4">
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <p><strong>Taxpayer:</strong> {selectedItem.business_name || selectedItem.taxpayer_name}</p>
                                            <p><strong>TIN:</strong> {selectedItem.tin}</p>
                                        </Col>
                                        <Col md={6}>
                                            {selectedItem.type === 'profile' && (
                                                <>
                                                    <p><strong>Income:</strong> {formatCurrency(selectedItem.last_year_income)}</p>
                                                    <p><strong>Last Year Tax:</strong> {formatCurrency(selectedItem.last_year_tax_paid)}</p>
                                                </>
                                            )}
                                            {selectedItem.type === 'receipt' && (
                                                <>
                                                    <p><strong>Amount:</strong> {formatCurrency(selectedItem.amount)}</p>
                                                    <p><strong>Method:</strong> {selectedItem.payment_method_name}</p>
                                                </>
                                            )}
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Decision</Form.Label>
                                    <div>
                                        <Form.Check
                                            inline
                                            type="radio"
                                            label="✅ Approve"
                                            name="decision"
                                            checked={verifyAction.status === 'approved'}
                                            onChange={() => setVerifyAction({...verifyAction, status: 'approved'})}
                                        />
                                        <Form.Check
                                            inline
                                            type="radio"
                                            label="❌ Reject"
                                            name="decision"
                                            checked={verifyAction.status === 'rejected'}
                                            onChange={() => setVerifyAction({...verifyAction, status: 'rejected'})}
                                        />
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Notes / Reason</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={verifyAction.notes}
                                        onChange={(e) => setVerifyAction({...verifyAction, notes: e.target.value})}
                                        placeholder={verifyAction.status === 'rejected' ? 'Please provide reason for rejection...' : 'Optional notes'}
                                    />
                                </Form.Group>

                                {selectedItem.type === 'profile' && verifyAction.status === 'approved' && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Assign Category (Optional)</Form.Label>
                                        <Form.Select>
                                            <option value="">Use suggested category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>
                                                    Category {cat.category_code} - {cat.category_name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                )}
                            </Form>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowVerifyModal(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant={verifyAction.status === 'approved' ? 'success' : 'danger'}
                        onClick={
                            selectedItem?.type === 'profile' ? handleVerifyProfile :
                            selectedItem?.type === 'receipt' ? handleVerifyReceipt :
                            handleVerifyTCC
                        }
                    >
                        {verifyAction.status === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default EnhancedTownAdminDashboard;