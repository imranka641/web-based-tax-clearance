import React, { useEffect } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { removeToken, removeUser } from '../../utils/auth';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Perform logout actions
    const logout = async () => {
      // Clear local storage
      removeToken();
      removeUser();
      
      // Wait a moment for user to see the message
      setTimeout(() => {
        navigate('/');
      }, 2000);
    };

    logout();
  }, [navigate]);

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <Card className="shadow text-center">
            <Card.Body className="p-5">
              <div className="mb-4">
                <span style={{ fontSize: '3rem' }}>👋</span>
              </div>
              <h4>Logging Out...</h4>
              <p className="text-muted">You are being safely logged out of the system.</p>
              <Spinner animation="border" variant="primary" className="mt-3" />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Logout;