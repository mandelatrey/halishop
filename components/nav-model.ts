// What the top nav shows, per visitor. Plain data (icon names, not components)
// so the server-built model can be handed to the client menus.

export type NavIcon = "store" | "user" | "inbox" | "package" | "plus" | "template" | "gallery" | "palette" | "settings" | "login";
export type NavItem = { href: string; label: string; icon: NavIcon };
export type NavModel = {
  links: NavItem[];
  /** The one filled action: "Sell on Haali", or a seller's "View shop". */
  cta?: NavItem;
  /** Signed out: the sign-in link. */
  signIn?: NavItem;
  /** Signed in: who, for the account menu. */
  account?: { name: string; phone: string; seller: boolean };
};

export function navFor(user: { name: string; phone: string; shopSlug?: string } | null): NavModel {
  if (!user) {
    return {
      links: [{ href: "/shops", label: "Shops", icon: "store" }],
      signIn: { href: "/login", label: "Sign in", icon: "login" },
      cta: { href: "/signup?as=seller", label: "Sell on Haali", icon: "store" },
    };
  }
  const account = { name: user.name, phone: user.phone, seller: !!user.shopSlug };
  if (!user.shopSlug) {
    return {
      links: [
        { href: "/shops", label: "Shops", icon: "store" },
        { href: "/account", label: "My account", icon: "user" },
      ],
      account,
    };
  }
  return {
    links: [
      { href: "/orders", label: "Orders", icon: "inbox" },
      { href: "/products", label: "Products", icon: "package" },
      { href: "/drops/new", label: "New drop", icon: "plus" },
      { href: "/templates", label: "Templates", icon: "template" },
      { href: "/storefront", label: "Shop page", icon: "gallery" },
      { href: "/brand-kit", label: "Brand kit", icon: "palette" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
    cta: { href: `/shop/${user.shopSlug}`, label: "View shop", icon: "store" },
    account,
  };
}
