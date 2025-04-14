# YÖK Atlas Scraper

This project is a web scraper tool used to extract university program data from YÖK Atlas (Turkish Higher Education Council's information system).

## Features

- Extracts data from Mathematical (SAY), Verbal (SÖZ), and Equal-Weight (EA) departments
- Stores program information in JSON format
- All data is collected in a single file
- The following information is collected for each program:
  - Program ID
  - University name
  - Faculty/department name
  - Program name
  - Program description
  - Placement ranking
  - Placement score
  - Score type category

## Requirements

- Node.js
- npm or yarn

## Installation

1. Clone the project:

```
git clone https://github.com/yourusername/yokatlas_scraper.git
cd yokatlas_scraper
```

2. Install dependencies:

```
npm install
```

## Usage

To run the application, use the following command in your terminal:

```
node scrapper.js
```

The scraper will display the data extraction status for each page as it runs. Results are saved to the `yok_atlas_all_results.json` file.

## Data Format

The extracted data is saved in the following JSON format:

```json
[
  {
    "id": "203910699",
    "university": "KOÇ ÜNİVERSİTESİ",
    "department": "Tıp Fakültesi",
    "program": "Tıp",
    "description": "Program description",
    "rank": 24,
    "score": 555.4201,
    "category": "say"
  },
  ...
]
```

- `id`: Program ID number
- `university`: University name
- `department`: Faculty or department name
- `program`: Program name
- `description`: Program description
- `rank`: Placement ranking (null if not available)
- `score`: Placement score (null if not available)
- `category`: Score type (say, soz, ea)

## Notes

- "Dolmadı" (Not Filled) values for placement ranking and score are processed as null
- The scraper checks for "Eski Kılavuz Kodu" (Old Guide Code) condition to extract correct IDs
- Random waiting time is applied between pages for rate limiting
