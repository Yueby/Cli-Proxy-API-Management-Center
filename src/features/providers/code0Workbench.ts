import type { ProviderEntryFormInput, SponsorKeyEntryInput, SponsorProviderRaw } from './types';

export type Code0KeyEntryInput = SponsorKeyEntryInput;
export type Code0ProviderRaw = SponsorProviderRaw;

export const getCode0KeyEntries = (input: ProviderEntryFormInput): Code0KeyEntryInput[] =>
  input.sponsorKeyEntries ?? [];
