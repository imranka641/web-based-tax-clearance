import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const TaxFinancialDashboard = () => {
    return (
        <Container className="mt-4">
            <h2>💰 Tax Financial Dashboard</h2>
            <Row className="mt-4">
                <Col md={4}>
                    <Card className="text-center border-success">
                        <Card.Body>
                            <h3>ETB 115,000</h3>
                            <p>Current Year Tax</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="text-center border-info">
                        <Card.Body>
                            <h3>ETB 345,000</h3>
                            <p>Total Paid (YTD)</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="text-center border-warning">
                        <Card.Body>
                            <h3>ETB 126,500</h3>
                            <p>Next Year Prediction</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default TaxFinancialDashboard;