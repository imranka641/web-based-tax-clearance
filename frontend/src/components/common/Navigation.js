import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Badge, NavDropdown } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { getToken, getUser, removeToken, removeUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';

const Navigation = () => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        const currentToken = getToken();
        const currentUser = getUser();
        setToken(currentToken);
        setUser(currentUser);
    }, [location]);

    const isSuperAdmin = () => user?.is_super_admin === true;
    const isRegionalAdmin = () => user?.role === 'regional_admin';
    const isTownAdmin = () => user?.role === 'town_admin';
    const isTaxpayer = () => user?.role === 'taxpayer';

    const handleLogout = () => {
        removeToken();
        removeUser();
        setToken(null);
        setUser(null);
        navigate('/login');
    };

    const hideNavOnAuthPages = () => {
        const authPages = ['/login', '/register'];
        return authPages.includes(location.pathname);
    };

    if (hideNavOnAuthPages()) {
        return null;
    }

    const getRoleDisplay = () => {
        if (isSuperAdmin()) return t('nav.superAdmin');
        if (isRegionalAdmin()) return t('nav.regionalAdmin');
        if (isTownAdmin()) return t('nav.townAdmin');
        if (isTaxpayer()) return t('nav.taxpayer');
        return 'User';
    };

    return (
        <Navbar bg="primary" variant="dark" expand="lg" sticky="top">
            <Container>
                <Navbar.Brand href="/">
                    <img
                        src="/ethiopia-flag.png"
                        alt="Ethiopia Flag"
                        style={{ width: '25px', marginRight: '10px' }}
                        onError={(e) => e.target.style.display = 'none'}
                    />
                    🇪🇹 {t('appName')}
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto align-items-center">
                        {/* Language Selector */}
                        <div className="me-2">
                            <LanguageSelector />
                        </div>

                        {token ? (
                            <>
                                {/* SUPER ADMIN */}
                                {isSuperAdmin() && (
                                    <NavDropdown title={t('nav.superAdmin')} id="super-admin-dropdown">
                                        <NavDropdown.Item href="/admin/dashboard">
                                            {t('nav.dashboard')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/regions">
                                            {t('nav.manageRegions')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/towns">
                                            {t('nav.manageTowns')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/users">
                                            {t('nav.manageUsers')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/settings">
                                            {t('nav.systemSettings')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Divider />
                                        <NavDropdown.Item href="/admin/reports">
                                            {t('nav.nationalReports')}
                                        </NavDropdown.Item>
                                    </NavDropdown>
                                )}

                                {/* REGIONAL ADMIN */}
                                {isRegionalAdmin() && (
                                    <NavDropdown title={t('nav.regionalAdmin')} id="regional-admin-dropdown">
                                        <NavDropdown.Item href="/regional/dashboard">
                                            {t('nav.dashboard')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/regional/towns">
                                            {t('nav.manageTowns')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/regional/admins">
                                            {t('nav.townAdmins')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/regional/tax-types">
                                            {t('nav.regionalTaxTypes')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Divider />
                                        <NavDropdown.Item href="/regional/reports">
                                            {t('nav.regionalReports')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/regional/performance">
                                            {t('nav.performance')}
                                        </NavDropdown.Item>
                                    </NavDropdown>
                                )}

                                {/* TOWN ADMIN */}
                                {isTownAdmin() && (
                                    <NavDropdown title={t('nav.townAdmin')} id="town-admin-dropdown">
                                        <NavDropdown.Item href="/town/dashboard">
                                            {t('nav.dashboard')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/town/tax-manager">
                                            {t('nav.taxManager')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/staff/receipt-review">
                                            {t('nav.reviewReceipts')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/town/tcc-reviews">
                                            {t('nav.tccReview')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Divider />
                                        <NavDropdown.Item href="/town/statistics">
                                            {t('nav.statistics')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/town/reports">
                                            {t('nav.townReports')}
                                        </NavDropdown.Item>
                                    </NavDropdown>
                                )}

                                {/* TAXPAYER */}
                                {isTaxpayer() && (
                                    <NavDropdown title={t('nav.taxpayer')} id="taxpayer-dropdown">
                                        <NavDropdown.Item href="/dashboard">
                                            {t('nav.dashboard')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/my-tcc-applications">
                                            {t('nav.tccApplications')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/tcc/apply">
                                            {t('tcc.apply')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/tax/financial-dashboard">
                                            {t('nav.financialDashboard')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/tax/pay/current">
                                            {t('nav.payTaxes')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/tax/history">
                                            {t('nav.paymentHistory')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/tax/deadlines">
                                            {t('nav.deadlines')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Divider />
                                        <NavDropdown.Item href="/tax/calculator">
                                            {t('nav.taxCalculator')}
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/tax/predict">
                                            {t('nav.taxPredictions')}
                                        </NavDropdown.Item>
                                    </NavDropdown>
                                )}

                                {/* COMMON LINKS */}
                                <Nav.Link href="/profile" className="text-white">
                                    {t('nav.profile')}
                                </Nav.Link>

                                {/* LOGOUT */}
                                <Nav.Link onClick={handleLogout} className="text-white" style={{ cursor: 'pointer' }}>
                                    {t('nav.logout')}
                                    <Badge bg="light" text="dark" className="ms-2">
                                        {user?.full_name?.split(' ')[0]} ({getRoleDisplay()})
                                    </Badge>
                                </Nav.Link>
                            </>
                        ) : (
                            <>
                                <Nav.Link href="/login" className="text-white">
                                    {t('nav.login')}
                                </Nav.Link>
                                <Nav.Link href="/register" className="text-white">
                                    {t('nav.register')}
                                </Nav.Link>
                                <Nav.Link href="/about" className="text-white">
                                    {t('nav.about')}
                                </Nav.Link>
                                <Nav.Link href="/contact" className="text-white">
                                    {t('nav.contact')}
                                </Nav.Link>
                            </>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Navigation;