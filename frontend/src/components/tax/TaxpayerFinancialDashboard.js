import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Modal, Form, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const TaxpayerFinancialDashboard = () => {
    const [user, setUser] = useState(null);
    const [taxTypes, setTaxTypes] = useState([]);
    const [declarations, setDeclarations] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [unpaidTaxes, setUnpaidTaxes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDeclareModal, setShowDeclareModal] = useState(false);
    const [selectedTaxType, setSelectedTaxType] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const { t } = useLanguage();

    const [declarationForm, setDeclarationForm] = useState({
        tax_type_id: '',
        period_type: 'monthly',
        revenue: '',
        expenses: '',
        notes: ''
    });

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'taxpayer') {
            window.location.href = '/login';
            return;
        }
        setUser(currentUser);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [taxTypesRes, declarationsRes, predictionsRes, unpaidRes] = await Promise.all([
                api.get('/taxpayer/available-tax-types'),
                api.get('/taxpayer/my-declarations'),
                api.get('/taxpayer/my-predictions'),
                api.get('/taxpayer/my-unpaid-taxes')
            ]);

            setTaxTypes(taxTypesRes.data.tax_types);
            setDeclarations(declarationsRes.data.declarations);
            setPredictions(predictionsRes.data.predictions);
            setUnpaidTaxes(unpaidRes.data.unpaid_taxes);
        } catch (error) {
            setError('Failed to load financial data');
        } finally {
            setLoading(false);
        }
    };

    const handleTaxTypeSelect = async (taxTypeId) => {
        setSelectedTaxType(taxTypes.find(t => t.id === parseInt(taxTypeId)));
        setDeclarationForm({...declarationForm, tax_type_id: taxTypeId});
        
        // Get prediction for this tax type
        try {
            const response = await api.get(`/taxpayer/predict-tax/${taxTypeId}`);
            setPrediction(response.data.prediction);
        } catch (error) {
            console.error('Failed to get prediction:', error);
        }
    };

    const calculateTax = () => {
        if (!selectedTaxType || !declarationForm.revenue) return 0;
        
        const revenue = parseFloat(declarationForm.revenue);
        const expenses = parseFloat(declarationForm.expenses) || 0;
        const profit = revenue - expenses;
        
        let calculatedTax = 0;
        
        switch(selectedTaxType.calculation_type) {
            case 'percentage':
                calculatedTax = revenue * (selectedTaxType.percentage_rate / 100);
                break;
            case 'fixed':
                calculatedTax = selectedTaxType.fixed_amount;
                break;
            case 'profit_based':
                calculatedTax = profit * (selectedTaxType.percentage_rate / 100);
                break;
            default:
                calculatedTax = revenue * 0.15; // Default 15%
        }
        
        // Apply minimum tax if applicable
        if (selectedTaxType.minimum_tax > 0 && calculatedTax < selectedTaxType.minimum_tax) {
            calculatedTax = selectedTaxType.minimum_tax;
        }
        
        return calculatedTax;
    };

    const handleSubmitDeclaration = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const calculatedTax = calculateTax();
            await api.post('/taxpayer/submit-declaration', {
                ...declarationForm,
                calculated_tax: calculatedTax,
                predicted_tax: prediction?.predicted_amount
            });
            
            setShowDeclareModal(false);
            setDeclarationForm({
                tax_type_id: '',
                period_type: 'monthly',
                revenue: '',
                expenses: '',
                notes: ''
            });
            setSelectedTaxType(null);
            setPrediction(null);
            fetchData();
            
            alert('✅ Declaration submitted successfully!');
        } catch (error) {
            setError('Failed to submit declaration');
        } finally {
            setLoading(false);
        }
    };

    const getStatusVariant = (status) => {
        switch(status) {
            case 'approved': return 'success';
            case 'rejected': return 'danger';
            case 'submitted': return 'warning';
            default: return 'secondary';
        }
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
                            <h2>💰 Taxpayer Financial Dashboard</h2>
                            <p className="text-muted mb-0">
                                {user?.full_name} | {user?.business_name} | TIN: {user?.tin}
                            </p>
                        </div>
                        <Button 
                            variant="success" 
                            onClick={() => setShowDeclareModal(true)}
                            disabled={taxTypes.length === 0}
                        >
                            ➕ New Declaration
                        </Button>
                    </div>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Summary Cards */}
            <Row className="mb-4">
                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-primary">
                        <Card.Body>
                            <h6 className="text-muted">Total Tax Paid (YTD)</h6>
                            <h3 className="text-primary">
                                ETB {declarations.filter(d => d.status === 'approved')
                                    .reduce((sum, d) => sum + parseFloat(d.calculated_tax || 0), 0)
                                    .toLocaleString()}
                            </h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-success">
                        <Card.Body>
                            <h6 className="text-muted">Pending Declarations</h6>
                            <h3 className="text-success">
                                {declarations.filter(d => d.status === 'submitted').length}
                            </h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-warning">
                        <Card.Body>
                            <h6 className="text-muted">Unpaid Taxes</h6>
                            <h3 className="text-warning">
                                ETB {unpaidTaxes.reduce((sum, t) => sum + parseFloat(t.amount), 0).toLocaleString()}
                            </h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3} md={6} className="mb-3">
                    <Card className="border-info">
                        <Card.Body>
                            <h6 className="text-muted">Next Tax Prediction</h6>
                            <h3 className="text-info">
                                ETB {predictions[0]?.predicted_amount?.toLocaleString() || '0'}
                            </h3>
                            <small>{predictions[0]?.period || 'Next period'}</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Main Content */}
            <Row>
                <Col md={8}>
                    {/* Declarations Table */}
                    <Card className="shadow-sm mb-4">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">📋 My Tax Declarations</h5>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive striped hover>
                                <thead>
                                    <tr>
                                        <th>Period</th>
                                        <th>Tax Type</th>
                                        <th>Revenue</th>
                                        <th>Expenses</th>
                                        <th>Calculated Tax</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {declarations.map(dec => (
                                        <tr key={dec.id}>
                                            <td>{new Date(dec.declaration_period).toLocaleDateString()}</td>
                                            <td>{dec.tax_type_name}</td>
                                            <td>ETB {dec.revenue?.toLocaleString()}</td>
                                            <td>ETB {dec.expenses?.toLocaleString()}</td>
                                            <td><strong>ETB {dec.calculated_tax?.toLocaleString()}</strong></td>
                                            <td>
                                                <Badge bg={getStatusVariant(dec.status)}>
                                                    {dec.status}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Button size="sm" variant="outline-primary">View</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>

                    {/* Tax Predictions */}
                    <Card className="shadow-sm">
                        <Card.Header className="bg-info text-white">
                            <h5 className="mb-0">🔮 Tax Predictions</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                {predictions.slice(0, 3).map(pred => (
                                    <Col md={4} key={pred.id}>
                                        <Card className="mb-3 border-info">
                                            <Card.Body>
                                                <h6>{new Date(pred.prediction_period).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</h6>
                                                <h4 className="text-info">ETB {pred.predicted_amount.toLocaleString()}</h4>
                                                <ProgressBar 
                                                    now={pred.confidence_score} 
                                                    label={`${pred.confidence_score}%`}
                                                    variant="info"
                                                />
                                                <small className="text-muted">AI Confidence</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    {/* Unpaid Taxes */}
                    <Card className="shadow-sm mb-4">
                        <Card.Header className="bg-danger text-white">
                            <h5 className="mb-0">⚠️ Unpaid Taxes</h5>
                        </Card.Header>
                        <Card.Body>
                            {unpaidTaxes.length === 0 ? (
                                <p className="text-success text-center">No unpaid taxes! 👍</p>
                            ) : (
                                unpaidTaxes.map(tax => (
                                    <div key={tax.id} className="border-bottom pb-2 mb-2">
                                        <div className="d-flex justify-content-between">
                                            <div>
                                                <strong>{tax.tax_type_name}</strong>
                                                <br />
                                                <small className="text-muted">Due: {new Date(tax.due_date).toLocaleDateString()}</small>
                                            </div>
                                            <div className="text-end">
                                                <strong className="text-danger">ETB {tax.amount.toLocaleString()}</strong>
                                                <br />
                                                <Badge bg="warning">Penalty: ETB {tax.penalty_amount}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </Card.Body>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="shadow-sm">
                        <Card.Header className="bg-success text-white">
                            <h5 className="mb-0">⚡ Quick Actions</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-grid gap-2">
                                <Button variant="outline-primary" onClick={() => setShowDeclareModal(true)}>
                                    📝 New Declaration
                                </Button>
                                <Button variant="outline-success" as={Link} to="/tax/pay">
                                    💰 Pay Taxes
                                </Button>
                                <Button variant="outline-info" as={Link} to="/tax/history">
                                    📊 Payment History
                                </Button>
                                <Button variant="outline-warning" as={Link} to="/tax/calculator">
                                    🧮 Tax Calculator
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Declaration Modal */}
            <Modal show={showDeclareModal} onHide={() => setShowDeclareModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Submit Tax Declaration</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmitDeclaration}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Tax Type *</Form.Label>
                            <Form.Select
                                value={declarationForm.tax_type_id}
                                onChange={(e) => handleTaxTypeSelect(e.target.value)}
                                required
                            >
                                <option value="">Select Tax Type</option>
                                {taxTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.tax_name} ({type.category_code})
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Period Type *</Form.Label>
                            <Form.Select
                                value={declarationForm.period_type}
                                onChange={(e) => setDeclarationForm({...declarationForm, period_type: e.target.value})}
                                required
                            >
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annual">Annual</option>
                            </Form.Select>
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Revenue (ETB) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.01"
                                        value={declarationForm.revenue}
                                        onChange={(e) => setDeclarationForm({...declarationForm, revenue: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Expenses (ETB)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.01"
                                        value={declarationForm.expenses}
                                        onChange={(e) => setDeclarationForm({...declarationForm, expenses: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        {selectedTaxType && (
                            <Alert variant="info" className="mt-3">
                                <h6>Tax Calculation Preview:</h6>
                                <p>
                                    <strong>Calculated Tax:</strong> ETB {calculateTax().toLocaleString()}<br />
                                    <strong>Method:</strong> {selectedTaxType.calculation_type}<br />
                                    {selectedTaxType.percentage_rate > 0 && <><strong>Rate:</strong> {selectedTaxType.percentage_rate}%<br /></>}
                                    {selectedTaxType.minimum_tax > 0 && <><strong>Minimum Tax:</strong> ETB {selectedTaxType.minimum_tax}</>}
                                </p>
                            </Alert>
                        )}

                        {prediction && (
                            <Alert variant="warning">
                                <h6>AI Prediction for this period:</h6>
                                <p>
                                    <strong>Predicted Tax:</strong> ETB {prediction.predicted_amount.toLocaleString()}<br />
                                    <strong>Confidence:</strong> {prediction.confidence_score}%
                                </p>
                            </Alert>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={declarationForm.notes}
                                onChange={(e) => setDeclarationForm({...declarationForm, notes: e.target.value})}
                                placeholder="Additional information (optional)"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDeclareModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Declaration'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default TaxpayerFinancialDashboard;