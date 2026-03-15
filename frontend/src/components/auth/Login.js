import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { setToken, setUser } from '../../utils/auth';


const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const response = await api.post('/auth/login', {
      email,
      password
    });

    const { token, user } = response.data;
    
    // Store token and user data
    setToken(token);
    setUser(user);
    
    // NEW REDIRECT LOGIC: Check super admin first
    if (user.is_super_admin) {
      navigate('/admin/dashboard');
    } else if (user.role === 'staff') {
      navigate('/staff-dashboard');
    } else {
      navigate('/dashboard');
    }

  } catch (err) {
    setError(err.response?.data?.error || 'Login failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white text-center">
              <h4 className="mb-0">Login to Your Account</h4>
            </Card.Header>
            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={onSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={email}
                    onChange={onChange}
                    placeholder="Enter your email"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={password}
                    onChange={onChange}
                    placeholder="Enter your password"
                    required
                  />
                </Form.Group>

                <div className="d-grid">
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
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </div>
              </Form>

              <div className="text-center mt-3">
                <p className="mb-0">
                  Don't have an account? <Link to="/register">Register here</Link>
                </p>
              </div>

              <hr className="my-4" />
              
              <div className="text-center">
                <small className="text-muted">
                  <strong>Demo Accounts:</strong><br />
                  Taxpayer: john.smith@email.com / password123<br />
                  Staff: admin@tax.gov.et / password123
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;