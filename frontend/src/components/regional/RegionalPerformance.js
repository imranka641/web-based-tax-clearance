import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const RegionalPerformance = () => {
    return (
        <Container className="mt-4">
            <h2>📈 Regional Performance</h2>
            <Row className="mt-4">
                <Col md={6}>
                    <Card>
                        <Card.Header>Collection Target</Card.Header>
                        <Card.Body>
                            <h3>78% Achieved</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card>
                        <Card.Header>Compliance Rate</Card.Header>
                        <Card.Body>
                            <h3>85%</h3>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default RegionalPerformance;