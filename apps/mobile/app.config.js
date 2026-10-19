/* global require, module, process */
/* eslint-disable @typescript-eslint/no-require-imports */
const app = require('./app.json').expo;

function androidMapsApiKey() {
  if (process.env.GOOGLE_MAPS_API_KEY) return process.env.GOOGLE_MAPS_API_KEY;
  try {
    const services = require('./google-services.json');
    return services.client?.find((client) => client.client_info?.android_client_info?.package_name === app.android.package)
      ?.api_key?.find((key) => typeof key.current_key === 'string')?.current_key;
  } catch {
    return undefined;
  }
}

module.exports = {
  ...app,
  plugins: [
    ...app.plugins,
    [
      'react-native-maps',
      { androidGoogleMapsApiKey: androidMapsApiKey() },
    ],
  ],
};
