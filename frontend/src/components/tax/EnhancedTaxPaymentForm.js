import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const EnhancedTaxPaymentForm = () => {
  const { taxTypeId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [taxType, setTaxType] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  const [formData, setFormData] = useState({
    tax_amount: '',
    payment_method_id: '',
    account_number: '',
    last_year_tax_amount: '',
    current_year_income: ''
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
      const [taxTypeRes, methodsRes] = await Promise.all([
        api.get(`/tax/tax-types/${taxTypeId}`),
        api.get('/tax/payment-methods')
      ]);

      setTaxType(taxTypeRes.data.tax_type);
      setPaymentMethods(methodsRes.data.payment_methods);

      // Auto-fill user data
      setFormData(prev => ({
        ...prev,
        last_year_tax_amount: user?.last_year_tax_amount || '',
        account_number: user?.phone || ''
      }));

    } catch (error) {
      setError('Failed to load payment form');
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

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload JPEG, PNG, or PDF files only');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      setReceiptFile(file);
    }
  };

  const processPayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    if (!receiptFile) {
      setError('Please upload payment receipt');
      setProcessing(false);
      return;
    }

    try {
      const receiptFormData = new FormData();
      receiptFormData.append('receipt', receiptFile);
      receiptFormData.append('tax_type_id', taxTypeId);
      receiptFormData.append('tax_amount', formData.tax_amount);
      receiptFormData.append('payment_method_id', formData.payment_method_id);
      receiptFormData.append('account_number', formData.account_number);

      const response = await api.post('/tax/process-payment-manual', receiptFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert('✅ Payment submitted successfully! Staff will review your receipt and process the payment.');
        navigate('/tax/dashboard');
      } else {
        setError(response.data.error || 'Payment submission failed');
      }

    } catch (error) {
      setError(error.response?.data?.error || 'Payment submission failed');
    } finally {
      setProcessing(false);
    }
  };

  const calculateTax = async () => {
    try {
      const response = await api.post('/tax/calculate', {
        tax_type_id: parseInt(taxTypeId),
        last_year_tax_amount: parseFloat(formData.last_year_tax_amount),
        current_year_income: parseFloat(formData.current_year_income)
      });
      
      setFormData(prev => ({
        ...prev,
        tax_amount: response.data.calculated_tax
      }));
      
    } catch (error) {
      setError('Failed to calculate tax');
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
                  <small>Complete your tax payment in 3 simple steps</small>
                </div>
                <Badge bg="light" text="dark">
                  ETB 🇪🇹
                </Badge>
              </div>
            </Card.Header>

            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={processPayment}>
                <Row>
                  <Col md={8}>
                    {/* Step 1: Tax Information */}
                    <Card className="mb-4 border-primary">
                      <Card.Header className="bg-light">
                        <h5 className="mb-0">Step 1: Tax Information</h5>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Last Year Tax Amount (ETB)</Form.Label>
                              <Form.Control
                                type="number"
                                name="last_year_tax_amount"
                                value={formData.last_year_tax_amount}
                                onChange={handleInputChange}
                                placeholder="Enter last year's tax amount"
                                step="0.01"
                              />
                              <Form.Text className="text-muted">
                                Helps calculate current year tax (optional)
                              </Form.Text>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Current Year Income (ETB)</Form.Label>
                              <Form.Control
                                type="number"
                                name="current_year_income"
                                value={formData.current_year_income}
                                onChange={handleInputChange}
                                placeholder="Estimated current year income"
                                step="0.01"
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                        
                        <Row>
                          <Col md={8}>
                            <Form.Group className="mb-3">
                              <Form.Label>Tax Amount (ETB) *</Form.Label>
                              <Form.Control
                                type="number"
                                name="tax_amount"
                                value={formData.tax_amount}
                                onChange={handleInputChange}
                                placeholder="Tax amount to pay"
                                required
                                step="0.01"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Button 
                              variant="outline-primary" 
                              className="mt-4"
                              onClick={calculateTax}
                              disabled={!formData.last_year_tax_amount}
                            >
                              Calculate Tax
                            </Button>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>

                    {/* Step 2: Payment Method */}
                    <Card className="mb-4 border-warning">
                      <Card.Header className="bg-light">
                        <h5 className="mb-0">Step 2: Payment Method</h5>
                      </Card.Header>
                      <Card.Body>
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
                                    {method.name} - {method.account_number}
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
                                placeholder="Your bank account or mobile money number"
                                required
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={4}>
                    {/* User Information */}
                    <Card className="bg-light mb-4">
                      <Card.Header>
                        <h6 className="mb-0">Your Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <p><strong>Name:</strong> {user?.full_name}</p>
                        <p><strong>TIN:</strong> {user?.tin}</p>
                        <p><strong>Business:</strong> {user?.business_name || 'N/A'}</p>
                        <p><strong>Email:</strong> {user?.email}</p>
                        <p><strong>Phone:</strong> {user?.phone || 'N/A'}</p>
                      </Card.Body>
                    </Card>

                    {/* Manual Review Info */}
                    <Card className="border-info">
                      <Card.Header className="bg-info text-white">
                        <h6 className="mb-0">Review Process</h6>
                      </Card.Header>
                      <Card.Body>
                        <p className="small">
                          <strong>Manual Staff Review:</strong>
                        </p>
                        <ul className="small">
                          <li>Upload your payment receipt</li>
                          <li>Staff will verify the receipt</li>
                          <li>Payment processed after approval</li>
                          <li>You'll be notified of the result</li>
                        </ul>
                        <Badge bg="warning" className="w-100">
                          Staff Verification Required
                        </Badge>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Step 3: Receipt Upload */}
                <Card className="border-success">
                  <Card.Header className="bg-light">
                    <h5 className="mb-0">Step 3: Upload Payment Receipt</h5>
                  </Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>Payment Receipt *</Form.Label>
                      <Form.Control
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleReceiptUpload}
                        required
                      />
                      <Form.Text className="text-muted">
                        Upload clear image/PDF of your payment receipt (Max 5MB)
                      </Form.Text>
                    </Form.Group>

                    {receiptFile && (
                      <Alert variant="success">
                        <strong>File selected:</strong> {receiptFile.name}
                      </Alert>
                    )}

                    <div className="d-grid gap-2 mt-4">
                      <Button 
                        variant="success" 
                        type="submit"
                        size="lg"
                        disabled={processing || !receiptFile}
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
                            Submitting...
                          </>
                        ) : (
                          `Submit ETB ${formData.tax_amount ? parseFloat(formData.tax_amount).toLocaleString() : '0'} for Review`
                        )}
                      </Button>
                      
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => navigate('/tax/dashboard')}
                        disabled={processing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EnhancedTaxPaymentForm;