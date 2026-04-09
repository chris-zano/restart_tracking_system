# Grade Book Dashboard

A Streamlit-based dashboard for managing student grades, attendance, and email campaigns for the Restart Program.

## Quick Start

```bash
# Install Bun (if not installed)
powershell -c "irm bun.sh/install.ps1|iex"

# Install dependencies
bun install
pip install -r python/requirements.txt

# Run TypeScript analysis (recommended)
bun app.ts analyze

# Or run Python Streamlit dashboard
streamlit run python/streamlit_app.py

# Or start the REST API server
bun app.ts serve
```

## Features

- **Grade Analytics**: Process Canvas gradebook exports and visualize student performance
- **Attendance Tracking**: Analyze Zoom attendance reports with fuzzy name matching
- **Email Campaigns**: Send targeted emails to students based on grade/attendance filters
- **Automated Data Processing**: Fuzzy matching to link student names across different systems
- **Dual Implementation**: Available as both TypeScript/Bun and Python applications
- **REST API**: Programmatic access to analytics via HTTP endpoints

## Project Structure

```
grade_book/
├── app.ts                    # Main Bun/TypeScript entry point
├── index.ts                  # Bun module entry
├── package.json              # Node/Bun dependencies
├── tsconfig.json             # TypeScript configuration
├── src/                      # TypeScript source code
│   ├── api/                  # REST API server
│   ├── cli/                  # CLI commands
│   ├── loaders/              # Data loading modules
│   ├── parsers/              # CSV parsers
│   ├── analysis/             # Analysis logic
│   ├── orchestrator/         # Data orchestration
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utilities
├── python/                   # Python implementation
│   ├── main.py               # CLI interface
│   ├── streamlit_app.py      # Streamlit dashboard
│   ├── load_data.py          # Load class list and grade CSVs
│   ├── load_attendance.py    # Load attendance reports
│   ├── clean_csv.py          # Clean & match grade data
│   ├── clean_attendance.py   # Clean & match attendance data
│   ├── analyse_data.py       # Generate grade reports
│   ├── analyse_attendance.py # Generate attendance reports
│   ├── analyse_weekly_progress.py # Weekly progress analysis
│   ├── send_emails.py        # SMTP email engine
│   ├── email_templates.py    # Email template generator
│   ├── requirements.txt      # Python dependencies
│   └── config/               # Configuration files
│       ├── email_config.json # SMTP configuration
│       └── settings.json     # Application settings
├── attendance_reports/       # Zoom attendance CSV files
├── weekly_targets/           # Canvas gradebook CSV files (weekly targets)
├── learner_progess_reports/  # Canvas learner progress reports
├── class_list/               # Student names and emails mapping
│   └── class_list.csv
└── docs/                     # Project documentation
```

## Setup

### 1. Install Dependencies

#### Python Dependencies

```bash
pip install -r python/requirements.txt
```

#### TypeScript/Bun Dependencies

