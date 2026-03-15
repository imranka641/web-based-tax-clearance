import React, { createContext, useState, useContext, useEffect } from 'react';

// Create context
const LanguageContext = createContext();

// Language translations
const translations = {
    en: {
        // App
        appName: "Ethiopian Tax Clearance System",
        welcome: "Welcome",
        
        // Navigation
        nav: {
            superAdmin: "⚡ Super Admin",
            regionalAdmin: "🏞️ Regional Admin",
            townAdmin: "🏛️ Town Admin",
            taxpayer: "💼 Taxpayer",
            dashboard: "Dashboard",
            profile: "👤 Profile",
            logout: "🚪 Logout",
            login: "🔐 Login",
            register: "📝 Register",
            about: "ℹ️ About",
            contact: "📞 Contact",
            
            // Taxpayer links
            tccApplications: "📋 TCC Applications",
            payTaxes: "💰 Pay Taxes",
            paymentHistory: "📈 Payment History",
            deadlines: "📅 Deadlines",
            taxCalculator: "🧮 Tax Calculator",
            taxPredictions: "🔮 Tax Predictions",
            financialDashboard: "📊 Financial Dashboard",
            
            // Town Admin links
            townDashboard: "📊 Dashboard",
            taxManager: "📋 Tax Manager",
            reviewReceipts: "📄 Review Receipts",
            tccReview: "📋 TCC Applications",
            statistics: "📈 Statistics",
            townReports: "📊 Town Reports",
            
            // Regional Admin links
            regionalDashboard: "📊 Dashboard",
            manageTowns: "🏘️ Manage Towns",
            townAdmins: "👥 Town Admins",
            regionalTaxTypes: "📋 Tax Types",
            regionalReports: "📊 Regional Reports",
            performance: "📈 Performance",
            
            // Super Admin links
            adminDashboard: "📊 Dashboard",
            manageRegions: "🗺️ Manage Regions",
            manageTowns: "🏘️ Manage Towns",
            manageUsers: "👥 Manage Users",
            systemSettings: "⚙️ System Settings",
            nationalReports: "📈 National Reports"
        },
        
        // Common
        common: {
            submit: "Submit",
            cancel: "Cancel",
            save: "Save",
            edit: "Edit",
            delete: "Delete",
            view: "View",
            download: "Download",
            search: "Search",
            filter: "Filter",
            status: "Status",
            actions: "Actions",
            date: "Date",
            amount: "Amount",
            description: "Description",
            loading: "Loading...",
            success: "Success",
            error: "Error",
            warning: "Warning",
            info: "Information",
            back: "Back",
            next: "Next",
            previous: "Previous",
            confirm: "Confirm",
            processing: "Processing..."
        },
        
        // Auth
        auth: {
            email: "Email",
            password: "Password",
            confirmPassword: "Confirm Password",
            fullName: "Full Name",
            tin: "TIN",
            phone: "Phone",
            businessName: "Business Name",
            region: "Region",
            town: "Town",
            createAccount: "Create Account",
            login: "Login",
            register: "Register",
            noAccount: "Don't have an account?",
            haveAccount: "Already have an account?",
            forgotPassword: "Forgot Password?",
            loginFailed: "Login failed. Please try again."
        },
        
        // Taxpayer Dashboard
        taxpayer: {
            dashboard: "Taxpayer Dashboard",
            currentYearTax: "Current Year Tax",
            nextYearPrediction: "Next Year Prediction",
            totalPaid: "Total Paid (YTD)",
            paymentStatus: "Payment Status",
            tccStatus: "TCC Status",
            eligible: "Eligible",
            notEligible: "Not Eligible",
            payNow: "PAY NOW",
            viewDetails: "View Details",
            recentDeclarations: "Recent Declarations",
            futurePredictions: "Future Predictions",
            quickActions: "Quick Actions",
            yourCategory: "Your Tax Category",
            complianceStatus: "Compliance Status",
            profileVerification: "Profile Verification",
            complete: "Complete",
            pending: "Pending",
            upToDate: "Up to Date",
            goodStanding: "Good Standing"
        },
        
        // TCC
        tcc: {
            apply: "Apply for TCC",
            myApplications: "My TCC Applications",
            applicationNumber: "Application #",
            purpose: "Purpose",
            submittedDate: "Submitted Date",
            status: "Status",
            certificateNumber: "Certificate #",
            validUntil: "Valid Until",
            actions: "Actions",
            download: "Download",
            view: "View",
            approved: "Approved",
            rejected: "Rejected",
            pending: "Pending",
            businessLicenseRenewal: "Business License Renewal",
            bankLoan: "Bank Loan",
            governmentTender: "Government Tender",
            taxClearance: "Tax Clearance",
            other: "Other"
        },
        
        // Payment
        payment: {
            taxPayment: "Tax Payment",
            amountDue: "Amount Due",
            paymentMethod: "Payment Method",
            accountNumber: "Account Number",
            uploadReceipt: "Upload Receipt",
            confirmPayment: "Confirm Payment",
            submitForVerification: "Submit for Verification",
            paymentHistory: "Payment History",
            paymentDate: "Payment Date",
            transactionId: "Transaction ID",
            verifiedBy: "Verified By",
            receipt: "Receipt",
            telebirr: "Telebirr",
            cbe: "Commercial Bank of Ethiopia",
            awash: "Awash Bank",
            dashen: "Dashen Bank"
        },
        
        // Admin
        admin: {
            pendingReviews: "Pending Reviews",
            totalTaxpayers: "Total Taxpayers",
            totalCollected: "Total Collected",
            complianceRate: "Compliance Rate",
            approve: "Approve",
            reject: "Reject",
            needsMoreInfo: "Needs More Info",
            review: "Review",
            verify: "Verify",
            category: "Category",
            formula: "Formula",
            minIncome: "Min Income",
            maxIncome: "Max Income",
            requiresReview: "Requires Review",
            autoApprove: "Auto-Approve",
            createCategory: "Create Category",
            editCategory: "Edit Category",
            taxpayerList: "Taxpayer List",
            unpaidTaxes: "Unpaid Taxes",
            generateReport: "Generate Report"
        },
        
        // Languages
        languages: {
            en: "English",
            am: "አማርኛ",
            om: "Afaan Oromoo",
            so: "Soomaali"
        }
    },
    
    am: {
        // App
        appName: "የኢትዮጵያ ግብር ንጹህነት ሲስተም",
        welcome: "እንኳን ደህና መጡ",
        
        // Navigation
        nav: {
            superAdmin: "⚡ ከፍተኛ አስተዳዳሪ",
            regionalAdmin: "🏞️ ክልል አስተዳዳሪ",
            townAdmin: "🏛️ የከተማ አስተዳዳሪ",
            taxpayer: "💼 ግብር ከፋይ",
            dashboard: "ዳሽቦርድ",
            profile: "👤 መገለጫ",
            logout: "🚪 ውጣ",
            login: "🔐 ግባ",
            register: "📝 ተመዝገብ",
            about: "ℹ️ ስለ እኛ",
            contact: "📞 አግኙን",
            
            // Taxpayer links
            tccApplications: "📋 የTCC ማመልከቻዎች",
            payTaxes: "💰 ግብር ክፈሉ",
            paymentHistory: "📈 የክፍያ ታሪክ",
            deadlines: "📅 የጊዜ ገደቦች",
            taxCalculator: "🧮 ግብር ማስያ",
            taxPredictions: "🔮 የግብር ትንበያ",
            financialDashboard: "📊 የፋይናንስ ዳሽቦርድ",
            
            // Town Admin links
            townDashboard: "📊 ዳሽቦርድ",
            taxManager: "📋 የግብር አስተዳዳሪ",
            reviewReceipts: "📄 ደረሰኞችን መርምር",
            tccReview: "📋 የTCC ማመልከቻዎች",
            statistics: "📈 ስታቲስቲክስ",
            townReports: "📊 የከተማ ሪፖርቶች",
            
            // Regional Admin links
            regionalDashboard: "📊 ዳሽቦርድ",
            manageTowns: "🏘️ ከተሞችን አስተዳድር",
            townAdmins: "👥 የከተማ አስተዳዳሪዎች",
            regionalTaxTypes: "📋 የግብር አይነቶች",
            regionalReports: "📊 ክልላዊ ሪፖርቶች",
            performance: "📈 አፈጻጸም",
            
            // Super Admin links
            adminDashboard: "📊 ዳሽቦርድ",
            manageRegions: "🗺️ ክልሎችን አስተዳድር",
            manageTowns: "🏘️ ከተሞችን አስተዳድር",
            manageUsers: "👥 ተጠቃሚዎችን አስተዳድር",
            systemSettings: "⚙️ የሲስተም ቅንብሮች",
            nationalReports: "📈 ብሔራዊ ሪፖርቶች"
        },
        
        // Common
        common: {
            submit: "አስገባ",
            cancel: "ሰርዝ",
            save: "አስቀምጥ",
            edit: "አርትዕ",
            delete: "ሰርዝ",
            view: "ተመልከት",
            download: "አውርድ",
            search: "ፈልግ",
            filter: "አጣራ",
            status: "ሁኔታ",
            actions: "ድርጊቶች",
            date: "ቀን",
            amount: "መጠን",
            description: "መግለጫ",
            loading: "በመጫን ላይ...",
            success: "ተሳክቷል",
            error: "ስህተት",
            warning: "ማስጠንቀቂያ",
            info: "መረጃ",
            back: "ተመለስ",
            next: "ቀጣይ",
            previous: "ቀዳሚ",
            confirm: "አረጋግጥ",
            processing: "በሂደት ላይ..."
        },
        
        // Auth
        auth: {
            email: "ኢሜይል",
            password: "የይለፍ ቃል",
            confirmPassword: "የይለፍ ቃል አረጋግጥ",
            fullName: "ሙሉ ስም",
            tin: "ቲን",
            phone: "ስልክ",
            businessName: "የንግድ ስም",
            region: "ክልል",
            town: "ከተማ",
            createAccount: "መለያ ፍጠር",
            login: "ግባ",
            register: "ተመዝገብ",
            noAccount: "መለያ የለዎትም?",
            haveAccount: "ቀድሞውኑ መለያ አለዎት?",
            forgotPassword: "የይለፍ ቃል ረስተዋል?",
            loginFailed: "መግባት አልተሳካም። እንደገና ይሞክሩ።"
        }
    },
    
    om: {
        // App
        appName: "Sistimii Qulqullina Gibirii Itoophiyaa",
        welcome: "Baga Nagaan Dhuftan",
        
        // Navigation
        nav: {
            superAdmin: "⚡ Admin Guddaa",
            regionalAdmin: "🏞️ Admin Naannoo",
            townAdmin: "🏛️ Admin Magaalaa",
            taxpayer: "💼 Gibirii Kaffalu",
            dashboard: "Dashboard",
            profile: "👤 Profile",
            logout: "🚪 Ba'i",
            login: "🔐 Seeni",
            register: "📝 Galmee",
            about: "ℹ️ Waa'ee",
            contact: "📞 Quunnamti",
            
            // Taxpayer links
            tccApplications: "📋 Iyyata TCC",
            payTaxes: "💰 Gibirii Kaffal",
            paymentHistory: "📈 Seenaa Kaffaltii",
            deadlines: "📅 Yeroo Xumuraa",
            taxCalculator: "🧮 Herrega Gibirii",
            taxPredictions: "🔮 Raagi Gibirii",
            financialDashboard: "📊 Dashboordii Maallaqaa",
            
            // Town Admin links
            townDashboard: "📊 Dashboordii",
            taxManager: "📋 Bulchaa Gibirii",
            reviewReceipts: "📄 Risiitii Mirkaneessi",
            tccReview: "📋 Iyyata TCC",
            statistics: "📈 Istaatistiksii",
            townReports: "📊 Gabaasa Magaalaa",
            
            // Regional Admin links
            regionalDashboard: "📊 Dashboordii",
            manageTowns: "🏘️ Bulchuu Magaalota",
            townAdmins: "👥 Admin Magaalota",
            regionalTaxTypes: "📋 Gosa Gibirii",
            regionalReports: "📊 Gabaasa Naannoo",
            performance: "📈 Hojii",
            
            // Super Admin links
            adminDashboard: "📊 Dashboordii",
            manageRegions: "🗺️ Bulchuu Naannolee",
            manageTowns: "🏘️ Bulchuu Magaalota",
            manageUsers: "👥 Bulchuu Fayyadamtoota",
            systemSettings: "⚙️ Sirreeffama Sistimii",
            nationalReports: "📈 Gabaasa Biyyaalessaa"
        },
        
        // Common
        common: {
            submit: "Ergi",
            cancel: "Haqi",
            save: "Qabi",
            edit: "Gulaali",
            delete: "Haqi",
            view: "Ilaali",
            download: "Buusi",
            search: "Barbaadi",
            filter: "Calali",
            status: "Haala",
            actions: "Gochoota",
            date: "Guyyaa",
            amount: "Baay'ina",
            description: "Ibsa",
            loading: "Fe'aa...",
            success: "Milkaa'ee",
            error: "Dogoggora",
            warning: "Akeekka",
            info: "Odeeffannoo",
            back: "Duuba",
            next: "Itti aanu",
            previous: "Kan duraa",
            confirm: "Mirkaneessi",
            processing: "Hojiirra..."
        },
        
        // Auth
        auth: {
            email: "Imeelii",
            password: "Jecha Iggita",
            confirmPassword: "Jecha Iggita Mirkaneessi",
            fullName: "Maqaa Guutuu",
            tin: "TIN",
            phone: "Bilbila",
            businessName: "Maqaa Daldalaa",
            region: "Naannoo",
            town: "Magaalaa",
            createAccount: "Akaawuntii Uumi",
            login: "Seeni",
            register: "Galmee",
            noAccount: "Akaawuntii hin qabduu?",
            haveAccount: "Duraanii akaawuntii qabduu?",
            forgotPassword: "Jecha iggita dagattee?",
            loginFailed: "Seenuun milkaa'ee hin jiru. Irra deebii yaali."
        }
    },
    
    so: {
        // App
        appName: "Nidaamka Canshuurta Itoobiya",
        welcome: "Soo Dhawaaw",
        
        // Navigation
        nav: {
            superAdmin: "⚡ Maamule Sare",
            regionalAdmin: "🏞️ Maamule Gobol",
            townAdmin: "🏛️ Maamule Magaalo",
            taxpayer: "💼 Bixiyaha Canshuurta",
            dashboard: "Dashboard",
            profile: "👤 Profile",
            logout: "🚪 Ka Bixi",
            login: "🔐 Gali",
            register: "📝 Isdiiwaan geli",
            about: "ℹ️ Ku saabsan",
            contact: "📞 La xiriir",
            
            // Taxpayer links
            tccApplications: "📋 Codsiyada TCC",
            payTaxes: "💰 Bixi Canshuurta",
            paymentHistory: "📈 Taariikhda Bixinta",
            deadlines: "📅 Wakhtiyada Dhamaadka",
            taxCalculator: "🧮 Xisaabiyaha Canshuurta",
            taxPredictions: "🔮 Saadaasha Canshuurta",
            financialDashboard: "📊 Dashboard-ka Maaliyadda",
            
            // Town Admin links
            townDashboard: "📊 Dashboard",
            taxManager: "📋 Maamulaha Canshuurta",
            reviewReceipts: "📄 Hubi Rasiidka",
            tccReview: "📋 Codsiyada TCC",
            statistics: "📈 Tirakoob",
            townReports: "📊 Warbixinta Magaalada",
            
            // Regional Admin links
            regionalDashboard: "📊 Dashboard",
            manageTowns: "🏘️ Maamul Magaalooyinka",
            townAdmins: "👥 Maamulayaasha Magaalooyinka",
            regionalTaxTypes: "📋 Noocyada Canshuurta",
            regionalReports: "📊 Warbixinta Gobolka",
            performance: "📈 Waxqabadka",
            
            // Super Admin links
            adminDashboard: "📊 Dashboard",
            manageRegions: "🗺️ Maamul Gobollada",
            manageTowns: "🏘️ Maamul Magaalooyinka",
            manageUsers: "👥 Maamul Isticmaalayaasha",
            systemSettings: "⚙️ Dejinta Nidaamka",
            nationalReports: "📈 Warbixinta Qaranka"
        },
        
        // Common
        common: {
            submit: "Gudbi",
            cancel: "Jooji",
            save: "Kaydi",
            edit: "Wax ka badal",
            delete: "Tirtir",
            view: "Eeg",
            download: "Soo deji",
            search: "Raadi",
            filter: "Shaandheey",
            status: "Xaalad",
            actions: "Ficillo",
            date: "Taariikh",
            amount: "Qadarka",
            description: "Sharaxaad",
            loading: "Soconaya...",
            success: "Guul",
            error: "Khalad",
            warning: "Digniin",
            info: "Macluumaad",
            back: "Dib u noqo",
            next: "Xiga",
            previous: "Hore",
            confirm: "Xaqiiji",
            processing: "Wax ka qabasho socota..."
        },
        
        // Auth
        auth: {
            email: "Iimayl",
            password: "Furaha",
            confirmPassword: "Xaqiiji Furaha",
            fullName: "Magaca Oo Dhan",
            tin: "TIN",
            phone: "Telefoon",
            businessName: "Magaca Ganacsiga",
            region: "Gobol",
            town: "Magaalo",
            createAccount: "Abuur Akoon",
            login: "Gali",
            register: "Isdiiwaan geli",
            noAccount: "Akoon ma lihid?",
            haveAccount: "Horey akoon u lihid?",
            forgotPassword: "Furaha waa iloowday?",
            loginFailed: "Galitaankii wuu fashilmay. Fadlan markale isku day."
        }
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');

    useEffect(() => {
        // Load saved language from localStorage
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage && translations[savedLanguage]) {
            setLanguage(savedLanguage);
        }
    }, []);

    const changeLanguage = (langCode) => {
        if (translations[langCode]) {
            setLanguage(langCode);
            localStorage.setItem('language', langCode);
            // Set dir attribute for RTL languages if needed
            document.documentElement.dir = 'ltr'; // All Ethiopian languages are LTR
            document.documentElement.lang = langCode;
        }
    };

    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];
        
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                console.warn(`Translation missing for key: ${key} in language: ${language}`);
                // Fallback to English
                let fallback = translations.en;
                for (const fk of keys) {
                    fallback = fallback?.[fk];
                }
                return fallback || key;
            }
        }
        
        return value || key;
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};