import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from '../locales/en.json';
import translationKO from '../locales/ko.json';
import translationJA from '../locales/ja.json';

const resources = {
  en: {
    translation: translationEN
  },
  ko: {
    translation: translationKO
  },
  ja: {
    translation: translationJA
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ko", 
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;