Install [Bun](https://bun.sh) if not already installed:

```bash
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1|iex"

# macOS/Linux
curl -fsSL https://bun.sh/install | bash
```

Then install project dependencies:

```bash
bun install
```

### 2. Configure Email (Microsoft Entra ID SMTP)

Create `config/email_config.json`:

```json
{
  "smtp": {
    "server": "smtp.office365.com",
    "port": 587,
    "sender_email": "your-email@domain.com",
    "sender_password": "your-app-password",
    "use_tls": true
  }
}
```

**Note**: Use an app-specific password for Microsoft accounts. Never commit this file to version control (already in `.gitignore`).

### 3. Prepare Data Files

- **class_list/class_list.csv**: Must have columns `Full Name` and `Emails`
- **weekly_targets/\*.csv**: Canvas gradebook exports
- **attendance_reports/\*.csv**: Zoom attendance reports (format: `participants_ID_YYYY_MM_DD.csv`)
- **learner_progess_reports/\*.csv**: Learner progress reports from Canvas

## Usage

### TypeScript/Bun Application (Recommended)

#### Run Analysis

Process and analyze all grade book data:

```bash
bun run app.ts analyze
```

Or simply:

```bash
bun app.ts
```

#### Start API Server

Launch the REST API server for programmatic access:

```bash
bun run app.ts serve
```

By default, the server runs on port 3000. To specify a custom port:

```bash
bun run app.ts serve 8080
```

#### Get Help

View all available commands:

```bash
bun run app.ts help
```

### Python Scripts

#### CLI Mode

Run analysis and output reports to stdout:

```bash
python python/main.py
```

This will:

- Load all CSVs from `weekly_targets/` and `attendance_reports/`
- Process and match student names using fuzzy matching
- Output formatted reports to console

#### Streamlit Dashboard

Launch the interactive web dashboard:

```bash
streamlit run python/streamlit_app.py
```

Then navigate to `http://localhost:8501` in your browser.

**Dashboard Features:**

- **Dashboard**: Overview with key metrics
- **Grade Analytics**: Per-week grade breakdowns, student performance tables
- **Attendance**: Session-by-session attendance tracking
- **Email Campaign**: Filter students and send targeted emails

#### Individual Python Modules

Run specific analysis modules independently:

```bash
# Analyze grade data
python python/analyse_data.py

# Analyze attendance data
python python/analyse_attendance.py

# Analyze weekly progress
python python/analyse_weekly_progress.py

# Send emails
python python/send_emails.py
```

## Data Processing Pipeline

1. **Load Class List**: Read `class_list.csv` for student name/email mappings
2. **Load CSVs**: Discover all files in `weekly_targets/` and `attendance_reports/`
3. **Fuzzy Matching**: Match Canvas/Zoom names to class list using Levenshtein distance
4. **Clean Data**: Extract KC scores, lab scores, attendance duration
5. **Analyze**: Compute completion rates, averages, attendance metrics
6. **Report**: Generate structured reports (CLI) or interactive visualizations (Streamlit)

## Fuzzy Matching

The system uses `fuzzywuzzy` library with token set ratio scoring (threshold: 80%) to handle:

- Name variations (e.g., "Bamuah Zenab" vs "Bamuah ZenabBamuah Zenab")
- Spelling differences
- Extra whitespace or characters

Unmatched students are logged for manual review.

## Email Campaigns

**Filters Available:**

- Completion rate (min/max %)
- Attendance rate
- Manual student selection

**Template Variables:**

- `{name}`: Replaced with student name in each email

## Troubleshooting

### TypeScript/Bun Issues

#### "bun: command not found"

Install Bun using the installation command above, then restart your terminal.

#### TypeScript compilation errors

Ensure you have TypeScript peer dependency:

```bash
bun add -d typescript
```

#### Module resolution errors

Check that `tsconfig.json` is properly configured and all imports use correct paths.

### Python Issues

#### "FileNotFoundError: class_list.csv not found"

Ensure `class_list/class_list.csv` exists in the correct directory path.

#### "ModuleNotFoundError: No module named 'streamlit'"

Install Python dependencies:

```bash
pip install -r python/requirements.txt
```

#### "Authentication failed" when sending emails

- Verify SMTP credentials in `python/config/email_config.json`
- For Microsoft accounts, use an app-specific password
- Check firewall/network restrictions on port 587

#### Students not matching

- Check fuzzy match scores in reports
- Verify names in `class_list/class_list.csv` match Canvas/Zoom exports
- Adjust threshold in `python/clean_csv.py` if needed (default: 80)

## Development

### TypeScript/Bun Development

To add new features to the TypeScript implementation:

1. **Data loading**: Modify files in `src/loaders/`
2. **Data parsing**: Update parsers in `src/parsers/`
3. **Analysis logic**: Extend `src/analysis/`
4. **API endpoints**: Add routes in `src/api/routes.ts`
5. **CLI commands**: Update `src/cli/commands.ts`

Run in development mode with hot reloading:

```bash
bun --watch app.ts analyze
```

### Python Development

To add new features to the Python implementation:

1. **Data loading**: Modify `python/load_data.py` or `python/load_attendance.py`
2. **Data cleaning**: Update `python/clean_csv.py` or `python/clean_attendance.py`
3. **Analysis logic**: Extend `python/analyse_data.py` or `python/analyse_attendance.py`
4. **UI**: Add pages/sections in `python/streamlit_app.py`

### Running Tests

```bash
# TypeScript tests (if available)
bun test

# Python tests (if available)
python -m pytest
```

## License

Internal use for Restart Program. Do not distribute without permission.

## Author

Christian Solomon  
christian.solomon@amalitech.com
