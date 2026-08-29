# Online Quiz — Vue 3 + Vuetify

Multiple-choice quiz application organized into 3 sections:

- **Public (`/`)** — users take the currently published quiz, with a contact form (`/contact`).
- **Results (`/resultats`)** — score, rating (Low/Medium/High/Perfect), PDF export, and a “More information” button.
- **Admin (`/admin`)** — protected by username/password: management of questionnaires, score levels, banners (vendors and quizzes), contact messages, and credentials.

## Stack

- Vue 3 (`<script setup>`) + Vue Router
- Vuetify 3
- Pinia (current quiz, file library, vendors, quiz banners, contact messages, admin session)
- [`mammoth.js`](https://github.com/mwilliamson/mammoth.js) for reading `.docx` files in the browser
- [`jsPDF`](https://github.com/parallax/jsPDF) for exporting results to PDF
- [`idb`](https://github.com/jakearchibald/idb) — lightweight wrapper around IndexedDB for persistence
- Vite

Everything runs 100% client-side: imported files, banners, contact messages (including any PDF attachments) are stored in IndexedDB (no server database or backend).

Only small admin settings (changed password, authorized domains) remain in `localStorage`, because they are tiny and benefit from its simple synchronous access.

This setup is suitable for a demo or single-machine use. See **“Going further”** for information about deploying it in a real multi-user environment.

### Why IndexedDB instead of localStorage

`localStorage` has a very limited quota (typically 5–10 MB per site depending on the browser) and quickly became full when several banners/logos and PDF result attachments were stored there — hence the “local storage full” message that could appear.

IndexedDB does not have this arbitrary limit: its quota depends on the amount of available disk space on the device (often hundreds of MB at minimum, and sometimes much more), making it significantly more robust for this use case.

Image compression (`utils/imageResize.js`) is still applied to keep loading times fast and PDFs lightweight, but it no longer needs to be aggressive in order to avoid a tight storage quota.

**Automatic schema repair:** `utils/idbKeyval.js` detects whether the local IndexedDB database is in an inconsistent state (for example, a missing object store, which can happen when a database was created by an earlier version of the project with a different schema) and automatically recreates it before retrying the operation, without requiring manual intervention.

If a record still fails to save, the actual technical error message is displayed in the relevant admin tab to facilitate troubleshooting.

The **Credentials** tab also indicates whether IndexedDB is available in the current browser (it may be blocked in private browsing, by certain privacy settings, or when the application is opened directly from a local file rather than served via `http://`/`https://`).

## Installation

```bash
npm install
npm run dev
```

The application is served at `http://localhost:5173`.

```bash
npm run build
npm run preview
```

## Default admin credentials

```text
Username: admin
Password: quizz2026
```

The password can be changed from the **Credentials** admin tab after logging in.

## Security

- No username or password is ever stored in plain text. Only the SHA-256 hash of the password is stored (by default, encoded in `src/config/adminAccess.js`, or replaced in `localStorage` if the admin changes it from the Credentials tab). The login credentials themselves are never written to `localStorage`/`sessionStorage` — only a boolean `logged in: yes/no` flag is stored, valid for the lifetime of the tab and cleared when the tab is closed or when the user logs out.
- **Conditional Administration link:** the `/admin` link only appears in the menu on domains listed in the Credentials tab (by default, `localhost`/`127.0.0.1`). The `/admin` URL remains directly accessible from any domain, but is always protected by login — this list only controls whether the visual link is displayed.
- **Invalid URL handling:** any unrecognized route displays a dedicated page with the message “You have reached the edge of the internet. Turn back before things get weird.” instead of a raw error.
- ⚠️ This authentication remains client-side, so it is not strong security on its own (the hash is visible in the JavaScript bundle delivered to the browser and could theoretically be cracked offline). For genuine production protection, authentication should be moved to a backend (API + session/JWT) — see **“Going further.”**

## Public section (`/`)

- If the admin has not published a quiz, the message **“Quiz unavailable”** is displayed.
- Otherwise, the published questionnaire is automatically loaded and the user answers the questions one by one.
- The name displayed at the top left (in the navigation bar) is the title of the active quiz banner (in bold and enlarged), instead of a generic label. Falls back to **“Quiz”** if no banner has a title.
- The active quiz banner image (if defined) is displayed in the page header, including on the **“unavailable”** message. The title is no longer duplicated below the image because it already appears at the top left.
- Once all questions have been answered, the user is automatically redirected to `/resultats`.
- The **Contact** link (`/contact`) is always visible:
  - the active vendor banner (name + logo, greatly enlarged) is displayed in the form header;
  - fields: first name, last name, email, question, mandatory GDPR consent checkbox;
  - if the user arrives via the **“More information”** button on the results page, the PDF of their quiz result is automatically prepared and displayed as an attachment (with preview), with no additional action required;
  - when submitted, the message and any attachment are stored in a flat file (emulated through IndexedDB, see `stores/contactMessages.js`) and a confirmation message is displayed on screen.

## Results section (`/resultats`)

- Overall score (X/Y and %) and rating (Low/Medium/High/Perfect) according to the thresholds defined by the admin.
- The active quiz banner is displayed in the page header (the same one used on the quiz page, for consistent visual identity throughout the quiz experience).
- **“Download as PDF”** button:
  - text is systematically collapsed with an automatic page break → no overflow outside the printable area;
  - header: vendor logo only, greatly enlarged (no associated name text);
  - immediately below: a short document reference prefixed with `Ref: ` followed by the filename without the `.docx` extension and 3 random alphanumeric characters (e.g. `Ref: general-knowledge-a7F`);
  - each correct answer is displayed in bold and annotated with **“(correct answer)”**; the answer selected by the user is underlined;
  - character spacing in question and answer headings is tightened for a more compact and readable layout.
- **“More information”** button: directly opens the contact form (`/contact`). The result PDF is automatically prepared and offered as an attachment (with preview available); the user only needs to enter their contact details and question.
- Button to restart the same quiz.
- If no quiz has been completed during the session, a message directs the user to the quiz page.

## Admin section (`/admin`)

Access is protected by username/password (session stored in `sessionStorage`, cleared when the tab is closed or when the user logs out).

### Questionnaires tab

- Import one or more `.docx` files (drag and drop or file selection).
- **Publish** button to activate one file from the library as the public quiz (only one can be active at a time), and **Unpublish** to remove it.
- Delete a file (with confirmation).

### Score Levels tab

- **Medium** and **High** thresholds (in %); Low always starts at 0%, and Perfect always corresponds to 100%.
- Visual preview of the 4 score ranges.

### Banners tab

- **Vendor banners:** list of banners (name, logo, contact email), one per vendor/broker. Only one can be active at a time — it is used on the contact form, the **“More information”** button, and the PDF header.
- **Quiz banners:** list of banners (title + image), one per quiz. Only one can be active at a time — its title is displayed at the top left of the site and its image is displayed in the header of the public quiz page.
- Each list allows entries to be added, activated, and deleted.
- Images are resized and compressed in the browser (see `utils/imageResize.js`) before being stored, for fast loading times and lightweight PDFs — without needing to be overly aggressive with quality since storage is now handled by IndexedDB.
- If storage nevertheless becomes full (for example, if the device's disk is almost full), an explicit error message is displayed in the relevant tab, and the Credentials tab provides a **Local Storage** panel showing the used space and available quota, with a button to clear everything in one click if necessary.

### Messages tab

- View messages submitted through the contact form (the “flat file,” now stored in IndexedDB), with individual or bulk deletion.
- When a message includes the attached result PDF (sent from **“More information”**), it appears below the message with a **Download** button.

### Credentials tab

- Change the admin password (verification of the old password, new password must contain at least 6 characters).
- Manage the list of authorized domains allowed to display the Administration link in the menu (add/remove domains, e.g. `localhost`, a test domain name, etc.).
- **Local Storage** panel: estimates the application's storage usage (IndexedDB) and the available quota on the device (via the `navigator.storage.estimate()` API), with a button to clear everything (quizzes, banners, messages, thresholds, custom password) if necessary.

## Expected `.docx` file format

An example file is provided at `src/assets/exemple-questions.docx`.

- Each question must be a paragraph beginning with a number followed by `.` or `)`:
  `1. What is the capital of France?`
- Each answer must be a paragraph beginning with a letter followed by `.`, `)` or `-`:
  `A) Paris`
- The correct answer(s) must be formatted in **bold** in Word.
  - One bold answer → single-choice question (radio buttons).
  - Multiple bold answers → multiple-choice question (checkboxes).

## Project structure

```text
src/
  App.vue                        # navigation bar + <router-view>
  main.js
  router/index.js                # routes: /, /resultats, /admin, /contact, 404
  config/adminAccess.js          # default admin username/hash/domains
  plugins/vuetify.js             # custom Vuetify theme
  stores/
    quiz.js                      # current quiz state (answers, score)
    library.js                   # file library, published file, thresholds
    vendors.js                   # vendor banner list + active vendor
    quizBanners.js               # quiz banner list + active banner
    contactMessages.js           # contact form messages ("flat file")
    auth.js                      # admin session, password change, authorized domains
  utils/
    docxParser.js                # extraction of questions from .docx
    pdfExport.js                 # result PDF generation (save + blob)
    imageResize.js               # image compression before storage
    idbKeyval.js                 # lightweight IndexedDB layer (get/set/delete/clear)
    storageUsage.js              # usage estimation + application data deletion
  views/
    PublicQuizView.vue           # public section
    ResultsView.vue               # results section (access guard)
    AdminView.vue                # admin section (login gate + tabs)
    ContactView.vue               # public contact form
    NotFoundView.vue              # 404 page ("edge of the internet")
  components/
    OrgBanner.vue                 # active vendor banner (contact form, results)
    QuizBanner.vue                # active quiz banner (quiz page)
    QuizPlayer.vue                # question-by-question flow
    QuizResults.vue               # score + rating + PDF + "More information"
    admin/
      AdminLogin.vue
      AdminUploader.vue           # multi-file import
      AdminFileList.vue            # library, publish/unpublish/delete
      AdminThresholds.vue          # score threshold configuration
      AdminVendorBanners.vue       # vendor banner list
      AdminQuizBanners.vue         # quiz banner list
      AdminMessages.vue             # contact message viewing/deletion
      AdminCredentials.vue          # password change + authorized admin domains
  assets/
    exemple-questions.docx        # demonstration file
```

## Going further (production deployment)

- Replace the hard-coded authentication with a real backend (API + password hashing + session/JWT).
- Replace IndexedDB (files, banners, messages) with a real server-side database if multiple administrators or multiple devices need to share the same data (IndexedDB remains local to each browser).
- Add CSV/Excel export for contact messages.
- Add a timer per question or for the entire quiz.
- Keep a history of scores per user.