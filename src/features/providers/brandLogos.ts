import kimiLightLogo from '@/assets/icons/kimi-light.svg';
import kimiDarkLogo from '@/assets/icons/kimi-dark.svg';
import lmuAILogo from '@/assets/icons/lmu-ai.png';
import infistarLogo from '@/assets/icons/infistar.png';
import type { ProviderBrand } from './types';

export interface ProviderBrandLogo {
  src: string;
  darkSrc?: string;
  transparent?: boolean;
  themeSurface?: boolean;
}

export const PROVIDER_LOGOS: Partial<Record<ProviderBrand, ProviderBrandLogo>> = {
  lmuAI: { src: lmuAILogo, transparent: true },
  infistar: { src: infistarLogo, transparent: false },
  kimi: {
    src: kimiDarkLogo,
    darkSrc: kimiLightLogo,
    transparent: true,
    themeSurface: true,
  },
};
