const {
  AndroidConfig,
  withAndroidColors,
  withAndroidColorsNight,
} = require('expo/config-plugins');

const { assignColorValue } = AndroidConfig.Colors;

/**
 * expo-image-picker-ийн crop дэлгэц (ExpoCropImageActivity) өнгөө
 * res/values{,-night}/colors.xml доторх эдгээр нэрээс уншдаг —
 * ExpoCropImageUtils.applyPaletteToOptions-ыг үз.
 *
 * Номын сангийн default нь toolbar-ыг ил тод (#00000000) орхидог тул crop хийж
 * буй зураг toolbar-ын ард харагдаж, товчнуудтай давхцдаг. Dark mode дээр icon
 * болон текст нь цагаан болохоор цайвар зурган дээр бүр мөсөн алга болдог.
 *
 * SDK 56-аас эхлэн expo-image-picker plugin өөрөө `colors` тохиргоо авдаг
 * болсон ч суулгасан 17.0.11 (SDK 54) дээр байхгүй тул resource-ыг нь шууд
 * бичиж өгнө. App-ийн resource номын сангийнхыг дардаг.
 *
 * Апп бүхэлдээ light дизайнтай учир light, night хоёуланд нь ижил утга онооно.
 */
const CROP_COLORS = {
  expoCropToolbarColor: '#ffffff',
  expoCropToolbarIconColor: '#222222',
  expoCropToolbarActionTextColor: '#222222',
  expoCropBackButtonIconColor: '#222222',
  expoCropBackgroundColor: '#ffffff',
};

function assignAll(colors) {
  return Object.entries(CROP_COLORS).reduce(
    (acc, [name, value]) => assignColorValue(acc, { name, value }),
    colors
  );
}

module.exports = function withImagePickerCropColors(config) {
  config = withAndroidColors(config, (cfg) => {
    cfg.modResults = assignAll(cfg.modResults);
    return cfg;
  });

  return withAndroidColorsNight(config, (cfg) => {
    cfg.modResults = assignAll(cfg.modResults);
    return cfg;
  });
};
