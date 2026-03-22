import React from "react";
import { CompanyContext } from "../context/CompanyContext";

/**
 * Central hook för licensstatus.
 * Läser companies/{companyId} via CompanyContext och ger tillbaka:
 * - company: företagsdokumentet (eller null)
 * - licenseState: "unknown" | "trial" | "trial_expired" | "active" | "expired"
 * - loading: om CompanyContext fortfarande initieras
 */
export function useCompanyLicense() {
  const { company, licenseState, loading } = React.useContext(CompanyContext);
  return { company, licenseState, loading };
}

