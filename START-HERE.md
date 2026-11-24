# Scholars’ Thanksgiving attendance

## 1. Prepare your Google Sheet

Use a tab named **ATTENDANCE**. Keep headers in row 1 and put the student roster on rows 2 and below. Each student number should appear once.

| Column | What goes there |
|---|---|
| A | Check-in date, written by the app |
| B | Check-in time, written by the app |
| C | Student number, such as 2021-07-00227 |
| D | Student name, used in the welcome message |
| L | Attendance status, set to Present by the app |

For column A, choose **Format → Number → Date**. For column B, choose **Format → Number → Time**. The app stores real spreadsheet date and time values using Philippine local time, so these formats control how the values display. Keep column C in **Plain text**. If column L uses a dropdown, make **Present** an allowed choice. Leave A, B, and L blank for students who have not checked in.

Keep the sheet private and give your organizer account Editor access. Avoid sorting, inserting, or deleting roster rows while check-ins are in progress. For a new event, use a fresh copy of the spreadsheet so the previous event’s attendance is preserved.

## 2. Configure the app and add the logos

1. In the Google Sheets URL, copy the portion between `/d/` and `/edit`. This is the spreadsheet ID. The number after `gid=` identifies a tab and goes nowhere in the config.
2. Open `config.js` and replace `PASTE_SPREADSHEET_ID_HERE` with that ID. The existing API key and OAuth client ID are already included. Keep the tab name as `ATTENDANCE`.
3. Put your PNG logos beside `index.html`, naming them `logo1.png` for the left and `logo2.png` for the right. A missing file leaves its labeled placeholder visible.

## 3. Publish and connect Google

1. Create a separate GitHub repository for the Thanksgiving app. Upload the files directly to the repository root.
2. In **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/(root)**, then save. Open the HTTPS URL that GitHub Pages provides.
3. In the existing Google Cloud project, make sure the Sheets API is enabled. In the existing OAuth web client, verify that the Pages origin is listed under **Authorized JavaScript origins**. For a URL like `https://yourname.github.io/scholars-thanksgiving/`, the origin is `https://yourname.github.io`. If that origin was already approved for the earlier attendance app, reuse it.
4. If the API key has website restrictions, make sure the new app URL is covered. If the OAuth app is in Testing, make sure the organizer account is an approved test user.
5. On the HTTPS site, click **Connect Google** and authorize with the organizer account that can edit the sheet. The **Dark mode** button appears after the connection loads.

[GitHub Pages publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)  
[Google Sheets JavaScript setup](https://developers.google.com/workspace/sheets/api/quickstart/js)

## 4. Test before the event

Use a copy of the spreadsheet to test. Enter a student number from column C and check that A, B, and L update on the same row. The app displays the name from D below the form for 10 seconds. The input clears immediately so the next student can start typing while the message is visible. Confirm that another successful check-in replaces the message and starts a fresh timer.

Submit the first student number again. You should see an already-checked-in message, with the original date and time preserved. Try an unknown number and confirm it produces no write. **Total present** counts unique student numbers marked Present. It refreshes when you connect and before each submission.

Try the live site on a phone, tablet, and desktop. The same page adapts to each screen size. A connected organizer station needs internet access. Use one station if preserving the first timestamp is critical. Simultaneous submissions for the same number on multiple stations can both update the same existing row.
