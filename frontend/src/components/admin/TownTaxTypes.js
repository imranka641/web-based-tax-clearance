import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const TownTaxTypes = () => {
  const navigate = useNavigate();
  
  return (
    <Container className="mt-4">
      <Card>
        <Card.Header className="bg-info text-white">
          <h4>Town Tax Types</h4>
        </Card.Header>
        <Card.Body>
          <p className="text-muted">Tax types management is integrated in the Town Tax Manager.</p>
          <p>Please use the <strong>Town Tax Manager</strong> for all tax type operations.</p>
          <Button variant="primary" onClick={() => navigate('/town/tax-manager')}>
            Go to Town Tax Manager
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default TownTaxTypes;