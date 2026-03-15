import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, ProgressBar, Nav, Tab, Modal, Image } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TownAdminDashboard = () => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({});
    const [pendingReceipts, setPendingReceipts] = useState([]);
    const [pendingTCC, setPendingTCC] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('receipts');
    
    // Modal states
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [receiptImage, setReceiptImage] = useState(null);
    const [loadingReceipt, setLoadingReceipt] = useState(false);
    
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        console.log('Current user:', currentUser); // Debug log
        
        if (!currentUser) {
            navigate('/login');
            return;
        }
        
        if (currentUser.role !== 'town_admin') {
            alert('Access denied. Town admin role required.');
            navigate('/dashboard');
            return;
        }
        
        setUser(currentUser);
        fetchDashboardData();
        fetchTCCApplications();
        
        // Refresh every 30 seconds
        const interval = setInterval(() => {
            fetchDashboardData();
            fetchTCCApplications();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);
// Add this useEffect for debugging
useEffect(() => {
    const debugPayments = async () => {
        try {
            // Check all payments for this town
            const response = await api.get('/town-admin/debug/payments');
            console.log('🔍 Debug payments:', response.data);
        } catch (error) {
            console.error('Debug error:', error);
        }
    };
    
    if (user) {
        debugPayments();
    }
}, [user]);
   // In TownAdminDashboard.js, add this debug log
const fetchDashboardData = async () => {
    try {
        console.log('Fetching dashboard data...');
        
        const statsRes = await api.get('/town-admin/stats');
        console.log('Stats response:', statsRes.data);
        setStats(statsRes.data);
        
        const receiptsRes = await api.get('/town-admin/pending-receipts');
        console.log('Receipts response:', receiptsRes.data);
        setPendingReceipts(receiptsRes.data.receipts || []);
        
        const tccRes = await api.get('/town-admin/assigned-tcc-applications');
        console.log('TCC response:', tccRes.data);
        setPendingTCC(tccRes.data.applications || []);
        
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        console.error('Error response:', error.response?.data);
        setError('Failed to load dashboard data');
    } finally {
        setLoading(false);
    }
};

    const fetchTCCApplications = async () => {
        try {
            console.log('Fetching TCC apps for town:', user?.town_id);
            const response = await api.get('/town-admin/assigned-tcc-applications');
            console.log('TCC apps response:', response.data);
            setPendingTCC(response.data.applications || []);
        } catch (error) {
            console.error('Error fetching TCC applications:', error);
            console.error('Error response:', error.response);
        } finally {
            setLoading(false);
        }
    };

    const handleViewReceipt = async (receipt) => {
        try {
            setSelectedReceipt(receipt);
            setLoadingReceipt(true);
            setShowReceiptModal(true);
            
            // Construct the full URL for the receipt
            let receiptUrl = receipt.receipt_url;
            
            // If no receipt_url, try to construct from file_path
            if (!receiptUrl && receipt.receipt_file_path) {
                // Clean up the file path
                const filePath = receipt.receipt_file_path.replace(/\\/g, '/');
                receiptUrl = `http://localhost:5000/${filePath}`;
            }
            
            console.log('Loading receipt from:', receiptUrl);
            
            // Fetch the receipt file
            const response = await fetch(receiptUrl);
            if (!response.ok) {
                throw new Error('Failed to load receipt');
            }
            
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            setReceiptImage(imageUrl);
            
        } catch (error) {
            console.error('Error loading receipt:', error);
            alert('Failed to load receipt. Please check if the file exists.');
        } finally {
            setLoadingReceipt(false);
        }
    };

    const handleCloseModal = () => {
        setShowReceiptModal(false);
        setSelectedReceipt(null);
        setReceiptImage(null);
    };

    // FIXED: Corrected endpoint from '/town-admin/review-receipt/' to '/town-admin/receipt-review/'
    const handleApproveReceipt = async (receiptId) => {
        try {
            await api.post(`/town-admin/receipt-review/${receiptId}/approve`, {
                staff_notes: 'Receipt approved'
            });
            // Refresh data after approval
            await fetchDashboardData();
            alert('✅ Receipt approved successfully!');
            handleCloseModal();
        } catch (error) {
            console.error('Error approving receipt:', error);
            alert('Failed to approve receipt: ' + (error.response?.data?.error || error.message));
        }
    };

    // FIXED: Corrected endpoint from '/town-admin/review-receipt/' to '/town-admin/receipt-review/'
    const handleRejectReceipt = async (receiptId) => {
        const reason = prompt('Please enter reason for rejection:');
        if (!reason) return;
        
        try {
            await api.post(`/town-admin/receipt-review/${receiptId}/reject`, {
                staff_notes: reason
            });
            // Refresh data after rejection
            await fetchDashboardData();
            alert('❌ Receipt rejected successfully!');
            handleCloseModal();
        } catch (error) {
            console.error('Error rejecting receipt:', error);
            alert('Failed to reject receipt: ' + (error.response?.data?.error || error.message));
        }
    };

    const getStatusVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'success';
            case 'rejected': return 'danger';
            case 'pending': return 'warning';
            case 'under_review': return 'info';
            case 'processing': return 'info';
            default: return 'secondary';
        }
    };

    const isImageFile = (filename) => {
        if (!filename) return false;
        const ext = filename.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext);
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
                            <h2>🏛️ Town Admin Dashboard</h2>
                            <p className="text-muted mb-0">
                                {user?.full_name} | Town ID: {user?.town_id}
                            </p>
                        </div>
                        <div>
                            <Badge bg="info" className="fs-6 me-2">
                                Last Updated: {new Date().toLocaleTimeString()}
                            </Badge>
                            <Button 
                                variant="outline-primary" 
                                size="sm" 
                                onClick={() => {
                                    fetchDashboardData();
                                    fetchTCCApplications();
                                }}
                            >
                                Refresh
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Key Metrics Cards */}
            <Row className="mb-4">
                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-primary h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted mb-2">Monthly Target</h6>
                                    <h3 className="text-primary">ETB {stats.monthly_target?.toLocaleString() || 0}</h3>
                                </div>
                                <div className="bg-primary bg-opacity-10 p-3 rounded">
                                    <i className="fas fa-bullseye fa-2x text-primary"></i>
                                </div>
                            </div>
                            <ProgressBar 
                                now={stats.target_percentage || 0} 
                                label={`${stats.target_percentage || 0}%`}
                                variant="primary"
                                className="mt-3"
                            />
                        </Card.Body>
                    </Card>
                </Col>

                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-success h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted mb-2">Collected This Month</h6>
                                    <h3 className="text-success">ETB {stats.monthly_collected?.toLocaleString() || 0}</h3>
                                </div>
                                <div className="bg-success bg-opacity-10 p-3 rounded">
                                    <i className="fas fa-coins fa-2x text-success"></i>
                                </div>
                            </div>
                            <small className="text-muted">
                                vs last month: {stats.monthly_growth > 0 ? '+' : ''}{stats.monthly_growth || 0}%
                            </small>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-warning h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted mb-2">Pending Reviews</h6>
                                    <h3 className="text-warning">
                                        {(pendingReceipts.length + pendingTCC.length) || 0}
                                    </h3>
                                </div>
                                <div className="bg-warning bg-opacity-10 p-3 rounded">
                                    <i className="fas fa-clock fa-2x text-warning"></i>
                                </div>
                            </div>
                            <small className="text-muted">
                                Receipts: {pendingReceipts.length} | TCC: {pendingTCC.length}
                            </small>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-info h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-muted mb-2">Total Taxpayers</h6>
                                    <h3 className="text-info">{stats.total_taxpayers || 0}</h3>
                                </div>
                                <div className="bg-info bg-opacity-10 p-3 rounded">
                                    <i className="fas fa-users fa-2x text-info"></i>
                                </div>
                            </div>
                            <small className="text-muted">
                                Active: {stats.active_taxpayers || 0}
                            </small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Main Tabs */}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <Nav variant="tabs" activeKey={activeTab} onSelect={setActiveTab}>
                        <Nav.Item>
                            <Nav.Link eventKey="receipts">
                                📄 Pending Receipts ({pendingReceipts.length})
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="tcc">
                                📋 Pending TCC Applications ({pendingTCC.length})
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Card.Header>
                <Card.Body>
                    <Tab.Content>
                        {/* Pending Receipts Tab */}
                        <Tab.Pane active={activeTab === 'receipts'}>
                            {pendingReceipts.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                                    <p className="text-muted">No pending receipts! All caught up.</p>
                                </div>
                            ) : (
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>Taxpayer</th>
                                            <th>TIN</th>
                                            <th>Tax Type</th>
                                            <th>Amount</th>
                                            <th>Date</th>
                                            <th>Status</th>
                                            <th>Receipt</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingReceipts.map(receipt => (
                                            <tr key={receipt.id}>
                                                <td>
                                                    <strong>{receipt.taxpayer_name}</strong>
                                                    <br />
                                                    <small className="text-muted">{receipt.taxpayer_email}</small>
                                                </td>
                                                <td>{receipt.tin}</td>
                                                <td>{receipt.tax_type_name}</td>
                                                <td>
                                                    <strong>ETB {receipt.amount?.toLocaleString()}</strong>
                                                </td>
                                                <td>{new Date(receipt.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <Badge bg={getStatusVariant(receipt.status)}>
                                                        {receipt.status}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button 
                                                        variant="outline-info" 
                                                        size="sm"
                                                        onClick={() => handleViewReceipt(receipt)}
                                                    >
                                                        View Receipt
                                                    </Button>
                                                </td>
                                                <td>
                                                    <Button 
                                                        size="sm" 
                                                        variant="success"
                                                        className="me-2"
                                                        onClick={() => handleApproveReceipt(receipt.id)}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="danger"
                                                        onClick={() => handleRejectReceipt(receipt.id)}
                                                    >
                                                        Reject
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Tab.Pane>

                        {/* Pending TCC Applications Tab */}
                        <Tab.Pane active={activeTab === 'tcc'}>
                            {pendingTCC.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                                    <p className="text-muted">No pending TCC applications! All caught up.</p>
                                </div>
                            ) : (
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>Taxpayer</th>
                                            <th>TIN</th>
                                            <th>Business</th>
                                            <th>Submitted</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingTCC.map(app => (
                                            <tr key={app.id}>
                                                <td>
                                                    <strong>{app.taxpayer_name}</strong>
                                                    <br />
                                                    <small className="text-muted">{app.email}</small>
                                                </td>
                                                <td>{app.tin}</td>
                                                <td>{app.business_name || 'N/A'}</td>
                                                <td>{new Date(app.submitted_at).toLocaleDateString()}</td>
                                                <td>
                                                    <Badge bg="warning">Pending Review</Badge>
                                                </td>
                                                <td>
                                                    <Button 
                                                        size="sm" 
                                                        variant="primary"
                                                        as={Link}
                                                        to={`/town/tcc-review/${app.id}`}
                                                    >
                                                        Review Application
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Tab.Pane>
                    </Tab.Content>
                </Card.Body>
            </Card>

            {/* Receipt View Modal */}
            <Modal show={showReceiptModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>
                        Payment Receipt - {selectedReceipt?.taxpayer_name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    {loadingReceipt ? (
                        <div className="py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3">Loading receipt...</p>
                        </div>
                    ) : receiptImage ? (
                        isImageFile(selectedReceipt?.receipt_file_path) ? (
                            <Image 
                                src={receiptImage} 
                                alt="Payment Receipt" 
                                fluid 
                                style={{ maxHeight: '500px', border: '1px solid #ddd', borderRadius: '5px' }}
                            />
                        ) : (
                            <div>
                                <i className="fas fa-file-pdf fa-4x text-danger mb-3"></i>
                                <p>PDF Receipt Document</p>
                                <Button 
                                    variant="danger"
                                    href={receiptImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Download PDF
                                </Button>
                            </div>
                        )
                    ) : (
                        <Alert variant="warning">
                            No receipt image available. The file may be missing.
                        </Alert>
                    )}
                    
                    {selectedReceipt && (
                        <div className="mt-4 text-start">
                            <h6>Receipt Details:</h6>
                            <p><strong>Taxpayer:</strong> {selectedReceipt.taxpayer_name}</p>
                            <p><strong>TIN:</strong> {selectedReceipt.tin}</p>
                            <p><strong>Amount:</strong> ETB {selectedReceipt.amount?.toLocaleString()}</p>
                            <p><strong>Tax Type:</strong> {selectedReceipt.tax_type_name}</p>
                            <p><strong>Submitted:</strong> {new Date(selectedReceipt.created_at).toLocaleString()}</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="success" onClick={() => {
                        handleApproveReceipt(selectedReceipt?.id);
                    }}>
                        Approve Payment
                    </Button>
                    <Button variant="danger" onClick={() => {
                        handleRejectReceipt(selectedReceipt?.id);
                    }}>
                        Reject Payment
                    </Button>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default TownAdminDashboard;