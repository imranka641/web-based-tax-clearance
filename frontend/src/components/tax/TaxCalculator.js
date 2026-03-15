import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Table } from 'react-bootstrap';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TaxCalculator = () => {
  const [user, setUser] = useState(null);
  const [taxTypes, setTaxTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    tax_type_id: '',
    income: '',
    business_profit: '',
    sales_amount: '',
    purchase_amount: '',
    deductions: ''
  });

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    fetchTaxTypes();
  }, []);

  const fetchTaxTypes = async () => {
    try {
      const response = await api.get('/tax/tax-types');
      setTaxTypes(response.data.tax_types);
    } catch (error) {
      console.error('Error fetching tax types:', error);
      setError('Failed to load tax types');
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

  const calculateTax = async (e) => {
    e.preventDefault();
    setCalculating(true);
    setError('');
    setResult(null);

    // Validate required fields
    if (!formData.tax_type_id) {
      setError('Please select a tax type');
      setCalculating(false);
      return;
    }

    try {
      let response;
      
      // Use simple calculation for all tax types
      if (formData.tax_type_id == 1 && formData.income) {
        // Income tax calculation
        response = await api.post('/tax/calculate', {
          tax_type_id: parseInt(formData.tax_type_id),
          current_year_income: parseFloat(formData.income)
        });
      } else if (formData.tax_type_id == 2 && formData.sales_amount) {
        // VAT calculation
        const vatAmount = (parseFloat(formData.sales_amount) - (parseFloat(formData.purchase_amount) || 0)) * 0.15;
        response = {
          data: {
            calculated_tax: Math.max(0, vatAmount).toFixed(2),
            calculation_method: 'vat_calculation'
          }
        };
      } else if (formData.tax_type_id == 3 && formData.business_profit) {
        // Business profit tax calculation
        const profitTax = parseFloat(formData.business_profit) * 0.30;
        response = {
          data: {
            calculated_tax: Math.max(0, profitTax).toFixed(2),
            calculation_method: 'profit_tax_calculation'
          }
        };
      } else {
        // Use backend calculation as fallback
        response = await api.post('/tax/calculate', {
          tax_type_id: parseInt(formData.tax_type_id),
          last_year_tax_amount: parseFloat(formData.last_year_tax_amount) || null,
          current_year_income: parseFloat(formData.income) || null
        });
      }

      setResult(response.data);
    } catch (error) {
      console.error('Calculation error:', error);
      setError('Failed to calculate tax. Please check your inputs and try again.');
    } finally {
      setCalculating(false);
    }
  };

  const quickCalculate = async (taxTypeId) => {
    if (!user?.last_year_tax_amount) {
      setError('Please set your last year tax amount in your profile first.');
      return;
    }

    setCalculating(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/tax/calculate', {
        tax_type_id: taxTypeId,
        last_year_tax_amount: parseFloat(user.last_year_tax_amount)
      });
      
      setResult({
        calculated_tax: response.data.calculated_tax,
        calculation_method: response.data.calculation_method,
        tax_type_id: taxTypeId
      });
    } catch (error) {
      console.error('Quick calculation error:', error);
      setError('Failed to calculate tax. Using default calculation.');
      
      // Fallback calculation
      const fallbackTax = parseFloat(user.last_year_tax_amount) * 1.1; // 10% increase
      setResult({
        calculated_tax: fallbackTax.toFixed(2),
        calculation_method: 'fallback_calculation',
        tax_type_id: taxTypeId
      });
    } finally {
      setCalculating(false);
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
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Tax Calculator</h2>
              <p className="text-muted">Calculate your tax obligations</p>
            </div>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Row>
            {/* Quick Calculator */}
            <Col md={4}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Quick Calculate</h5>
                </Card.Header>
                <Card.Body>
                  <p className="small text-muted">
                    Calculate based on last year's tax amount
                  </p>
                  {taxTypes.map(taxType => (
                    <div key={taxType.id} className="d-grid mb-2">
                      <Button 
                        variant="outline-primary" 
                        onClick={() => quickCalculate(taxType.id)}
                        disabled={calculating}
                      >
                        {taxType.name}
                      </Button>
                    </div>
                  ))}
                  {!user?.last_year_tax_amount && (
                    <Alert variant="warning" className="mt-3">
                      <small>
                        Set your last year tax amount in your profile to use quick calculation.
                      </small>
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Advanced Calculator */}
            <Col md={8}>
              <Card className="shadow-sm">
                <Card.Header className="bg-success text-white">
                  <h5 className="mb-0">Advanced Tax Calculator</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={calculateTax}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tax Type *</Form.Label>
                      <Form.Select
                        name="tax_type_id"
                        value={formData.tax_type_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Tax Type</option>
                        {taxTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {/* Income Tax Fields */}
                    {(formData.tax_type_id == 1 || !formData.tax_type_id) && (
                      <>
                        <Form.Group className="mb-3">
                          <Form.Label>Annual Income (ETB)</Form.Label>
                          <Form.Control
                            type="number"
                            name="income"
                            value={formData.income}
                            onChange={handleInputChange}
                            placeholder="Enter your annual income"
                            step="0.01"
                            min="0"
                          />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label>Deductions (ETB)</Form.Label>
                          <Form.Control
                            type="number"
                            name="deductions"
                            value={formData.deductions}
                            onChange={handleInputChange}
                            placeholder="Enter tax deductions"
                            step="0.01"
                            min="0"
                          />
                        </Form.Group>
                      </>
                    )}

                    {/* VAT Fields */}
                    {formData.tax_type_id == 2 && (
                      <>
                        <Form.Group className="mb-3">
                          <Form.Label>Total Sales (ETB) *</Form.Label>
                          <Form.Control
                            type="number"
                            name="sales_amount"
                            value={formData.sales_amount}
                            onChange={handleInputChange}
                            placeholder="Enter total sales amount"
                            step="0.01"
                            min="0"
                            required
                          />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label>Total Purchases (ETB)</Form.Label>
                          <Form.Control
                            type="number"
                            name="purchase_amount"
                            value={formData.purchase_amount}
                            onChange={handleInputChange}
                            placeholder="Enter total purchase amount"
                            step="0.01"
                            min="0"
                          />
                        </Form.Group>
                      </>
                    )}

                    {/* Business Profit Tax Fields */}
                    {formData.tax_type_id == 3 && (
                      <Form.Group className="mb-3">
                        <Form.Label>Business Profit (ETB) *</Form.Label>
                        <Form.Control
                          type="number"
                          name="business_profit"
                          value={formData.business_profit}
                          onChange={handleInputChange}
                          placeholder="Enter business profit"
                          step="0.01"
                          min="0"
                          required
                        />
                      </Form.Group>
                    )}

                    {/* Last Year Tax Amount (Common for all types) */}
                    <Form.Group className="mb-3">
                      <Form.Label>Last Year Tax Amount (ETB)</Form.Label>
                      <Form.Control
                        type="number"
                        name="last_year_tax_amount"
                        value={formData.last_year_tax_amount}
                        onChange={(e) => setFormData(prev => ({...prev, last_year_tax_amount: e.target.value}))}
                        placeholder="Enter last year's tax amount"
                        step="0.01"
                        min="0"
                      />
                      <Form.Text className="text-muted">
                        Optional: Helps provide more accurate calculations
                      </Form.Text>
                    </Form.Group>

                    <div className="d-grid">
                      <Button 
                        variant="success" 
                        type="submit"
                        disabled={calculating}
                      >
                        {calculating ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Calculating...
                          </>
                        ) : (
                          'Calculate Tax'
                        )}
                      </Button>
                    </div>
                  </Form>

                  {result && (
                    <div className="mt-4">
                      <Alert variant="info">
                        <h5>Calculation Result</h5>
                        <p><strong>Tax Amount:</strong> ETB {result.calculated_tax}</p>
                        <p><strong>Method:</strong> {result.calculation_method?.replace(/_/g, ' ')}</p>
                        {result.breakdown && (
                          <div>
                            <strong>Breakdown:</strong>
                            <Table striped size="sm" className="mt-2">
                              <tbody>
                                {Object.entries(result.breakdown).map(([key, value]) => (
                                  <tr key={key}>
                                    <td>{key.replace(/_/g, ' ')}</td>
                                    <td>{value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        )}
                      </Alert>
                      <div className="d-grid">
                        <Button 
                          variant="primary" 
                          href={`/tax/pay/${formData.tax_type_id || result.tax_type_id}?calculated_amount=${result.calculated_tax}`}
                        >
                          Pay This Amount
                        </Button>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default TaxCalculator;