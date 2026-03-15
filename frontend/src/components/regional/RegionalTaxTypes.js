import React from 'react';
import { Container, Card, Table } from 'react-bootstrap';

const RegionalTaxTypes = () => {
    return (
        <Container className="mt-4">
            <h2>📋 Regional Tax Types</h2>
            <Card className="mt-4">
                <Card.Body>
                    <Table striped>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Min Income</th>
                                <th>Max Income</th>
                                <th>Tax Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>A</td>
                                <td>Large Enterprises</td>
                                <td>5,000,000</td>
                                <td>Unlimited</td>
                                <td>30% of profit</td>
                            </tr>
                            <tr>
                                <td>B</td>
                                <td>Medium Enterprises</td>
                                <td>1,000,000</td>
                                <td>4,999,999</td>
                                <td>25% of profit</td>
                            </tr>
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default RegionalTaxTypes;