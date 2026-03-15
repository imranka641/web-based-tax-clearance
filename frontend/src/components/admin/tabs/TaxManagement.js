import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Form, Modal, Badge, Alert } from 'react-bootstrap';
import api from '../../../services/api';

const TaxManagement = () => {
  const [taxTypes, setTaxTypes] = useState([]);
  const [taxPeriods, setTaxPeriods] = useState([]);
  const [taxBrackets, setTaxBrackets] = useState([]);
  const [showTaxTypeModal, setShowTaxTypeModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editingTaxType, setEditingTaxType] = useState(null);
  const [loading, setLoading] = useState(true);

  const [taxTypeForm, setTaxTypeForm] = useState({
    name: '',
    description: '',
    formula: ''
  });

  const [periodForm, setPeriodForm] = useState({
    tax_type_id: '',
    period_name: '',
    start_date: '',
    end_date: '',
    due_date: '',
    grace_period_days: 7
  });

  useEffect(() => {
    fetchTaxData();
  }, []);

  const fetchTaxData = async () => {
    try {
      const [typesRes, periodsRes, bracketsRes] = await Promise.all([
        api.get('/admin/tax-types'),
        api.get('/admin/tax-periods'),
        api.get('/admin/tax-brackets')
      ]);

      setTaxTypes(typesRes.data.tax_types);
      setTaxPeriods(periodsRes.data.tax_periods);
      setTaxBrackets(bracketsRes.data.tax_brackets);
    } catch (error) {
      console.error('Error fetching tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTaxType = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/tax-types', taxTypeForm);
      setShowTaxTypeModal(false);
      setTaxTypeForm({ name: '', description: '', formula: '' });
      fetchTaxData();
    } catch (error) {
      console.error('Error creating tax type:', error);
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/tax-periods', periodForm);
      setShowPeriodModal(false);
      setPeriodForm({
        tax_type_id: '',
        period_name: '',
        start_date: '',
        end_date: '',
        due_date: '',
        grace_period_days: 7
      });
      fetchTaxData();
    } catch (error) {
      console.error('Error creating tax period:', error);
    }
  };

  const toggleTaxTypeStatus = async (taxTypeId, currentStatus) => {
    try {
      await api.put(`/admin/tax-types/${taxTypeId}`, {
        is_active: !currentStatus
      });
      fetchTaxData();
    } catch (error) {
      console.error('Error updating tax type:', error);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Tax Management</h4>
        <div>
          <Button variant="primary" className="me-2" onClick={() => setShowTaxTypeModal(true)}>
            + Add Tax Type
          </Button>
          <Button variant="success" onClick={() => setShowPeriodModal(true)}>
            + Add Tax Period
          </Button>
        </div>
      </div>

      <Row>
        {/* Tax Types */}
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Tax Types</h5>
            </Card.Header>
            <Card.Body>
              {taxTypes.map(taxType => (
                <Card key={taxType.id} className="mb-3">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6>{taxType.name}</h6>
                        <p className="text-muted small mb-1">{taxType.description}</p>
                        <Badge bg={taxType.is_active ? 'success' : 'secondary'}>
                          {taxType.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <small className="d-block text-muted mt-1">
                          Formula: {taxType.formula}
                        </small>
                      </div>
                      <div>
                        <Button
                          size="sm"
                          variant={taxType.is_active ? 'warning' : 'success'}
                          onClick={() => toggleTaxTypeStatus(taxType.id, taxType.is_active)}
                        >
                          {taxType.is_active ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </Card.Body>
          </Card>
        </Col>

        {/* Tax Periods */}
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Active Tax Periods</h5>
            </Card.Header>
            <Card.Body>
              {taxPeriods.filter(p => p.is_active).map(period => (
                <Card key={period.id} className="mb-3 border-warning">
                  <Card.Body>
                    <h6>{period.period_name}</h6>
                    <p className="mb-1">
                      <strong>Tax Type:</strong> {period.tax_type_name}
                    </p>
                    <p className="mb-1">
                      <strong>Period:</strong> {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                    </p>
                    <p className="mb-1">
                      <strong>Due Date:</strong> {new Date(period.due_date).toLocaleDateString()}
                    </p>
                    <Badge bg={new Date(period.due_date) > new Date() ? 'success' : 'danger'}>
                      {new Date(period.due_date) > new Date() ? 'Active' : 'Expired'}
                    </Badge>
                  </Card.Body>
                </Card>
              ))}
            </Card.Body>
          </Card>

          {/* Tax Brackets */}
          <Card className="mt-4">
            <Card.Header>
              <h5 className="mb-0">Income Tax Brackets</h5>
            </Card.Header>
            <Card.Body>
              <Table striped size="sm">
                <thead>
                  <tr>
                    <th>Min Income</th>
                    <th>Max Income</th>
                    <th>Tax Rate</th>
                    <th>Fixed Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {taxBrackets.filter(b => b.tax_type_id === 1).map(bracket => (
                    <tr key={bracket.id}>
                      <td>ETB {bracket.min_income?.toLocaleString()}</td>
                      <td>{bracket.max_income ? `ETB ${bracket.max_income.toLocaleString()}` : 'Above'}</td>
                      <td>{bracket.tax_rate}%</td>
                      <td>ETB {bracket.fixed_amount?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add Tax Type Modal */}
      <Modal show={showTaxTypeModal} onHide={() => setShowTaxTypeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Tax Type</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateTaxType}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Tax Type Name</Form.Label>
              <Form.Control
                type="text"
                value={taxTypeForm.name}
                onChange={(e) => setTaxTypeForm({...taxTypeForm, name: e.target.value})}
                placeholder="e.g., Income Tax, VAT"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={taxTypeForm.description}
                onChange={(e) => setTaxTypeForm({...taxTypeForm, description: e.target.value})}
                placeholder="Describe this tax type..."
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Calculation Formula</Form.Label>
              <Form.Select
                value={taxTypeForm.formula}
                onChange={(e) => setTaxTypeForm({...taxTypeForm, formula: e.target.value})}
                required
              >
                <option value="">Select Formula</option>
                <option value="bracket_system">Bracket System</option>
                <option value="percentage:0.15">Percentage (15%)</option>
                <option value="percentage:0.30">Percentage (30%)</option>
                <option value="fixed_amount">Fixed Amount</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTaxTypeModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Tax Type
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add Tax Period Modal */}
      <Modal show={showPeriodModal} onHide={() => setShowPeriodModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Tax Period</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreatePeriod}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Tax Type</Form.Label>
              <Form.Select
                value={periodForm.tax_type_id}
                onChange={(e) => setPeriodForm({...periodForm, tax_type_id: e.target.value})}
                required
              >
                <option value="">Select Tax Type</option>
                {taxTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Period Name</Form.Label>
              <Form.Control
                type="text"
                value={periodForm.period_name}
                onChange={(e) => setPeriodForm({...periodForm, period_name: e.target.value})}
                placeholder="e.g., Q1 2024, Annual 2024"
                required
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={periodForm.start_date}
                    onChange={(e) => setPeriodForm({...periodForm, start_date: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={periodForm.end_date}
                    onChange={(e) => setPeriodForm({...periodForm, end_date: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="date"
                value={periodForm.due_date}
                onChange={(e) => setPeriodForm({...periodForm, due_date: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Grace Period (Days)</Form.Label>
              <Form.Control
                type="number"
                value={periodForm.grace_period_days}
                onChange={(e) => setPeriodForm({...periodForm, grace_period_days: parseInt(e.target.value)})}
                min="0"
                max="30"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPeriodModal(false)}>
              Cancel
            </Button>
            <Button variant="success" type="submit">
              Create Tax Period
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default TaxManagement;