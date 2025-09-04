export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
  interval?: string;
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_Sq5k2tvP5lWTZX',
    priceId: 'price_1RuPZHRcofW8m11g8UYCoNiX',
    name: 'Monthly subscription for VA claims AI assistant & case support services',
    description: 'Includes access to our intelligent claims assistance chatbot and dedicated guidance throughout the VA decision-making process, helping veterans navigate paperwork, deadlines, and updates with confidence.',
    mode: 'subscription',
    price: 50.00,
    currency: 'usd',
    interval: 'month'
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.id === id);
};