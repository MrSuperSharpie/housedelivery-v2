import type { HomeConfiguratorDefinition, HomeRoomLookCategory } from "@/data/home-configurator";
import { canonicalHomeConfiguratorChapters } from "@/data/home-configurator-architecture";
import assets from "@/data/home-lookbook-assets.json";
import { models } from "@/data/models";

const model = models.find((home) => home.slug === "salt-spring");
if (!model) throw new Error("Salt Spring model is unavailable.");
const interiorChapters = canonicalHomeConfiguratorChapters.filter((chapter) => chapter.id !== "exterior-arrival-openings" && chapter.id !== "windows-patio-doors");
const interiors = (["a", "b"] as const).flatMap((residence) => interiorChapters.map((chapter): HomeRoomLookCategory => ({
  kind: "room-look",
  id: `residence-${residence}-${chapter.id}`,
  number: chapter.number,
  residence,
  title: `Residence ${residence.toUpperCase()} / ${chapter.title}`,
  shortTitle: `${residence.toUpperCase()} / ${chapter.title}`,
  description: `Choose the ${chapter.title.toLowerCase()} for Residence ${residence.toUpperCase()}. This selection is independent of the other residence and does not change the shared exterior.`,
  represents: ["Coordinated interior finishes", "Residence-specific project review"],
  options: assets.filter((asset) => asset.homeId === "salt-spring" && asset.categoryId === chapter.id).map((asset) => ({
    id: `residence-${residence}-${asset.id}`,
    level: asset.level as "premium" | "signature",
    optionNumber: asset.optionNumber,
    name: asset.name,
    editorial: { descriptors: [asset.name], storyFragments: [asset.name.toLowerCase()], materialRole: chapter.title },
    image: { src: asset.src, alt: `Salt Spring Duplex, Residence ${residence.toUpperCase()}, ${chapter.title}, ${asset.name}.`, fit: "contain", role: "design-board", quality: 100 },
  })),
})));
const exteriorAsset = assets.find((asset) => asset.homeId === "salt-spring" && asset.level === "shared");
if (!exteriorAsset) throw new Error("Salt Spring shared exterior is unavailable.");
const exterior: HomeRoomLookCategory = {
  kind: "room-look", id: "exterior-arrival-openings", number: "07", residence: "shared",
  title: "Shared Exterior Arrival & Openings", shortTitle: "Shared Exterior",
  description: "One exterior applies to the entire duplex: both entries and garages, cladding, window and patio frames, exterior hardware and lighting. Interior tiers never change this design.",
  represents: ["Both entries and garages", "Cladding and render", "Window and patio frames", "Exterior hardware and lighting"],
  options: [{ id: "salt-spring-shared-exterior", level: "premium", shared: true, optionNumber: "1", name: "Shared Exterior", image: { src: exteriorAsset.src, alt: "Salt Spring Duplex shared exterior for Residence A and Residence B.", fit: "contain", role: "design-board", quality: 100 } }],
};
const categories = [...interiors, exterior];
export const saltSpringHomeConfigurator: HomeConfiguratorDefinition = {
  configurationVersion: 1, homeId: model.slug, homeName: "Salt Spring", residenceLabel: "Salt Spring Duplex",
  architecturalImages: [{src:model.heroImage,alt:"Salt Spring Duplex exterior."},{src:model.images[1],alt:"Salt Spring Duplex interior."}],
  disclaimer: "Representative finish directions, adapted separately to each residence during project review. One shared exterior applies to the whole building. Final products, quantities, technical suitability and pricing require project confirmation.",
  categories,
  lookBook: {
    home: { id: model.slug, name: "Salt Spring", residenceLabel: "Salt Spring Duplex", areaLabel: `${model.squareFeet.toLocaleString()} sq. ft.`, description: model.description, heroImage: {src:model.heroImage,alt:"Salt Spring Duplex."}, metadata: [{label:"Residences",value:"A + B"},{label:"Area",value:`${model.squareFeet.toLocaleString()} sq. ft.`}] },
    sections: categories.map((category,index) => ({kind:"selection-story",layout:"cinematic-hero",id:category.id,number:String(index+1).padStart(2,"0"),title:category.title,introduction:category.description,items:[{categoryId:category.id,presentation:"hero"}]})),
    nextStageSteps: [{title:"House Delivery Review",description:"Review the independent Residence A and B interior schedules and one shared exterior."},{title:"Product + Project Confirmation",description:"Confirm products, quantities, availability and project pricing for each residence."},{title:"Project-Specific Visualization",description:"Develop the selected finish brief to suit each residence's plan."}],
    preliminaryNotice: "This Look Book is a preliminary finish brief, not a final construction specification, quotation, engineering package or permit document.",
  },
};
