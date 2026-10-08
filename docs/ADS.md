# Ads and locked content (Phase 33)

Two features that share one rule: **nothing appears until an admin asks for it.** Every ad position is
seeded off, and the lock table starts empty, so a deployment that ignores this phase entirely looks
exactly as it did before.

## Ad positions

| Position | Where it is drawn | Why it is safe there |
| --- | --- | --- |
| `sidebar` | Beside the content column on wide screens | it is a column, not an overlay; hidden below 1024px where there is no sidebar |
| `below-content` | After the article body, before the footer | out of the way of everything interactive |
| `in-list` | In the flow of a grid, after the first row | it takes a cell a card would have taken, never covers one |

The list is **code** (`lib/ads.ts`) because a page can only render an ad where it has a hole for one. The
row in `public.ad_placements` is the **switch**. A row whose id is not in the list is ignored, with a
sentence saying so, rather than injected somewhere unexpected.

Nothing under `components/3d` may import an ad component: that rule is a test, not a convention
(`npm run check:unlock`), because a layout comment is what a refactor deletes first.

### Providers

| Provider | What happens |
| --- | --- |
| `placeholder` | A labelled box that says it is a placeholder. What a self-host or a demo shows. |
| `adsense` | A real `<ins class="adsbygoogle">` unit. Needs **both** `NEXT_PUBLIC_ADSENSE_CLIENT` and the position's ad unit id; with either missing the position draws nothing and the console prints why. |
| `ezoic` | **Refused.** The schema accepts the value so a deployment can record the intent, and the code refuses to render it: this build contains no Ezoic integration, and a placeholder wearing another network's name is a lie. |

### Why the switch is read by a client island

`components/ads/AdBanner.tsx` fetches `/api/ads/slots` once per page. The alternative - reading the
switches on the server - would mean `cookies()` (which turns every page with a hole for an ad into a
dynamic render) or a build-time bake (which makes an admin wait for a rebuild). The island costs one
cached request and keeps the advert off the critical path: **the page is interactive before the ad is
requested**, the same rule the 3D viewers follow.

The answer is cached for 60 seconds in process and at the edge. A switch an admin flips through the
console is felt immediately, because the write forgets the cache itself.

## Locked content

A lock is one row in `public.locked_contents`, keyed by a **text key**:

    model:tyrannosaurus-rex          a species page
    chapter:<uuid>                   one manga chapter
    catalog-entry:space/uranus       a catalogue entry (space, plants, vehicles)

Two ways out, both from the phase brief:

1. **Watch a rewarded advert.** The panel runs a countdown, then asks `/api/unlock` to record it.
2. **Buy it once.** A real Lemon Squeezy checkout (Phase 32). The plan comes from the lock row, never from
   the client, and the entitlement is written by the webhook.

An admin can also withdraw a lock (`active = false`) without deleting the row, and the console shows how
many people have opened each one.

### The rewarded advert is a mock, and says so

The client reports when the advert started; the server checks only that enough time has passed
(`lib/unlock.ts`, `rewardedAdVerdict`). **A client that lies can unlock for free.** That is acceptable
for a placeholder and unacceptable for a real network.

What a real integration needs, written down so nobody mistakes the mock for enforcement:

- a rewarded ad unit from the network, played over the page;
- the network's **server-side verification** (AdSense SSV, or the equivalent callback), which is what
  proves the advert actually completed - not a timer;
- an endpoint the network calls, verifying *its* signature, which then writes the unlock with the service
  role. The visitor's browser would no longer be the one claiming completion.

Until those exist, the honest description of the feature is "a mock that demonstrates the flow".

### What the database enforces (measured)

The narrowing that matters is on `user_unlocks`: a browser may record an **advert** unlock and nothing
else, so "I paid" cannot be typed into a request body. Driven as the `authenticated` role with a Clerk
style `sub` claim, in one transaction each:

| Insert | Result |
| --- | --- |
| own account, `method = 'ad'` | **inserted** |
| own account, `method = 'purchase'` | **42501** row level security policy violated |
| another account's id, `method = 'ad'` | **42501** |

A purchase unlock is written by the webhook with the service role, and the `admin` method exists for a
future console action that would record who granted it.

### It is a product gate, not access control

The model files live in a **public bucket** - every credited model in this catalogue is served from one -
so the lock decides what the interface shows, not what the network serves. A visitor who reads the page
payload can still find the URL. Locking the bytes means per-object storage policies and signed URLs, which
is a different change with a real cost: it would also break the hover previews and the cache headers the
3D pages rely on. Recorded here rather than implied by a padlock icon.

## The older premium-species teaser is still there

`components/premium/UnlockModal.tsx` (Phase 4) is a **different mechanism**: it reads the `premium` flag on
a species and remembers the unlock in the browser's own store. It is unchanged, and this phase does not
quietly take it over. Unifying them means seeding `locked_contents` from the species data and retiring
`useExploreStore.unlockPremium`, which is a migration rather than a wiring - the honest next step, and
worth doing before a third mechanism appears.

## Testing it locally

```bash
# What a page would draw right now (public, cached 60s):
curl -s localhost:9000/api/ads/slots

# Is one entry locked, and how could it be opened?
curl -s "localhost:9000/api/unlock?contentId=catalog-entry:space/uranus"

# Lock something, then look again:
psql -c "insert into public.locked_contents (content_id, label, kind) values
         ('catalog-entry:space/uranus','Uranus','catalog-entry')"
curl -s localhost:9000/catalog/space/uranus      # the panel replaces the viewer
```

The switch and the lock both take effect within a minute, or immediately when written through the console
at `/admin/ads`.
