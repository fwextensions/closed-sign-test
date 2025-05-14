const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");
const path = require("path");

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001; // Explicitly set port to 3001

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// Initialize OpenAI
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

// API endpoint to process closure information with GPT-4o
app.post("/api/process-closure", async (req, res) => {
	try {
		const { departmentName, closureInfo, additionalInfo } = req.body;

		// Validate required fields
		if (!departmentName || !closureInfo) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		const currentDate = new Date();
		const formattedDate = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD
		const formattedTime = currentDate.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "numeric",
			hour12: true
		});
		const currentYear = currentDate.getFullYear();
		const currentMonth = currentDate.getMonth() + 1;
		const currentDay = currentDate.getDate();
		const dayOfWeek = currentDate.toLocaleDateString("en-US", { weekday: "long" });
		
		// Calculate tomorrow's date and day of week
		const tomorrowDate = new Date(currentDate);
		tomorrowDate.setDate(currentDate.getDate() + 1);
		const tomorrowFormatted = tomorrowDate.toISOString().split("T")[0];
		const tomorrowDayOfWeek = tomorrowDate.toLocaleDateString("en-US", { weekday: "long" });
		
		// Get days of the week for the next 7 days
		const nextSevenDays = [];
		for (let i = 0; i < 7; i++) {
			const futureDate = new Date(currentDate);
			futureDate.setDate(currentDate.getDate() + i);
			nextSevenDays.push({
				date: futureDate.toISOString().split("T")[0],
				day: futureDate.toLocaleDateString("en-US", { weekday: "long" }),
				relative: i === 0 ? "today" : i === 1 ? "tomorrow" : `${futureDate.toLocaleDateString("en-US", { weekday: "long" })}`
			});
		}

		// Create prompt for GPT-4o
		const prompt = `
You are a helpful assistant for the City and County of San Francisco. 
Your task is to standardize office closure information for public notices.

CURRENT DATE AND TIME INFORMATION:
- Today is ${dayOfWeek}, ${formattedDate} at ${formattedTime}
- Tomorrow is ${tomorrowDayOfWeek}, ${tomorrowFormatted}
- The current year is ${currentYear} (this is 2025, not 2023)

DAYS OF THE WEEK REFERENCE:
${nextSevenDays.map(day => `- ${day.relative}: ${day.day}, ${day.date}`).join("\n")}

Department Name: ${departmentName}
Closure Information: ${closureInfo}
${additionalInfo ? `Additional Information: ${additionalInfo}` : ""}

Please extract and standardize the following information:
1. The exact dates and times when the office will be closed
2. The exact date and time when the office will reopen
3. Format this information in a clear, professional way suitable for a public notice

IMPORTANT: You must extract the ACTUAL dates and times from the closure information, not just return the example format. DO NOT use placeholders like "YYYY-MM-DD" or "2023-MM-DD" in your response.

For example, if the closure information says "We will be closed tomorrow from 2pm to 5pm and will reopen the next day at 8am", you should extract:
- Tomorrow (${tomorrowDayOfWeek}) is ${tomorrowFormatted} (convert to YYYY-MM-DD format: ${tomorrowFormatted})
- Closed time: 2pm-5pm
- The day after tomorrow is the date after ${tomorrowFormatted}
- Open time: starting at 8am

Return your response as a JSON object with the following structure:
{
  "standardizedClosure": "This office will be closed: [standardized closure information]",
  "standardizedReopen": "We will reopen: [standardized reopening information]",
  ${additionalInfo ? `"additionalInfo": "[formatted additional information]",` : `"additionalInfo": "",`}
  "structuredTimes": [
    {
      "date": "2025-03-30",
      "closed": "2:00pm-5:00pm",
      "status": "closed"
    },
    {
      "date": "2025-03-31",
      "open": "8:00am-5:00pm",
      "status": "open"
    }
  ]
}

For the structuredTimes array:
- Include an entry for each date affected
- Use ISO format (YYYY-MM-DD) for dates - MAKE SURE TO INCLUDE THE ACTUAL YEAR (2025)
- Use 12-hour format with am/pm for times (e.g., "9:00am-5:00pm")
- Set status to "closed" for dates/times when the office is closed
- Set status to "open" for dates/times when the office is open
- If a date has both open and closed periods, create separate entries for each
- If no specific year is mentioned, assume the current year (2025)
- If relative dates are mentioned (e.g., "today", "tomorrow", "next Monday"), convert them to actual dates based on today being ${dayOfWeek}, ${formattedDate}
- DO NOT use placeholders like "MM" or "DD" in your response
${additionalInfo ? "" : "- If no additional information was provided, leave the additionalInfo field as an empty string"}
`;

		// Log the prompt for debugging
		console.log("===== PROMPT SENT TO GPT-4o =====");
		console.log(prompt);
		console.log("=================================");

		// Call OpenAI API
		const completion = await openai.chat.completions.create({
			model: "gpt-4o",
			messages: [
				{ 
					role: "system", 
					content: `You are a helpful assistant that standardizes office closure information. You extract specific dates and times from text and format them in a structured way. Today is ${dayOfWeek}, ${formattedDate} at ${formattedTime}. Tomorrow is ${tomorrowDayOfWeek}, ${tomorrowFormatted}. The current year is 2025.`
				},
				{ role: "user", content: prompt }
			],
			response_format: { type: "json_object" }
		});

		// Parse the response
		const gptResponse = JSON.parse(completion.choices[0].message.content);
		
		// Log the response for debugging
		console.log("===== RESPONSE FROM GPT-4o =====");
		console.log(JSON.stringify(gptResponse, null, 2));
		console.log("=================================");
		
		// Validate and fix structured times if needed
		if (gptResponse.structuredTimes && Array.isArray(gptResponse.structuredTimes)) {
			gptResponse.structuredTimes = gptResponse.structuredTimes.map(timeEntry => {
				// Fix any date format issues
				if (timeEntry.date && (timeEntry.date.includes("MM") || timeEntry.date.includes("DD") || timeEntry.date.startsWith("2023"))) {
					// If the model returned a placeholder or wrong year, use today's date as fallback
					const today = new Date();
					timeEntry.date = `2025-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
				}
				return timeEntry;
			});
		}

		// Create CMS data
		const cmsData = {
			departmentName: departmentName,
			closureStatus: "closed",
			lastUpdated: new Date().toISOString(),
			closureDetails: {
				closureInfo: gptResponse.standardizedClosure,
				reopenInfo: gptResponse.standardizedReopen,
				additionalInfo: gptResponse.additionalInfo || ""
			},
			structuredTimes: gptResponse.structuredTimes || [],
			metadata: {
				generatedBy: "SF Office Closure Sign Generator",
				generatedOn: new Date().toLocaleDateString("en-US", {
					weekday: "long",
					month: "long",
					day: "numeric",
					year: "numeric"
				})
			}
		};

		// Send response
		res.json({
			standardizedClosure: gptResponse.standardizedClosure,
			standardizedReopen: gptResponse.standardizedReopen,
			additionalInfo: gptResponse.additionalInfo || "",
			structuredTimes: gptResponse.structuredTimes || [],
			cmsData
		});
	} catch (error) {
		console.error("Error processing with GPT-4o:", error);
		res.status(500).json({ error: "Failed to process closure information" });
	}
});

// Start server
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
