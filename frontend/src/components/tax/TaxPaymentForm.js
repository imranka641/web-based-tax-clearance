import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TaxPaymentForm = () => {
  const { taxTypeId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [taxType, setTaxType] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [taxPeriods, setTaxPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);

  const [formData, setFormData] = useState({
    tax_period_id: '',
    declared_amount: '',
    monthly_income: '',
    sales_amount: '',
    purchase_amount: '',
    business_profit: '',
    payment_method_id: '',
    account_number: ''
  });

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    fetchFormData();
  }, [taxTypeId, navigate]);

  const fetchFormData = async () => {
    try {
      const [taxTypeRes, methodsRes, periodsRes] = await Promise.all([
        api.get(`/tax/tax-types/${taxTypeId}`),
        api.get('/tax/payment-methods'),
        api.get(`/tax/tax-periods/${taxTypeId}`)
      ]);

      setTaxType(taxTypeRes.data.tax_type);
      setPaymentMethods(methodsRes.data.payment_methods);
      setTaxPeriods(periodsRes.data.tax_periods);

      // Set default tax period
      if (periodsRes.data.tax_periods.length > 0) {
        setFormData(prev => ({
          ...prev,
          tax_period_id: periodsRes.data.tax_periods[0].id
        }));
      }

    } catch (error) {
      setError('Failed to load tax payment form');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const verifyWithAI = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');
    setAiResult(null);

    try {
      const response = await api.post('/tax/ai-verify', {
        tax_type_id: parseInt(taxTypeId),
        ...formData
      });

      setAiResult(response.data);
      setShowAiModal(true);

    } catch (error) {
      setError(error.response?.data?.error || 'AI verification failed');
    } finally {
      setProcessing(false);
    }
  };

  const processPayment = async () => {
    setProcessing(true);
    setError('');

    try {
      const response = await api.post('/tax/process-payment', {
        tax_type_id: parseInt(taxTypeId),
        tax_period_id: parseInt(formData.tax_period_id),
        declared_amount: parseFloat(formData.declared_amount),
        payment_method_id: parseInt(formData.payment_method_id),
        account_number: formData.account_number,
        ai_verification_id: aiResult.verification_id
      });

      if (response.data.success) {
        alert(`✅ Payment successful! Transaction ID: ${response.data.transaction_id}`);
        navigate('/tax/dashboard');
      } else {
        setError(response.data.error || 'Payment processing failed');
      }

    } catch (error) {
      setError(error.response?.data?.error || 'Payment processing failed');
    } finally {
      setProcessing(false);
      setShowAiModal(false);
    }
  };

  const getInputFields = () => {
    switch(taxType?.name) {
      case 'Income Tax':
        return (
          <Form.Group className="mb-3">
            <Form.Label>Monthly Income (ETB) *</Form.Label>
            <Form.Control
              type="number"
              name="monthly_income"
              value={formData.monthly_income}
              onChange={handleInputChange}
              placeholder="Enter your monthly income in ETB"
              required
            />
            <Form.Text className="text-muted">
              Your tax will be calculated based on Ethiopian income tax brackets
            </Form.Text>
          </Form.Group>
        );
      
      case 'Value Added Tax (VAT)':
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Total Sales Amount (ETB) *</Form.Label>
              <Form.Control
                type="number"
                name="sales_amount"
                value={formData.sales_amount}
                onChange={handleInputChange}
                placeholder="Enter total sales amount"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Total Purchase Amount (ETB) *</Form.Label>
              <Form.Control
                type="number"
                name="purchase_amount"
                value={formData.purchase_amount}
                onChange={handleInputChange}
                placeholder="Enter total purchase amount"
                required
              />
            </Form.Group>
          </>
        );
      
      case 'Business Profit Tax':
        return (
          <Form.Group className="mb-3">
            <Form.Label>Business Profit (ETB) *</Form.Label>
            <Form.Control
              type="number"
              name="business_profit"
              value={formData.business_profit}
              onChange={handleInputChange}
              placeholder="Enter your business profit"
              required
            />
            <Form.Text className="text-muted">
              Business profit tax rate: 30%
            </Form.Text>
          </Form.Group>
        );
      
      default:
        return (
          <Form.Group className="mb-3">
            <Form.Label>Tax Amount (ETB) *</Form.Label>
            <Form.Control
              type="number"
              name="declared_amount"
              value={formData.declared_amount}
              onChange={handleInputChange}
              placeholder="Enter tax amount in ETB"
              required
            />
          </Form.Group>
        );
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
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col md={10}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0">Pay {taxType?.name}</h4>
                  <small>Ethiopian Ministry of Revenue</small>
                </div>
                <Badge bg="light" text="dark">
                  ETB 🇪🇹
                </Badge>
              </div>
            </Card.Header>

            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={verifyWithAI}>
                <Row>
                  <Col md={8}>
                    {/* Tax Period Selection */}
                    <Form.Group className="mb-3">
                      <Form.Label>Tax Period *</Form.Label>
                      <Form.Select
                        name="tax_period_id"
                        value={formData.tax_period_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Tax Period</option>
                        {taxPeriods.map(period => (
                          <option key={period.id} value={period.id}>
                            {period.period_name} (Due: {new Date(period.due_date).toLocaleDateString()})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {/* Dynamic Input Fields based on Tax Type */}
                    {getInputFields()}

                    {/* Declared Amount (for all types) */}
                    <Form.Group className="mb-4">
                      <Form.Label>Declared Tax Amount (ETB) *</Form.Label>
                      <Form.Control
                        type="number"
                        name="declared_amount"
                        value={formData.declared_amount}
                        onChange={handleInputChange}
                        placeholder="Enter the tax amount you want to pay"
                        required
                        step="0.01"
                      />
                      <Form.Text className="text-muted">
                        This amount will be verified by our AI system
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Card className="bg-light">
                      <Card.Header>
                        <h6 className="mb-0">Tax Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <p><strong>Tax Type:</strong> {taxType?.name}</p>
                        <p><strong>Description:</strong> {taxType?.description}</p>
                        
                        {taxType?.name === 'Income Tax' && (
                          <div>
                            <strong>Tax Brackets:</strong>
                            <small className="d-block">• 0-600 ETB: 0%</small>
                            <small className="d-block">• 601-1,650 ETB: 10%</small>
                            <small className="d-block">• 1,651-3,200 ETB: 15%</small>
                            <small className="d-block">• 3,201-5,250 ETB: 20%</small>
                            <small className="d-block">• 5,251-7,800 ETB: 25%</small>
                            <small className="d-block">• Above 7,800 ETB: 30%</small>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <div className="d-grid mt-4">
                  <Button 
                    variant="warning" 
                    type="submit"
                    size="lg"
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        AI Verification in Progress...
                      </>
                    ) : (
                      '🔍 Verify with AI & Continue to Payment'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* AI Verification Modal */}
      <Modal show={showAiModal} onHide={() => setShowAiModal(false)} size="lg">
        <Modal.Header closeButton className={aiResult?.approved ? 'bg-success text-white' : 'bg-warning'}>
          <Modal.Title>
            {aiResult?.approved ? '✅ AI Verification Passed' : '⚠️ AI Verification Alert'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {aiResult && (
            <div>
              <Alert variant={aiResult.approved ? 'success' : 'warning'}>
                <h6>{aiResult.warning}</h6>
              </Alert>

              <Row className="text-center mb-3">
                <Col md={4}>
                  <Card className="border-primary">
                    <Card.Body>
                      <h6>Declared Amount</h6>
                      <h4 className="text-primary">ETB {aiResult.declared_amount?.toLocaleString()}</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-info">
                    <Card.Body>
                      <h6>Expected Amount</h6>
                      <h4 className="text-info">ETB {aiResult.expected_amount?.toLocaleString()}</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-secondary">
                    <Card.Body>
                      <h6>AI Confidence</h6>
                      <h4 className="text-secondary">{aiResult.confidence}%</h4>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {!aiResult.approved && (
                <Alert variant="danger">
                  <strong>🚨 Required Action:</strong> {aiResult.required_action === 'manual_review' 
                    ? 'This payment requires manual review by tax officers.' 
                    : 'Please adjust your declared amount to match the expected calculation.'}
                </Alert>
              )}

              {/* Payment Method Selection */}
              {aiResult.approved && (
                <div>
                  <h6>Select Payment Method</h6>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Payment Method *</Form.Label>
                        <Form.Select
                          name="payment_method_id"
                          value={formData.payment_method_id}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select Payment Method</option>
                          {paymentMethods.map(method => (
                            <option key={method.id} value={method.id}>
                              {method.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Your Account Number *</Form.Label>
                        <Form.Control
                          type="text"
                          name="account_number"
                          value={formData.account_number}
                          onChange={handleInputChange}
                          placeholder="Enter your account number"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAiModal(false)}>
            Cancel
          </Button>
          {aiResult?.approved && (
            <Button 
              variant="success" 
              onClick={processPayment}
              disabled={processing || !formData.payment_method_id || !formData.account_number}
            >
              {processing ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Processing Payment...
                </>
              ) : (
                `Pay ETB ${aiResult.declared_amount?.toLocaleString()}`
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TaxPaymentForm;