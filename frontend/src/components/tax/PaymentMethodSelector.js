import React from 'react';
import { Card, Form, Row, Col, Image } from 'react-bootstrap';

const PaymentMethodSelector = ({ methods, selected, onChange }) => {
    return (
        <Card className="mb-4 border-warning">
            <Card.Header className="bg-light">
                <h5 className="mb-0">Step 2: Select Payment Method</h5>
            </Card.Header>
            <Card.Body>
                <Row>
                    {methods.map(method => (
                        <Col md={6} key={method.id} className="mb-3">
                            <Card 
                                className={`payment-method-card ${selected === method.id ? 'border-primary selected' : ''}`}
                                onClick={() => onChange(method.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <Card.Body className="d-flex align-items-center">
                                    <div className="me-3">
                                        {method.name.includes('Telebirr') && '📱'}
                                        {method.name.includes('Bank') && '🏦'}
                                    </div>
                                    <div>
                                        <h6 className="mb-1">{method.name}</h6>
                                        <small className="text-muted">Account: {method.account_number}</small>
                                    </div>
                                    {selected === method.id && (
                                        <div className="ms-auto text-primary">✓</div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Card.Body>
        </Card>
    );
};

export default PaymentMethodSelector;