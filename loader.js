(function () {
  "use strict";

  var RUNTIME_URL = "https://raw.githubusercontent.com/enoz3/digitaledu-chat-loader/main/runtime.json";
  var RUNTIME_MIRROR_URL = "https://cdn.jsdelivr.net/gh/enoz3/digitaledu-chat-loader@main/runtime.json";
  var DEFAULT_BASE_URL = "https://roy-canberra-ent-barn.trycloudflare.com";
  var DEFAULT_SECONDARY_BASE_URL = "https://engineering-moral-activation-zealand.trycloudflare.com";
  var WIDGET_LOAD_TIMEOUT_MS = 8000;

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

  function uniqueBases(values) {
    var result = [];
    var seen = {};
    for (var i = 0; i < values.length; i += 1) {
      var value = normalizeBaseUrl(values[i]);
      if (!value) continue;
      if (seen[value]) continue;
      seen[value] = true;
      result.push(value);
    }
    return result;
  }

  function resolveFallbacks(sourceScript) {
    var attrBase = sourceScript ? sourceScript.getAttribute("data-fallback-base-url") : "";
    var attrSecondary = sourceScript ? sourceScript.getAttribute("data-secondary-base-url") : "";
    var dataBase = sourceScript ? sourceScript.getAttribute("data-base-url") : "";
    return {
      fallbackBase: normalizeBaseUrl(attrBase) || normalizeBaseUrl(dataBase) || DEFAULT_BASE_URL,
      secondaryBase: normalizeBaseUrl(attrSecondary) || DEFAULT_SECONDARY_BASE_URL
    };
  }

  function loadWidgetScript(baseUrl, sourceScript, runtime) {
    return new Promise(function (resolve, reject) {
      var normalizedBase = normalizeBaseUrl(baseUrl);
      if (!normalizedBase) {
        reject(new Error("invalid_base"));
        return;
      }

      if (
        (typeof window.customElements !== "undefined" &&
          window.customElements.get &&
          window.customElements.get("ccdlc-chat-widget")) ||
        document.querySelector("ccdlc-chat-widget")
      ) {
        resolve();
        return;
      }

      var widgetScript = document.createElement("script");
      var finished = false;
      var timer = setTimeout(function () {
        finalize(new Error("widget_load_timeout"));
      }, WIDGET_LOAD_TIMEOUT_MS);

      function finalize(error) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (error) {
          if (widgetScript.parentNode) {
            widgetScript.parentNode.removeChild(widgetScript);
          }
          reject(error);
          return;
        }
        widgetScript.setAttribute("data-ccdlc-widget", "1");
        resolve();
      }

      widgetScript.src = normalizedBase + "/widget.js";
      widgetScript.setAttribute("data-base-url", normalizedBase);
      widgetScript.setAttribute("data-ccdlc-widget", "pending");

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

      widgetScript.onload = function () {
        finalize(null);
      };
      widgetScript.onerror = function () {
        finalize(new Error("widget_load_failed"));
      };

      document.head.appendChild(widgetScript);
    });
  }

  function injectWidgetCandidates(candidates, sourceScript, runtime) {
    var queue = uniqueBases(candidates || []);
    if (queue.length === 0) return;
    var index = 0;

    function tryNext() {
      if (index >= queue.length) return;
      var nextBase = queue[index];
      index += 1;
      loadWidgetScript(nextBase, sourceScript, runtime || {}).catch(function () {
        tryNext();
      });
    }

    tryNext();
  }

  function boot() {
    var sourceScript = getCurrentScript();
    var fallback = resolveFallbacks(sourceScript);

    readRuntime(RUNTIME_URL)
      .catch(function () {
        return readRuntime(RUNTIME_MIRROR_URL);
      })
      .then(function (runtime) {
        var runtimeBase = runtime && runtime.base_url ? runtime.base_url : "";
        var runtimeSecondary = runtime && runtime.secondary_base_url ? runtime.secondary_base_url : "";
        injectWidgetCandidates(
          [runtimeBase, fallback.fallbackBase, runtimeSecondary, fallback.secondaryBase],
          sourceScript,
          runtime || {}
        );
      })
      .catch(function () {
        injectWidgetCandidates([fallback.fallbackBase, fallback.secondaryBase], sourceScript, {});
      });
  }

  boot();
})();