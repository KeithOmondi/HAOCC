// middlewares/sanitize.js
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss";

export const sanitizeMiddleware = (app) => {
  // Prevent MongoDB operator injection
  app.use((req, res, next) => {
    if (req.body) {
      mongoSanitize.sanitize(req.body, {
        replaceWith: "_",
        onSanitize: ({ key }) => {
          console.log(`🧹 Sanitized from body: ${key}`);
        },
      });
    }
    if (req.params) {
      mongoSanitize.sanitize(req.params, {
        replaceWith: "_",
        onSanitize: ({ key }) => {
          console.log(`🧹 Sanitized from params: ${key}`);
        },
      });
    }
    next();
  });

  // Prevent XSS attacks (sanitize all strings)
  app.use((req, res, next) => {
    const sanitizeStrings = (obj, location) => {
      for (let key in obj) {
        if (typeof obj[key] === "string") {
          const clean = xss(obj[key]);
          if (clean !== obj[key]) {
            console.log(`⚠️ XSS cleaned in ${location}: ${key}`);
          }
          obj[key] = clean;
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          sanitizeStrings(obj[key], location);
        }
      }
    };

    if (req.body) sanitizeStrings(req.body, "body");
    if (req.params) sanitizeStrings(req.params, "params");
    if (req.query) sanitizeStrings(req.query, "query");

    next();
  });
};
