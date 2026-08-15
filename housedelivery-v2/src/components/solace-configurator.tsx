"use client";

import { useState } from "react";

import { HomeDesignCollections } from "@/components/home-design-collections";
import { MySolaceSummary } from "@/components/my-solace-summary";
import { SolaceKitchenCabinetry } from "@/components/solace-kitchen-cabinetry";
import type {
  HomeDesignDirectionId,
  HomeDesignDirectionsExperience,
} from "@/data/home-design-collections";
import {
  defaultSolaceConfiguration,
  type SolaceConfiguration,
  type SolaceKitchenCabinetryId,
  type SolaceKitchenCabinetryOption,
} from "@/data/solace-configuration";

type SolaceConfiguratorProps = {
  experience: HomeDesignDirectionsExperience;
  kitchenCabinetryOptions: readonly SolaceKitchenCabinetryOption[];
};

export function SolaceConfigurator({
  experience,
  kitchenCabinetryOptions,
}: SolaceConfiguratorProps) {
  const [configuration, setConfiguration] = useState<SolaceConfiguration>(
    defaultSolaceConfiguration,
  );

  const selectedDirection = experience.directions.find(
    (direction) => direction.id === configuration.designDirectionId,
  );
  const selectedCabinetry = kitchenCabinetryOptions.find(
    (option) =>
      option.id === configuration.inclusionSelections.kitchenCabinetry,
  );

  if (!selectedDirection || !selectedCabinetry) {
    throw new Error("The default Solace configuration is invalid.");
  }

  function selectDesignDirection(designDirectionId: HomeDesignDirectionId) {
    setConfiguration((current) => ({
      ...current,
      designDirectionId,
    }));
  }

  function selectKitchenCabinetry(
    kitchenCabinetry: SolaceKitchenCabinetryId,
  ) {
    setConfiguration((current) => ({
      ...current,
      inclusionSelections: {
        ...current.inclusionSelections,
        kitchenCabinetry,
      },
    }));
  }

  return (
    <div
      id="solace-configurator"
      data-solace-configuration="active"
      className="scroll-mt-20"
    >
      <HomeDesignCollections
        experience={experience}
        selectedDirectionId={configuration.designDirectionId}
        onSelectDirection={selectDesignDirection}
      />
      <SolaceKitchenCabinetry
        options={kitchenCabinetryOptions}
        selectedOptionId={configuration.inclusionSelections.kitchenCabinetry}
        onSelectOption={selectKitchenCabinetry}
      />
      <MySolaceSummary
        designDirection={selectedDirection}
        kitchenCabinetry={selectedCabinetry}
      />
    </div>
  );
}
