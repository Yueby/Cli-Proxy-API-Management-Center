import kimiLightLogo from '@/assets/icons/kimi-light.svg';
import kimiDarkLogo from '@/assets/icons/kimi-dark.svg';
import type { ProviderBrand } from './types';

export interface ProviderBrandLogo {
  src: string;
  darkSrc?: string;
  transparent?: boolean;
  themeSurface?: boolean;
}

export const PROVIDER_LOGOS: Partial<Record<ProviderBrand, ProviderBrandLogo>> = {
  kimi: {
    src: kimiDarkLogo,
    darkSrc: kimiLightLogo,
    transparent: true,
    themeSurface: true,
  },
};
