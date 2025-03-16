
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    });
  }



function displayFileName() {
    let fileInput = document.getElementById("fileInput").files[0];
    let fileNameDisplay = document.getElementById("fileName");

    if (fileInput) {
        fileNameDisplay.innerText = "Selected File: " + fileInput.name;
        fileNameDisplay.style.display = "block";
    } else {
        fileNameDisplay.style.display = "none";
    }
}

function uploadFile() {
    let fileInput = document.getElementById("fileInput").files[0];
    let errorMessage = document.getElementById("errorMessage");
    let resultsTable = document.getElementById("results").getElementsByTagName("tbody")[0];
    let loadingMessage = document.getElementById("loadingMessage");
    let noResultsMessage = document.getElementById("noResultsMessage");

    resultsTable.innerHTML = "";
    errorMessage.innerText = "";
    noResultsMessage.style.display = "none";

    if (!fileInput) {
        errorMessage.innerText = "Please select a file.";
        return;
    }

    // Show loading message
    loadingMessage.style.display = "block";

    let formData = new FormData();
    formData.append("file", fileInput);

    fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Hide loading message
        loadingMessage.style.display = "none";

        if (data.error) {
            errorMessage.innerText = data.error;
            return;
        }

        if (data.similar_cases.length === 0) {
            noResultsMessage.style.display = "block";
            return;
        }

        data.similar_cases.forEach(caseInfo => {
            let row = resultsTable.insertRow();
            row.innerHTML = `
                <td>${caseInfo.Crime}</td>
                <td>${caseInfo.Year}</td>
                <td>${caseInfo.Place}</td>
                <td>${caseInfo["Accused Count"]}</td>
                <td>${caseInfo["Similarity Score"]}</td>
                <td>${caseInfo["Similarities Found"]}</td>
            `;
        });
    })
    .catch(error => {
        loadingMessage.style.display = "none";
        errorMessage.innerText = "Error processing the request.";
    });
}
