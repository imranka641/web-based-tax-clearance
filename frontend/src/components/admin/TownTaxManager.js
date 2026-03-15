import React, { useState, useEffect } from 'react';
import {
    Container, Row, Col, Card, Table, Button, Form,
    Modal, Alert, Spinner, Badge, Tabs, Tab
} from 'react-bootstrap';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const TownTaxManager = () => {
    const [user, setUser] = useState(null);
    const [categories, setCategories] = useState([]);
    const [pendingVerifications, setPendingVerifications] = useState([]);
    const [taxpayers, setTaxpayers] = useState([]);
    const [statistics, setStatistics] = useState({
        overview: {
            total_taxpayers: 0,
            verified_taxpayers: 0,
            pending_taxpayers: 0,
            total_collected: 0,
            total_overdue: 0,
            category_count: 0
        },
        category_breakdown: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('categories');
    const [processing, setProcessing] = useState(false);
    
    // Document preview states
    const [documentPreviews, setDocumentPreviews] = useState({
        tax_certificate: null,
        business_license: null,
        financial_statement: null
    });
    const [loadingDocs, setLoadingDocs] = useState(false);
    
    const { t } = useLanguage();

    const [categoryForm, setCategoryForm] = useState({
        id: null,
        category_code: '',
        category_name: '',
        min_income: '',
        max_income: '',
        formula_type: 'percentage_of_last_year',
        base_rate: '20',
        multiplier: '1.15',
        fixed_amount: '0',
        requires_review: true,
        auto_approve_threshold: '30'
    });

    const [verifyForm, setVerifyForm] = useState({
        status: 'verified',
        notes: '',
        override_category: ''
    });

    useEffect(() => {
        const currentUser = getUser();
        console.log('Current user:', currentUser);
        
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }
        
        // Allow both town_admin and super_admin to access
        if (currentUser.role !== 'town_admin' && !currentUser.is_super_admin) {
            window.location.href = '/login';
            return;
        }
        
        setUser(currentUser);
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            console.log('Fetching town tax manager data...');
            
            // Fetch categories
            const catRes = await api.get('/town-tax/categories').catch(err => {
                console.error('Categories fetch error:', err);
                return { data: { categories: [] } };
            });
            
            // Fetch pending verifications
            const pendingRes = await api.get('/town-tax/pending-verifications').catch(err => {
                console.error('Pending verifications fetch error:', err);
                return { data: { pending: [] } };
            });
            
            // Fetch taxpayers
            const taxRes = await api.get('/town-tax/taxpayers').catch(err => {
                console.error('Taxpayers fetch error:', err);
                return { data: { taxpayers: [] } };
            });
            
            // Fetch statistics
            const statsRes = await api.get('/town-tax/statistics').catch(err => {
                console.error('Statistics fetch error:', err);
                return { 
                    data: { 
                        overview: {
                            total_taxpayers: 0,
                            verified_taxpayers: 0,
                            pending_taxpayers: 0,
                            total_collected: 0,
                            total_overdue: 0,
                            category_count: 0
                        },
                        category_breakdown: []
                    } 
                };
            });

            setCategories(catRes.data.categories || []);
            setPendingVerifications(pendingRes.data.pending || []);
            setTaxpayers(taxRes.data.taxpayers || []);
            setStatistics(statsRes.data || {
                overview: {
                    total_taxpayers: 0,
                    verified_taxpayers: 0,
                    pending_taxpayers: 0,
                    total_collected: 0,
                    total_overdue: 0,
                    category_count: 0
                },
                category_breakdown: []
            });
            
            console.log('Data fetched successfully');
        } catch (error) {
            console.error('Fetch data error:', error);
            setError('Failed to load data: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    // Fetch documents function
    const fetchDocuments = async (profileId) => {
        setLoadingDocs(true);
        try {
            const response = await api.get(`/town-tax/profile-documents/${profileId}`);
            setDocumentPreviews(response.data.documents);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.post('/town-tax/categories', categoryForm);
            setShowCategoryModal(false);
            resetCategoryForm();
            fetchData();
            alert('Category saved successfully!');
        } catch (error) {
            console.error('Save category error:', error);
            setError('Failed to save category: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const resetCategoryForm = () => {
        setCategoryForm({
            id: null,
            category_code: '',
            category_name: '',
            min_income: '',
            max_income: '',
            formula_type: 'percentage_of_last_year',
            base_rate: '20',
            multiplier: '1.15',
            fixed_amount: '0',
            requires_review: true,
            auto_approve_threshold: '30'
        });
    };

    const handleEditCategory = (category) => {
        setCategoryForm({
            id: category.id,
            category_code: category.category_code,
            category_name: category.category_name,
            min_income: category.min_income,
            max_income: category.max_income || '',
            formula_type: category.formula_type,
            base_rate: category.base_rate || '20',
            multiplier: category.multiplier || '1.15',
            fixed_amount: category.fixed_amount || '0',
            requires_review: category.requires_review,
            auto_approve_threshold: category.auto_approve_threshold || '30'
        });
        setShowCategoryModal(true);
    };

    // Updated function that opens the verify modal and fetches documents
    const openVerifyModal = (profile) => {
        setSelectedProfile(profile);
        setShowVerifyModal(true);
        fetchDocuments(profile.id); // Fetch documents when modal opens
    };

    const handleVerifyProfile = async (e) => {
        e.preventDefault();
        if (!selectedProfile) return;
        
        try {
            setProcessing(true);
            await api.post(`/town-tax/verify-profile/${selectedProfile.id}`, verifyForm);
            setShowVerifyModal(false);
            setSelectedProfile(null);
            setVerifyForm({
                status: 'verified',
                notes: '',
                override_category: ''
            });
            fetchData();
            alert('Profile verified successfully!');
        } catch (error) {
            console.error('Verify profile error:', error);
            setError('Failed to verify profile: ' + (error.response?.data?.error || error.message));
        } finally {
            setProcessing(false);
        }
    };

    const getFormulaDisplay = (category) => {
        if (!category) return 'N/A';
        
        switch(category.formula_type) {
            case 'percentage_of_last_year':
                return `${parseFloat(category.multiplier || 1).toFixed(2)}x last year tax`;
            case 'percentage_of_income':
                return `${category.base_rate || 0}% of income`;
            case 'fixed_amount':
                return `Fixed ETB ${parseFloat(category.fixed_amount || 0).toLocaleString()}`;
            case 'mixed':
                return `ETB ${parseFloat(category.fixed_amount || 0).toLocaleString()} + ${category.base_rate || 0}%`;
            default:
                return category.formula_type;
        }
    };

    if (loading && !categories.length) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading Town Tax Manager...</p>
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
                            <h2 className="text-primary">🏛️ Town Tax Manager</h2>
                            <p className="text-muted mb-0">
                                {user?.full_name || 'Admin'} | {user?.town_name || 'Your Town'} Administration
                            </p>
                        </div>
                        <Button 
                            variant="primary" 
                            onClick={() => {
                                resetCategoryForm();
                                setShowCategoryModal(true);
                            }}
                        >
                            ➕ Add New Category
                        </Button>
                    </div>
                </Col>
            </Row>

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            {/* Statistics Cards */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="border-primary shadow-sm">
                        <Card.Body>
                            <h6 className="text-muted">Total Taxpayers</h6>
                            <h3 className="text-primary">{statistics.overview?.total_taxpayers || 0}</h3>
                            <small>Verified: {statistics.overview?.verified_taxpayers || 0}</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-success shadow-sm">
                        <Card.Body>
                            <h6 className="text-muted">Total Collected</h6>
                            <h3 className="text-success">ETB {(statistics.overview?.total_collected || 0).toLocaleString()}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-warning shadow-sm">
                        <Card.Body>
                            <h6 className="text-muted">Pending Review</h6>
                            <h3 className="text-warning">{pendingVerifications.length}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-info shadow-sm">
                        <Card.Body>
                            <h6 className="text-muted">Categories</h6>
                            <h3 className="text-info">{categories.length}</h3>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Main Tabs */}
            <Card className="shadow">
                <Card.Header className="bg-light">
                    <Tabs 
                        activeKey={activeTab} 
                        onSelect={(k) => setActiveTab(k)}
                        className="mb-3"
                    >
                        <Tab eventKey="categories" title={`📋 Tax Categories (${categories.length})`}>
                            <div className="mt-3">
                                {categories.length === 0 ? (
                                    <Alert variant="info">
                                        No categories found. Click "Add New Category" to create one.
                                    </Alert>
                                ) : (
                                    <Table responsive striped hover>
                                        <thead>
                                            <tr>
                                                <th>Category</th>
                                                <th>Income Range (ETB)</th>
                                                <th>Formula</th>
                                                <th>Review Required</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categories.map(cat => (
                                                <tr key={cat.id}>
                                                    <td>
                                                        <Badge bg="primary" className="me-2">{cat.category_code}</Badge>
                                                        {cat.category_name}
                                                    </td>
                                                    <td>
                                                        {parseFloat(cat.min_income).toLocaleString()}
                                                        {cat.max_income ? 
                                                            ` - ${parseFloat(cat.max_income).toLocaleString()}` : 
                                                            ' +'
                                                        }
                                                    </td>
                                                    <td>{getFormulaDisplay(cat)}</td>
                                                    <td>
                                                        <Badge bg={cat.requires_review ? 'warning' : 'success'}>
                                                            {cat.requires_review ? 'Required' : 'Auto'}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline-primary"
                                                            onClick={() => handleEditCategory(cat)}
                                                        >
                                                            Edit
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </div>
                        </Tab>

                        <Tab eventKey="pending" title={`⏳ Pending Reviews (${pendingVerifications.length})`}>
                            <div className="mt-3">
                                {pendingVerifications.length === 0 ? (
                                    <Alert variant="success">
                                        No pending verifications! All caught up.
                                    </Alert>
                                ) : (
                                    <Table responsive striped hover>
                                        <thead>
                                            <tr>
                                                <th>Business</th>
                                                <th>Owner</th>
                                                <th>Income (ETB)</th>
                                                <th>Last Year Tax</th>
                                                <th>Suggested Category</th>
                                                <th>Submitted</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingVerifications.map(p => (
                                                <tr key={p.id}>
                                                    <td><strong>{p.business_name}</strong></td>
                                                    <td>
                                                        {p.full_name}<br/>
                                                        <small className="text-muted">{p.tin}</small>
                                                    </td>
                                                    <td>{parseFloat(p.last_year_income || 0).toLocaleString()}</td>
                                                    <td>{parseFloat(p.last_year_tax_paid || 0).toLocaleString()}</td>
                                                    <td>
                                                        <Badge bg="info">{p.category_code || 'N/A'}</Badge>
                                                    </td>
                                                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                                    <td>
                                                        <Button 
                                                            size="sm" 
                                                            variant="success"
                                                            onClick={() => openVerifyModal(p)}
                                                        >
                                                            Review
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </div>
                        </Tab>

                        <Tab eventKey="taxpayers" title={`👥 Taxpayers (${taxpayers.length})`}>
                            <div className="mt-3">
                                {taxpayers.length === 0 ? (
                                    <Alert variant="info">No taxpayers found.</Alert>
                                ) : (
                                    <Table responsive striped hover>
                                        <thead>
                                            <tr>
                                                <th>Business</th>
                                                <th>Category</th>
                                                <th>Last Year Income</th>
                                                <th>Current Tax</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {taxpayers.map(t => (
                                                <tr key={t.id}>
                                                    <td>
                                                        <strong>{t.business_name}</strong><br/>
                                                        <small>{t.tin}</small>
                                                    </td>
                                                    <td>
                                                        <Badge bg="primary">{t.category_code || 'N/A'}</Badge>
                                                    </td>
                                                    <td>ETB {(t.last_year_income || 0).toLocaleString()}</td>
                                                    <td>ETB {(t.current_year_tax || 0).toLocaleString()}</td>
                                                    <td>
                                                        <Badge bg={t.payment_status === 'paid' ? 'success' : 'warning'}>
                                                            {t.payment_status || 'pending'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </div>
                        </Tab>

                        <Tab eventKey="reports" title="📊 Reports">
                            <div className="mt-3">
                                <Row>
                                    <Col md={6}>
                                        <Card className="mb-3">
                                            <Card.Header>Category Breakdown</Card.Header>
                                            <Card.Body>
                                                {statistics.category_breakdown?.length === 0 ? (
                                                    <p className="text-muted">No data available</p>
                                                ) : (
                                                    <Table>
                                                        <thead>
                                                            <tr>
                                                                <th>Category</th>
                                                                <th>Taxpayers</th>
                                                                <th>Total Tax</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {statistics.category_breakdown?.map((c, idx) => (
                                                                <tr key={idx}>
                                                                    <td><Badge bg="info">{c.category_code}</Badge></td>
                                                                    <td>{c.taxpayer_count || 0}</td>
                                                                    <td>ETB {(c.total_tax || 0).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card>
                                            <Card.Header>Quick Actions</Card.Header>
                                            <Card.Body>
                                                <div className="d-grid gap-2">
                                                    <Button variant="outline-primary" onClick={fetchData}>
                                                        Refresh Data
                                                    </Button>
                                                    <Button variant="outline-success">
                                                        Generate Monthly Report
                                                    </Button>
                                                    <Button variant="outline-info">
                                                        Export Taxpayer List
                                                    </Button>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </div>
                        </Tab>
                    </Tabs>
                </Card.Header>
            </Card>

            {/* Category Modal */}
            <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{categoryForm.id ? 'Edit Category' : 'Create New Category'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveCategory}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Category Code *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={categoryForm.category_code}
                                        onChange={(e) => setCategoryForm({...categoryForm, category_code: e.target.value})}
                                        placeholder="e.g., A, B, C"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Category Name *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={categoryForm.category_name}
                                        onChange={(e) => setCategoryForm({...categoryForm, category_name: e.target.value})}
                                        placeholder="e.g., Large Enterprises"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Minimum Income (ETB) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={categoryForm.min_income}
                                        onChange={(e) => setCategoryForm({...categoryForm, min_income: e.target.value})}
                                        placeholder="0"
                                        required
                                        min="0"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Maximum Income (ETB)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={categoryForm.max_income}
                                        onChange={(e) => setCategoryForm({...categoryForm, max_income: e.target.value})}
                                        placeholder="Leave empty for unlimited"
                                        min="0"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Formula Type *</Form.Label>
                            <Form.Select
                                value={categoryForm.formula_type}
                                onChange={(e) => setCategoryForm({...categoryForm, formula_type: e.target.value})}
                                required
                            >
                                <option value="percentage_of_last_year">Percentage of Last Year's Tax</option>
                                <option value="percentage_of_income">Percentage of Income</option>
                                <option value="fixed_amount">Fixed Amount</option>
                                <option value="mixed">Mixed (Base + Percentage)</option>
                            </Form.Select>
                        </Form.Group>

                        {categoryForm.formula_type === 'percentage_of_last_year' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Multiplier (e.g., 1.2 for 120%) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.01"
                                    value={categoryForm.multiplier}
                                    onChange={(e) => setCategoryForm({...categoryForm, multiplier: e.target.value})}
                                    required
                                />
                                <Form.Text>Example: 1.15 = 115% of last year's tax</Form.Text>
                            </Form.Group>
                        )}

                        {categoryForm.formula_type === 'percentage_of_income' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Percentage Rate (%) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.1"
                                    value={categoryForm.base_rate}
                                    onChange={(e) => setCategoryForm({...categoryForm, base_rate: e.target.value})}
                                    required
                                />
                            </Form.Group>
                        )}

                        {(categoryForm.formula_type === 'fixed_amount' || categoryForm.formula_type === 'mixed') && (
                            <Form.Group className="mb-3">
                                <Form.Label>Fixed Amount (ETB) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={categoryForm.fixed_amount}
                                    onChange={(e) => setCategoryForm({...categoryForm, fixed_amount: e.target.value})}
                                    required
                                    min="0"
                                />
                            </Form.Group>
                        )}

                        {categoryForm.formula_type === 'mixed' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Additional Percentage Rate (%) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.1"
                                    value={categoryForm.base_rate}
                                    onChange={(e) => setCategoryForm({...categoryForm, base_rate: e.target.value})}
                                    required
                                />
                            </Form.Group>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Requires Manual Review"
                                checked={categoryForm.requires_review}
                                onChange={(e) => setCategoryForm({...categoryForm, requires_review: e.target.checked})}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Auto-Approve Threshold (%)</Form.Label>
                            <Form.Control
                                type="number"
                                value={categoryForm.auto_approve_threshold}
                                onChange={(e) => setCategoryForm({...categoryForm, auto_approve_threshold: e.target.value})}
                            />
                            <Form.Text>Auto-approve if tax change is less than this percentage</Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Category'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Verification Modal with Document Previews */}
            <Modal show={showVerifyModal} onHide={() => setShowVerifyModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Verify Taxpayer Profile</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleVerifyProfile}>
                    <Modal.Body>
                        {selectedProfile && (
                            <>
                                {/* Taxpayer Information */}
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Card className="bg-light">
                                            <Card.Body>
                                                <h6>Business Information</h6>
                                                <p><strong>Business:</strong> {selectedProfile.business_name || 'self employed'}</p>
                                                <p><strong>Owner:</strong> {selectedProfile.full_name}</p>
                                                <p><strong>Email:</strong> {selectedProfile.email}</p>
                                                <p><strong>TIN:</strong> {selectedProfile.tin}</p>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card className="bg-light">
                                            <Card.Body>
                                                <h6>Financial Information</h6>
                                                <p><strong>Income:</strong> ETB {parseFloat(selectedProfile.last_year_income || 0).toLocaleString()}</p>
                                                <p><strong>Last Year Tax:</strong> ETB {parseFloat(selectedProfile.last_year_tax_paid || 0).toLocaleString()}</p>
                                                <p><strong>Suggested Category:</strong> 
                                                    <Badge bg={selectedProfile.assigned_category ? 'info' : 'warning'} className="ms-2">
                                                        {selectedProfile.assigned_category || 'N/A'}
                                                    </Badge>
                                                </p>
                                                <p><strong>Business Type:</strong> {selectedProfile.business_type || 'Not specified'}</p>
                                                <p><strong>Employees:</strong> {selectedProfile.employee_count || 0}</p>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>

                                {/* Documents Section */}
                                <Card className="mb-3">
                                    <Card.Header className="bg-primary text-white">
                                        <h6 className="mb-0">📎 Uploaded Documents</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        {loadingDocs ? (
                                            <div className="text-center">
                                                <Spinner animation="border" size="sm" />
                                                <p className="mt-2">Loading documents...</p>
                                            </div>
                                        ) : (
                                            <Row>
                                                <Col md={4}>
                                                    <Card className="text-center h-100">
                                                        <Card.Body>
                                                            <div className="mb-2">
                                                                {documentPreviews.tax_certificate ? (
                                                                    <>
                                                                        <i className="fas fa-file-pdf fa-3x text-danger mb-2"></i>
                                                                        <p className="mb-1">Tax Certificate</p>
                                                                        <Button 
                                                                            size="sm" 
                                                                            variant="outline-primary"
                                                                            href={`http://localhost:5000/${documentPreviews.tax_certificate}`}
                                                                            target="_blank"
                                                                        >
                                                                            View Document
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <i className="fas fa-file fa-3x text-muted mb-2"></i>
                                                                        <p className="text-muted">No document uploaded</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                                <Col md={4}>
                                                    <Card className="text-center h-100">
                                                        <Card.Body>
                                                            <div className="mb-2">
                                                                {documentPreviews.business_license ? (
                                                                    <>
                                                                        <i className="fas fa-file-pdf fa-3x text-danger mb-2"></i>
                                                                        <p className="mb-1">Business License</p>
                                                                        <Button 
                                                                            size="sm" 
                                                                            variant="outline-primary"
                                                                            href={`http://localhost:5000/${documentPreviews.business_license}`}
                                                                            target="_blank"
                                                                        >
                                                                            View Document
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <i className="fas fa-file fa-3x text-muted mb-2"></i>
                                                                        <p className="text-muted">No document uploaded</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                                <Col md={4}>
                                                    <Card className="text-center h-100">
                                                        <Card.Body>
                                                            <div className="mb-2">
                                                                {documentPreviews.financial_statement ? (
                                                                    <>
                                                                        <i className="fas fa-file-pdf fa-3x text-danger mb-2"></i>
                                                                        <p className="mb-1">Financial Statement</p>
                                                                        <Button 
                                                                            size="sm" 
                                                                            variant="outline-primary"
                                                                            href={`http://localhost:5000/${documentPreviews.financial_statement}`}
                                                                            target="_blank"
                                                                        >
                                                                            View Document
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <i className="fas fa-file fa-3x text-muted mb-2"></i>
                                                                        <p className="text-muted">No document uploaded</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            </Row>
                                        )}
                                    </Card.Body>
                                </Card>

                                {/* Decision Section */}
                                <Card className="mb-3">
                                    <Card.Header className="bg-warning text-dark">
                                        <h6 className="mb-0">⚖️ Make Decision</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Decision *</Form.Label>
                                            <Form.Select
                                                value={verifyForm.status}
                                                onChange={(e) => setVerifyForm({...verifyForm, status: e.target.value})}
                                                required
                                            >
                                                <option value="verified">✅ Verify & Approve</option>
                                                <option value="rejected">❌ Reject</option>
                                                <option value="needs_review">🔄 Needs More Information</option>
                                            </Form.Select>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Override Category (Optional)</Form.Label>
                                            <Form.Select
                                                value={verifyForm.override_category}
                                                onChange={(e) => setVerifyForm({...verifyForm, override_category: e.target.value})}
                                            >
                                                <option value="">Use Suggested Category</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.category_code} - {cat.category_name}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Notes</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={verifyForm.notes}
                                                onChange={(e) => setVerifyForm({...verifyForm, notes: e.target.value})}
                                                placeholder="Add verification notes or rejection reason..."
                                            />
                                        </Form.Group>
                                    </Card.Body>
                                </Card>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowVerifyModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={processing}>
                            {processing ? 'Processing...' : 'Submit Decision'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default TownTaxManager;