# CutMatch AI

**Your style. Before the chair.** CutMatch AI lets you preview a YouCam AI Hairstyle Generator v2.1 hairstyle on your own photo before visiting the barber. The app uses a small Next.js server layer to keep the YouCam API key out of browser code. Its dark charcoal, warm cream, and electric-lime interface uses locally stored Pexels hairstyle photographs and an original logo.

## Requirements

- Node.js 20.9 or newer
- A YouCam API key with access/units for AI Hairstyle Generator v2.1
- An Upstash Redis database with REST access enabled
- A private demo access code and a separate session-signing secret

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `YOUCAM_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DEMO_ACCESS_CODE`, and `DEMO_SESSION_SECRET` in `.env.local`. Use a random access code of at least 24 characters and a different random session secret of at least 32 bytes. Keep all values server-side and never commit the environment file.
4. Start the development server with `npm run dev`.
5. Open [http://localhost:3000/access](http://localhost:3000/access) and enter the private demo access code.

For deployment, configure all five values as server-side environment variables in the hosting platform. Do not prefix them with `NEXT_PUBLIC_`.

### Private hackathon demo access

The `/access` page submits the code to a same-origin server endpoint. The server verifies it and sets a signed, 12-hour `HttpOnly`, `SameSite=Strict` session cookie with path `/` and `Secure` enabled in production. The signing secret is separate from the access code. Missing or placeholder configuration disables access; API requests fail closed. Changing either secret invalidates existing sessions.

Share the access code with judges through a private channel such as a direct message or invite-only event communication. Do not put the code in a URL, source control, public documentation, screenshots, or the client application. Rotate both values after the demo. This shared code is not individual judge authentication and does not enforce per-judge usage quotas.

### Check Redis connectivity locally

This check sends only `PING` to Upstash Redis and prints a generic success/failure message; it does not call YouCam or print the URL/token. Run it from the project root:

```sh
node --env-file=.env.local --input-type=module -e '
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("Redis connectivity check failed: server credentials are not configured.");
  process.exit(1);
}
try {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["PING"]),
  });
  const data = await response.json();
  if (!response.ok || data.result !== "PONG") throw new Error();
  console.log("Redis connectivity OK.");
} catch {
  console.error("Redis connectivity check failed. Check the server-side Upstash configuration.");
  process.exit(1);
}
'
```

Use Node.js 20.12 or newer for `--env-file`; alternatively provide the same variables through your normal server environment without printing them.

## Use

Upload a clear, front-facing portrait (JPEG, PNG, or WebP; under 10 MB), search/filter listed templates or upload a hairstyle reference, and choose **Generate preview**. When you press the button, both your portrait and any selected custom reference image are sent to YouCam for processing; uploaded files are retained by the provider for up to 30 days. The app uploads images using YouCam's File API, creates one hairstyle task, polls status every 10 seconds, and displays the real result when complete. Compare the original and generated image side by side, use the overlay slider, or save the output.

To limit unit usage, the app does not generate previews automatically; each task begins only after the user presses the button. Template results are loaded once on page open, with further pages loaded only on request.

## Preview idempotency and store setup

The preview API requires an `Idempotency-Key` and fingerprints the portrait bytes, selected reference bytes (or preset ID), content types, and input sizes. The client reuses the same key when retrying the same inputs in a tab, including after a page reload and reselecting the same files, and creates a new key when the inputs change. Only a SHA-256 fingerprint and random key are held in `sessionStorage`; image bytes are not stored there. `lib/preview-idempotency.ts` uses Upstash Redis REST `SET ... NX` for atomic claim-if-absent and Lua scripts for owner-checked state transitions. Redis records are namespaced and keyed by a SHA-256 hash of the client key.

If either Upstash variable is absent or Redis is unavailable, malformed, or rejects an operation, `/api/preview` fails closed with HTTP 503 and does not call YouCam. Redis credentials are read only in the server module and are never sent to the browser.

Records intentionally have **no automatic TTL**. Expiring a `processing` or `uncertain` record could let a retry create another paid task; expiring completed records could also permit replayed keys to create new tasks. Plan Redis storage/retention accordingly and do not delete these keys as routine cleanup. A same-key/same-fingerprint completed request reuses the original task ID; concurrent or processing requests do not start a second provider call; and key reuse with different inputs is rejected.

If provider task creation has an uncertain outcome, or the provider returned a task ID but saving it failed, the record remains `processing` or becomes `uncertain`; retries fail closed rather than call the provider again. A process crash can leave a `processing` record without a task ID and requires manual reconciliation. This may leave a request unresolved. Exactly-once provider execution cannot be guaranteed because support for provider-side task idempotency has not been established. Users can still create a separate request with different inputs or a fresh key, which is an explicit new preview and may consume credits.

## Preset coverage and reference photos

The library displays the live templates and thumbnails returned by YouCam; it does not fabricate template IDs or substitute another haircut when a category has no matching template name. Style-type filters are based on provider-listed titles. Optional **All styles**, **Men's styles**, and **Women's styles** filters use the provider's own audience labels for presets. For reference photos, the same filters describe the person shown in each photograph, not who can wear that hairstyle. No gender choice is required to upload a photo or browse by hair type.

The provider catalog checked on October 25, 2026 returned 116 templates. That snapshot included explicitly named Afros, Buzz Cuts, taper fades, waves, generic braids (including Two Braids, Boho Side Braid, Bubble Braids, and Baby Braids), and Dreadlocks. It did not include explicitly named Cornrows, Box Braids, Twists, Protective Styles, or Nigerian barbershop cuts. These are catalog-listed options, not a claim that every template has been generation-tested. The API's `Male`/`Female` template category is provider metadata, not a guarantee that a style is suitable only for a particular group or hair texture. The live catalog can change; the application fetches current templates rather than relying on this snapshot.

## Local photo references

The studio's photo-reference gallery is separate from the live YouCam preset catalog and from a user's generated result. It currently includes 16 selectable local reference photos (10 Pexels photos and six AI-generated collage crops) and two inspiration-only photos. The six collage crops are visibly marked as candidates; their licensing and YouCam transfer quality have not been verified. Selectable cards are labeled as unverified: the existing v2.1 request flow uploads a selected image as `ref_file_id`, but that does not verify that YouCam can reproduce the named look. Searching, filtering, and selecting photos do not contact YouCam or spend credits. A selected photo is sent for processing only after the user presses **Generate preview**. The braid-texture detail remains inspiration-only because its exact style cannot be identified; the long-braids profile remains inspiration-only because its framing is too wide. A previously labeled "Braided updo" photo was removed from the gallery because the photo does not clearly show an updo. The landing-page hero uses the cornrows portrait and is labeled as inspiration, not a generated result.

The ten existing photo references are from individual Pexels photo pages. The [Pexels license](https://www.pexels.com/license/) allows use on websites and apps; attribution is not required, but is included here and in the gallery. The six AI-generated collage crops are listed separately below; their licensing has not been verified.

Newly sourced photos are stored locally as optimized JPEGs (maximum 900 × 1350 pixels, quality 82). Two gallery images are close crops made from the already licensed originals to better show the hair; they are not new photographs and retain the original source credits. The original source files were not overwritten.

| Local file | Style shown | Photographer | Pexels source |
| --- | --- | --- | --- |
| `public/images/hairstyles/afro-portrait.jpg` | Natural Afro — custom reference input; exact output unverified | Bobography | [Photo 34786792](https://www.pexels.com/photo/portrait-of-woman-with-natural-afro-hairstyle-34786792/) |
| `public/images/hairstyles/waves.jpg` | Waves — custom reference input; exact output unverified | Ismail Suleiman | [Photo 39945585](https://www.pexels.com/photo/man-in-sunglasses-with-stylish-wave-haircut-39945585/) |
| `public/images/hairstyles/cornrows.jpg` | Cornrows — custom reference input; exact output unverified | Omotaiyewoo | [Photo 29138328](https://www.pexels.com/photo/profile-of-a-man-with-cornrows-against-rustic-wall-29138328/) |
| `public/images/hairstyles/box-braids.jpg` | Long box braids — custom reference input; exact output unverified | Geezy Photography | [Photo 13767165](https://www.pexels.com/photo/portrait-of-woman-with-box-braids-among-leaves-13767165/) |
| `public/images/hairstyles/locs.jpg` | Locs with faded sides — custom reference input; exact output unverified | Reyna Montgomery | [Photo 12093796](https://www.pexels.com/photo/12093796/) |
| `public/images/hairstyles/short-buzz-cut-close.jpg` | Close crop of a short buzz cut — custom reference input; output unverified | Marcelo Chagas | [Photo 6151195](https://www.pexels.com/photo/thoughtful-black-woman-on-footbridge-6151195/) |
| `public/images/hairstyles/pixie-cut.jpg` | Textured pixie cut — custom reference input; output unverified | Beatriz Fernandes | [Photo 12900365](https://www.pexels.com/photo/a-tattooed-woman-looking-at-the-camera-while-hands-is-on-her-chin-12900365/) |
| `public/images/hairstyles/cornrows-with-long-braids.jpg` | Cornrows with long braids — custom reference input; exact pattern/output unverified | Evlogia Pictures | [Photo 17463802](https://www.pexels.com/photo/an-african-woman-with-braids-17463802/) |
| `public/images/hairstyles/long-braids-close.jpg` | Close crop of long braids; exact pattern not identified — custom reference input; output unverified | Wayne Fotografias | [Photo 5722771](https://www.pexels.com/photo/dreamy-black-woman-with-afro-braids-5722771/) |
| `public/images/hairstyles/braided-space-buns.jpg` | Braided buns — custom reference input; exact braid pattern/output unverified | Oluwapamilerinayo Ajala | [Photo 36426407](https://www.pexels.com/photo/portrait-of-a-young-woman-with-unique-braids-36426407/) |
| `public/images/hairstyles/long-braids-profile.jpg` | Long braids in profile — inspiration only; framing is too wide for a close reference | Kabe Rossi | [Photo 15290414](https://www.pexels.com/photo/model-in-long-braids-wearing-denim-dungarees-15290414/) |
| `public/images/hairstyles/braids-detail.jpg` | Textured braid detail — inspiration only; exact braid style unverified | Malama Mushitu | [Photo 34191088](https://www.pexels.com/photo/close-up-of-textured-braids-on-a-woman-34191088/) |

The six AI-generated candidate crops are selectable custom references, not provider presets. Their labels come from the collage; the "Sponge twists" label is provisional. The high-fade photo is categorized only under the broad short-cuts/fades category, not the more specific high-taper category. None of these candidates has been tested with YouCam, and none guarantees transfer quality or facial-hair preservation.

| Local file | Proposed hairstyle label | Notes |
| --- | --- | --- |
| `public/images/hairstyle-candidates/low-taper-textured-afro.png` | Low taper + textured afro | AI-generated collage crop; licensing and transfer quality unverified |
| `public/images/hairstyle-candidates/mid-taper.png` | Mid taper | AI-generated collage crop; licensing and transfer quality unverified |
| `public/images/hairstyle-candidates/high-fade.png` | High fade | AI-generated collage crop; licensing and transfer quality unverified; not categorized as a high taper |
| `public/images/hairstyle-candidates/burst-fade.png` | Burst fade | AI-generated collage crop; licensing and transfer quality unverified |
| `public/images/hairstyle-candidates/360-waves.png` | 360 waves | AI-generated collage crop; licensing and transfer quality unverified |
| `public/images/hairstyle-candidates/sponge-twists.png` | Sponge twists | AI-generated collage crop; exact styling method, licensing, and transfer quality unverified |

Other unillustrated styles include high taper fade, knotless braids, Fulani braids, Ghana braids, passion twists, butterfly locs, curly bob, two-strand twists, Senegalese twists, braided bob, wash-and-go curls, twist-out, high puff, tapered natural cut, silk-press style, wigs, and a Nigerian barbershop cut. The locs photo is not labeled as twists, and the barber-process photo is not presented as a finished haircut. No hairstyle in this photo gallery is marked as a verified YouCam preset or generation-tested result.

### Targeted reference-photo search (October 26, 2026)

No Pexels images were added in this search. Pexels search results and candidate individual pages were checked, but no candidate met both the close-up requirement and the evidence needed for the exact requested hairstyle label. Six separate AI-generated collage crops were later added as explicitly unverified candidates; they are not represented as licensed Pexels images or tested YouCam results.

| Empty category | Why no photo was added |
| --- | --- |
| Low taper fade | Search results included a barber working on a fade; it is a haircut-in-progress, not a finished reference, and did not verify a low taper. |
| Mid taper fade | The surfaced fade photo showed a haircut in progress and did not verify the taper height. |
| High taper fade | The surfaced fade photo showed a haircut in progress and did not verify the taper height. |
| 360 waves | The surfaced portrait had a cap covering the hair, so the wave pattern could not be inspected. |
| Burst fade | No individual photo page and close-up clearly verifying a burst fade was confirmed. |
| Sponge twists with taper | No close-up showed both sponge twists and the taper clearly enough to verify the combined style. |
| Knotless braids | Candidate pages showed generic braids; the knotless installation pattern was not identified in the photo/page description. |
| Fulani braids | Candidate pages showed generic braids or unrelated traditional attire; no close portrait verified a Fulani braid pattern. |
| Ghana braids | Candidate close-up showed cornrow-style braids, but did not identify the specific Ghana-braid pattern. |
| Passion twists | No close-up photo page verified passion twists rather than another twist/braid style. |
| Butterfly locs | Search surfaced a multi-person portrait with unspecified natural hairstyles, not a clearly identifiable butterfly-loc close-up. |
| Curly bob | A bob candidate showed straight hair from the back; curly portraits found did not verify a bob shape. |

No selected Pexels search candidate was added to the project or represented as a provider preset. All listed categories remain available as filters; where candidate crops appear, they remain clearly marked as unverified.

The current close-up review found the following:

- **Selectable Pexels close-ups:** Natural Afro, defined waves, cornrows, long box braids, locs with faded sides, short buzz cut (new crop), textured pixie cut, cornrows with long braids, long braids (new crop; exact pattern unspecified), and braided buns.
- **Selectable AI-generated candidates:** Low taper + textured afro, mid taper, high fade, burst fade, 360 waves, and sponge twists. These have not been tested with YouCam; the sponge-twist label is provisional.
- **Inspiration-only:** The wide long-braids profile and braid-texture detail. These cannot be selected or sent as reference inputs.
- **Excluded from the gallery:** `braided-updo.jpg` was not an accurate updo reference; the source photo shows long braids rather than a clearly identifiable braided updo. `low-fade-barbershop.jpg` shows a cut in progress, not a finished style.

## Identity and image editing

The v2.1 hair-transfer schema documents source/reference file IDs or URLs, a preset `template_id`, and `hair_color` (`ref` or `src`). It does not document face-identity preservation, face masks, or other identity controls, so this app does not send invented parameters or claim the generated face will be unchanged. The original uploaded photo remains the unaltered comparison image in the browser; the server only corrects orientation, resizes, and converts the upload format. CutMatch applies no beauty filters, face reshaping, or skin-tone edits. The generated preview may still change facial details or hair color, and should be compared with the original.

## API flow

- `GET /s2s/v2.1/task/template/hair-transfer` retrieves predefined styles.
- `POST /s2s/v2.0/file` creates a file-upload request; the server sends image bytes to the returned presigned URL.
- `POST /s2s/v2.1/task/hair-transfer` creates a task using source and reference `file_id`s, or a source `file_id` and `template_id`.
- `GET /s2s/v2.1/task/hair-transfer/{task_id}` is polled for task completion and provides the result.

Input images are orientation-corrected, resized to a maximum 1024-pixel edge, and converted to JPEG before upload. Use one well-lit face looking forward, with the full face visible; YouCam documents a face width of at least 128 pixels and a single-face requirement. YouCam retains uploaded/generated files for up to 30 days, while each result URL is valid for two hours. The save link retrieves the result server-side and streams it as a download without exposing the API key or the temporary result URL to the browser.

## Verify

- `npm run typecheck`
- `npm run build`
- `npm test`

The live YouCam task flow requires a valid API key and available units; no test result is simulated.
