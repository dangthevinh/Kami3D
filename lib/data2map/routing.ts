import { distanceKm, type LatLng } from "../geo.ts";

/**
 * Delivery planning: batching stops onto vehicles, then ordering them.
 *
 * Three things this module is:
 *
 *   1. **pure.** No map, no fetch, no time. It takes points and capacities and returns an order, so
 *      `scripts/check-logistics.mjs` can pin every claim the panel makes about it;
 *   2. **small.** Nearest neighbour plus 2-opt is a few dozen lines and lands within a few percent of
 *      a solver on a day's worth of stops. A vehicle-routing library would be a dependency, a licence
 *      and a bundle for a demo that has neither the real order book nor the real road graph;
 *   3. **honest about what it ignores.** There is no live traffic, no one-way streets, no time
 *      windows in the objective and no driver shifts. `estimateRoute` says what it assumes, the page
 *      prints those assumptions next to the numbers, and the numbers are called estimates.
 *
 * It is a **starting plan**, not a dispatch system, and the panel says that in those words.
 */

export interface Depot extends LatLng {
  id: string;
  name: string;
}

export interface DeliveryStop extends LatLng {
  id: string;
  /** Parcels in kilograms - the only capacity unit this demo has. */
  demandKg: number;
  /** The hour window the customer asked for, inclusive start, exclusive end. */
  window: [number, number];
}

export interface Vehicle {
  id: string;
  name: string;
  capacityKg: number;
  depotId: string;
}

/** What the estimate assumes. Printed in the UI, because every number below depends on it. */
export const ASSUMPTIONS = {
  /** Average speed in Ho Chi Minh City traffic, including stops at lights. */
  speedKmh: 22,
  /** Minutes at the door: park, walk, hand over, sign. */
  serviceMinutes: 6,
  /** Dong per kilometre: fuel plus wear on a small van. */
  costPerKm: 12_000,
  /** Dong per hour of a driver's time, loaded. */
  costPerHour: 60_000,
} as const;

export interface PlannedRoute {
  vehicleId: string;
  depotId: string;
  /** Stop ids in the order they are visited. */
  stopIds: string[];
  /** One-way kilometres: depot, every stop in order, back to the depot. */
  distanceKm: number;
  loadKg: number;
  travelMinutes: number;
  serviceMinutes: number;
  /** Packed hour windows of the stops on this run, for the panel to flag a conflict. */
  conflicts: number;
}

export interface Plan {
  routes: PlannedRoute[];
  totalDistanceKm: number;
  totalMinutes: number;
  /** Stops no vehicle had room for. Reported rather than dropped in silence. */
  unassigned: string[];
  assumed: typeof ASSUMPTIONS;
}

/** Straight-line distance for a leg. Named separately because the UI says "straight-line" too. */
function legKm(a: LatLng, b: LatLng): number {
  return distanceKm(a, b);
}

function tourLength(depot: LatLng, order: readonly number[], points: readonly LatLng[]): number {
  if (order.length === 0) return 0;

  let total = legKm(depot, points[order[0]]);
  for (let i = 1; i < order.length; i += 1) total += legKm(points[order[i - 1]], points[order[i]]);
  return total + legKm(points[order[order.length - 1]], depot);
}

/**
 * Nearest neighbour from the depot.
 *
 * The classic greedy start: always go to the closest stop you have not visited. It is fast, it is
 * deterministic, and it is usually 10-25% worse than optimal - which is exactly why 2-opt follows it.
 */
export function nearestNeighbour(depot: LatLng, points: readonly LatLng[]): number[] {
  const remaining = new Set(points.map((_, index) => index));
  const order: number[] = [];
  let current: LatLng = depot;

  while (remaining.size > 0) {
    let best = -1;
    let bestKm = Number.POSITIVE_INFINITY;

    for (const index of remaining) {
      const km = legKm(current, points[index]);
      if (km < bestKm) {
        bestKm = km;
        best = index;
      }
    }

    remaining.delete(best);
    order.push(best);
    current = points[best];
  }

  return order;
}

/**
 * 2-opt: reverse a segment whenever it shortens the tour, until nothing does.
 *
 * Deterministic and monotone - the length never increases, which is the property the check suite
 * asserts on every pass rather than trusting.
 */
export function twoOpt(depot: LatLng, order: readonly number[], points: readonly LatLng[], maxPasses = 40): number[] {
  if (order.length < 3) return [...order];

  let best = [...order];
  let bestLength = tourLength(depot, best, points);

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let improved = false;

    for (let i = 0; i < best.length - 1; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const candidate = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const length = tourLength(depot, candidate, points);

        if (length < bestLength - 1e-9) {
          best = candidate;
          bestLength = length;
          improved = true;
        }
      }
    }

    if (!improved) break;
  }

  return best;
}

