import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const TownReports = () => {
  const navigate = useNavigate();
  
  return (
    <Container className="mt-4">
      <Card>
        <Card.Header className="bg-info text-white">
          <h4>Town Reports</h4>
        </Card.Header>
        <Card.Body>
          <p className="text-muted">Reports generation coming soon...</p>
          <Button variant="primary" onClick={() => navigate('/town/dashboard')}>
            Back to Dashboard
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default TownReports;