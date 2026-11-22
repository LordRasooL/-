/*
  اگر بعداً برنامه را تغییر دادی،
  عدد v1 را به v2 و سپس v3 تغییر بده.
*/
const CACHE_NAME = "daftar-mali-offline-v1";

const BASE_URL =
  new URL("./", self.location.href);

const INDEX_URL =
  new URL("./index.html", BASE_URL).href;

const ROOT_URL =
  new URL("./", BASE_URL).href;

const APP_FILES = [
  ROOT_URL,
  INDEX_URL,
  new URL("./manifest.json", BASE_URL).href,
  new URL("./icon.svg", BASE_URL).href
];

/*
  ذخیره فایل‌های برنامه برای استفاده آفلاین
*/
self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache =>
        cache.addAll(APP_FILES)
      )
      .then(() =>
        self.skipWaiting()
      )
  );
});

/*
  حذف حافظه نسخه‌های قدیمی
*/
self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(names =>
        Promise.all(
          names
            .filter(
              name => name !== CACHE_NAME
            )
            .map(
              name => caches.delete(name)
            )
        )
      )
      .then(() =>
        self.clients.claim()
      )
  );
});

/*
  بازکردن برنامه از حافظه هنگام قطع اینترنت
*/
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl =
    new URL(request.url);

  if (
    requestUrl.origin !==
    self.location.origin
  ) {
    return;
  }

  /*
    بازکردن صفحات برنامه
  */
  if (request.mode === "navigate") {
    event.respondWith(
      caches
        .open(CACHE_NAME)
        .then(async cache => {
          const cachedPage =
            await cache.match(INDEX_URL);

          const networkRequest =
            fetch(request)
              .then(response => {
                if (
                  response &&
                  response.ok
                ) {
                  cache.put(
                    INDEX_URL,
                    response.clone()
                  );
                }

                return response;
              });

          if (cachedPage) {
            event.waitUntil(
              networkRequest.catch(() => {})
            );

            return cachedPage;
          }

          try {
            return await networkRequest;
          } catch (error) {
            return (
              await cache.match(ROOT_URL) ||
              await cache.match(INDEX_URL)
            );
          }
        })
    );

    return;
  }

  /*
    فایل‌های دیگر مثل آیکون و manifest
  */
  event.respondWith(
    caches
      .match(request, {
        ignoreSearch: true
      })
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(response => {
            if (
              !response ||
              !response.ok
            ) {
              return response;
            }

            const copy =
              response.clone();

            caches
              .open(CACHE_NAME)
              .then(cache =>
                cache.put(request, copy)
              );

            return response;
          });
      })
  );
});
