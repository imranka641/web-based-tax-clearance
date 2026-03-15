import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TCCApplication = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      navigate('/login');
    }
    setUser(currentUser);
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/applications', {});

      setSuccess('TCC application submitted successfully! Redirecting to dashboard...');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
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
        <Col md={8}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white text-center">
              <h4 className="mb-0">Apply for Tax Clearance Certificate</h4>
            </Card.Header>
            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <div className="mb-4 p-3 bg-light rounded">
                <h6>Applicant Information</h6>
                <Row>
                  <Col md={6}>
                    <strong>Full Name:</strong> {user.full_name}
                  </Col>
                  <Col md={6}>
                    <strong>TIN:</strong> {user.tin}
                  </Col>
                </Row>
                <Row className="mt-2">
                  <Col md={6}>
                    <strong>Business Name:</strong> {user.business_name || 'N/A'}
                  </Col>
                  <Col md={6}>
                    <strong>Email:</strong> {user.email}
                  </Col>
                </Row>
              </div>

              <Alert variant="info" className="mb-4">
                <h6>📋 Application Process</h6>
                <ol className="mb-0">
                  <li>Submit your application</li>
                  <li>Ministry staff will verify your tax compliance</li>
                  <li>You'll receive notification of approval/rejection</li>
                  <li>Download your digital TCC if approved</li>
                </ol>
              </Alert>

              <Form onSubmit={onSubmit}>
                <Form.Group className="mb-4">
                  <Form.Check 
                    type="checkbox"
                    label="I confirm that all the information provided is accurate and complete to the best of my knowledge."
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Check 
                    type="checkbox"
                    label="I understand that providing false information may lead to legal consequences."
                    required
                  />
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Submitting Application...
                      </>
                    ) : (
                      'Submit TCC Application'
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => navigate('/dashboard')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TCCApplication;