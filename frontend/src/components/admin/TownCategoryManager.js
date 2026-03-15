import React, { useState, useEffect } from 'react';
import {
    Container, Row, Col, Card, Table, Button, Form,
    Modal, Alert, Spinner, Badge, Tabs, Tab
} from 'react-bootstrap';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const TownCategoryManager = () => {
    const [user, setUser] = useState(null);
    const [categories, setCategories] = useState([]);
    const [pendingVerifications, setPendingVerifications] = useState([]);
    const [taxpayers, setTaxpayers] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const { t } = useLanguage();

    const [categoryForm, setCategoryForm] = useState({
        category_code: '',
        category_name: '',
        min_income: '',
        max_income: '',
        formula_type: 'percentage_of_last_year',
        base_rate: '',
        multiplier: '1.15',
        fixed_amount: '',
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
        if (!currentUser || currentUser.role !== 'town_admin') {
            window.location.href = '/login';
            return;
        }
        setUser(currentUser);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [catRes, pendingRes, taxRes, statsRes] = await Promise.all([
                api.get('/town-tax/categories'),
                api.get('/town-tax/pending-verifications'),
                api.get('/town-tax/taxpayers'),
                api.get('/town-tax/statistics')
            ]);

            setCategories(catRes.data.categories);
            setPendingVerifications(pendingRes.data.pending);
            setTaxpayers(taxRes.data.taxpayers);
            setStatistics(statsRes.data);
        } catch (error) {
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        try {
            await api.post('/town-tax/categories', categoryForm);
            setShowCategoryModal(false);
            setCategoryForm({
                category_code: '',
                category_name: '',
                min_income: '',
                max_income: '',
                formula_type: 'percentage_of_last_year',
                base_rate: '',
                multiplier: '1.15',
                fixed_amount: '',
                requires_review: true,
                auto_approve_threshold: '30'
            });
            fetchData();
        } catch (error) {
            setError('Failed to save category');
        }
    };

    const handleVerifyProfile = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/town-tax/verify-profile/${selectedProfile.id}`, verifyForm);
            setShowVerifyModal(false);
            setSelectedProfile(null);
            setVerifyForm({
                status: 'verified',
                notes: '',
                override_category: ''
            });
            fetchData();
        } catch (error) {
            setError('Failed to verify profile');
        }
    };

    const getFormulaDisplay = (category) => {
        switch(category.formula_type) {
            case 'percentage_of_last_year':
                return `${category.multiplier}x last year tax`;
            case 'percentage_of_income':
                return `${category.base_rate}% of income`;
            case 'fixed_amount':
                return `Fixed ETB ${category.fixed_amount}`;
            case 'mixed':
                return `ETB ${category.fixed_amount} + ${category.base_rate}%`;
            default:
                return category.formula_type;
        }
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
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>🏛️ Town Tax Manager</h2>
                            <p className="text-muted mb-0">
                                {user?.full_name} | {user?.town_name} Town
                            </p>
                        </div>
                        <Button 
                            variant="primary" 
                            onClick={() => setShowCategoryModal(true)}
                        >
                            ➕ Add/Edit Category
                        </Button>
                    </div>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Statistics Cards */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="border-primary">
                        <Card.Body>
                            <h6 className="text-muted">Total Taxpayers</h6>
                            <h3 className="text-primary">{statistics.overview?.total_taxpayers || 0}</h3>
                            <small>Verified: {statistics.overview?.verified_taxpayers || 0}</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-success">
                        <Card.Body>
                            <h6 className="text-muted">Total Collected</h6>
                            <h3 className="text-success">ETB {statistics.overview?.total_collected?.toLocaleString() || 0}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-warning">
                        <Card.Body>
                            <h6 className="text-muted">Pending Review</h6>
                            <h3 className="text-warning">{pendingVerifications.length}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-info">
                        <Card.Body>
                            <h6 className="text-muted">Categories</h6>
                            <h3 className="text-info">{statistics.category_breakdown?.length || 0}</h3>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Main Tabs */}
            <Card className="shadow">
                <Card.Header>
                    <Tabs defaultActiveKey="categories" id="tax-manager-tabs">
                        <Tab eventKey="categories" title="📋 Tax Categories">
                            <Table responsive striped hover className="mt-3">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Income Range</th>
                                        <th>Formula</th>
                                        <th>Review</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(cat => (
                                        <tr key={cat.id}>
                                            <td>
                                                <Badge bg="primary">{cat.category_code}</Badge>
                                                <br />
                                                <small>{cat.category_name}</small>
                                            </td>
                                            <td>
                                                ETB {cat.min_income?.toLocaleString()}
                                                {cat.max_income ? ` - ${cat.max_income.toLocaleString()}` : '+'}
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
                                                    onClick={() => {
                                                        setCategoryForm(cat);
                                                        setShowCategoryModal(true);
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Tab>

                        <Tab eventKey="pending" title={`⏳ Pending Reviews (${pendingVerifications.length})`}>
                            <Table responsive striped hover className="mt-3">
                                <thead>
                                    <tr>
                                        <th>Business</th>
                                        <th>Owner</th>
                                        <th>Income</th>
                                        <th>Last Year Tax</th>
                                        <th>Suggested Category</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingVerifications.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.business_name}</td>
                                            <td>{p.full_name}<br/><small>{p.tin}</small></td>
                                            <td>ETB {p.last_year_income?.toLocaleString()}</td>
                                            <td>ETB {p.last_year_tax_paid?.toLocaleString()}</td>
                                            <td>
                                                <Badge bg="info">{p.category_code}</Badge>
                                            </td>
                                            <td>
                                                <Button 
                                                    size="sm" 
                                                    variant="success"
                                                    onClick={() => {
                                                        setSelectedProfile(p);
                                                        setShowVerifyModal(true);
                                                    }}
                                                >
                                                    Review
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Tab>

                        <Tab eventKey="taxpayers" title="👥 Taxpayers">
                            <Table responsive striped hover className="mt-3">
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
                                                {t.business_name}<br/>
                                                <small>{t.tin}</small>
                                            </td>
                                            <td>
                                                <Badge bg="primary">{t.category_code}</Badge>
                                            </td>
                                            <td>ETB {t.last_year_income?.toLocaleString()}</td>
                                            <td>ETB {t.current_year_tax?.toLocaleString()}</td>
                                            <td>
                                                <Badge bg={t.payment_status === 'paid' ? 'success' : 'warning'}>
                                                    {t.payment_status || 'pending'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Tab>

                        <Tab eventKey="reports" title="📊 Reports">
                            <Row className="mt-3">
                                <Col md={6}>
                                    <Card>
                                        <Card.Header>Category Breakdown</Card.Header>
                                        <Card.Body>
                                            <Table>
                                                <thead>
                                                    <tr>
                                                        <th>Category</th>
                                                        <th>Taxpayers</th>
                                                        <th>Total Tax</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {statistics.category_breakdown?.map(c => (
                                                        <tr key={c.category_code}>
                                                            <td><Badge bg="info">{c.category_code}</Badge></td>
                                                            <td>{c.taxpayer_count}</td>
                                                            <td>ETB {c.total_tax?.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card>
                                        <Card.Header>Quick Actions</Card.Header>
                                        <Card.Body>
                                            <div className="d-grid gap-2">
                                                <Button variant="outline-primary">
                                                    Generate Monthly Report
                                                </Button>
                                                <Button variant="outline-success">
                                                    Export Taxpayer List
                                                </Button>
                                                <Button variant="outline-info">
                                                    View Collection Trends
                                                </Button>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab>
                    </Tabs>
                </Card.Header>
            </Card>

            {/* Category Modal */}
            <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{categoryForm.id ? 'Edit Category' : 'Create Category'}</Modal.Title>
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
                                        placeholder="A, B, C, etc."
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
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Min Income (ETB) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={categoryForm.min_income}
                                        onChange={(e) => setCategoryForm({...categoryForm, min_income: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Max Income (ETB)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={categoryForm.max_income}
                                        onChange={(e) => setCategoryForm({...categoryForm, max_income: e.target.value})}
                                        placeholder="Leave empty for unlimited"
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
                                <option value="percentage_of_last_year">Percentage of Last Year</option>
                                <option value="percentage_of_income">Percentage of Income</option>
                                <option value="fixed_amount">Fixed Amount</option>
                                <option value="mixed">Mixed (Base + Percentage)</option>
                                <option value="progressive">Progressive</option>
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

                        {categoryForm.formula_type === 'fixed_amount' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Fixed Amount (ETB) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={categoryForm.fixed_amount}
                                    onChange={(e) => setCategoryForm({...categoryForm, fixed_amount: e.target.value})}
                                    required
                                />
                            </Form.Group>
                        )}

                        {categoryForm.formula_type === 'mixed' && (
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Base Amount (ETB) *</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={categoryForm.fixed_amount}
                                            onChange={(e) => setCategoryForm({...categoryForm, fixed_amount: e.target.value})}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
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
                                </Col>
                            </Row>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Requires Review"
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
                        <Button variant="primary" type="submit">
                            Save Category
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Verification Modal */}
            <Modal show={showVerifyModal} onHide={() => setShowVerifyModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Verify Taxpayer Profile</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleVerifyProfile}>
                    <Modal.Body>
                        {selectedProfile && (
                            <>
                                <p><strong>Business:</strong> {selectedProfile.business_name}</p>
                                <p><strong>Owner:</strong> {selectedProfile.full_name}</p>
                                <p><strong>Income:</strong> ETB {selectedProfile.last_year_income?.toLocaleString()}</p>
                                <p><strong>Suggested Category:</strong> {selectedProfile.category_code}</p>
                                
                                <Form.Group className="mb-3">
                                    <Form.Label>Decision *</Form.Label>
                                    <Form.Select
                                        value={verifyForm.status}
                                        onChange={(e) => setVerifyForm({...verifyForm, status: e.target.value})}
                                        required
                                    >
                                        <option value="verified">✅ Verify & Approve</option>
                                        <option value="rejected">❌ Reject</option>
                                        <option value="needs_review">🔄 Needs More Info</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Override Category (Optional)</Form.Label>
                                    <Form.Select
                                        value={verifyForm.override_category}
                                        onChange={(e) => setVerifyForm({...verifyForm, override_category: e.target.value})}
                                    >
                                        <option value="">Use Suggested</option>
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
                                        placeholder="Add verification notes..."
                                    />
                                </Form.Group>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowVerifyModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Submit Decision
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default TownCategoryManager;