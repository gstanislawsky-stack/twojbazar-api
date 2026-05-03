(function () {
  const DESKTOP_OVERRIDE_KEY = "twojbazar.desktopMode";
  const DESKTOP_PARAM = "desktop";
  const APP_ENTRY = "/app/index.html?v=20260422-motorola#home";

  const locationRef = window.location;
  const userAgent = (navigator.userAgent || "").toLowerCase();
  const path = locationRef.pathname || "/";

  function isBot(ua) {
    return /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|linkedinbot|google-structured-data-testing-tool|headlesschrome|lighthouse/i.test(ua);
  }

  function isTablet(ua) {
    return /ipad|tablet|playbook|silk|kindle|nexus 7|nexus 9|sm-t|tab/i.test(ua) || (/android/.test(ua) && !/mobile/.test(ua));
  }

  function isPhone(ua) {
    if (/iphone|ipod|windows phone|blackberry|bb10|opera mini|mobile safari/i.test(ua)) {
      return true;
    }

    if (/android/.test(ua) && /mobile|moto|motorola|xt\d{3,5}|edge/i.test(ua)) {
      return true;
    }

    const uaDataMobile = navigator.userAgentData && navigator.userAgentData.mobile === true;
    const coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const touchDevice = navigator.maxTouchPoints > 0 || coarsePointer;
    const viewportWidth = Math.min(window.innerWidth || 0, window.screen.width || 0) || window.innerWidth || 0;
    const smallScreen = Math.min(window.screen.width || 0, window.screen.height || 0) > 0
      ? Math.min(window.screen.width, window.screen.height) <= 820
      : false;

    return Boolean((uaDataMobile || touchDevice) && (smallScreen || (viewportWidth > 0 && viewportWidth <= 820)));
  }

  function readDesktopOverride() {
    try {
      return localStorage.getItem(DESKTOP_OVERRIDE_KEY) === "1";
    } catch (_error) {
      return false;
    }
  }

  function writeDesktopOverride(enabled) {
    try {
      if (enabled) {
        localStorage.setItem(DESKTOP_OVERRIDE_KEY, "1");
      } else {
        localStorage.removeItem(DESKTOP_OVERRIDE_KEY);
      }
    } catch (_error) {
      // Ignore storage errors (private mode, blocked storage).
    }
  }

  const params = new URLSearchParams(locationRef.search || "");

  if (params.get(DESKTOP_PARAM) === "1") {
    writeDesktopOverride(true);
    return;
  }

  if (params.get(DESKTOP_PARAM) === "0") {
    writeDesktopOverride(false);
  }

  if (readDesktopOverride()) {
    return;
  }

  if (isBot(userAgent)) {
    return;
  }

  if (path.startsWith("/app/")) {
    return;
  }

  if (!(path === "/" || path.endsWith("/index.html"))) {
    return;
  }

  if (isTablet(userAgent)) {
    return;
  }

  if (!isPhone(userAgent)) {
    return;
  }

  const targetUrl = new URL(APP_ENTRY, locationRef.origin);

  if ((locationRef.pathname + locationRef.hash) === (targetUrl.pathname + targetUrl.hash)) {
    return;
  }

  locationRef.replace(targetUrl.toString());
})();
