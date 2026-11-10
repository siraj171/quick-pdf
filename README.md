# Quick PDF

Free, private tools that run in the browser: photos to PDF, PDF compression, Merge PDF and PDF to JPG. No files are uploaded.

Live site: https://quickpdf-ten.vercel.app/

## Project layout

- `index.html`: home page with all tools (self-contained, CSS and JavaScript inside)
- `merge-pdf.html`, `pdf-to-jpg.html`: stand-alone pages for search engines
- `privacy.html`, `terms.html`: legal pages
- `style.css`: shared stylesheet used by the extra pages
- `assets/`: logo, favicons, social share image, and `assets/lib/` (PDF engine files, served from this site)
- `sitemap.xml`, `robots.txt`, `site.webmanifest`, `favicon.ico`: SEO and app files
- `vercel.json`: security headers and caching
- `source/`: editable source. Run `python3 source/build.py` after changing it.
- `later/`: unused backend code for a future feedback feature (not deployed)

## Publish on GitHub and Vercel

1. Create a new GitHub repository (for example `quick-pdf`).
2. Upload all files from this folder, including hidden files such as `.vercelignore`.
3. In Vercel, choose "Add New Project", import the GitHub repository, keep the default settings and deploy.
4. Check the live site and submit `sitemap.xml` in Google Search Console.

## Contact form setup (Vercel)

The contact form sends messages through `api/contact.js` using Resend (https://resend.com).
The owner's email address is not stored in the code. Set these in Vercel -> Project -> Settings -> Environment Variables, then redeploy:

- `RESEND_API_KEY`: API key from Resend
- `CONTACT_TO`: the inbox that receives messages
- `CONTACT_FROM` (optional): a sender address on a domain verified in Resend
