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

## How submission works

There is no backend. After the customer submits, the page shows an enquiry sheet with a reference (`ENQ-YYYYMMDD-###`) and offers:

- **Email to sales** opens a pre-filled email to `VITE_SALES_EMAIL`, with the reference in the subject.
- **Download CSV** and **Print / Save as PDF** for the customer's own copy.
- **Follow up chat** (bottom right) prepares a follow-up email quoting the reference.

Limits to know about:

- Reference numbers come from a counter in the customer's browser, so two customers can get the same number on the same day. Check for duplicates when replying.
- Attachments are not uploaded. The form lists file names and tells the customer to attach the files to the email.
- The follow-up chat cannot reply live.

To receive enquiries automatically without relying on the customer's email app, add a backend (for example a Vercel serverless function in `api/` that sends the email, or a Power Automate HTTP trigger) and call it from `submit` in `src/main.js`.
