import { getApiBaseUrl } from './src/lib/config.ts';

console.log('Testing environment configuration...');
console.log('VITE_API_BASE_URL:', process.env.VITE_API_BASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// This would be called from browser context, so let's simulate
global.window = {
  location: {
    hostname: 'localhost'
  }
};

try {
  const apiUrl = getApiBaseUrl();
  console.log('Resolved API URL:', apiUrl);
} catch (error) {
  console.error('Error:', error.message);
}
