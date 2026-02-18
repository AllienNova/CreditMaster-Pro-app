/**
 * Offers Module
 *
 * Financial product offers, matching, and compliance disclosures.
 */

// Types
export * from "./types";

// Services
export { offerService, default as offerServiceDefault } from "./offer-service";
export {
  disclosureService,
  default as disclosureServiceDefault,
} from "./disclosure-service";
