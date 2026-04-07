const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 30;

export function toJsDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object" && (value._seconds ?? value.seconds) != null) {
    const seconds = value._seconds ?? value.seconds;
    const parsed = new Date(Number(seconds) * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function getTrialEndDate(company) {
  return toJsDate(company?.trialEndsAt) || toJsDate(company?.licenseValidUntil);
}

export function getTrialDaysLeft(company, now = new Date()) {
  const trialEnd = getTrialEndDate(company);
  if (!trialEnd) return 0;
  const diff = trialEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

export function getTrialProgressPercent(company, now = new Date()) {
  const daysLeft = getTrialDaysLeft(company, now);
  const elapsed = Math.max(0, Math.min(TRIAL_DAYS, TRIAL_DAYS - daysLeft));
  return Math.round((elapsed / TRIAL_DAYS) * 100);
}

export function getTotalSeatCount(company) {
  const trialSeats = Math.max(0, Number(company?.trialLicenseCount) || 0);
  const paidSeats = Math.max(0, Number(company?.licenseCount) || 0);
  return trialSeats + paidSeats;
}

export function hasAccess(company, now = new Date()) {
  if (!company) return false;

  const status = String(company.subscriptionStatus || "").toLowerCase();
  if (status === "active") return true;

  const trialEnd = getTrialEndDate(company);
  if (status === "trialing") {
    return Boolean(trialEnd && trialEnd.getTime() > now.getTime());
  }

  // Bakåtkompatibilitet för äldre dokument som saknar subscriptionStatus.
  if (company.isTrial && trialEnd) {
    return trialEnd.getTime() > now.getTime();
  }

  return !status || status === "trial";
}

export function getLicenseState(company, now = new Date()) {
  if (!company) return "unknown";

  const status = String(company.subscriptionStatus || "").toLowerCase();
  if (status === "trialing" || company.isTrial) {
    return hasAccess(company, now) ? "trial" : "trial_expired";
  }

  if (status === "active" || !status) return "active";
  return hasAccess(company, now) ? "active" : "expired";
}
