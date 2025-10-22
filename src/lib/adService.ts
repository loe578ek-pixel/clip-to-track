import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdMobInitializationOptions, AdOptions } from '@capacitor-community/admob';

// Replace these with your actual AdMob ad unit IDs
const AD_UNITS = {
  banner: {
    android: 'ca-app-pub-3940256099942544/6300978111', // Test ID
    ios: 'ca-app-pub-3940256099942544/2934735716'     // Test ID
  },
  interstitial: {
    android: 'ca-app-pub-3940256099942544/1033173712', // Test ID
    ios: 'ca-app-pub-3940256099942544/4411468910'     // Test ID
  }
};

let isBannerShowing = false;

export const initializeAds = async () => {
  try {
    const options: AdMobInitializationOptions = {
      testingDevices: ['YOUR_TEST_DEVICE_ID'],
      initializeForTesting: true
    };
    await AdMob.initialize(options);
    console.log('AdMob initialized');
  } catch (error) {
    console.error('Failed to initialize AdMob:', error);
  }
};

export const showBannerAd = async (isPremium: boolean) => {
  if (isPremium || isBannerShowing) return;

  try {
    const options: BannerAdOptions = {
      adId: AD_UNITS.banner.android, // Will auto-detect platform
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: true
    };

    await AdMob.showBanner(options);
    isBannerShowing = true;
    console.log('Banner ad shown');
  } catch (error) {
    console.error('Failed to show banner ad:', error);
  }
};

export const hideBannerAd = async () => {
  if (!isBannerShowing) return;

  try {
    await AdMob.hideBanner();
    isBannerShowing = false;
    console.log('Banner ad hidden');
  } catch (error) {
    console.error('Failed to hide banner ad:', error);
  }
};

export const showInterstitialAd = async (isPremium: boolean) => {
  if (isPremium) return;

  try {
    const options: AdOptions = {
      adId: AD_UNITS.interstitial.android, // Will auto-detect platform
      isTesting: true
    };

    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
    console.log('Interstitial ad shown');
  } catch (error) {
    console.error('Failed to show interstitial ad:', error);
  }
};

export const removeBannerAd = async () => {
  try {
    await AdMob.removeBanner();
    isBannerShowing = false;
    console.log('Banner ad removed');
  } catch (error) {
    console.error('Failed to remove banner ad:', error);
  }
};
