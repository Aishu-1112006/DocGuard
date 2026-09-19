import { useState, createContext, useContext } from "react";

export const translations = {
  en: {
    app_title: "DOCGUARD",
    tagline: "AI-Powered Identity & Document Screening System",
    welcome: "Welcome",
    officer: "Officer",
    supervisor: "Supervisor",
    admin: "Admin",
    passenger: "Passenger",
    logout: "Logout",
    login: "Sign In",
    signup: "Register Account",
    screening_queue: "Screening Queue",
    new_screening: "+ New Screening",
    total_handled: "Total Handled",
    approved_cleared: "Approved / Cleared",
    under_review: "Under Review",
    high_risk: "Flagged / High Risk",
    reappeal_requests: "Re-Appeal Requests",
    view_reappeals: "View Re-Appeals",
    recent_cases: "Your Recent Screening Cases",
    no_cases: "No screening cases yet. Click 'New Screening' to start.",
    select_airport: "Select Duty Airport",
    airport_hint: "Choose the international checkpoint for this screening session.",
    document_upload: "Document Upload",
    live_camera: "Live Passenger Camera",
    forensic_analysis: "Forensic Analysis & Verification",
    risk_assessment: "Explainable Risk Assessment",
    verdict: "Officer Verdict",
    reappeal_portal: "Passenger Re-Appeal Portal",
    historical_intelligence: "Historical Border Intelligence",
    analytics: "Operational Analytics",
    audit_logs: "Audit Logs",
    system_health: "System Health",
    clear: "Clear / Approve",
    review: "Secondary Review",
    escalate: "Escalate Case",
    reject: "Reject Case",
    status: "Status",
    risk_score: "Risk Score",
    action: "Action",
    submit_appeal: "Submit Re-Appeal",
    assistant_placeholder: "Ask AI Assistant about your screening status...",
  },
  ta: {
    app_title: "DOCGUARD",
    tagline: "செயற்கை நுண்ணறிவு ஆவண மற்றும் அடையாள சரிபார்ப்பு அமைப்பு",
    welcome: "வரவேற்கிறோம்",
    officer: "அதிகாரி",
    supervisor: "மேற்பார்வையாளர்",
    admin: "நிர்வாகி",
    passenger: "பயணி",
    logout: "வெளியேறு",
    login: "உள்நுழைவு",
    signup: "பதிவு செய்க",
    screening_queue: "சரிபார்ப்பு வரிசை",
    new_screening: "+ புதிய சரிபார்ப்பு",
    total_handled: "மொத்தம் கையாண்டவை",
    approved_cleared: "அனுமதிக்கப்பட்டது",
    under_review: "ஆய்வில் உள்ளது",
    high_risk: "அதிக ஆபத்து",
    reappeal_requests: "மறுமுறையீட்டு கோரிக்கைகள்",
    view_reappeals: "மறுமுறையீடுகளை காண்க",
    recent_cases: "உங்கள் சமீபத்திய சரிபார்ப்புகள்",
    no_cases: "இதுவரை சரிபார்ப்புகள் ஏதுமில்லை.",
    select_airport: "விமான நிலையத்தை தேர்வு செய்க",
    airport_hint: "இந்த சோதனைக்கான சர்வதேச விமான நிலையத்தை தேர்வு செய்யவும்.",
    document_upload: "ஆவண பதிவேற்றம்",
    live_camera: "நேரலை கேமரா",
    forensic_analysis: "தடயவியல் பகுப்பாய்வு",
    risk_assessment: "ஆபத்து மதிப்பீடு",
    verdict: "அதிகாரியின் முடிவு",
    reappeal_portal: "பயணி மறுமுறையீட்டு தளம்",
    historical_intelligence: "வரலாற்று எல்லை உளவு",
    analytics: "செயல்பாட்டு பகுப்பாய்வு",
    audit_logs: "தணிக்கை பதிவுகள்",
    system_health: "அமைப்பின் நிலை",
    clear: "அனுமதி தருக",
    review: "இரண்டாம் கட்ட ஆய்வு",
    escalate: "உயர்மட்ட ஆய்வு",
    reject: "நிராகரி",
    status: "நிலை",
    risk_score: "ஆபத்து புள்ளி",
    action: "நடவடிக்கை",
    submit_appeal: "மறுமுறையீடு சமர்ப்பி",
    assistant_placeholder: "உங்கள் சரிபார்ப்பு நிலை குறித்து கேளுங்கள்...",
  },
  hi: {
    app_title: "DOCGUARD",
    tagline: "एआई-संचालित पहचान एवं दस्तावेज़ जांच प्रणाली",
    welcome: "स्वागत है",
    officer: "अधिकारी",
    supervisor: "पर्यवेक्षक",
    admin: "प्रशासक",
    passenger: "यात्री",
    logout: "लॉग आउट",
    login: "साइन इन",
    signup: "रजिस्टर करें",
    screening_queue: "स्क्रीनिंग कतार",
    new_screening: "+ नई स्क्रीनिंग",
    total_handled: "कुल संसाधित",
    approved_cleared: "स्वीकृत / साफ़",
    under_review: "समीक्षाधीन",
    high_risk: "उच्च जोखिम",
    reappeal_requests: "पुनर्याचिका अनुरोध",
    view_reappeals: "पुनर्याचिका देखें",
    recent_cases: "आपके हालिया स्क्रीनिंग मामले",
    no_cases: "अभी तक कोई मामला नहीं है।",
    select_airport: "हवाई अड्डा चुनें",
    airport_hint: "इस सत्र के लिए अंतर्राष्ट्रीय हवाई अड्डा चुनें।",
    document_upload: "दस्तावेज़ अपलोड",
    live_camera: "लाइव कैमरा",
    forensic_analysis: "फॉरेंसिक विश्लेषण",
    risk_assessment: "जोखिम मूल्यांकन",
    verdict: "अधिकारी का निर्णय",
    reappeal_portal: "यात्री पुनर्याचिका पोर्टल",
    historical_intelligence: "ऐतिहासिक सीमा खुफिया",
    analytics: "परिचालन विश्लेषण",
    audit_logs: "ऑडिट लॉग",
    system_health: "सिस्टम स्वास्थ्य",
    clear: "स्वीकृत करें",
    review: "द्वितीयक समीक्षा",
    escalate: "आगे बढ़ाएं",
    reject: "अस्वीकार करें",
    status: "स्थिति",
    risk_score: "जोखिम स्कोर",
    action: "कार्रवाई",
    submit_appeal: "पुनर्याचिका जमा करें",
    assistant_placeholder: "अपनी स्थिति के बारे में एआई सहायक से पूछें...",
  }
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("docguard_lang") || "en");

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem("docguard_lang", newLang);
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
