// src/utils/getBlog.ts
// ============================================================================
// 📝 WHY THIS FILE WAS CREATED:
// 1. DATE CONVERSION: Excel stores dates as 5-digit serial numbers (e.g. 46000).
//    This file translates those raw numbers into readable text (e.g. "Oct 17, 2026").
// 2. CENTRALIZED FETCHING: Instead of repeating Excel-reading code in multiple 
//    places, this file reads 'blogs.xlsx' once and provides clean blog posts 
//    to both the blog listing page and individual article pages.
// ============================================================================

// ============================================================================
// PART 1: IMPORTING EXTERNAL TOOLS (LIBRARIES)
// ============================================================================
// 1. 'xlsx': A community package that can read and parse Excel (.xlsx, .xls) files.
import * as XLSX from 'xlsx';

// 2. 'path': A built-in Node.js tool to stitch folder names into valid computer paths
//    regardless of whether you are running on Windows (C:\...) or Mac/Linux (/...).
import path from 'node:path';

// 3. 'fs' (File System): A built-in Node.js tool that lets code read, write,
//    and check files sitting on your hard drive.
import fs from 'node:fs';


// ============================================================================
// PART 2: THE BLUEPRINT / DATA CONTRACT (TypeScript Interface)
// ============================================================================
// This interface defines what a clean blog post looks like in our code.
// Every post handed to our website will have these 7 exact text (string) fields.
export interface BlogPost {
  title: string;    // The article title
  slug: string;     // The URL path name (e.g. "what-it-can-take-to-stay-put")
  date: string;     // Formatted publication date (e.g. "Oct 17, 2026")
  category: string; // The topic badge (e.g. "Market Insights")
  excerpt: string;  // Short teaser text shown on cards
  image: string;    // Image URL for the card & article cover
  content: string;  // The full markdown/text written in Excel
}


// ============================================================================
// PART 3: THE MAIN FUNCTION (getAllPosts)
// ============================================================================
// This function does all the heavy lifting and returns a list (array) of BlogPosts.
export function getAllPosts(): BlogPost[] {

  // 1. Find the exact path to blogs.xlsx on your computer's hard drive
  //    process.cwd() means "the root folder of this project".
  const filePath = path.resolve(process.cwd(), 'src', 'data', 'blogs.xlsx');

  // 2. Safety Check: If the file does not exist on disk, return an empty list []
  //    This prevents the entire website from crashing if the file is moved or renamed.
  if (!fs.existsSync(filePath)) return [];

  // 3. Read the binary raw data of the spreadsheet into memory
  const fileBuffer = fs.readFileSync(filePath);

  // 4. Parse the binary data with the XLSX engine into an active workbook object
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  // 5. Select the very first tab/sheet inside the Excel workbook
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // 6. Convert the sheet's rows into JavaScript objects.
  //    { defval: '' } ensures that if any cell is left blank, it becomes "" instead of undefined.
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // 7. A fallback image to show if you leave the 'image' cell blank in Excel
  const fallbackImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';


  // ==========================================================================
  // HELPER FUNCTION: PARSING EXCEL DATES (The 5-digit number fix)
  // ==========================================================================
  // Excel stores dates as serial numbers counting days since Jan 1, 1900.
  // For example, the year 2026 is stored as a number around 46000.
  // If the cell contains a raw number > 30000, we convert it to real text ("Oct 17, 2026").
  const parseDate = (dateVal: any) => {
    if (!dateVal) return '';

    const num = Number(dateVal);
    // If it's a numeric Excel serial timestamp:
    if (!isNaN(num) && num > 30000) {
      // 25569 is the day offset between Excel's epoch (1900) and Unix epoch (1970)
      const utcDays = Math.floor(num - 25569);
      // 86,400,000 milliseconds in one day
      const dateObj = new Date(utcDays * 86400 * 1000);
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // If it was already typed as plain text (e.g. "Oct 17, 2026"), just return it trimmed
    return String(dateVal).trim();
  };


  // ==========================================================================
  // STEP 4: TRANSFORM EACH ROW INTO A CLEAN POST
  // ==========================================================================
  // .map() loops through every single row of your Excel file one by one
  return rawRows
    .map((row) => {

      // A. Normalize all column header names to lowercase and trimmed
      //    So whether you typed "Title", "TITLE", or "title ", it all becomes "title".
      const normalizedRow: Record<string, any> = {};
      for (const [key, val] of Object.entries(row)) {
        normalizedRow[key.trim().toLowerCase()] = val;
      }

      // B. Extract the Title. If there's no title, mark this row as null (to be discarded).
      const title = String(normalizedRow.title || '').trim();
      if (!title) return null;

      // C. Automatic Fallback Slug:
      //    If you don't type a slug in Excel, we automatically take the title,
      //    lowercase it, replace spaces and special symbols with hyphens:
      //    "What It Takes!" -> "what-it-takes"
      const fallbackSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-letters/numbers with a single dash
        .replace(/(^-|-$)/g, '');    // Strip leading or trailing dashes

      // Use the typed slug if provided, otherwise use our generated fallback slug
      const slug = String(normalizedRow.slug || fallbackSlug).trim();

      // D. Clean and parse date, category, excerpt, image, and content
      const date = parseDate(normalizedRow.date);
      const category = String(normalizedRow.category || normalizedRow.tag || 'Market Insights').trim();
      const excerpt = String(normalizedRow.excerpt || normalizedRow.description || '').trim();
      const image = String(normalizedRow.image || fallbackImage).trim();
      const content = String(normalizedRow.content || '').trim();

      // Return our clean, structured blog post object
      return {
        title,
        slug,
        date,
        category,
        excerpt,
        image: image.length > 0 ? image : fallbackImage,
        content
      };
    })
    // STEP 5: FILTER OUT EMPTY ROWS
    // If a row in Excel was empty or had no title, .filter() discards it
    // so only real, published articles make it to your site.
    .filter((post): post is NonNullable<typeof post> => post !== null && post.title.length > 0);
}