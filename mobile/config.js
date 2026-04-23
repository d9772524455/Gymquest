// API host used by the WebView. Edit DEV_API_URL if testing against a local server.
// In production builds (__DEV__ === false) this file always exports PROD_API_URL.
const PROD_API_URL = 'https://gymquest.ru';
const DEV_API_URL = 'https://gymquest.ru'; // replace with e.g. 'http://192.168.1.10:3000' when testing locally

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
