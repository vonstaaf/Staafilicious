/**
 * Enkel loggning för appen. Använd istället för Sentry – lätt att läsa i Metro/Console.
 * I produktion skriver vi bara till console; du kan senare koppla på t.ex. en egen backend.
 */

const PREFIX = "[Workaholic]";

export const logger = {
  log(...args) {
    console.log(PREFIX, ...args);
  },
  info(...args) {
    console.info(PREFIX, ...args);
  },
  warn(...args) {
    console.warn(PREFIX, ...args);
  },
  error(message, error = null) {
    if (error) {
      console.error(PREFIX, message, error?.stack ?? error);
    } else {
      console.error(PREFIX, message);
    }
  },
};

export default logger;
