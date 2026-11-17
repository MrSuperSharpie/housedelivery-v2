import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import type { HomeInclusionOption } from "@/data/home-configurator";
import type { StoredLookBook, StoredLookBookSelection } from "./types";

export const lookBookAssetOrigin = "https://www.housedelivery.ca";
export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
}
export function verifiedEmailChoices(record: StoredLookBook) {
  const definition = getHomeConfiguratorRegistration(record.homeFamily, record.homeSlug)?.definition;
  if (!definition || definition.homeId !== record.configuration.homeId) return [];
  const choices: StoredLookBookSelection[] = [];
  const add = (categoryId: string, categoryTitle: string, option: HomeInclusionOption | undefined, zoneId?: string, zoneTitle?: string) => {
    if (option) choices.push({ categoryId, categoryTitle, ...(zoneId ? { zoneId, zoneTitle } : {}), optionId: option.id, optionName: option.name, tier: option.shared ? "shared" : option.level });
  };
  for (const category of definition.categories) {
    if (category.kind === "coordinated") continue;
    if (category.kind === "flooring") {
      for (const zone of category.zones) {
        const selected = record.configuration.flooringSelections[zone.id];
        if (selected?.status === "confirmed") add(category.id, category.title, zone.options.find(o => o.id === selected.optionId), zone.id, zone.title);
      }
    } else {
      const selected = record.configuration.inclusionSelections[category.id];
      if (selected?.status === "confirmed") add(category.id, category.title, category.options.find(o => o.id === selected.optionId));
    }
  }
  // Canonical option records, not submitted labels or inferred materials.
  const order = (c: StoredLookBookSelection) => /kitchen/i.test(c.categoryId) ? 0 : /floor/i.test(c.categoryId) ? 1 : /ensuite|bath/i.test(c.categoryId) ? 2 : 3;
  return choices.sort((a, b) => order(a) - order(b)).filter((c, i, all) => all.findIndex(p => p.categoryId === c.categoryId) === i).slice(0, 3);
}
export function designAppreciation(record: StoredLookBook) {
  const choices = verifiedEmailChoices(record);
  if (choices.length < 2) return "Your Look Book gives your ideas a place to come together—a personal design direction to revisit and make your own.";
  const space = (c: StoredLookBookSelection) => /kitchen/i.test(c.categoryId) ? "kitchen" : /floor/i.test(c.categoryId) ? "flooring and stairs" : /ensuite/i.test(c.categoryId) ? "primary ensuite" : (c.zoneTitle ?? c.categoryTitle).replace(/look\s*&\s*feel/ig, "").trim().toLowerCase();
  const tier = (c: StoredLookBookSelection) => c.tier === "shared" ? "" : c.tier === "signature" ? "Signature " : "Premium ";
  const join = (items: string[]) => items.length === 2 ? items.join(" and ") : items.slice(0,-1).join(", ") + ", and " + items.at(-1);
  const home = record.homeDisplayName.replace(/^The\s+/i, "");
  if (choices.every(c => c.optionName === choices[0].optionName && c.tier === choices[0].tier)) {
    const direction = `“${choices[0].optionName}” ${tier(choices[0])}selections`;
    return choices[0].tier === "signature"
      ? `Your ${direction} bring a consistent design direction to the ${join(choices.map(space))}. Those choices give your ${home} Look Book its own character.`
      : `There’s a considered thread to your ${direction} across the ${join(choices.map(space))}. It’s a personal direction, beautifully brought together in your ${home} Look Book.`;
  }
  const label = (c: StoredLookBookSelection) => `“${c.optionName}” ${tier(c)}direction for the ${space(c)}`;
  return `You’ve paired your ${label(choices[0])} with the ${label(choices[1])}.${choices[2] ? ` Your ${label(choices[2])} adds another personal detail.` : " Together, they give your Look Book a character of its own."}`;
}
export function lookBookLinks(record: StoredLookBook, origin: string) {
  const root = new URL(origin);
  if (!/^https:$/.test(root.protocol) && !(root.protocol === "http:" && ["localhost", "127.0.0.1"].includes(root.hostname))) throw Error("Invalid Look Book origin");
  if (root.username || root.password) throw Error("Invalid Look Book origin");
  const view = new URL(`/lookbook/${record.id}`, root.origin).href;
  return { view, download: `${view}/pdf?disposition=attachment`, project: `${view}#check-my-property` };
}
export function renderCustomerLookBookEmail(record: StoredLookBook, origin: string) {
  const definition = getHomeConfiguratorRegistration(record.homeFamily, record.homeSlug)?.definition;
  const name = record.homeDisplayName.replace(/^The\s+/i, ""), links = lookBookLinks(record, origin);
  const image = definition?.lookBook.home.heroImage;
  const hero = image && image.src.startsWith("/") ? new URL(image.src, lookBookAssetOrigin).href : undefined;
  const logo = `${lookBookAssetOrigin}/images/brand/house-delivery-logo-tan.png`;
  const appreciation = designAppreciation(record), e = escapeEmailHtml;
  const subject = `Your ${name} Look Book. Beautifully done.`;
  const preheader = "Your design selections, beautifully brought together.";
  // Fulfilment only: the project invitation stays on the website, not in this
  // delivery email. Requesting a Look Book never grants marketing consent.
  const paragraphs = ["There’s something special about seeing your ideas come together.", "And we have to say, you have an eye for design.", appreciation, "Your personalized Look Book brings everything together, ready to revisit, enjoy and share."];
  const text = ["HOUSE DELIVERY | DESIGN STUDIO", "You’ve made it yours.", `Your ${name}. Your personal touch.`, `Hi ${record.contact.firstName},`, ...paragraphs, `VIEW MY LOOK BOOK: ${links.view}`, `DOWNLOAD MY LOOK BOOK: ${links.download}`, "Thank you for designing with House Delivery. We hope you’ve enjoyed the experience.", "The House Delivery Team", "This email fulfils your Look Book request. You are not subscribed to marketing emails.", "Questions? hello@housedelivery.ca", `${lookBookAssetOrigin}/privacy`].join("\n\n");
  const p = (value: string) => `<p style="margin:0 0 20px;font:16px/27px Arial,Helvetica,sans-serif;color:#45443e">${e(value)}</p>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(subject)}</title><style>@media only screen and (max-width:620px){.email-shell{width:100%!important}.email-content{padding:30px 24px!important}.email-title{font-size:38px!important;line-height:40px!important}.email-logo{width:168px!important}}</style></head><body style="margin:0;padding:0;background:#0b0c10"><div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${e(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b0c10"><tr><td align="center" style="padding:24px 0"><!--[if mso]><table role="presentation" width="640" align="center"><tr><td><![endif]--><table role="presentation" class="email-shell" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#efeee8"><tr><td style="padding:34px 40px;background:#0b0c10"><img class="email-logo" src="${logo}" width="190" alt="House Delivery" style="display:block;width:190px;max-width:100%;height:auto;border:0"><p style="margin:24px 0 0;font:10px/18px Arial,Helvetica,sans-serif;letter-spacing:2px;color:#d8c8aa">HOUSE DELIVERY | DESIGN STUDIO</p></td></tr>${hero ? `<tr><td><img src="${e(hero)}" width="640" alt="${e(name)} — architectural design reference" style="display:block;width:100%;max-width:640px;height:auto;border:0"></td></tr>` : ""}<tr><td class="email-content" style="padding:40px"><p style="margin:0 0 18px;font:10px/18px Arial,Helvetica,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#6b6354">Your personal Look Book</p><h1 class="email-title" style="margin:0 0 22px;font:normal 48px/50px Arial,Helvetica,sans-serif;letter-spacing:-2px;color:#0b0c10">You’ve made<br>it yours.</h1><p style="margin:0 0 32px;font:22px/30px Arial,Helvetica,sans-serif;letter-spacing:-.5px;color:#0b0c10">Your ${e(name)}. Your personal touch.</p>${p(`Hi ${record.contact.firstName},`)}${paragraphs.map(p).join("")}<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 22px"><tr><td bgcolor="#0b0c10" style="background:#0b0c10;padding:18px 24px"><a href="${e(links.view)}" style="font:bold 11px/18px Arial,Helvetica,sans-serif;letter-spacing:1.4px;text-decoration:none;color:#ffffff;display:inline-block">VIEW MY LOOK BOOK</a></td></tr></table><p style="margin:0 0 32px;font:12px/22px Arial,Helvetica,sans-serif"><a href="${e(links.download)}" style="color:#0b0c10;text-decoration:underline">Download My Look Book</a></p><div style="border-top:1px solid #b8b2a6;padding-top:28px">${p("Thank you for designing with House Delivery. We hope you’ve enjoyed the experience.")}<p style="margin:0;font:16px/26px Arial,Helvetica,sans-serif;color:#0b0c10">The House Delivery Team</p></div></td></tr><tr><td class="email-content" style="padding:28px 40px;background:#e3dfd4"><p style="margin:0 0 10px;font:12px/20px Arial,Helvetica,sans-serif;color:#56544d">This email fulfils your Look Book request. You’re not subscribed to marketing emails.</p><p style="margin:0;font:12px/22px Arial,Helvetica,sans-serif;color:#56544d"><a href="mailto:hello@housedelivery.ca" style="color:#45443e">hello@housedelivery.ca</a> &nbsp;·&nbsp; <a href="${lookBookAssetOrigin}/privacy" style="color:#45443e">Privacy</a></p></td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
  return { subject, preheader, html, text, links, choices: verifiedEmailChoices(record) };
}