/** Total kilometres of an order, depot to depot. Exported so the panel and the tests agree. */
export function orderDistanceKm(depot: LatLng, order: readonly number[], points: readonly LatLng[]): number {
  return tourLength(depot, order, points);
}

/**
 * How a batch is ordered.
 *
 * `file` is the baseline the page measures against - the stops in the order they arrived, which is
 * what a dispatcher does by hand at 6am. `greedy` is nearest neighbour. `2opt` is the plan.
 * Keeping all three in one function is what makes the comparison honest: same batches, same
 * vehicles, same capacity rule, one difference.
 */
export type RouteStrategy = "file" | "greedy" | "2opt";

export interface PlanInput {
  depots: Depot[];
  stops: DeliveryStop[];
  vehicles: Vehicle[];
  strategy?: RouteStrategy;
}

/**
 * Batching, then ordering.
 *
 * Vehicles are filled in a fixed order - sorted by capacity, largest first, then by id - taking the
 * stops nearest their own depot first. That is a greedy bin-packing, not an optimal assignment, and
 * the panel calls it a starting plan rather than a dispatch decision. What a stop no vehicle had
 * room for is returned in `unassigned`, never dropped: a plan that quietly loses three deliveries is
 * worse than one that says it could not fit them.
 */
export function planRoutes({ depots, stops, vehicles, strategy = "2opt" }: PlanInput): Plan {
  const depotOf = new Map(depots.map((depot) => [depot.id, depot]));
  const routes: PlannedRoute[] = [];
  const unassigned: string[] = [];

  const ordered = [...vehicles].sort((a, b) => b.capacityKg - a.capacityKg || a.id.localeCompare(b.id));
  const taken = new Set<string>();

  for (const vehicle of ordered) {
    const depot = depotOf.get(vehicle.depotId);
    if (!depot) {
      unassigned.push(...stops.filter((stop) => !taken.has(stop.id)).map((stop) => stop.id));
      continue;
    }

    // Nearest to this depot first, so a vehicle fills up with the stops it is best placed to serve.
    const candidates = stops
      .filter((stop) => !taken.has(stop.id))
      .sort((a, b) => legKm(depot, a) - legKm(depot, b) || a.id.localeCompare(b.id));

    const load: DeliveryStop[] = [];
    let loadKg = 0;

    for (const stop of candidates) {
      if (loadKg + stop.demandKg > vehicle.capacityKg) continue;
      load.push(stop);
      loadKg += stop.demandKg;
      taken.add(stop.id);
    }

    if (load.length === 0) continue;

    const points: LatLng[] = load.map((stop) => ({ lng: stop.lng, lat: stop.lat }));
    const greedy = nearestNeighbour(depot, points);
    const order =
      strategy === "file" ? points.map((_, index) => index) : strategy === "greedy" ? greedy : twoOpt(depot, greedy, points);
    const distanceKm = Math.round(tourLength(depot, order, points) * 100) / 100;

    const windows = order.map((index) => load[index].window);
    const conflicts = windows.filter((window, index) => index > 0 && window[0] < windows[index - 1][1]).length;

    routes.push({
      vehicleId: vehicle.id,
      depotId: depot.id,
      stopIds: order.map((index) => load[index].id),
      distanceKm,
      loadKg,
      travelMinutes: Math.round((distanceKm / ASSUMPTIONS.speedKmh) * 60),
      serviceMinutes: load.length * ASSUMPTIONS.serviceMinutes,
      conflicts,
    });
  }

  for (const stop of stops) if (!taken.has(stop.id)) unassigned.push(stop.id);

  const totalDistanceKm = Math.round(routes.reduce((sum, route) => sum + route.distanceKm, 0) * 100) / 100;
  const totalMinutes = routes.reduce((sum, route) => sum + route.travelMinutes + route.serviceMinutes, 0);

  return { routes, totalDistanceKm, totalMinutes, unassigned, assumed: ASSUMPTIONS };
}

/** What a plan costs, in dong, under the assumptions the page prints. */
export function planCost(plan: Pick<Plan, "totalDistanceKm" | "totalMinutes">): number {
  const drivingHours = plan.totalMinutes / 60;
  return Math.round(plan.totalDistanceKm * ASSUMPTIONS.costPerKm + drivingHours * ASSUMPTIONS.costPerHour);
}

export { tourLength as tourDistanceKm };
