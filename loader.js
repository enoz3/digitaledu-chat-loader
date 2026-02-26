(function () {
  "use strict";

  var RUNTIME_URL = "https://raw.githubusercontent.com/enoz3/digitaledu-chat-loader/main/runtime.json";
  var RUNTIME_MIRROR_URL = "https://cdn.jsdelivr.net/gh/enoz3/digitaledu-chat-loader@main/runtime.json";
  var DEFAULT_BASE_URL = "https://imperial-expenditures-cameras-under.trycloudflare.com";

  function getCurrentScript() {
    return (
      document.currentScript ||
      (function () {
        var scripts = document.getElementsByTagName("script");
        return scripts[scripts.length - 1] || null;
      })()
    );
  }

  function normalizeBaseUrl(value) {
    if (!value || typeof value !== "string") return "";
    try {
      var url = new URL(value.trim());
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      return url.origin;
    } catch (e) {
      return "";
    }
  }

  function readRuntime(url) {
    return fetch(url + "?t=" + Date.now(), { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("runtime_fetch_failed:" + res.status);
      return res.json();
    });
  }

  function resolveFallbackBase(sourceScript) {
    var attrBase = sourceScript ? sourceScript.getAttribute("data-fallback-base-url") : "";
    var dataBase = sourceScript ? sourceScript.getAttribute("data-base-url") : "";
    return normalizeBaseUrl(attrBase) || normalizeBaseUrl(dataBase) || DEFAULT_BASE_URL;
  }

  function injectWidget(baseUrl, sourceScript, runtime) {
    var normalizedBase = normalizeBaseUrl(baseUrl);
    if (!normalizedBase) return;
    if (document.querySelector("script[data-ccdlc-widget='1']")) return;

    var widgetScript = document.createElement("script");
    widgetScript.src = normalizedBase + "/widget.js";
    widgetScript.setAttribute("data-base-url", normalizedBase);
    widgetScript.setAttribute("data-ccdlc-widget", "1");

    var avatarAttr = sourceScript && sourceScript.getAttribute("data-avatar");
    var runtimeAvatar = runtime && typeof runtime.avatar_url === "string" ? runtime.avatar_url.trim() : "";
    var avatar = avatarAttr && avatarAttr.trim() ? avatarAttr.trim() : runtimeAvatar;
    if (avatar) {
      widgetScript.setAttribute("data-avatar", avatar);
    }

    var position = sourceScript && sourceScript.getAttribute("data-position");
    if (position === "left" || position === "right") {
      widgetScript.setAttribute("data-position", position);
    }

    document.head.appendChild(widgetScript);
  }

  function boot() {
    var sourceScript = getCurrentScript();
    var fallbackBase = resolveFallbackBase(sourceScript);

    readRuntime(RUNTIME_URL)
      .catch(function () {
        return readRuntime(RUNTIME_MIRROR_URL);
      })
      .then(function (runtime) {
        var base = runtime && runtime.base_url ? runtime.base_url : fallbackBase;
        injectWidget(base, sourceScript, runtime || {});
      })
      .catch(function () {
        if (fallbackBase) {
          injectWidget(fallbackBase, sourceScript, {});
        }
      });
  }

  boot();
})();