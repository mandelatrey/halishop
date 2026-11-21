"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/lib/actions/shops";
import "./favorite.css";

/**
 * Follow a shop. `favorite` is null when signed out: the heart then takes the
 * buyer to sign in and brings them back to the shop.
 */
export default function FavoriteButton({ slug, favorite }: { slug: string; favorite: boolean | null }) {
  const [on, setOn] = useState(!!favorite);
  const [pending, start] = useTransition();
  const router = useRouter();
  const label = on ? "Saved to your favourites" : "Save this shop";
  return (
    <button
      type="button"
      className={`by-fav${on ? " on" : ""}`}
      aria-pressed={favorite === null ? undefined : on}
      aria-label={favorite === null ? "Sign in to save this shop" : label}
      title={favorite === null ? "Sign in to save this shop" : label}
      disabled={pending}
      onClick={() => {
        if (favorite === null) {
          router.push(`/login?next=${encodeURIComponent(`/shop/${slug}`)}`);
          return;
        }
        setOn(!on); // optimistic
        start(async () => {
          const res = await toggleFavorite(slug);
          setOn(res.favorite);
        });
      }}
    >
      <Heart size={16} aria-hidden fill={on ? "currentColor" : "none"} />
      <span className="by-fav-l">{on ? "Saved" : "Save"}</span>
    </button>
  );
}
