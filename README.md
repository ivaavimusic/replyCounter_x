# X Reply Counter

A Chrome extension that tracks your daily posting activity on [X](https://x.com) (formerly Twitter). Monitor your progress, set daily goals, and maintain consistency with a beautiful floating counter that integrates seamlessly with X's interface.

## Features

- **Floating Counter Bubble**: A minimal, draggable bubble that displays your current post count. Click to expand for detailed stats, click minimize to collapse back.
- **Daily Goal Tracking**: Set a custom daily target and track your progress with a visual progress bar (color-coded: red < 50%, yellow < 100%, green = goal achieved).
- **Activity Graph**: GitHub-style contribution graph showing your posting history by month.
- **Theme Detection**: Automatically adapts to X's light or dark theme.
- **Reminder Notifications**: Optional notifications to remind you to post at customizable intervals (30 min to 4 hours). Stops once you hit your daily goal.
- **Data Export**: Export your posting history to CSV for analysis.
- **Local Storage**: All data is stored locally in your browser. No external servers or APIs required.
- **Privacy Focused**: Works entirely client-side by detecting successful tweet submissions. No data leaves your browser.
- **Auto Reset**: Counter automatically resets at midnight local time.

## Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/ivaavimusic/replyCounter_x.git
   cd replyCounter_x
   ```

2. Generate the extension icons:
   - Open `generate-icons.html` in your browser
   - Click "Download All Icons"
   - Move the downloaded files (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`) to the `icons/` folder

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select the cloned repository folder
   - The extension icon will appear in your toolbar

## Usage

### Floating Counter

1. **View Counter**: Visit [x.com](https://x.com) or [twitter.com](https://twitter.com) to see the floating counter bubble in the bottom-right corner
2. **Expand Details**: Click the bubble to expand and see your progress bar and target
3. **Minimize**: Click the "−" button to collapse back to the bubble view
4. **Reposition**: Drag the bubble (or the header when expanded) to move it anywhere on screen

### Extension Popup

Click the extension icon in your toolbar to access:

- **Today's Progress**: Current count vs target with progress bar
- **Settings**: Adjust daily target (1-1000) and toggle counter visibility
- **Reminders**: Enable notifications with customizable intervals
- **Activity Graph**: Browse monthly posting history with navigation
- **Monthly Summary**: View total posts, daily average, best day, and goals achieved
- **Export**: Download all data as CSV or clear history

## How It Works

The extension monitors network requests to X's API endpoints. When a successful tweet creation is detected (POST request to `CreateTweet` endpoint with 2xx response), the counter increments. This approach:

- Requires no API keys or authentication
- Works in real-time as you post
- Counts all tweet types (posts, replies, quotes, retweets with comment)
- Respects your privacy - no data is sent anywhere

## Data Storage

All data is stored locally using Chrome's `storage.local` API:

| Key | Description |
|-----|-------------|
| `todayCount` | Current day's post count |
| `todayDate` | Date string for daily reset tracking |
| `dailyTarget` | Your configured daily goal (default: 10) |
| `stats` | Monthly posting history object |
| `counterEnabled` | Toggle for floating counter visibility |
| `counterPosition` | Saved {left, top} position of counter |
| `counterExpanded` | Expanded or bubble state |
| `reminderEnabled` | Notification toggle |
| `reminderInterval` | Notification frequency in minutes |

## Project Structure

```
replyCounter_x/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker - counting, alarms, notifications
├── content.js             # Content script - floating counter injection
├── content.css            # Floating counter styles (light/dark themes)
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── popup.css              # Popup styles (X-native dark theme)
├── generate-icons.html    # Icon generator utility
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Save settings and statistics locally |
| `alarms` | Schedule daily resets at midnight and reminder notifications |
| `notifications` | Display reminder notifications when enabled |
| `webRequest` | Detect successful tweet creation requests |
| Host: `twitter.com`, `x.com` | Required to inject counter and monitor requests |

## Publishing to Chrome Web Store

1. Register as a [Chrome Web Store Developer](https://chrome.google.com/webstore/devconsole/) ($5 one-time fee)
2. Create a ZIP of the extension (excluding `generate-icons.html` and `README.md`)
3. Upload to the Developer Dashboard
4. Fill in store listing details and submit for review

## Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Commit (`git commit -m 'Add your feature'`)
5. Push (`git push origin feature/your-feature`)
6. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate comments.

## Troubleshooting

**Counter not showing?**
- Refresh the X page
- Check if "Show Counter" is enabled in extension settings
- Ensure you're on x.com or twitter.com

**Posts not being counted?**
- The extension monitors GraphQL endpoints which X uses internally
- Try posting again after a page refresh
- Check browser console for errors

**Counter position reset?**
- Position is saved automatically when you stop dragging
- Try clearing extension storage and repositioning

## License

This project is open source and available under the [MIT License](LICENSE).

## Credits

**Built by** [@ivaavimusic](https://x.com/ivaavimusic)

**A product of** [EventHorizon Labs](https://ehlabs.xyz)

## Support

- Open an issue on [GitHub](https://github.com/ivaavimusic/replyCounter_x/issues)
- Reach out on X: [@ivaavimusic](https://x.com/ivaavimusic)

---

Made for the X community.
