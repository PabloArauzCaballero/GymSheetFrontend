module.exports = function (api) {
  api.cache(true);
  return {
    // Desde SDK 54 `babel-preset-expo` añade solo el plugin de worklets que
    // necesita Reanimated 4. Listarlo a mano lo duplicaría.
    presets: ['babel-preset-expo'],
  };
};
