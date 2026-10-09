# Pollisum Bucket Enquiry

Customer-facing enquiry and request-for-quotation form for Pollisum's buckets, hoppers, cylinder racks and man cages. Built with Vite (vanilla JS, no framework). No payment is taken.

## Run locally

```bash
npm install
npm run dev
```

## Deploy on Vercel

1. Push this folder to a Git repository (GitHub, GitLab or Bitbucket) and import it in Vercel. Or run `npx vercel` from this folder.
2. Vercel detects Vite automatically. Build command `npm run build`, output directory `dist`.
3. Add the environment variable `VITE_SALES_EMAIL` (the mailbox that receives enquiries). Redeploy after changing it.

## Where things live

| Path | What it holds |
|---|---|
| `src/data.js` | Catalogue: models, specs, descriptions, notes. Edit here to add or change products. |
| `src/main.js` | App logic: steps, cart, custom form, review, chat, email and CSV output. |
| `src/styles.css` | Styles following the Pollisum style guide (colour tokens at the top). |
| `src/assets/images/` | Product photos and banner images. File name (without extension) is the key used in `data.js`. |
| `index.html` | Page shell, banner markup, Google Fonts link (Roboto). |

## Automatic email (Resend)

`api/enquiry.js` is a Vercel serverless function. When the customer presses Submit, the form posts to it and it emails the enquiry (with the CSV attached) to sales only. The customer's email is set as reply-to. No confirmation is sent to the customer. Follow-up chat messages go the same way. If the function is not configured or fails, the page falls back to the manual "Email to sales" button.

Set these in Vercel (Settings > Environment Variables, Production), then redeploy:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | API key from resend.com |
| `RESEND_FROM` | e.g. `Pollisum Enquiries <enquiries@pollisum.com>`. The domain must be verified in Resend. |
| `SALES_EMAIL` | Inbox that receives enquiries. Defaults to `fabrication@pollisum.com`. |
| `VITE_SALES_EMAIL` | Same inbox, shown in the manual fallback. |

Until the domain is verified, Resend only delivers to the account owner's own address.

Limits to know about:

- Reference numbers come from a counter in the customer's browser, so two customers can get the same number on the same day. The sales subject line also carries the company name.
- Attachments are not uploaded. The done page tells the customer to email drawings or photos to sales, quoting the reference.
- The follow-up chat cannot reply live; sales replies by email.

## Supabase

Enquiries and follow-ups are also saved to the `public.enquiries` table (project `pollisum-bucket-enquiry`, Singapore). The write happens inside `api/enquiry.js` with `SUPABASE_SERVICE_ROLE_KEY`, set only in Vercel. RLS is on with no policies, so the browser cannot read or write the table. If the save fails the email is still sent. `ref` is not unique, since reference numbers come from a browser counter.
