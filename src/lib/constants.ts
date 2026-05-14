export const LUPPO_UNITS = [
  "LUPPO Provincial Headquarters (Camp Diego Silang)",
  "San Fernando City PS",
  "Agoo MPS",
  "Aringay MPS",
  "Bacnotan MPS",
  "Bagulin MPS",
  "Balaoan MPS",
  "Bangar MPS",
  "Bauang MPS",
  "Burgos MPS",
  "Caba MPS",
  "Luna MPS",
  "Naguilian MPS",
  "Pugo MPS",
  "San Gabriel MPS",
  "San Juan MPS",
  "Santo Tomas MPS",
  "Santol MPS",
  "Sudipen MPS",
  "Tubao MPS",
  "1st La Union PMFC",
  "2nd La Union PMFC",
] as const;

export const NAME_QUALIFIERS = ["Jr.", "Sr.", "II", "III", "IV", "V"] as const;

export const TODAY = new Date();
export const MAX_BIRTHDATE = new Date(
  TODAY.getFullYear() - 18,
  TODAY.getMonth(),
  TODAY.getDate()
)
  .toISOString()
  .split("T")[0];
export const MIN_BIRTHDATE = new Date(
  TODAY.getFullYear() - 70,
  TODAY.getMonth(),
  TODAY.getDate()
)
  .toISOString()
  .split("T")[0];
