# Future Features to be Added in Safemailz

These features should be available across all mail categories, from Inbox to Deleted Items:

## 1. Jump To Option
Add a “Jump To” dropdown button for quick navigation of mail items by date. This button must be available for every folder category (Inbox, Sent Items, Deleted, Drafts, etc.) and should be placed at the top of the mail preview area (mail list column) where all the emails are displayed, rather than in the sidebar.
The button should display a consistent icon. When hovered, it should show a "Jump To" tooltip. Upon selecting an option, the icon should not change its label to the selected text; it must remain consistent.
When a user clicks on an option (e.g., 'Last month'), the mail list should filter out any emails newer than that time frame. It should effectively "jump" back in time, showing emails from that specific time frame and older at the top of the list.
The dropdown should include the following list options:
* Today
* Yesterday
* Last week
* Last month
* Last year
* A Calendar option at the bottom that opens a date picker allowing the user to select a custom date.
## 2. Mail Filters
Add filtering options with the following categories:
* All
* Unread
* Flagged
* To Me
* Has Files
* Mentioned Me

## 3. Hover Actions in Mail Preview
In the mail preview section, display the following icons when a user hovers over a mail:
* Read
* Unread
* Delete
* Pin

### 3.1 Reposition Hover Actions to Avoid Covering Mail Buttons
The hover action icons currently appear on top of the existing mail action buttons (date area / 3-dot menu), making those buttons unclickable. Reposition the hover actions so they:
* Appear **inline** within the mail-header-row, replacing the date text on hover (Outlook-style behavior)
* Do **not** overlap or cover any existing buttons (3-dot menu, flag, star, etc.)
* Maintain good UI/UX with smooth transitions
* When the user stops hovering, the date text should return to its original position

## 4. Expand Mail View
Add an expand button for each mail. When clicked, the mail should open in an expanded view where the main message and replies are shown separately.

## 5. Sender Format
Every mail should display the sender in the following format:
* **Yash Thakor <[yashthakor00123@gmail.com](mailto:yashthakor00123@gmail.com)>**

## 6. Profile View on Click
When a user clicks on the sender or recipient name in any mail, the corresponding profile should open in a floating window with the following tabs:
* Overview
* Files
* Messages
* Contact Information

The top tabs should also include sub-tabs, following the Outlook-style layout.

## 7. Reply Actions
Add the following buttons throughout the full mail flow:
* Reply
* Reply All
* Forward

## 8. Settings Page
Create a floating settings window with the following tabs:
* Account
* General
* Mail

The top section should also include sub-tabs based on the Outlook design style.

## 9. Notifications
Add a notification feature in Safemailz to show daily mail notifications.

## 10. Date and Time Format
Update the date and time format across the application to match the Outlook style shown in the reference screenshot:
* **Mail Preview List:** Format as DDD DD-MM (e.g., Fri 10-07).
* **Mail Reading Pane:** Display on the top right side (opposite to the sender profile) formatted as DDD DD-MM-YYYY HH:mm (e.g., Fri 10-07-2026 16:49).

## 11. Threaded Reply Flow
For emails with the subject "Test" (or general threads), implement a threaded conversation UI/UX exactly like the Outlook interface shown in the screenshot:
* **Threaded Layout:** Display all messages in the thread stacked vertically within the reading pane.
* **Message Cards:** Each message card should show the sender's avatar (e.g., "RS"), sender name, email, recipient, date on the right, and the body.
* **Collapsible Previous Quotes:** Quoted text or previous replies should be hidden under a `...` button that toggles expansion.
* **Action Buttons:** At the top right of each message card, show action buttons like Reply (curved arrow pointing left), Reply All, and Forward.
* **Inline Reply/Forward:** At the very bottom of the thread, show prominent "Reply" and "Forward" buttons. Clicking "Reply" should open an inline compose editor matching the website's theme, allowing the user to type and send a reply directly within the thread.
* **Mock Thread for "Test":** Specifically for the email with the subject "Test", seed a mock conversation thread containing the three messages:
  1. `singhrahuldrill1@outlook.com` sending "Hi"
  2. `rahul.awhognoida@gmail.com` replying "kese ho bhai"
  3. `singhrahuldrill1@outlook.com` replying "Thik hoon tum kese ho" (with "Reply" and "Forward" buttons below it).


