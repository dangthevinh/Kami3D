import { Boxes, Car, Landmark, PawPrint, Rocket, Sprout, type LucideIcon } from "lucide-react";

/**
 * A lucide icon by name.
 *
 * `categories.icon` holds a **name** ("Rocket", "Sprout"), because the database has no business
 * knowing about glyphs and an id is not a component. This map is the one place a name becomes a
 * component, and an unknown name gets a box rather than crashing a page - a category an operator added
 * with a typo should look plain, not take the route down.
 *
 * The list is deliberately short: it is the icons the catalogue actually uses, not all of lucide.
 * Importing the whole set would put a few hundred kilobytes into the first paint of a page that draws
 * five glyphs.
 */
const ICONS: Record<string, LucideIcon> = {
  PawPrint,
  Rocket,
  Sprout,
  Car,
  Landmark,
};

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name ? ICONS[name] : undefined) ?? Boxes;
  return <Icon className={className} aria-hidden />;
}
