import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { useLanguage } from '../../contexts/LanguageContext';

const LanguageSelector = () => {
    const { language, changeLanguage } = useLanguage();

    const languages = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
        { code: 'om', name: 'Afaan Oromoo', flag: '🇪🇹' },
        { code: 'so', name: 'Soomaali', flag: '🇪🇹' }
    ];

    const getCurrentLanguage = () => {
        const current = languages.find(lang => lang.code === language);
        return current || languages[0];
    };

    return (
        <Dropdown align="end">
            <Dropdown.Toggle variant="outline-light" size="sm" id="language-dropdown">
                <span className="me-1">{getCurrentLanguage().flag}</span>
                <span className="d-none d-md-inline">{getCurrentLanguage().name}</span>
            </Dropdown.Toggle>

            <Dropdown.Menu>
                {languages.map((lang) => (
                    <Dropdown.Item
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        active={language === lang.code}
                    >
                        <span className="me-2">{lang.flag}</span>
                        {lang.name}
                        {language === lang.code && <span className="ms-2">✓</span>}
                    </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default LanguageSelector;