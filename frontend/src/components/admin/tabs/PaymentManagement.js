import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Form, Modal, Badge, Alert } from 'react-bootstrap';
import api from '../../../services/api';

const PaymentManagement = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    account_number: '',
    account_name: '',
    is_active: true
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.get('/admin/payment-methods');
      setPaymentMethods(response.data.payment_methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/payment-methods', formData);
      setShowModal(false);
      setFormData({ name: '', account_number: '', account_name: '', is_active: true });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error creating payment method:', error);
    }
  };

  const toggleMethodStatus = async (methodId, currentStatus) => {
    try {
      await api.put(`/admin/payment-methods/${methodId}`, {
        is_active: !currentStatus
      });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error updating payment method:', error);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Payment Methods Management</h4>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Add Payment Method
        </Button>
      </div>

      <Row>
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Payment Methods</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive striped>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Account Number</th>
                    <th>Account Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMethods.map(method => (
                    <tr key={method.id}>
                      <td>{method.name}</td>
                      <td>{method.account_number}</td>
                      <td>{method.account_name}</td>
                      <td>
                        <Badge bg={method.is_active ? 'success' : 'secondary'}>
                          {method.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant={method.is_active ? 'warning' : 'success'}
                          onClick={() => toggleMethodStatus(method.id, method.is_active)}
                        >
                          {method.is_active ? 'Disable' : 'Enable'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add Payment Method Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Payment Method</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Payment Method Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Telebirr, CBE, Awash Bank"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Account Number</Form.Label>
              <Form.Control
                type="text"
                value={formData.account_number}
                onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                placeholder="Bank account or wallet number"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Account Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.account_name}
                onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                placeholder="Account holder name"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Payment Method
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentManagement;