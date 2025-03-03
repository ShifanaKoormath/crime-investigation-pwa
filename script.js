let currentLimit = 10; // Initial limit of cases to display

function uploadFile() {
    let fileInput = document.getElementById("fileInput");
    let loader = document.getElementById("loader");
    let resultDiv = document.getElementById("result");
    let showMoreBtn = document.getElementById("showMore");

    if (!fileInput.files.length) {
        alert("Please select a file!");
        return;
    }

    let file = fileInput.files[0];
    document.getElementById("fileName").textContent = "Selected File: " + file.name;

    let formData = new FormData();
    formData.append("file", file);

    loader.style.display = "block";
    resultDiv.innerHTML = "";
    showMoreBtn.style.display = "none"; // Hide Show More initially

    fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        loader.style.display = "none";

        if (data.similar_cases && data.similar_cases.length > 0) {
            resultDiv.innerHTML = `<h3>Similar Cases (Top ${currentLimit} Shown)</h3>`;

            data.similar_cases.forEach((caseData, index) => {
                let caseDiv = document.createElement("div");
                caseDiv.className = "case";
                caseDiv.innerHTML = `
                    <strong>Case ${index + 1}:</strong><br>
                    <strong>Crime:</strong> ${caseData.Crime}<br>
                    <strong>Year:</strong> ${caseData.Year}<br>
                    <strong>Place:</strong> ${caseData.Place}<br>
                    <strong>Accused Count:</strong> ${caseData["Accused Count"]}<br>
                    <strong>Similarity Score:</strong> ${caseData["Similarity Score"]}<br>
                    <strong>Reason for Similarity:</strong> ${caseData["Similarities Found"]}
                    <hr>
                `;
                resultDiv.appendChild(caseDiv);
            });

            if (data.total_found > currentLimit) {
                showMoreBtn.style.display = "block"; // Show button if more cases exist
            }
        } else {
            resultDiv.innerHTML = "<p>No similar cases found.</p>";
        }

        window.scrollTo({ top: resultDiv.offsetTop, behavior: "smooth" });
    })
    .catch(error => {
        loader.style.display = "none";
        alert("Error uploading file. Please try again.");
        console.error("Upload Error:", error);
    });
}

// Load More Results
function loadMoreResults() {
    currentLimit += 10;
    uploadFile();
}

document.getElementById("showMore").addEventListener("click", loadMoreResults);
