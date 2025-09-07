# **App Name**: Kannada Tech Data

## Core Features:

- Channel ID Retrieval: Automatically retrieve the YouTube channel ID from the provided channel URL.
- Video Data Fetching: Fetch all uploaded video metadata from the YouTube Data API v3, including title, uploader, upload date, share link and description.
- Pagination Handling: Handle pagination of the YouTube Data API to retrieve all videos, regardless of the number of videos on the channel.
- JSON Output Formatting: Format the fetched video data into a JSON array and print it to standard output.
- Error Handling: Implement error handling to gracefully manage API quota issues and missing video fields.
- Dynamic Script Configuration: The script uses the environment variable YT_API_KEY so the user does not need to re-edit the source.

## Style Guidelines:

- Primary color: Deep indigo (#4B0082) to reflect technical expertise and depth.
- Background color: Very light lavender (#F0F8FF) to create a clean and modern feel.
- Accent color: Bright turquoise (#30D5C8) to highlight important elements and provide visual interest.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and 'Inter' (sans-serif) for body text. 'Space Grotesk' gives a techy feel suitable for a technology channel and Inter's neutral, clean presentation will allow users to comfortably read longer descriptions if needed.