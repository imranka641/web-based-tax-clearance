import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TaxpayerTaxTypes = () => {
    const [taxTypes, setTaxTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTaxTypes();
    }, []);

    const fetchTaxTypes = async () => {
        try {
            const response = await api.get('/taxpayer/available-tax-types');
            setTaxTypes(response.data.tax_types);
        } catch (error) {
            setError('Failed to load tax types');
        } finally {
            setLoading(false);
        }
    };

    const getCalculationTypeBadge = (type) => {
        switch(type) {
            case 'percentage': return <Badge bg="info">Percentage</Badge>;
            case 'fixed': return <Badge bg="success">Fixed</Badge>;
            case 'profit_based': return <Badge bg="primary">Profit Based</Badge>;
            default: return <Badge bg="secondary">{type}</Badge>;
        }
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" />
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <Row>
                <Col>
                    <h2>Available Tax Types</h2>
                    <p className="text-muted">Tax types defined by your town administration</p>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Card className="shadow-sm">
                        <Card.Body>
                            <Table responsive striped hover>
                                <thead>
                                    <tr>
                                        <th>Tax Code</th>
                                        <th>Tax Name</th>
                                        <th>Category</th>
                                        <th>Calculation</th>
                                        <th>Rate/Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {taxTypes.map(tax => (
                                        <tr key={tax.id}>
                                            <td><strong>{tax.tax_code}</strong></td>
                                            <td>{tax.tax_name}</td>
                                            <td>{tax.category_code}</td>
                                            <td>{getCalculationTypeBadge(tax.calculation_type)}</td>
                                            <td>
                                                {tax.calculation_type === 'percentage' && `${tax.percentage_rate}%`}
                                                {tax.calculation_type === 'fixed' && `ETB ${tax.fixed_amount}`}
                                            </td>
                                            <td>
                                                <Button 
                                                    size="sm" 
                                                    variant="primary"
                                                    as={Link}
                                                    to={`/tax/pay/${tax.id}`}
                                                >
                                                    Pay Now
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
        </Container>
    );
};

export default TaxpayerTaxTypes;