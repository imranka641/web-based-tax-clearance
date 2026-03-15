import React from 'react';
import { Card, Badge, ProgressBar, ListGroup } from 'react-bootstrap';

const ProfileStatus = ({ profile }) => {
    const getVerificationStatus = () => {
        if (!profile) return { text: 'Not Started', color: 'secondary', progress: 0 };
        
        switch(profile.verification_status) {
            case 'verified':
                return { text: 'Verified', color: 'success', progress: 100 };
            case 'pending':
                return { text: 'Pending Review', color: 'warning', progress: 50 };
            case 'rejected':
                return { text: 'Rejected', color: 'danger', progress: 25 };
            default:
                return { text: 'Not Started', color: 'secondary', progress: 0 };
        }
    };

    const status = getVerificationStatus();

    return (
        <Card className="shadow-sm mb-4">
            <Card.Header>
                <h5 className="mb-0">Profile Status</h5>
            </Card.Header>
            <Card.Body>
                <div className="text-center mb-3">
                    <Badge bg={status.color} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                        {status.text}
                    </Badge>
                </div>
                
                <ProgressBar 
                    now={status.progress} 
                    variant={status.color} 
                    className="mb-3"
                    label={`${status.progress}%`}
                />

                <ListGroup variant="flush">
                    <ListGroup.Item>
                        <strong>Documents:</strong>{' '}
                        {profile?.tax_certificate_path ? '✅ Uploaded' : '❌ Pending'}
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <strong>Business License:</strong>{' '}
                        {profile?.business_license_path ? '✅ Uploaded' : '❌ Pending'}
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <strong>Financial Data:</strong>{' '}
                        {profile?.last_year_income ? '✅ Provided' : '❌ Pending'}
                    </ListGroup.Item>
                </ListGroup>
            </Card.Body>
        </Card>
    );
};

export default ProfileStatus;