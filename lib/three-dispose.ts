/**
 * Giving a cloned GLB its GPU memory back.
 *
 * `useGLTF` caches a loaded scene for the life of the page, and every place that draws one clones it
 * (`gltf.scene.clone(true)`) so that per-viewer tweaks — wireframe, materials, shadows — do not leak
 * into the cache. A clone does **not** copy geometry or materials: it references the same ones. So an
 * unmounting viewer that disposes "its own" objects is disposing objects the cache still holds, and
 * the honest description is: the GPU buffers go, the CPU-side data stays, and the next render
 * re-uploads them. A second visit to the same species is therefore still instant, and a quiz round
 * that reveals ten species in a row no longer keeps ten sets of buffers alive (docs/REVIEW.md, R6 —
 * the measurement was `renderer.info.memory`, whose count only ever went up).
 *
 * The walk is written here, without importing three, because a memory leak is exactly the kind of
 * thing that should have a test, and a test should not need a WebGL context. It recognises the
 * objects by the flags three itself uses (`isBufferGeometry`, `isMaterial`, `isTexture`), which is
 * also what lets the suite hand it plain objects.
 */

interface Disposable {
  dispose?: () => void;
}

export interface DisposeReport {
  geometries: number;
  materials: number;
  textures: number;
}

interface Node {
  children?: unknown[];
  geometry?: unknown;
  material?: unknown;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Anything three would call a texture, whether it is attached as `map` or as `sheenColorMap`. */
function isTexture(value: unknown): value is Disposable {
  return isObject(value) && value.isTexture === true && typeof value.dispose === "function";
}

function isMaterial(value: unknown): value is Disposable {
  return isObject(value) && value.isMaterial === true && typeof value.dispose === "function";
}

function isGeometry(value: unknown): value is Disposable {
  return isObject(value) && value.isBufferGeometry === true && typeof value.dispose === "function";
}

/**
 * Disposes every geometry, material and texture reachable from `root`, once each.
 *
 * Idempotent, safe on a partial scene, and it never throws: a disposal that fails must not take a
 * page down with it, so a missing `dispose` is simply skipped.
 */
export function disposeClone(root: unknown): DisposeReport {
  const report: DisposeReport = { geometries: 0, materials: 0, textures: 0 };
  if (!isObject(root)) return report;

  const seen = new Set<unknown>();
  // Geometry, materials and textures are shared by reference across meshes (a clone is a shallow
  // copy), so each is released exactly once even when several meshes point at it.
  const disposed = new Set<unknown>();
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!isObject(node) || seen.has(node)) continue;
    seen.add(node);

    if (Array.isArray((node as Node).children)) stack.push(...((node as Node).children as unknown[]));

    const geometry = (node as Node).geometry;
    if (isGeometry(geometry) && !disposed.has(geometry)) {
      disposed.add(geometry);
      geometry.dispose?.();
      report.geometries += 1;
    }

    const material = (node as Node).material;
    const materials = Array.isArray(material) ? material : material === undefined || material === null ? [] : [material];

    for (const entry of materials) {
      if (!isMaterial(entry) || disposed.has(entry)) continue;
      disposed.add(entry);

      // Textures are the expensive half, and they hang off the material under names this module
      // deliberately does not enumerate: any texture-valued property is one.
      const fields: Record<string, unknown> = isObject(entry) ? entry : {};
      for (const value of Object.values(fields)) {
        if (isTexture(value) && !disposed.has(value)) {
          disposed.add(value);
          value.dispose?.();
          report.textures += 1;
        }
      }

      entry.dispose?.();
      report.materials += 1;
    }
  }

  return report;
}
