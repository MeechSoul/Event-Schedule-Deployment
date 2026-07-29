# Event Schedule Deployment & Google Sheets Live Sync Widget

A high-performance, visually stunning, mobile-responsive **Event Schedule Generator & Embeddable Web Widget** designed for multi-day conventions, dance events, and festivals.

It connects directly to any published Google Sheet CSV and updates automatically in near real-time (~60 seconds auto-sync).

---

## 🌟 Key Features

1. **Near Real-Time Google Sheets Auto-Sync**:
   - Fetches published CSV data directly from your Google Sheet without requiring a backend server.
   - Background polling updates the schedule automatically every 60 seconds.

2. **Multi-Day Navigation Tabs**:
   - **`[ ✨ Full Schedule ]`** (Default view displaying all convention days sequentially).
   - Dynamic individual day tabs (`FRIYAY / Day 1`, `SATURYAY / Day 2`, `SUNYAY / Day 3`, `Day 4`, etc.).

3. **Dual View Layout Engine**:
   - **Interactive Agenda View**: Timeline cards with icons, room badges, instructor tags, and "The Scoop" callouts. Ideal for mobile browsing.
   - **Sheet Grid View**: HTML table preserving the classic column/row structure of Google Sheets.

4. **Multi-Event Brand Kit Customizer**:
   - Theme Presets (`ATX ROX Magical Westie`, `Cyberpunk Dark`, `Minimalist Clean`, `Sunset Gold`).
   - Live color pickers for Primary, Secondary, Background, and Card colors.
   - Saves settings to `localStorage`.

5. **Search & Interactive Filters**:
   - Real-time text search (Title, Instructor, Room, Scoop).
   - Room/Track dropdown filter (`Big Room`, `Side Room`, `Small Room`, `Bliss Room`, `Pool`).
   - Category Pills (`🎓 Workshops`, `🏆 Comps`, `🦄 Social`, `🍄 Late Night`, `✨ Shows`, `🛟 Pool Party`).
   - Add to Google Calendar & `.ics` download.

6. **1-Click Website Embed Generator**:
   - Copy-paste iframe code for WordPress, Squarespace, Wix, Webflow, or custom HTML sites.

---

## 🚀 How to Publish a New Google Sheet for your Event

1. Open your convention Google Sheet.
2. Click **File** -> **Share** -> **Publish to web**.
3. Select the schedule sheet tab and choose **Comma-separated values (.csv)** as the export format.
4. Click **Publish** and copy the generated link.
5. Pass your Google Sheet CSV URL as a query parameter in your embed link:
   `https://yourdomain.com/schedule?sheet=YOUR_GOOGLE_SHEET_CSV_URL`

---

## 📦 How to Embed on WordPress / Squarespace / Wix

Copy and paste this snippet into a Custom HTML block on your website:

```html
<!-- START ATX ROX EVENT SCHEDULE EMBED -->
<iframe 
  src="https://yourdomain.com/index.html?sheet=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vRYBLvB4_05i_D7KHyR4v55tsRYfDS2PTN2zPRxjfxtT5gEfvuk1tuV2T-4HpYQgbgEz070Y7EDBnbz%2Fpub%3Fgid%3D1745454581%26single%3Dtrue%26output%3Dcsv&theme=atx-rox" 
  width="100%" 
  height="850px" 
  frameborder="0" 
  style="border: none; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);"
  allow="clipboard-write"
  title="ATX ROX Schedule '26">
</iframe>
<!-- END ATX ROX EVENT SCHEDULE EMBED -->
```

---

## 🛠 Local Development & Testing

You can preview and test the schedule locally using any web server:
```bash
# Python 3
python -m http.server 8000

# Node / npx
npx http-server -p 8000
```
Then open `http://localhost:8000` in your browser.
