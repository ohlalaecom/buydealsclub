export interface Deal {
  id: string;
  title: string;
  description: string;
  [key: string]: any;
}

export interface DealTranslation {
  deal_id: string;
  language: string;
  title: string;
  description: string;
}

export function getTranslatedDeal(
  deal: Deal,
  translations: DealTranslation[] | null,
  language: string
): Deal {
  if (!translations || language === 'en') {
    return deal;
  }

  const translation = translations.find(
    (t) => t.deal_id === deal.id && t.language === language
  );

  if (!translation) {
    return deal;
  }

  return {
    ...deal,
    title: translation.title,
    description: translation.description,
  };
}
