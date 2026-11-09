import Link from "next/link";

import {
  cmhcCatalogueReferenceDate,
  cmhcCatalogueTermsHref,
  cmhcOfficialTermsPdfHref,
} from "@/data/cmhc-catalogue";
import { cn } from "@/lib/cn";

type CmhcCatalogueNoticeProps = {
  designName?: string;
  className?: string;
};

export function CmhcCatalogueAttribution({
  designName,
  className,
}: {
  designName: string;
  className?: string;
}) {
  return (
    <p className={className}>
      Drawings and renderings. Source: Canada Mortgage and Housing Corporation
      (CMHC), Housing Design Catalogue — {designName}, British Columbia, reference
      date: {cmhcCatalogueReferenceDate}. This information is reproduced and
      distributed on an “as is” basis with the permission of CMHC.
    </p>
  );
}

export function CmhcCatalogueNotice({
  designName,
  className,
}: CmhcCatalogueNoticeProps) {
  return (
    <div className={cn("space-y-3 text-xs leading-6 text-white/60", className)}>
      <Link
        href={cmhcCatalogueTermsHref}
        className="inline-flex min-h-11 items-center font-medium text-white/80 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        CMHC Terms and Conditions
      </Link>
      <p>
        <Link
          href={cmhcCatalogueTermsHref}
          className="underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          CMHC catalogue drawings are subject to the CMHC Housing Design
          Catalogue User Terms and Conditions.
        </Link>
      </p>
      <a
        href={cmhcOfficialTermsPdfHref}
        className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        Official CMHC terms (PDF)
      </a>
      {designName ? (
        <CmhcCatalogueAttribution designName={designName} />
      ) : null}
    </div>
  );
}
