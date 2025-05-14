document.addEventListener("DOMContentLoaded", () => {
	const closureForm = document.getElementById("closureForm");
	const generateBtn = document.getElementById("generateBtn");
	const printBtn = document.getElementById("printBtn");
	const previewContainer = document.getElementById("previewContainer");
	const signPreview = document.getElementById("signPreview");
	const jsonOutput = document.getElementById("jsonOutput");

	// Hardcoded current date for consistency with server
	const CURRENT_DATE = new Date("2025-03-27T13:42:57-07:00");

	// Process with GPT-4o via our API endpoint
	const processWithGPT4o = async (data) => {
		try {
			const response = await fetch("http://localhost:3001/api/process-closure", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(data)
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.error("Error calling API:", error);
			throw error;
		}
	};

	// Function to format date in a more readable format
	const formatDate = (dateString) => {
		try {
			// Make sure we're using the correct date format
			console.log("Formatting date:", dateString);
			const date = new Date(dateString);
			if (isNaN(date.getTime())) {
				console.error("Invalid date:", dateString);
				return dateString; // Return original if invalid
			}
			return date.toLocaleDateString("en-US", {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric"
			});
		} catch (error) {
			console.error("Error formatting date:", error);
			return dateString; // Return original if error
		}
	};

	// Function to generate a schedule table from structured times
	const generateScheduleTable = (structuredTimes) => {
		if (!structuredTimes || structuredTimes.length === 0) {
			return "";
		}

		console.log("Generating table from structuredTimes:", structuredTimes);

		// Sort by date
		const sortedTimes = [...structuredTimes].sort((a, b) => {
			return new Date(a.date) - new Date(b.date);
		});

		let tableHtml = `
			<table class="schedule-table">
				<thead>
					<tr>
						<th>Date</th>
						<th>Status</th>
						<th>Hours</th>
					</tr>
				</thead>
				<tbody>
		`;

		sortedTimes.forEach(entry => {
			const formattedDate = formatDate(entry.date);
			const status = entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
			const hours = entry.closed || entry.open || "";

			tableHtml += `
				<tr>
					<td>${formattedDate}</td>
					<td class="${entry.status}">${status}</td>
					<td>${hours}</td>
				</tr>
			`;
		});

		tableHtml += `
				</tbody>
			</table>
		`;

		return tableHtml;
	};

	// Function to render the closed sign
	const renderClosedSign = (data) => {
		const { departmentName, standardizedClosure, standardizedReopen, additionalInfo, structuredTimes } = data;
		
		console.log("Rendering sign with structuredTimes:", structuredTimes);
		const scheduleTable = generateScheduleTable(structuredTimes);
		
		signPreview.innerHTML = `
			<div class="closed-sign">
				<div class="sign-header">SORRY, WE'RE CLOSED</div>
				<div class="department">${departmentName}</div>
				
				<div class="schedule-container">
					${scheduleTable}
				</div>
				
				${additionalInfo && additionalInfo.trim() !== "" ? `<div class="additional-info">${additionalInfo}</div>` : ""}
				<div class="sf-logo">CITY AND COUNTY OF SAN FRANCISCO</div>
			</div>
		`;
	};

	// Function to display JSON data
	const displayJsonData = (cmsData) => {
		// Format the JSON with proper indentation for better readability
		jsonOutput.textContent = JSON.stringify(cmsData, null, 2);
		
		// Highlight the structured times in the UI if available
		if (cmsData.structuredTimes && cmsData.structuredTimes.length > 0) {
			console.log("Structured times available:", cmsData.structuredTimes);
		}
	};

	// Handle form submission
	closureForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		
		// Show loading state
		generateBtn.textContent = "Generating...";
		generateBtn.disabled = true;
		
		// Get form data
		const departmentName = document.getElementById("departmentName").value;
		const closureInfo = document.getElementById("closureInfo").value;
		const additionalInfo = document.getElementById("additionalInfo").value;
		
		try {
			// Process with GPT-4o
			const result = await processWithGPT4o({
				departmentName,
				closureInfo,
				additionalInfo
			});
			
			console.log("Full response from API:", result);
			
			// Render the closed sign with the structuredTimes from the API response
			renderClosedSign({
				departmentName,
				standardizedClosure: result.standardizedClosure,
				standardizedReopen: result.standardizedReopen,
				additionalInfo: result.additionalInfo,
				structuredTimes: result.structuredTimes || []
			});
			
			// Display JSON data
			displayJsonData(result.cmsData);
			
			// Show preview and enable print button
			previewContainer.classList.remove("hidden");
			printBtn.disabled = false;
			
			// Scroll to preview
			previewContainer.scrollIntoView({ behavior: "smooth" });
		} catch (error) {
			console.error("Error generating sign:", error);
			alert("There was an error generating your sign. Please try again.");
		} finally {
			// Reset button state
			generateBtn.textContent = "Generate Sign";
			generateBtn.disabled = false;
		}
	});

	// Handle print button click
	printBtn.addEventListener("click", () => {
		window.print();
	});
});
