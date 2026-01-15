# 🎸 VibeDashboard

Display your Claude Code (vibe coding) usage stats on your GitHub profile README!

[![npm version](https://badge.fury.io/js/vibe-dashboard.svg)](https://www.npmjs.com/package/vibe-dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 📊 **Automatic Updates** - GitHub Actions updates your stats daily
- 🎨 **Themes** - Dark and light mode support
- 🌍 **i18n** - English, Korean, and Japanese support
- 📈 **Rich Stats** - Token usage, costs, model breakdown, and charts
- 🖼️ **SVG Cards** - Beautiful cards for your profile
- ⚡ **Zero Server** - 100% GitHub Actions, no server needed
- 📅 **Period Filtering** - View stats by day, week, month, or all time
- 🔗 **Multi-Server Support** - Merge data from multiple machines

## Preview

### Card Layout (Dark Theme)

![VibeDashboard Example](./example-card.svg)

## Quick Setup

### 1. Create GitHub Profile Repo

Create a repository with your GitHub username (e.g., `YOUR_USERNAME/YOUR_USERNAME`). This will appear on your GitHub profile.

### 2. Add Markers to README

Add these markers to your profile README where you want the dashboard to appear:

```markdown
<!-- VIBE-DASHBOARD:START -->
![Vibe Dashboard](./vibe-card.svg)
<!-- VIBE-DASHBOARD:END -->
```

### 3. Add GitHub Actions Workflow

Create `.github/workflows/update-dashboard.yml`:

```yaml
name: Update Vibe Dashboard

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:
  push:
    paths:
      - '*-cc.json'
      - 'cc.json'

jobs:
  update-dashboard:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install -g vibe-dashboard

      - name: Generate dashboard from all sources
        run: |
          FILES=$(ls *-cc.json cc.json 2>/dev/null | sort -u | tr '\n' ' ')
          if [ -n "$FILES" ]; then
            vibe-dashboard generate \
              -i $FILES \
              --output ./README.md \
              --svg-output ./vibe-card.svg
          fi

      - run: |
          git config --local user.email "action@github.com"
          git config --local user.name "VibeDashboard Bot"
          git add README.md vibe-card.svg
          git diff --quiet && git diff --staged --quiet || git commit -m "📊 Update Vibe Dashboard [skip ci]"
          git push
```

### 4. Set Up Auto-Sync on Each Machine

On each machine where you use Claude Code, just tell Claude Code:

```
"Follow https://github.com/mjyoo2/VibeDashboard#multi-server-setup and set up this server as [server-name]"
```

For manual setup, see [Multi-Server Setup](#multi-server-setup).

### 5. (Optional) Create Config

Create `vibe-config.json` for customization:

```json
{
  "theme": "dark",
  "layout": "card",
  "language": "en"
}
```

## CLI Commands

### Generate Dashboard

```bash
npx vibe-dashboard generate [options]

Options:
  -c, --config <path>       Path to config file (default: ./vibe-config.json)
  -i, --input <paths...>    Path(s) to ccusage JSON file(s) - supports multiple
  -o, --output <path>       Path to README file (default: ./README.md)
  -s, --svg-output <path>   Path to save SVG file
  --theme <theme>           Theme: dark or light
  --layout <layout>         Layout: card, minimal, or detailed
  --language <lang>         Language: en, ko, or ja
  --period <period>         Time period: day, week, month, or all
```

### Initialize README

Add markers to your README:

```bash
npx vibe-dashboard init
```

### Validate Data

Validate your cc.json file:

```bash
npx vibe-dashboard validate --input ./cc.json
```

### Merge Multiple Sources

Combine data from multiple machines/servers:

```bash
npx vibe-dashboard merge -i server1.json -i server2.json -o merged.json
```

## Multi-Server Setup

If you use Claude Code on multiple machines, you can automatically collect and merge all your usage data.

### How to Ask Claude Code

Just tell Claude Code:

```
"Follow https://github.com/mjyoo2/VibeDashboard#multi-server-setup and set up this server as [server-name]"
```

or in Korean:

```
"https://github.com/mjyoo2/VibeDashboard#multi-server-setup 를 보고 이 서버를 [서버이름]으로 세팅해줘"
```

> **For Claude Code AI:** Follow these steps exactly to set up multi-server sync for the user.

### Step 1: Clone Profile Repo

Run these commands on the machine where you want to set up sync:

```bash
# Replace YOUR_USERNAME with actual GitHub username
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_USERNAME.git
cd YOUR_USERNAME
```

### Step 2: Create Sync Script

Create the sync script file. **Important:** Replace `YOUR_USERNAME` and `SERVER_NAME` with actual values.

```bash
# Create the script file
cat > ~/YOUR_USERNAME/sync-usage.sh << 'EOF'
#!/bin/bash
#############################################
# VibeDashboard Auto-Sync Script
#
# CONFIGURATION - Edit these values:
GITHUB_USERNAME="YOUR_USERNAME"      # Your GitHub username
SERVER_NAME="desktop"                # Unique name: desktop, laptop, server1, work-pc, etc.
#############################################

REPO_DIR="$HOME/${GITHUB_USERNAME}"

# Navigate to repo
cd "$REPO_DIR" || { echo "Error: Repo not found at $REPO_DIR"; exit 1; }

# Pull latest changes
git pull origin main

# Check if ccusage is installed
if ! command -v ccusage &> /dev/null; then
    echo "Error: ccusage not installed. Run: npm install -g ccusage"
    exit 1
fi

# Generate usage data
ccusage --json > "${SERVER_NAME}-cc.json"

# Check if file was created and has content
if [ ! -s "${SERVER_NAME}-cc.json" ]; then
    echo "Error: Failed to generate usage data"
    exit 1
fi

# Commit and push
git add "${SERVER_NAME}-cc.json"
if git diff --quiet && git diff --staged --quiet; then
    echo "No changes to commit"
else
    git commit -m "📊 Update ${SERVER_NAME} usage data"
    # Push with retry on failure (handles GitHub Actions conflicts)
    if ! git push origin main 2>/dev/null; then
        echo "Push failed, pulling and retrying..."
        git pull --rebase origin main
        git push origin main
    fi
    echo "✅ Successfully synced ${SERVER_NAME} data"
fi
EOF
```

Make the script executable:

```bash
chmod +x ~/YOUR_USERNAME/sync-usage.sh
```

### Step 3: Edit Script Configuration

Open the script and edit the configuration section:

```bash
# Edit the script
nano ~/YOUR_USERNAME/sync-usage.sh

# Or use sed to replace values directly:
sed -i 's/YOUR_USERNAME/actual_username/g' ~/YOUR_USERNAME/sync-usage.sh
sed -i 's/SERVER_NAME="desktop"/SERVER_NAME="actual_server_name"/g' ~/YOUR_USERNAME/sync-usage.sh
```

**Configuration values to set:**
| Variable | Description | Examples |
|----------|-------------|----------|
| `GITHUB_USERNAME` | Your GitHub username | `johndoe`, `janedoe` |
| `SERVER_NAME` | Unique identifier for this machine | `desktop`, `laptop`, `work-pc`, `home-server`, `macbook` |

### Step 4: Test the Script

Run manually first to verify it works:

```bash
~/YOUR_USERNAME/sync-usage.sh
```

Expected output:
```
✅ Successfully synced desktop data
```

### Step 5: Schedule Auto-Sync

#### Linux/Mac (cron)

```bash
# Open crontab editor
crontab -e

# Add one of these lines:

# Option 1: Run daily at midnight
0 0 * * * $HOME/YOUR_USERNAME/sync-usage.sh >> $HOME/vibe-sync.log 2>&1

# Option 2: Run every 6 hours
0 */6 * * * $HOME/YOUR_USERNAME/sync-usage.sh >> $HOME/vibe-sync.log 2>&1

# Option 3: Run every hour
0 * * * * $HOME/YOUR_USERNAME/sync-usage.sh >> $HOME/vibe-sync.log 2>&1
```

Verify cron job was added:
```bash
crontab -l
```

#### Windows (Task Scheduler via PowerShell)

```powershell
# Create scheduled task that runs daily at midnight
$action = New-ScheduledTaskAction -Execute "bash.exe" -Argument "-c '$HOME/YOUR_USERNAME/sync-usage.sh'"
$trigger = New-ScheduledTaskTrigger -Daily -At 12:00AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "VibeDashboard Sync" -Description "Sync Claude Code usage to GitHub"
```

Or manually via Task Scheduler GUI:
1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task → Name: "VibeDashboard Sync"
3. Trigger: Daily
4. Action: Start a program
   - Program: `bash.exe`
   - Arguments: `-c "$HOME/YOUR_USERNAME/sync-usage.sh"`

### Example: Complete Setup with 2 Servers

**On Desktop (Windows/WSL):**
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_USERNAME.git
cd YOUR_USERNAME

cat > sync-usage.sh << 'EOF'
#!/bin/bash
GITHUB_USERNAME="YOUR_USERNAME"
SERVER_NAME="desktop"
REPO_DIR="$HOME/${GITHUB_USERNAME}"
cd "$REPO_DIR" || exit 1
git pull origin main
ccusage --json > "${SERVER_NAME}-cc.json"
git add "${SERVER_NAME}-cc.json"
if ! git diff --quiet || ! git diff --staged --quiet; then
    git commit -m "📊 Update ${SERVER_NAME} usage data"
    git push origin main || { git pull --rebase origin main && git push origin main; }
fi
EOF

chmod +x sync-usage.sh
./sync-usage.sh
```

**On Laptop (Mac):**
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_USERNAME.git
cd YOUR_USERNAME

cat > sync-usage.sh << 'EOF'
#!/bin/bash
GITHUB_USERNAME="YOUR_USERNAME"
SERVER_NAME="laptop"
REPO_DIR="$HOME/${GITHUB_USERNAME}"
cd "$REPO_DIR" || exit 1
git pull origin main
ccusage --json > "${SERVER_NAME}-cc.json"
git add "${SERVER_NAME}-cc.json"
if ! git diff --quiet || ! git diff --staged --quiet; then
    git commit -m "📊 Update ${SERVER_NAME} usage data"
    git push origin main || { git pull --rebase origin main && git push origin main; }
fi
EOF

chmod +x sync-usage.sh
./sync-usage.sh
```

### Final Repository Structure

```
YOUR_USERNAME/
├── README.md                      # Auto-updated by GitHub Actions
├── vibe-card.svg                  # Auto-generated dashboard image
├── vibe-config.json               # Optional configuration
├── desktop-cc.json                # Usage data from desktop
├── laptop-cc.json                 # Usage data from laptop
├── server1-cc.json                # Usage data from server1
├── sync-usage.sh                  # Sync script (optional, can delete after setup)
└── .github/
    └── workflows/
        └── update-dashboard.yml   # GitHub Actions workflow
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| `ccusage: command not found` | Run `npm install -g ccusage` |
| `Permission denied` | Run `chmod +x sync-usage.sh` |
| `Repository not found` | Check GITHUB_USERNAME in script |
| `Authentication failed` | Set up Git credentials or SSH key |
| Cron not running | Check `crontab -l` and system logs |
| No data in dashboard | Verify `*-cc.json` files exist in repo |

The dashboard will automatically show: `> Merged from N sources` when multiple data files are detected

## Period Filtering

View your stats for specific time periods:

```bash
# Today only
vibe-dashboard generate --period day

# This week (last 7 days)
vibe-dashboard generate --period week

# This month (last 30 days)
vibe-dashboard generate --period month

# All time (default)
vibe-dashboard generate --period all
```

Period is shown in the title:
- `🎸 Vibe Coding Stats (Today)`
- `🎸 Vibe Coding Stats (This Week)`
- `🎸 Vibe Coding Stats (This Month)`
- `🎸 Vibe Coding Stats` (all time)

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | string | `"dark"` | `"dark"` or `"light"` |
| `layout` | string | `"card"` | `"card"`, `"minimal"`, or `"detailed"` |
| `period` | string | `"all"` | `"day"`, `"week"`, `"month"`, or `"all"` |
| `language` | string | `"en"` | `"en"`, `"ko"`, or `"ja"` |
| `currencySymbol` | string | `"$"` | Currency symbol for costs |
| `chartDays` | number | `14` | Days to show in chart (7, 14, 30) |
| `showItems.totalTokens` | boolean | `true` | Show total tokens |
| `showItems.totalCost` | boolean | `true` | Show total cost |
| `showItems.periodChart` | boolean | `true` | Show usage chart |
| `showItems.modelBreakdown` | boolean | `true` | Show model breakdown |
| `showItems.dailyAverage` | boolean | `true` | Show daily average |
| `showItems.lastUpdated` | boolean | `true` | Show last updated time |

### Full Config Example

```json
{
  "theme": "dark",
  "layout": "card",
  "period": "week",
  "showItems": {
    "totalTokens": true,
    "totalCost": true,
    "periodChart": true,
    "modelBreakdown": true,
    "dailyAverage": true,
    "lastUpdated": true
  },
  "chartDays": 14,
  "language": "ko",
  "currencySymbol": "$"
}
```

## Layouts

### Card (Default)

SVG card with all stats in a compact format. Best for profile headers.

### Minimal

Pure markdown, no SVG. Lightweight and works everywhere.

### Detailed

SVG card + expanded markdown with model breakdown table.

## Languages

| Code | Language | Period Labels |
|------|----------|---------------|
| `en` | English | Today, This Week, This Month, All Time |
| `ko` | 한국어 | 오늘, 이번 주, 이번 달, 전체 기간 |
| `ja` | 日本語 | 今日, 今週, 今月, 全期間 |

## Requirements

- Node.js 20+
- [ccusage](https://github.com/ryoppippi/ccusage) for generating usage data
- GitHub Actions enabled on your repository

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Privacy

VibeDashboard is **privacy-first**:

- ✅ All data stays in your repository
- ✅ No external servers or APIs
- ✅ No tracking or analytics
- ✅ 100% open source

## Credits

- [ccusage](https://github.com/ryoppippi/ccusage) - Claude Code usage tracking
- Inspired by [github-readme-stats](https://github.com/anuraghazra/github-readme-stats)

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Made with 🎸 by vibe coders
