export const environment = {
  production: false,
  cloudinary: {
    cloudName: 'dpvrv7btt', // TODO: Move to backend env vars for security
    apiKey: '425947453244552', // TODO: Move to backend env vars for security
    uploadPreset: 'rfm_uploads'
  },
  api: {
    baseUrl: 'http://localhost:3001/api'
  },
  payment: {
    gcashNumber: '09171234567',
    gcashName: 'RFM Custom Apparel',
    bankName: 'BDO',
    bankAccountNumber: '1234567890',
    bankAccountName: 'RFM Custom Apparel'
  }
};
