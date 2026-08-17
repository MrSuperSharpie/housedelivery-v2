import type { InclusionImage } from "@/data/inclusions";

export type LookBookCustomer = {
  firstName: string;
  lastName?: string;
};

export type LookBookPersonalization = {
  customer: LookBookCustomer;
  preparedAt: string;
  reference: string;
};

export type LookBookHome = {
  id: string;
  name: string;
  residenceLabel: string;
  areaLabel?: string;
  description: string;
  heroImage: InclusionImage;
  introductionImage?: InclusionImage;
  metadata?: readonly {
    label: string;
    value: string;
  }[];
};

export type LookBookSelectionReference = {
  categoryId: string;
  zoneId?: string;
  label?: string;
  presentation?: "feature" | "supporting" | "flooring-palette";
};

export type LookBookSelection = {
  id: string;
  categoryId: string;
  zoneId?: string;
  label: string;
  optionName: string;
  level: "premium" | "signature";
  description?: string;
  image: InclusionImage;
};

type LookBookSectionBase = {
  id: string;
  number: string;
  title: string;
  introduction: string;
};

export type LookBookSection =
  | (LookBookSectionBase & {
      kind: "selections";
      items: readonly LookBookSelectionReference[];
    })
  | (LookBookSectionBase & {
      kind: "editorial";
      eyebrow: string;
      statement: string;
      body: string;
    });

export type ProjectCoordinatedItem = {
  id: string;
  title: string;
  description: string;
};

export type HomeLookBook = {
  home: LookBookHome;
  sections: readonly LookBookSection[];
  projectCoordinatedItems?: readonly ProjectCoordinatedItem[];
  nextStageSteps: readonly {
    title: string;
    description: string;
  }[];
  preliminaryNotice: string;
};

export function getLookBookCustomerName(customer: LookBookCustomer) {
  return [customer.firstName.trim(), customer.lastName?.trim()]
    .filter(Boolean)
    .join(" ");
}

export function formatLookBookPreparedDate(preparedAt: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(preparedAt));
}

export function createLookBookReference(homeId: string, date = new Date()) {
  const prefix = homeId.slice(0, 3).toUpperCase();
  const dateCode = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(4);
  window.crypto.getRandomValues(values);
  const suffix = Array.from(values, (value) => alphabet[value % alphabet.length]).join("");

  return `${prefix}-${dateCode}-${suffix}`;
}
