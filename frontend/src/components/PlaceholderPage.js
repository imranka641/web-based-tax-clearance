import React from 'react';
import { Container, Card, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const PlaceholderPage = ({ title, description, role }) => {
  const navigate = useNavigate();

  return (
    <Container className="mt-5">
      <Card className="shadow-lg">
        <Card.Header className={`bg-${role === 'admin' ? 'danger' : role === 'regional' ? 'success' : role === 'town' ? 'info' : 'primary'} text-white`}>
          <h3 className="mb-0">{title}</h3>
        </Card.Header>
        <Card.Body className="p-5 text-center">
          <div className="mb-4">
            <span className="display-1">🚧</span>
          </div>
          <h4 className="mb-3">Under Construction</h4>
          <p className="lead text-muted mb-4">
            {description || 'This page is currently being developed.'}
          </p>
          <Alert variant="info" className="text-start">
            <strong>📍 Route:</strong> {window.location.pathname}<br />
            <strong>👤 Role:</strong> {role}<br />
            <strong>🕒 Status:</strong> Coming Soon
          </Alert>
          <Button variant="primary" onClick={() => navigate(-1)} className="mt-3">
            ← Go Back
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PlaceholderPage;