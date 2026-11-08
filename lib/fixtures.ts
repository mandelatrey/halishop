import type { BrandKit, Product, ShopContact } from "./types";

export const DEFAULT_BRAND_KIT: BrandKit = {
  shopName: "SHANIA COLLECTIONS",
  shopUrl: "shop.app/shania",
  palette: {
    primary: "#201e1d",
    accent: "#135aed",
    harmony: "complementary",
  },
  frame: "Bar",
  whatsapp: "+256772145908",
  alwaysShow: {
    price: true,
    code: true,
    shopLink: true,
    variants: false,
    whatsapp: false,
  },
};

export const DEFAULT_CONTACT: ShopContact = {
  whatsapp: "+256772145908",
  area: "Ntinda",
  cityCopy: "delivery today in Kampala",
  city: "Kampala",
};

export const DEFAULT_REF_PREFIX = "SH-4F2";

export const SEED_PRODUCTS: Product[] = [
  {
    code: "B3",
    title: "T-shirt black",
    price: 35000,
    currency: "UGX",
    category: "clothing",
    variantLabel: "Sizes",
    variants: ["S", "M", "L", "XL"],
    stock: 4,
    description: "100% cotton. Still available in every size.",
  },
  {
    code: "C1",
    title: "Jeans straight",
    price: 40000,
    currency: "UGX",
    category: "clothing",
    variantLabel: "Waist",
    variants: ["30", "32", "34"],
    stock: 2,
    description: "Straight fit denim, 2 left.",
  },
  {
    code: "C4",
    title: "Hoodie grey",
    price: 55000,
    currency: "UGX",
    category: "clothing",
    variantLabel: "Sizes",
    variants: ["S", "M", "L"],
    stock: 3,
    description: "Fleece-lined, oversized fit.",
  },
  {
    code: "E1",
    title: "Wireless earbuds",
    price: 120000,
    currency: "UGX",
    category: "electronics",
    variantLabel: "Colour",
    variants: ["Black", "White"],
    stock: 6,
    description: "USB-C case, 30-hour total playback.",
  },
  {
    code: "H2",
    title: "Scented candle",
    price: 22000,
    currency: "UGX",
    category: "home",
    variantLabel: "Scent",
    variants: ["Vanilla", "Sandalwood", "Citrus"],
    stock: 12,
    description: "Soy wax, 40-hour burn.",
  },
  {
    code: "B7",
    title: "T-shirt white",
    price: 35000,
    currency: "UGX",
    category: "clothing",
    variantLabel: "Sizes",
    variants: [],
    stock: 0,
    soldOut: true,
    description: "Sold out — restock next week.",
  },
];
