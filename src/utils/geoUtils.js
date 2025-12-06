import axios from 'axios';

export const getCountryFromIP = async (ip) => {
  try {
    // Remove local IPs for development
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return { country: 'Local', countryCode: 'LOC' };
    }

    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    return {
      country: response.data.country,
      countryCode: response.data.countryCode
    };
  } catch (error) {
    console.error('Error fetching country from IP:', error);
    return { country: 'Unknown', countryCode: 'UNK' };
  }
};