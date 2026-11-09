import type {
  HomeInclusionOption,
  HomeInclusionLevel,
} from "@/data/home-configurator";
import type {
  CanonicalHomeConfiguratorChapterId,
  HomeProductFamily,
} from "@/data/home-configurator-architecture";

export type HomeDesignPackageScope =
  | { kind: "shared" }
  | { kind: "home-specific"; homeId: string };

export type HomeDesignPackage = {
  packageId: string;
  chapterId: CanonicalHomeConfiguratorChapterId;
  scope: HomeDesignPackageScope;
  compatibleProductFamilies?: readonly HomeProductFamily[];
  option: HomeInclusionOption;
};

export type HomeDesignPackageReference = {
  packageId: string;
  overrides?: {
    id?: string;
    level?: HomeInclusionLevel;
    optionNumber?: string;
    name?: string;
    description?: string;
  };
};

export type HomeDesignPackageResolutionContext = {
  homeId: string;
  productFamily: HomeProductFamily;
  chapterId: CanonicalHomeConfiguratorChapterId;
};

export type ResolvedHomeDesignPackageOption = HomeInclusionOption & {
  sourcePackageId: string;
  sourceScope: HomeDesignPackageScope;
};

export type HomeDesignPackageLibrary = Readonly<
  Record<string, HomeDesignPackage>
>;

export function createHomeDesignPackageLibrary(
  packages: readonly HomeDesignPackage[],
): HomeDesignPackageLibrary {
  const library: Record<string, HomeDesignPackage> = {};

  for (const designPackage of packages) {
    if (library[designPackage.packageId]) {
      throw new Error(
        `Duplicate home design package: ${designPackage.packageId}`,
      );
    }
    library[designPackage.packageId] = designPackage;
  }

  return library;
}

export function resolveHomeDesignPackageReference(
  library: HomeDesignPackageLibrary,
  reference: HomeDesignPackageReference,
  context: HomeDesignPackageResolutionContext,
): ResolvedHomeDesignPackageOption {
  const designPackage = library[reference.packageId];

  if (!designPackage) {
    throw new Error(`Unknown home design package: ${reference.packageId}`);
  }
  if (designPackage.chapterId !== context.chapterId) {
    throw new Error(
      `${reference.packageId} belongs to ${designPackage.chapterId}, not ${context.chapterId}.`,
    );
  }
  if (
    designPackage.scope.kind === "home-specific" &&
    designPackage.scope.homeId !== context.homeId
  ) {
    throw new Error(
      `${reference.packageId} is restricted to ${designPackage.scope.homeId}.`,
    );
  }
  if (
    designPackage.scope.kind === "shared" &&
    designPackage.compatibleProductFamilies &&
    !designPackage.compatibleProductFamilies.includes(context.productFamily)
  ) {
    throw new Error(
      `${reference.packageId} is not approved for ${context.productFamily}.`,
    );
  }

  return {
    ...designPackage.option,
    ...reference.overrides,
    sourcePackageId: designPackage.packageId,
    sourceScope: designPackage.scope,
  };
}

export function resolveHomeDesignPackageReferences(
  library: HomeDesignPackageLibrary,
  references: readonly HomeDesignPackageReference[],
  context: HomeDesignPackageResolutionContext,
) {
  return references.map((reference) =>
    resolveHomeDesignPackageReference(library, reference, context),
  );
}

// Populate only after architecture-neutral or home-specific artwork is approved.
export const houseDeliveryDesignPackageLibrary =
  createHomeDesignPackageLibrary([]);
